/**
 * Amazon Product & Media Scraper - Background Service Worker
 * Manages download queues, directory organization, and file exports.
 */

// Helper to sanitize filenames for Windows/macOS/Linux
function sanitizeFilename(name) {
  return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').substring(0, 100).trim();
}

// Download a single file
function downloadFile(url, filename, saveAs = false) {
  return new Promise((resolve, reject) => {
    chrome.downloads.download(
      {
        url: url,
        filename: filename,
        saveAs: saveAs,
        conflictAction: 'uniquify'
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(downloadId);
        }
      }
    );
  });
}

// Sequential batch download with polite delay
async function downloadBatch(items, onProgress) {
  const results = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      const downloadId = await downloadFile(item.url, item.filename, false);
      results.push({ success: true, downloadId, item });
    } catch (err) {
      console.error(`Failed to download ${item.filename}:`, err);
      results.push({ success: false, error: err.message, item });
    }

    if (onProgress) {
      onProgress({
        current: i + 1,
        total: items.length,
        item
      });
    }

    // Small delay between downloads to prevent browser throttling
    if (i < items.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  return results;
}

// Listen to messages from popup or content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'DOWNLOAD_SINGLE') {
    const { url, filename, folder = 'AmazonScraper' } = request;
    const cleanName = sanitizeFilename(filename);
    const targetPath = `${folder}/${cleanName}`;

    downloadFile(url, targetPath)
      .then(id => sendResponse({ success: true, downloadId: id }))
      .catch(err => sendResponse({ success: false, error: err.message }));

    return true; // Keep message port open for async response
  }

  if (request.action === 'DOWNLOAD_BATCH') {
    const { items, folder = 'AmazonScraper' } = request;

    const formattedItems = items.map((item, idx) => ({
      url: item.url,
      filename: `${folder}/${sanitizeFilename(item.filename)}`
    }));

    downloadBatch(formattedItems)
      .then(results => sendResponse({ success: true, results }))
      .catch(err => sendResponse({ success: false, error: err.message }));

    return true;
  }

  if (request.action === 'EXPORT_TEXT_FILE') {
    const { content, filename, mimeType = 'application/json', folder = 'AmazonScraper' } = request;
    const dataUrl = `data:${mimeType};charset=utf-8,` + encodeURIComponent(content);
    const cleanPath = `${folder}/${sanitizeFilename(filename)}`;

    downloadFile(dataUrl, cleanPath)
      .then(id => sendResponse({ success: true, downloadId: id }))
      .catch(err => sendResponse({ success: false, error: err.message }));

    return true;
  }

  if (request.action === 'TEST_API_CONNECTION') {
    const { endpoint, apiKey } = request;
    testApiConnection(endpoint, apiKey)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));

    return true;
  }

  if (request.action === 'EXPORT_TO_API') {
    const { endpoint, apiKey, data } = request;
    sendDataToApi(endpoint, apiKey, data)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));

    return true;
  }
});

// Test reaching the API endpoint
async function testApiConnection(endpoint, apiKey) {
  if (!endpoint || !endpoint.startsWith('http')) {
    throw new Error('URL endpoint tidak valid. Harus diawali dengan http:// atau https://');
  }

  const headers = {
    'Accept': 'application/json, text/plain, */*'
  };

  if (apiKey && apiKey.trim()) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    headers['x-api-key'] = apiKey.trim();
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    // Try pinging with lightweight POST or GET
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ping: true, action: 'ping', timestamp: Date.now() }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    return {
      success: response.status < 500,
      status: response.status,
      statusText: response.statusText
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return { success: false, error: 'Koneksi timeout: Server tidak merespons dalam 10 detik.' };
    }
    return { success: false, error: err.message };
  }
}

// Helper to filter and prioritize up to 4 high-res images (excluding size charts)
function filterAndPrioritizeImages(images) {
  if (!images || !Array.isArray(images)) return [];

  const isSizeChart = (img) => {
    const str = `${img.variant || ''} ${img.url || ''}`.toLowerCase();
    return (
      str.includes('sizechart') ||
      str.includes('size_chart') ||
      str.includes('sizing') ||
      str.includes('fit_guide') ||
      str.includes('size-chart') ||
      str.includes('dimension')
    );
  };

  // 1. Exclude size charts / diagrams
  const candidates = images.filter(img => !isSizeChart(img));

  // 2. Score priority: MAIN (100) > PT01 (90) > PT02 (80) > PT03 (70) > PT04 (60) > isHiRes (50)
  const getScore = (img) => {
    const v = (img.variant || '').toUpperCase();
    if (v === 'MAIN') return 100;
    if (v === 'PT01') return 90;
    if (v === 'PT02') return 80;
    if (v === 'PT03') return 70;
    if (v === 'PT04') return 60;
    if (img.isHiRes) return 50;
    return 10;
  };

  candidates.sort((a, b) => getScore(b) - getScore(a));

  // 3. Limit to maximum 4 images
  return candidates.slice(0, 4).map(img => ({
    url: img.url,
    thumbUrl: img.thumbUrl || img.url,
    variant: img.variant || 'MAIN',
    isHiRes: !!img.isHiRes
  }));
}

// Helper to filter direct MP4 videos only (excluding HLS .m3u8 for Meta Threads)
function filterVideos(videos) {
  if (!videos || !Array.isArray(videos)) return [];
  return videos
    .filter(v => v.mp4Url && v.mp4Url.startsWith('http') && !v.mp4Url.includes('.m3u8'))
    .map(v => ({
      title: v.title || 'Product Video',
      mp4Url: v.mp4Url,
      thumbnail: v.thumbnail || '',
      duration: v.duration || '',
      creator: v.creator || ''
    }));
}

// Send full product payload to external/local API
async function sendDataToApi(endpoint, apiKey, data) {
  if (!endpoint || !endpoint.startsWith('http')) {
    throw new Error('URL endpoint tidak valid. Harus diawali dengan http:// atau https://');
  }

  const effectiveApiKey = apiKey ? apiKey.trim() : 'threads_agent_secret_cron_key_999';

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/plain, */*',
    'x-api-key': effectiveApiKey,
    'Authorization': `Bearer ${effectiveApiKey}`
  };

  // Process and filter media
  const filteredImages = filterAndPrioritizeImages(data.images);
  const filteredVideos = filterVideos(data.videos);

  // Format clean, standardized payload
  const payload = {
    asin: data.asin || '',
    title: data.title || '',
    brand: data.brand || '',
    brandUrl: data.brandUrl || '',
    price: data.price || '',
    listPrice: data.listPrice || '',
    discount: data.discount || '',
    currency: data.currency || '',
    rating: data.rating || '',
    reviewCount: data.reviewCount || '',
    availability: data.availability || '',
    isOutOfStock: !!data.isOutOfStock,
    seller: data.seller || '',
    returnPolicy: data.returnPolicy || '',
    productUrl: data.url || '',
    affiliateLink: data.affiliateLink || '',
    trackingId: data.trackingId || '',
    selectedColor: data.selectedColor || '',
    selectedSize: data.selectedSize || '',
    creatorNotes: (data.creatorNotes || '').trim(),
    breadcrumbs: data.breadcrumbs || [],
    bullets: data.bullets || [],
    quickFacts: data.quickFacts || {},
    specifications: data.specifications || {},
    description: data.description || '',
    images: filteredImages,
    videos: filteredVideos,
    scrapedAt: data.scrapedAt || new Date().toISOString()
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    let responseData = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      responseData = await response.json().catch(() => null);
    } else {
      responseData = await response.text().catch(() => null);
    }

    if (!response.ok) {
      const errMsg = (responseData && typeof responseData === 'object' && (responseData.error || responseData.message))
        ? (responseData.error || responseData.message)
        : `Server merespons status ${response.status} (${response.statusText})`;
      return {
        success: false,
        status: response.status,
        statusText: response.statusText,
        error: errMsg,
        data: responseData
      };
    }

    return {
      success: true,
      status: response.status,
      statusText: response.statusText,
      data: responseData
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return { success: false, error: 'Request timeout: Server tidak merespons dalam 35 detik.' };
    }
    return { success: false, error: err.message };
  }
}
