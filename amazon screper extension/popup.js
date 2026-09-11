/**
 * Amazon Product & Media Scraper - Popup Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // Global API Constants
  const PROD_API_URL = 'https://threads-agent-amazon-affiliate.vercel.app/api/products/ingest';
  const LOCAL_API_URL = 'http://localhost:3000/api/products/ingest';
  const DEFAULT_API_KEY = 'threads_agent_secret_cron_key_999';

  // State
  let currentProduct = null;
  let selectedImages = new Set();

  // Elements
  const loadingView = document.getElementById('loadingView');
  const notAmazonView = document.getElementById('notAmazonView');
  const universalVideoView = document.getElementById('universalVideoView');
  const detectedVideoSubtitle = document.getElementById('detectedVideoSubtitle');
  const detectedVideoCountBadge = document.getElementById('detectedVideoCountBadge');
  const manualVideoUrlInput = document.getElementById('manualVideoUrlInput');
  const exportManualVideoBtn = document.getElementById('exportManualVideoBtn');
  const detectedVideosList = document.getElementById('detectedVideosList');
  const noWebVideosFound = document.getElementById('noWebVideosFound');
  const mainContentView = document.getElementById('mainContentView');
  const pageStatusBadge = document.getElementById('pageStatusBadge');
  const refreshBtn = document.getElementById('refreshBtn');

  // Universal Video Detector Server Status Elements
  const univServerDot = document.getElementById('univServerDot');
  const univServerStatusText = document.getElementById('univServerStatusText');
  const univBtnLocal = document.getElementById('univBtnLocal');
  const univBtnProd = document.getElementById('univBtnProd');
  const univPingBtn = document.getElementById('univPingBtn');
  const universalServerWarning = document.getElementById('universalServerWarning');
  const univSwitchToProdLink = document.getElementById('univSwitchToProdLink');

  // Helper to fetch saved API Config from storage (Default to deployed Vercel Cloud)
  function getStoredApiConfig() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['amazonScraperApiEndpoint', 'amazonScraperApiKey'], (result) => {
        let endpoint = result.amazonScraperApiEndpoint;
        // Default strictly to deployed Vercel Cloud URL
        if (!endpoint || endpoint.includes('localhost') || endpoint.includes('127.0.0.1')) {
          endpoint = PROD_API_URL;
          chrome.storage.local.set({ amazonScraperApiEndpoint: PROD_API_URL });
        }
        const apiKey = result.amazonScraperApiKey || DEFAULT_API_KEY;
        resolve({ endpoint, apiKey });
      });
    });
  }

  // Check connection status in Universal Video view (Default to deployed Vercel Cloud)
  function checkUniversalServerStatus(customEndpoint) {
    chrome.storage.local.get(['amazonScraperApiEndpoint', 'amazonScraperApiKey'], (result) => {
      let endpoint = customEndpoint || result.amazonScraperApiEndpoint;
      if (!endpoint || endpoint.includes('localhost') || endpoint.includes('127.0.0.1')) {
        endpoint = PROD_API_URL;
        chrome.storage.local.set({ amazonScraperApiEndpoint: PROD_API_URL });
      }
      const apiKey = result.amazonScraperApiKey || DEFAULT_API_KEY;
      const isProd = endpoint.includes('vercel.app') || !endpoint.includes('localhost');

      if (univBtnLocal && univBtnProd) {
        if (isProd) {
          univBtnProd.style.background = '#4f46e5';
          univBtnProd.style.color = '#fff';
          univBtnLocal.style.background = 'transparent';
          univBtnLocal.style.color = '#a1a1aa';
        } else {
          univBtnLocal.style.background = '#4f46e5';
          univBtnLocal.style.color = '#fff';
          univBtnProd.style.background = 'transparent';
          univBtnProd.style.color = '#a1a1aa';
        }
      }

      if (univServerDot) univServerDot.style.background = '#eab308';
      if (univServerStatusText) univServerStatusText.textContent = `Pengecekan: ${isProd ? 'Vercel Cloud (threads-agent-amazon-affiliate.vercel.app)' : 'Localhost (3000)'}...`;

      chrome.runtime.sendMessage({
        action: 'TEST_API_CONNECTION',
        endpoint,
        apiKey
      }, (res) => {
        if (res && res.success) {
          if (univServerDot) univServerDot.style.background = '#10b981';
          if (univServerStatusText) univServerStatusText.textContent = `Aktif: ${isProd ? 'Vercel Cloud (Online)' : 'Localhost'}`;
          if (universalServerWarning) universalServerWarning.classList.add('hidden');
        } else {
          if (univServerDot) univServerDot.style.background = '#ef4444';
          if (univServerStatusText) univServerStatusText.textContent = `Offline: ${isProd ? 'Vercel Cloud' : 'Localhost'}`;
          if (universalServerWarning) universalServerWarning.classList.remove('hidden');
        }
      });
    });
  }

  // Wire Universal Server Buttons
  if (univBtnLocal) {
    univBtnLocal.addEventListener('click', () => {
      chrome.storage.local.set({ amazonScraperApiEndpoint: LOCAL_API_URL });
      if (apiEndpointInput) apiEndpointInput.value = LOCAL_API_URL;
      checkUniversalServerStatus(LOCAL_API_URL);
      showToast('Target diubah ke Localhost (3000)');
    });
  }

  if (univBtnProd) {
    univBtnProd.addEventListener('click', () => {
      chrome.storage.local.set({ amazonScraperApiEndpoint: PROD_API_URL });
      if (apiEndpointInput) apiEndpointInput.value = PROD_API_URL;
      checkUniversalServerStatus(PROD_API_URL);
      showToast('Target diubah ke Prod (Vercel)');
    });
  }

  if (univPingBtn) {
    univPingBtn.addEventListener('click', () => {
      checkUniversalServerStatus();
      showToast('Menguji koneksi server...');
    });
  }

  if (univSwitchToProdLink) {
    univSwitchToProdLink.addEventListener('click', () => {
      chrome.storage.local.set({ amazonScraperApiEndpoint: PROD_API_URL });
      if (apiEndpointInput) apiEndpointInput.value = PROD_API_URL;
      checkUniversalServerStatus(PROD_API_URL);
      showToast('Target diubah ke Prod (Vercel)');
    });
  }

  // Banner elements
  const bannerThumb = document.getElementById('bannerThumb');
  const bannerTitle = document.getElementById('bannerTitle');
  const bannerAsinBadge = document.getElementById('bannerAsinBadge');
  const bannerBrandBadge = document.getElementById('bannerBrandBadge');
  const bannerPrice = document.getElementById('bannerPrice');
  const bannerListPrice = document.getElementById('bannerListPrice');
  const bannerDiscount = document.getElementById('bannerDiscount');
  const bannerRatingVal = document.getElementById('bannerRatingVal');
  const bannerReviewCount = document.getElementById('bannerReviewCount');

  // Tabs & Counts
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const tabBadgeImages = document.getElementById('tabBadgeImages');
  const tabBadgeVideos = document.getElementById('tabBadgeVideos');

  // Affiliate Elements
  const affiliateLinkInput = document.getElementById('affiliateLinkInput');
  const fetchAffiliateLinkBtn = document.getElementById('fetchAffiliateLinkBtn');
  const fetchAffiliateBtnText = document.getElementById('fetchAffiliateBtnText');
  const copyAffiliateLinkBtn = document.getElementById('copyAffiliateLinkBtn');
  const pasteAffiliateLinkBtn = document.getElementById('pasteAffiliateLinkBtn');
  const affiliateTagBadge = document.getElementById('affiliateTagBadge');
  const btnFormatShort = document.getElementById('btnFormatShort');
  const btnFormatFull = document.getElementById('btnFormatFull');

  let currentAffiliateFormat = 'short';
  let currentAffiliateLink = '';

  // Images Elements
  const imagesGrid = document.getElementById('imagesGrid');
  const selectAllImagesCheckbox = document.getElementById('selectAllImagesCheckbox');
  const selectedCountText = document.getElementById('selectedCountText');
  const downloadSelectedImagesBtn = document.getElementById('downloadSelectedImagesBtn');

  // Videos Elements
  const videosList = document.getElementById('videosList');
  const videoTotalCount = document.getElementById('videoTotalCount');
  const downloadAllVideosBtn = document.getElementById('downloadAllVideosBtn');
  const noVideosState = document.getElementById('noVideosState');

  // Info Elements
  const infoAvailability = document.getElementById('infoAvailability');
  const infoSeller = document.getElementById('infoSeller');
  const infoColor = document.getElementById('infoColor');
  const infoSize = document.getElementById('infoSize');
  const infoBreadcrumbs = document.getElementById('infoBreadcrumbs');
  const infoBulletsList = document.getElementById('infoBulletsList');
  const infoSpecsTable = document.getElementById('infoSpecsTable');
  const infoDescription = document.getElementById('infoDescription');
  const copyBulletsBtn = document.getElementById('copyBulletsBtn');
  const copySpecsBtn = document.getElementById('copySpecsBtn');

  // Export Elements
  const exportJsonBtn = document.getElementById('exportJsonBtn');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const copyAllBtn = document.getElementById('copyAllBtn');
  const copyRawJsonBtn = document.getElementById('copyRawJsonBtn');
  const jsonPreviewContent = document.getElementById('jsonPreviewContent');

  // API Export Elements
  const apiEndpointInput = document.getElementById('apiEndpointInput');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const testApiBtn = document.getElementById('testApiBtn');
  const sendToApiBtn = document.getElementById('sendToApiBtn');
  const sendToApiBtnText = document.getElementById('sendToApiBtnText');
  const apiStatusBadge = document.getElementById('apiStatusBadge');
  const apiResultStatus = document.getElementById('apiResultStatus');
  const creatorNotesInput = document.getElementById('creatorNotesInput');
  const btnEnvProd = document.getElementById('btnEnvProd');
  const btnEnvLocal = document.getElementById('btnEnvLocal');

  // Toast
  const toastNotification = document.getElementById('toastNotification');
  const toastMessage = document.getElementById('toastMessage');
  let toastTimer = null;

  function showToast(msg, duration = 2500) {
    if (toastTimer) clearTimeout(toastTimer);
    toastMessage.textContent = msg;
    toastNotification.classList.remove('hidden');
    toastTimer = setTimeout(() => {
      toastNotification.classList.add('hidden');
    }, duration);
  }

  // Tab Switching
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTabId = btn.getAttribute('data-tab');
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const activePane = document.getElementById(targetTabId);
      if (activePane) activePane.classList.add('active');
    });
  });

  // Check if current tab is Amazon
  function isAmazonUrl(url) {
    if (!url) return false;
    return /https?:\/\/(www\.)?amazon\.[a-z.]+/i.test(url);
  }

  // Initialize scraper
  async function init() {
    loadingView.classList.remove('hidden');
    notAmazonView.classList.add('hidden');
    mainContentView.classList.add('hidden');

    pageStatusBadge.className = 'status-badge status-loading';
    pageStatusBadge.textContent = 'Memindai...';

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      loadingView.classList.add('hidden');
      notAmazonView.classList.remove('hidden');
      pageStatusBadge.className = 'status-badge status-error';
      pageStatusBadge.textContent = 'Tab Kosong';
      return;
    }

    // If active tab is NOT Amazon, run Universal Video Detector mode!
    if (!isAmazonUrl(tab.url)) {
      initUniversalVideoDetector(tab);
      return;
    }

    // Try sending message to content script
    try {
      chrome.tabs.sendMessage(tab.id, { action: 'SCRAPE_PRODUCT' }, async (response) => {
        if (chrome.runtime.lastError || !response || !response.success) {
          // Content script not injected yet, inject it manually
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['content.js']
            });

            // Retry scrape after injection
            setTimeout(() => {
              chrome.tabs.sendMessage(tab.id, { action: 'SCRAPE_PRODUCT' }, (res2) => {
                if (res2 && res2.success) {
                  renderData(res2.data);
                } else {
                  showError('Gagal mengambil data produk dari halaman ini.');
                }
              });
            }, 300);
          } catch (injectErr) {
            showError('Tidak dapat menyuntikkan scraper: ' + injectErr.message);
          }
        } else {
          renderData(response.data);
        }
      });
    } catch (err) {
      showError(err.message);
    }
  }

  // Universal Video Detector for all web pages (TikTok, Threads, Instagram, Reddit, YouTube, etc.)
  async function initUniversalVideoDetector(tab) {
    loadingView.classList.add('hidden');
    notAmazonView.classList.add('hidden');
    mainContentView.classList.add('hidden');
    universalVideoView.classList.remove('hidden');

    pageStatusBadge.className = 'status-badge status-brand';
    pageStatusBadge.textContent = 'Detektor Video';
    const hostname = tab.url ? new URL(tab.url).hostname : 'Web';
    detectedVideoSubtitle.textContent = `Memindai video di ${hostname}...`;

    // Ping API server immediately to update connection badge & warn if offline
    checkUniversalServerStatus();

    try {
      chrome.tabs.sendMessage(tab.id, { action: 'DETECT_PAGE_VIDEOS' }, async (response) => {
        if (chrome.runtime.lastError || !response || !response.success) {
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['videoSniffer.js']
            });

            setTimeout(() => {
              chrome.tabs.sendMessage(tab.id, { action: 'DETECT_PAGE_VIDEOS' }, (res2) => {
                if (res2 && res2.success) {
                  renderDetectedWebVideos(res2.videos || [], tab);
                } else {
                  renderDetectedWebVideos([], tab);
                }
              });
            }, 300);
          } catch (e) {
            renderDetectedWebVideos([], tab);
          }
        } else {
          renderDetectedWebVideos(response.videos || [], tab);
        }
      });
    } catch (err) {
      renderDetectedWebVideos([], tab);
    }
  }

  function renderDetectedWebVideos(videos, tab) {
    detectedVideosList.innerHTML = '';
    const total = videos ? videos.length : 0;
    detectedVideoCountBadge.textContent = `${total} Video`;
    const host = tab.url ? new URL(tab.url).hostname : 'Halaman Web';
    detectedVideoSubtitle.textContent = `${host} (${total} video terdeteksi)`;

    if (!videos || videos.length === 0) {
      noWebVideosFound.classList.remove('hidden');
      return;
    }

    noWebVideosFound.classList.add('hidden');

    videos.forEach((v, idx) => {
      const card = document.createElement('div');
      card.className = 'video-card';
      card.style.cssText = 'border: 1px solid #27272a; background: #141416; border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 8px; transition: border-color 0.2s;';

      const hasPoster = v.poster && v.poster.trim().length > 0;

      card.innerHTML = `
        <div style="display: flex; gap: 10px; align-items: center;">
          <div class="video-thumb-container" style="width: 88px; height: 58px; background: #09090b; border-radius: 6px; overflow: hidden; display: flex; align-items: center; justify-content: center; position: relative; flex-shrink: 0; border: 1px solid #27272a; cursor: pointer;" title="Klik untuk membuka/preview video">
            ${hasPoster ? `
              <img src="${v.poster}" alt="Thumbnail" class="video-thumb-img" style="width: 100%; height: 100%; object-fit: cover;">
              <div class="video-thumb-fallback" style="display: none; width: 100%; height: 100%; background: linear-gradient(135deg, #1e1b4b, #312e81); flex-direction: column; align-items: center; justify-content: center; gap: 3px;">
                <div style="width: 22px; height: 22px; border-radius: 50%; background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center;">
                  <svg style="width: 10px; height: 10px; color: #c7d2fe; margin-left: 2px;" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                </div>
                <span style="font-size: 8px; color: #a5b4fc; font-weight: 700;">WEB VIDEO</span>
              </div>
            ` : `
              <div class="video-thumb-fallback" style="display: flex; width: 100%; height: 100%; background: linear-gradient(135deg, #1e1b4b, #312e81); flex-direction: column; align-items: center; justify-content: center; gap: 3px;">
                <div style="width: 22px; height: 22px; border-radius: 50%; background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center;">
                  <svg style="width: 10px; height: 10px; color: #c7d2fe; margin-left: 2px;" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                </div>
                <span style="font-size: 8px; color: #a5b4fc; font-weight: 700;">WEB VIDEO</span>
              </div>
            `}
            <div class="video-play-badge" style="position: absolute; inset: 0; background: rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; pointer-events: none; transition: opacity 0.2s;">
              <div style="width: 22px; height: 22px; border-radius: 50%; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.4);">
                <svg style="width: 9px; height: 9px; color: #fff; margin-left: 2px;" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
              </div>
            </div>
            ${v.duration ? `<span style="position: absolute; bottom: 2px; right: 2px; background: rgba(0,0,0,0.85); color: #fff; font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: 600;">${v.duration}s</span>` : ''}
          </div>
          <div style="flex: 1; min-width: 0;">
            <h4 style="font-size: 11px; font-weight: 600; color: #f4f4f5; margin: 0 0 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${v.title}">${v.title || `Video #${idx + 1}`}</h4>
            <span style="font-size: 10px; color: #71717a; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${v.url}</span>
            <span style="font-size: 9px; color: #a855f7; display: inline-block; margin-top: 3px;">✨ AI Vision Autodetect</span>
          </div>
        </div>
        <div style="display: flex; gap: 6px; justify-content: flex-end; align-items: center; border-top: 1px solid #1f1f23; padding-top: 6px;">
          <button class="btn btn-sm btn-ghost btn-preview-url" type="button" style="font-size: 10px; padding: 3px 8px;" title="Putar video di tab baru">
            👁️ Tonton
          </button>
          <button class="btn btn-sm btn-ghost btn-copy-url" type="button" style="font-size: 10px; padding: 3px 8px;">
            Salin URL
          </button>
          <button class="btn btn-sm btn-primary btn-export-stock" type="button" style="font-size: 10px; padding: 4px 10px; background: linear-gradient(135deg, #9333ea, #db2777); border: none;">
            🚀 Export ke Stok Media
          </button>
        </div>
      `;

      const thumbContainer = card.querySelector('.video-thumb-container');
      const thumbImg = card.querySelector('.video-thumb-img');
      const thumbFallback = card.querySelector('.video-thumb-fallback');

      if (thumbImg && thumbFallback) {
        thumbImg.onerror = () => {
          thumbImg.style.display = 'none';
          thumbFallback.style.display = 'flex';
        };
      }

      // Click thumbnail or preview button to open video
      thumbContainer.addEventListener('click', () => {
        chrome.tabs.create({ url: v.url });
      });

      card.querySelector('.btn-preview-url').addEventListener('click', () => {
        chrome.tabs.create({ url: v.url });
      });

      card.querySelector('.btn-copy-url').addEventListener('click', () => {
        navigator.clipboard.writeText(v.url);
        showToast('URL video disalin ke clipboard!');
      });

      const exportBtn = card.querySelector('.btn-export-stock');
      exportBtn.addEventListener('click', async () => {
        exportBtn.disabled = true;
        exportBtn.textContent = '⏳ Menyimpan...';
        showToast('Mengirim video ke Stok Media & AI Vision...', 4000);

        const config = await getStoredApiConfig();

        chrome.runtime.sendMessage({
          action: 'EXPORT_VIDEO_TO_MEDIA_STOCK',
          endpoint: config.endpoint,
          apiKey: config.apiKey,
          videoUrl: v.url,
          title: v.title,
          sourceUrl: tab.url,
          thumbnailUrl: v.poster,
          category: 'AUTO',
          notes: `Exported via Universal Web Sniffer from ${tab.url}`,
        }, (res) => {
          exportBtn.disabled = false;
          if (res && res.success) {
            exportBtn.textContent = '✅ Tersimpan!';
            exportBtn.style.background = '#059669';
            showToast(`✅ Video "${res.title || 'Viral'}" berhasil masuk Stok Media!`, 4500);
          } else {
            exportBtn.textContent = '🚀 Export ke Stok Media';
            const errMsg = res?.error || 'Koneksi API gagal';
            showToast(`Gagal: ${errMsg}`, 5000);
            if (universalServerWarning) universalServerWarning.classList.remove('hidden');
          }
        });
      });

      detectedVideosList.appendChild(card);
    });
  }

  // Handle Manual Video URL Export
  if (exportManualVideoBtn && manualVideoUrlInput) {
    exportManualVideoBtn.addEventListener('click', async () => {
      const val = (manualVideoUrlInput.value || '').trim();
      if (!val || !val.startsWith('http')) {
        showToast('Masukkan URL video yang valid (diawali http:// atau https://)', 3000);
        return;
      }

      exportManualVideoBtn.disabled = true;
      exportManualVideoBtn.textContent = '⏳ Menyimpan...';
      showToast('Mengirim video ke Stok Media & AI Vision...', 4000);

      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const config = await getStoredApiConfig();

      chrome.runtime.sendMessage({
        action: 'EXPORT_VIDEO_TO_MEDIA_STOCK',
        endpoint: config.endpoint,
        apiKey: config.apiKey,
        videoUrl: val,
        title: '',
        sourceUrl: activeTab?.url || '',
        category: 'AUTO',
        notes: `Manual URL input from extension`,
      }, (res) => {
        exportManualVideoBtn.disabled = false;
        exportManualVideoBtn.textContent = 'Simpan';
        if (res && res.success) {
          manualVideoUrlInput.value = '';
          showToast(`✅ Video "${res.title || 'Viral'}" berhasil masuk Stok Media!`, 4500);
        } else {
          const errMsg = res?.error || 'Koneksi API gagal';
          showToast(`Gagal: ${errMsg}`, 5000);
          if (universalServerWarning) universalServerWarning.classList.remove('hidden');
        }
      });
    });
  }

  function showError(msg) {
    loadingView.classList.add('hidden');
    pageStatusBadge.className = 'status-badge status-error';
    pageStatusBadge.textContent = 'Error';
    showToast(msg, 4000);
  }

  // Render product data into UI
  function renderData(data) {
    currentProduct = data;
    selectedImages = new Set(data.images.map(img => img.url));

    loadingView.classList.add('hidden');
    mainContentView.classList.remove('hidden');

    pageStatusBadge.className = 'status-badge status-ready';
    pageStatusBadge.textContent = 'Terhubung';

    // 1. Banner
    const firstImg = data.images[0] ? data.images[0].thumbUrl || data.images[0].url : '';
    bannerThumb.src = firstImg;
    bannerTitle.textContent = data.title || 'Judul Produk Amazon';
    bannerTitle.title = data.title || '';

    bannerAsinBadge.textContent = `ASIN: ${data.asin || '-'}`;
    bannerBrandBadge.textContent = data.brand || 'Amazon Store';

    bannerPrice.textContent = data.price || 'Harga Tidak Tersedia';
    if (data.listPrice) {
      bannerListPrice.textContent = data.listPrice;
      bannerListPrice.classList.remove('hidden');
    } else {
      bannerListPrice.classList.add('hidden');
    }

    if (data.discount) {
      bannerDiscount.textContent = data.discount;
      bannerDiscount.classList.remove('hidden');
    } else {
      bannerDiscount.classList.add('hidden');
    }

    bannerRatingVal.textContent = data.rating ? data.rating.replace(/out of 5 stars/i, '').trim() : '-';
    bannerReviewCount.textContent = data.reviewCount ? `(${data.reviewCount})` : '';

    // Tab counts
    tabBadgeImages.textContent = data.images.length;
    tabBadgeVideos.textContent = data.videos.length;

    // Affiliate Details
    if (data.trackingId) {
      affiliateTagBadge.textContent = `Tag: ${data.trackingId}`;
      affiliateTagBadge.classList.remove('hidden');
    } else {
      affiliateTagBadge.classList.add('hidden');
    }

    // Check if user already copied amzn.to link, otherwise auto-fetch or fallback
    checkClipboardForAffiliateLink().then((alreadyCopied) => {
      if (!alreadyCopied && (data.hasSiteStripe || data.trackingId)) {
        fetchAffiliateLink();
      } else if (!alreadyCopied) {
        affiliateLinkInput.value = '';
        currentAffiliateLink = '';
        copyAffiliateLinkBtn.disabled = true;
      }
    });

    // 2. Images Tab
    renderImagesGrid(data.images, data.asin);

    // 3. Videos Tab
    renderVideosList(data.videos, data.asin);

    // 4. Info Tab
    renderInfoTab(data);

    // 5. Export Tab
    jsonPreviewContent.textContent = JSON.stringify(data, null, 2);
  }

  // Helper to set and propagate affiliate link
  function setAffiliateLink(link, isOfficial = true) {
    if (!link) return;
    currentAffiliateLink = link.trim();
    affiliateLinkInput.value = currentAffiliateLink;
    copyAffiliateLinkBtn.disabled = false;
    if (currentProduct) {
      currentProduct.affiliateLink = currentAffiliateLink;
      jsonPreviewContent.textContent = JSON.stringify(currentProduct, null, 2);
    }
  }

  // Check if system clipboard already holds an amzn.to or affiliate link
  async function checkClipboardForAffiliateLink() {
    try {
      const clip = (await navigator.clipboard.readText() || '').trim();
      if (clip && (clip.includes('amzn.to/') || (clip.includes('amazon.') && clip.includes('tag=')))) {
        setAffiliateLink(clip, true);
        return true;
      }
    } catch (e) {}
    return false;
  }

  // Fetch Affiliate Link from SiteStripe or clipboard
  async function fetchAffiliateLink() {
    fetchAffiliateLinkBtn.disabled = true;
    fetchAffiliateBtnText.textContent = 'Memuat...';

    // 1. Record existing clipboard text so we can detect changes
    let prevClip = '';
    try {
      prevClip = (await navigator.clipboard.readText() || '').trim();
    } catch (e) {}

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      fetchAffiliateLinkBtn.disabled = false;
      fetchAffiliateBtnText.textContent = 'Ambil Link';
      return;
    }

    // 2. Instruct content script to trigger Amazon SiteStripe button
    chrome.tabs.sendMessage(
      tab.id,
      { action: 'TRIGGER_SITESTRIPE_CLICK', format: currentAffiliateFormat },
      async (res) => {
        // Update tag badge if returned
        if (res && res.trackingId) {
          affiliateTagBadge.textContent = `Tag: ${res.trackingId}`;
          affiliateTagBadge.classList.remove('hidden');
        }

        // If content script grabbed link directly from textarea
        if (res && res.domLink) {
          setAffiliateLink(res.domLink, true);
          fetchAffiliateLinkBtn.disabled = false;
          fetchAffiliateBtnText.textContent = 'Ambil Link';
          showToast(res.domLink.includes('amzn.to') ? 'Short Link (amzn.to) didapat!' : 'Link Affiliate didapat!');
          return;
        }

        // 3. Poll the OS clipboard in popup.js
        // SiteStripe's internal JavaScript writes directly to clipboard upon button click.
        // Because popup.js is focused and has "clipboardRead", we poll for the updated link.
        let captured = null;
        for (let attempt = 0; attempt < 22; attempt++) {
          await new Promise(r => setTimeout(r, 150));
          try {
            const currentClip = (await navigator.clipboard.readText() || '').trim();
            if (currentClip && currentClip.startsWith('http')) {
              if (currentClip.includes('amzn.to/')) {
                captured = currentClip;
                break;
              }
              if (currentClip !== prevClip && currentClip.includes('tag=')) {
                captured = currentClip;
                break;
              }
            }
          } catch (clipErr) {}
        }

        fetchAffiliateLinkBtn.disabled = false;
        fetchAffiliateBtnText.textContent = 'Ambil Link';

        if (captured) {
          setAffiliateLink(captured, true);
          showToast(captured.includes('amzn.to') ? 'Short Link (amzn.to) berhasil disalin!' : 'Link Affiliate berhasil didapat!');
        } else if (res && res.fallbackLink) {
          setAffiliateLink(res.fallbackLink, false);
          showToast('Menggunakan Link Affiliate Standar. Klik "Paste" jika Anda baru menyalin dari SiteStripe.', 3500);
        } else {
          showToast(res?.reason || 'Gagal mengambil link dari SiteStripe', 3500);
        }
      }
    );
  }

  // Affiliate format buttons
  btnFormatShort.addEventListener('click', () => {
    btnFormatShort.classList.add('active');
    btnFormatFull.classList.remove('active');
    currentAffiliateFormat = 'short';
    fetchAffiliateLink();
  });

  btnFormatFull.addEventListener('click', () => {
    btnFormatFull.classList.add('active');
    btnFormatShort.classList.remove('active');
    currentAffiliateFormat = 'full';
    fetchAffiliateLink();
  });

  fetchAffiliateLinkBtn.addEventListener('click', () => {
    fetchAffiliateLink();
  });

  // Paste button: pull on demand from clipboard
  pasteAffiliateLinkBtn.addEventListener('click', async () => {
    try {
      const clip = (await navigator.clipboard.readText() || '').trim();
      if (clip && (clip.includes('amzn.to') || clip.includes('amazon.'))) {
        setAffiliateLink(clip, true);
        showToast('Link affiliate berhasil ditempel dari Clipboard!');
      } else {
        showToast('Clipboard tidak berisi link Amazon / amzn.to yang valid', 3000);
      }
    } catch (err) {
      showToast('Gagal membaca clipboard: ' + err.message, 3000);
    }
  });

  // Copy button
  copyAffiliateLinkBtn.addEventListener('click', () => {
    if (currentAffiliateLink || affiliateLinkInput.value) {
      navigator.clipboard.writeText(currentAffiliateLink || affiliateLinkInput.value);
      showToast('Link Affiliate disalin ke clipboard!');
    }
  });

  // Auto-sync clipboard when popup window regains focus
  window.addEventListener('focus', async () => {
    if (!currentAffiliateLink || !currentAffiliateLink.includes('amzn.to/')) {
      try {
        const clip = (await navigator.clipboard.readText() || '').trim();
        if (clip && clip.includes('amzn.to/')) {
          setAffiliateLink(clip, true);
          showToast('Mendeteksi link amzn.to dari clipboard!');
        }
      } catch (e) {}
    }
  });

  // Render Images Grid
  function renderImagesGrid(images, asin) {
    imagesGrid.innerHTML = '';

    if (images.length === 0) {
      imagesGrid.innerHTML = '<div class="empty-tab-state"><p>Tidak ada gambar resolusi tinggi ditemukan.</p></div>';
      selectedCountText.textContent = '0 terpilih';
      downloadSelectedImagesBtn.disabled = true;
      return;
    }

    selectAllImagesCheckbox.checked = true;
    updateSelectedCount();

    images.forEach((img, index) => {
      const card = document.createElement('div');
      card.className = 'image-card';

      card.innerHTML = `
        <div class="image-preview">
          <label class="custom-checkbox image-card-checkbox">
            <input type="checkbox" class="img-check" data-url="${img.url}" checked>
            <span class="checkmark"></span>
          </label>
          <img src="${img.thumbUrl || img.url}" alt="Image ${index + 1}" loading="lazy">
          <span class="image-badge-res">${img.isHiRes ? '1500px+' : 'Standar'}</span>
        </div>
        <div class="image-card-actions">
          <span class="image-variant-tag">${img.variant || `#${index + 1}`}</span>
          <div style="display:flex;gap:4px;">
            <button class="image-btn-action btn-open-img" title="Buka Gambar Asli">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </button>
            <button class="image-btn-action btn-dl-single-img" title="Download Gambar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </button>
          </div>
        </div>
      `;

      // Checkbox listener
      const check = card.querySelector('.img-check');
      check.addEventListener('change', (e) => {
        if (e.target.checked) {
          selectedImages.add(img.url);
        } else {
          selectedImages.delete(img.url);
        }
        updateSelectedCount();
      });

      // Open in new tab
      card.querySelector('.btn-open-img').addEventListener('click', (e) => {
        e.stopPropagation();
        chrome.tabs.create({ url: img.url });
      });

      // Download single image
      card.querySelector('.btn-dl-single-img').addEventListener('click', (e) => {
        e.stopPropagation();
        const filename = `${asin || 'AMZ'}_img_${index + 1}_${img.variant || 'view'}.jpg`;
        chrome.runtime.sendMessage({
          action: 'DOWNLOAD_SINGLE',
          url: img.url,
          filename: filename,
          folder: `AmazonScraper/${asin || 'Product'}`
        }, (res) => {
          if (res && res.success) {
            showToast(`Mengunduh gambar #${index + 1}...`);
          } else {
            showToast('Gagal mengunduh gambar', 3000);
          }
        });
      });

      imagesGrid.appendChild(card);
    });
  }

  function updateSelectedCount() {
    const total = currentProduct ? currentProduct.images.length : 0;
    const selected = selectedImages.size;
    selectedCountText.textContent = `${selected} dari ${total} terpilih`;
    downloadSelectedImagesBtn.disabled = selected === 0;
    selectAllImagesCheckbox.checked = selected === total && total > 0;
  }

  // Select/Deselect All Images
  selectAllImagesCheckbox.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    const checkboxes = imagesGrid.querySelectorAll('.img-check');
    checkboxes.forEach(cb => {
      cb.checked = isChecked;
      const url = cb.getAttribute('data-url');
      if (isChecked) selectedImages.add(url);
      else selectedImages.delete(url);
    });
    updateSelectedCount();
  });

  // Download Selected Images
  downloadSelectedImagesBtn.addEventListener('click', () => {
    if (!currentProduct || selectedImages.size === 0) return;

    const itemsToDownload = [];
    currentProduct.images.forEach((img, idx) => {
      if (selectedImages.has(img.url)) {
        itemsToDownload.push({
          url: img.url,
          filename: `${currentProduct.asin || 'AMZ'}_img_${idx + 1}_${img.variant || 'view'}.jpg`
        });
      }
    });

    showToast(`Memulai unduhan ${itemsToDownload.length} gambar...`);

    chrome.runtime.sendMessage({
      action: 'DOWNLOAD_BATCH',
      items: itemsToDownload,
      folder: `AmazonScraper/${currentProduct.asin || 'Product'}`
    }, (res) => {
      if (res && res.success) {
        showToast(`${itemsToDownload.length} gambar berhasil diantrekan!`);
      } else {
        showToast('Terjadi kesalahan saat mengunduh gambar.', 3000);
      }
    });
  });

  // Render Videos List
  function renderVideosList(videos, asin) {
    videosList.innerHTML = '';
    videoTotalCount.textContent = `${videos.length} video ditemukan`;

    if (videos.length === 0) {
      noVideosState.classList.remove('hidden');
      downloadAllVideosBtn.disabled = true;
      return;
    }

    noVideosState.classList.add('hidden');
    downloadAllVideosBtn.disabled = false;

    videos.forEach((v, index) => {
      const card = document.createElement('div');
      card.className = 'video-card';

      card.innerHTML = `
        <div class="video-thumb-wrap">
          <img src="${v.thumbnail || ''}" alt="Video Thumbnail">
          <div class="video-play-overlay">
            <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          </div>
          ${v.duration ? `<span class="video-duration-pill">${v.duration}</span>` : ''}
        </div>
        <div class="video-info-wrap">
          <h4 class="video-title" title="${v.title}">${v.title || `Video #${index + 1}`}</h4>
          <span class="video-creator">Oleh: ${v.creator || 'Amazon'}</span>
        </div>
        <div class="video-actions">
          ${v.mp4Url ? `
            <button class="btn btn-sm btn-primary btn-dl-video" title="Download MP4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              <span>MP4</span>
            </button>
          ` : `
            <span style="font-size:10px;color:var(--text-muted)">Stream HLS</span>
          `}
          <button class="icon-button btn-export-stock-single" title="Export ke Stok Media Viral" style="color: #c084fc;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
          </button>
          <button class="icon-button btn-copy-video" title="Salin URL Video">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
        </div>
      `;

      // Export Amazon video to MediaStock
      const exportStockBtn = card.querySelector('.btn-export-stock-single');
      if (exportStockBtn && (v.mp4Url || v.hlsUrl)) {
        exportStockBtn.addEventListener('click', () => {
          const videoUrl = v.mp4Url || v.hlsUrl;
          exportStockBtn.style.opacity = '0.5';
          showToast('Mengirim video ke Stok Media & AI Vision...', 3000);
          chrome.runtime.sendMessage({
            action: 'EXPORT_VIDEO_TO_MEDIA_STOCK',
            videoUrl: videoUrl,
            title: v.title,
            sourceUrl: window.location.href,
            thumbnailUrl: v.thumbnail,
            category: 'AUTO',
            notes: `Exported from Amazon product ${asin || ''}`
          }, (res) => {
            exportStockBtn.style.opacity = '1';
            if (res && res.success) {
              showToast(`✅ Video "${res.title || 'Produk'}" berhasil masuk Stok Media!`, 4000);
            } else {
              showToast(`Gagal: ${res?.error || 'Koneksi error'}`, 4000);
            }
          });
        });
      }

      // Download single MP4
      const dlBtn = card.querySelector('.btn-dl-video');
      if (dlBtn && v.mp4Url) {
        dlBtn.addEventListener('click', () => {
          const cleanTitle = (v.title || `video_${index + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
          const filename = `${asin || 'AMZ'}_video_${index + 1}_${cleanTitle}.mp4`;
          showToast(`Mengunduh video #${index + 1}...`);
          chrome.runtime.sendMessage({
            action: 'DOWNLOAD_SINGLE',
            url: v.mp4Url,
            filename: filename,
            folder: `AmazonScraper/${asin || 'Product'}/videos`
          });
        });
      }

      // Copy video link
      card.querySelector('.btn-copy-video').addEventListener('click', () => {
        const link = v.mp4Url || v.hlsUrl;
        if (link) {
          navigator.clipboard.writeText(link);
          showToast('Link video disalin ke clipboard!');
        }
      });

      videosList.appendChild(card);
    });
  }

  // Download All Videos
  downloadAllVideosBtn.addEventListener('click', () => {
    if (!currentProduct || currentProduct.videos.length === 0) return;

    const mp4Videos = currentProduct.videos.filter(v => v.mp4Url);
    if (mp4Videos.length === 0) {
      showToast('Tidak ada video berformat direct MP4 yang dapat diunduh.', 3000);
      return;
    }

    const items = mp4Videos.map((v, idx) => {
      const cleanTitle = (v.title || `video_${idx + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
      return {
        url: v.mp4Url,
        filename: `${currentProduct.asin || 'AMZ'}_video_${idx + 1}_${cleanTitle}.mp4`
      };
    });

    showToast(`Memulai unduhan ${items.length} video MP4...`);

    chrome.runtime.sendMessage({
      action: 'DOWNLOAD_BATCH',
      items: items,
      folder: `AmazonScraper/${currentProduct.asin || 'Product'}/videos`
    }, (res) => {
      if (res && res.success) {
        showToast(`${items.length} video berhasil diantrekan!`);
      } else {
        showToast('Gagal mengunduh video.', 3000);
      }
    });
  });

  // Render Info Tab
  function renderInfoTab(data) {
    infoAvailability.textContent = data.availability || (data.isOutOfStock ? 'Habis (Out of Stock)' : 'Tersedia');
    if (data.isOutOfStock) {
      infoAvailability.className = 'info-value text-danger';
    } else {
      infoAvailability.className = 'info-value text-success';
    }

    infoSeller.textContent = data.seller || 'Amazon';
    infoColor.textContent = data.selectedColor || '-';
    infoSize.textContent = data.selectedSize || '-';

    // Breadcrumbs
    if (data.breadcrumbs && data.breadcrumbs.length > 0) {
      infoBreadcrumbs.textContent = data.breadcrumbs.join('  ›  ');
    } else {
      infoBreadcrumbs.textContent = 'Tidak ada kategori tercantum';
    }

    // Bullets
    infoBulletsList.innerHTML = '';
    if (data.bullets && data.bullets.length > 0) {
      data.bullets.forEach(b => {
        const li = document.createElement('li');
        li.textContent = b;
        infoBulletsList.appendChild(li);
      });
    } else {
      infoBulletsList.innerHTML = '<li style="color:var(--text-muted)">Tidak ada poin fitur.</li>';
    }

    // Specifications
    infoSpecsTable.innerHTML = '';
    const specKeys = Object.keys(data.specifications || {});
    if (specKeys.length > 0) {
      specKeys.forEach(key => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <th>${key}</th>
          <td>${data.specifications[key]}</td>
        `;
        infoSpecsTable.appendChild(tr);
      });
    } else {
      infoSpecsTable.innerHTML = '<tr><td colspan="2" style="color:var(--text-muted);padding:8px">Tidak ada tabel spesifikasi.</td></tr>';
    }

    // Description
    infoDescription.textContent = data.description || 'Tidak ada deskripsi rinci.';
  }

  // Copy ASIN on banner click
  bannerAsinBadge.addEventListener('click', () => {
    if (currentProduct && currentProduct.asin) {
      navigator.clipboard.writeText(currentProduct.asin);
      showToast(`ASIN ${currentProduct.asin} disalin!`);
    }
  });

  // Copy Bullets
  copyBulletsBtn.addEventListener('click', () => {
    if (currentProduct && currentProduct.bullets) {
      const text = currentProduct.bullets.map((b, i) => `${i + 1}. ${b}`).join('\n');
      navigator.clipboard.writeText(text);
      showToast('Poin fitur disalin ke clipboard!');
    }
  });

  // Copy Specs
  copySpecsBtn.addEventListener('click', () => {
    if (currentProduct && currentProduct.specifications) {
      const text = Object.entries(currentProduct.specifications)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');
      navigator.clipboard.writeText(text);
      showToast('Spesifikasi disalin ke clipboard!');
    }
  });

  // Export JSON File
  exportJsonBtn.addEventListener('click', () => {
    if (!currentProduct) return;
    currentProduct.affiliateLink = currentAffiliateLink || currentProduct.affiliateLink || null;
    const jsonStr = JSON.stringify(currentProduct, null, 2);
    const filename = `${currentProduct.asin || 'Amazon'}_data.json`;
    chrome.runtime.sendMessage({
      action: 'EXPORT_TEXT_FILE',
      content: jsonStr,
      filename: filename,
      mimeType: 'application/json',
      folder: `AmazonScraper/${currentProduct.asin || 'Product'}`
    }, (res) => {
      if (res && res.success) showToast(`File JSON diunduh: ${filename}`);
    });
  });

  // Export CSV File
  exportCsvBtn.addEventListener('click', () => {
    if (!currentProduct) return;

    // Build structured CSV
    const rows = [
      ['Atribut', 'Nilai'],
      ['ASIN', currentProduct.asin || ''],
      ['Judul Produk', `"${(currentProduct.title || '').replace(/"/g, '""')}"`],
      ['Brand', `"${(currentProduct.brand || '').replace(/"/g, '""')}"`],
      ['Harga', currentProduct.price || ''],
      ['Harga Normal', currentProduct.listPrice || ''],
      ['Diskon', currentProduct.discount || ''],
      ['Rating', currentProduct.rating || ''],
      ['Jumlah Review', currentProduct.reviewCount || ''],
      ['Stok', currentProduct.availability || ''],
      ['Penjual', `"${(currentProduct.seller || '').replace(/"/g, '""')}"`],
      ['Warna Dipilih', currentProduct.selectedColor || ''],
      ['Ukuran Dipilih', currentProduct.selectedSize || ''],
      ['Kategori', `"${(currentProduct.breadcrumbs || []).join(' > ').replace(/"/g, '""')}"`],
      ['URL Produk', currentProduct.url || ''],
      ['Link Affiliate', currentAffiliateLink || currentProduct.affiliateLink || ''],
      ['Jumlah Gambar', (currentProduct.images || []).length],
      ['Jumlah Video', (currentProduct.videos || []).length],
      ['Fitur Produk (Bullets)', `"${(currentProduct.bullets || []).join('\n').replace(/"/g, '""')}"`],
      ['Deskripsi', `"${(currentProduct.description || '').replace(/"/g, '""')}"`]
    ];

    // Add Specs
    if (currentProduct.specifications) {
      Object.entries(currentProduct.specifications).forEach(([k, v]) => {
        rows.push([`Spec: ${k}`, `"${(v || '').replace(/"/g, '""')}"`]);
      });
    }

    // Add Image URLs
    if (currentProduct.images) {
      currentProduct.images.forEach((img, i) => {
        rows.push([`Gambar #${i + 1} (${img.variant})`, img.url]);
      });
    }

    // Add Video URLs
    if (currentProduct.videos) {
      currentProduct.videos.forEach((v, i) => {
        rows.push([`Video #${i + 1} (${v.title})`, v.mp4Url || v.hlsUrl || '']);
      });
    }

    const csvContent = '\uFEFF' + rows.map(r => r.join(',')).join('\n');
    const filename = `${currentProduct.asin || 'Amazon'}_data.csv`;

    chrome.runtime.sendMessage({
      action: 'EXPORT_TEXT_FILE',
      content: csvContent,
      filename: filename,
      mimeType: 'text/csv',
      folder: `AmazonScraper/${currentProduct.asin || 'Product'}`
    }, (res) => {
      if (res && res.success) showToast(`File CSV diunduh: ${filename}`);
    });
  });

  // Copy Summary to Clipboard
  copyAllBtn.addEventListener('click', () => {
    if (!currentProduct) return;
    const summary = `
📦 PRODUK AMAZON
================================
ASIN: ${currentProduct.asin}
Judul: ${currentProduct.title}
Brand: ${currentProduct.brand}
Harga: ${currentProduct.price} (Diskon: ${currentProduct.discount || '0%'}, Normal: ${currentProduct.listPrice || '-'})
Rating: ${currentProduct.rating} ${currentProduct.reviewCount ? `(${currentProduct.reviewCount})` : ''}
Ketersediaan: ${currentProduct.availability}
Penjual: ${currentProduct.seller}
Kategori: ${(currentProduct.breadcrumbs || []).join(' > ')}
URL: ${currentProduct.url}
🔗 LINK AFFILIATE: ${currentAffiliateLink || currentProduct.affiliateLink || '-'}

📌 FITUR UTAMA:
${(currentProduct.bullets || []).map((b, i) => `• ${b}`).join('\n')}

🖼️ GAMBAR (${(currentProduct.images || []).length} items):
${(currentProduct.images || []).map((img, i) => `[${i + 1}] ${img.url}`).join('\n')}

🎥 VIDEO (${(currentProduct.videos || []).length} items):
${(currentProduct.videos || []).map((v, i) => `[${i + 1}] ${v.title} -> ${v.mp4Url || v.hlsUrl}`).join('\n')}
    `.trim();

    navigator.clipboard.writeText(summary);
    showToast('Ringkasan lengkap disalin ke clipboard!');
  });

  // Copy Raw JSON
  copyRawJsonBtn.addEventListener('click', () => {
    if (currentProduct) {
      navigator.clipboard.writeText(JSON.stringify(currentProduct, null, 2));
      showToast('Raw JSON disalin ke clipboard!');
    }
  });

  // --- Threads Agent Vault API Integration Logic ---
  function updateApiBadge(text, className) {
    if (apiStatusBadge) {
      apiStatusBadge.textContent = text;
      apiStatusBadge.className = `badge-pill ${className}`;
    }
  }

  function updateEnvToggle(url) {
    if (!btnEnvProd || !btnEnvLocal) return;
    if (url && (url.includes('localhost') || url.includes('127.0.0.1'))) {
      btnEnvLocal.classList.add('active');
      btnEnvProd.classList.remove('active');
    } else {
      btnEnvProd.classList.add('active');
      btnEnvLocal.classList.remove('active');
    }
  }

  // Load saved API settings from chrome.storage (Default to deployed Vercel Cloud)
  chrome.storage.local.get(['amazonScraperApiEndpoint', 'amazonScraperApiKey'], (result) => {
    let endpoint = result.amazonScraperApiEndpoint;
    if (!endpoint || endpoint.includes('localhost') || endpoint.includes('127.0.0.1')) {
      endpoint = PROD_API_URL;
      chrome.storage.local.set({ amazonScraperApiEndpoint: PROD_API_URL });
    }
    const apiKey = result.amazonScraperApiKey || DEFAULT_API_KEY;

    apiEndpointInput.value = endpoint;
    apiKeyInput.value = apiKey;
    updateEnvToggle(endpoint);
    updateApiBadge('Siap', 'badge-api-connected');
  });

  // Prod & Local environment quick buttons
  if (btnEnvProd) {
    btnEnvProd.addEventListener('click', () => {
      apiEndpointInput.value = PROD_API_URL;
      updateEnvToggle(PROD_API_URL);
      chrome.storage.local.set({ amazonScraperApiEndpoint: PROD_API_URL });
      checkUniversalServerStatus(PROD_API_URL);
      showToast('Beralih ke Endpoint Vercel (Prod)');
    });
  }

  if (btnEnvLocal) {
    btnEnvLocal.addEventListener('click', () => {
      apiEndpointInput.value = LOCAL_API_URL;
      updateEnvToggle(LOCAL_API_URL);
      chrome.storage.local.set({ amazonScraperApiEndpoint: LOCAL_API_URL });
      checkUniversalServerStatus(LOCAL_API_URL);
      showToast('Beralih ke Endpoint Localhost (3000)');
    });
  }

  // Auto-save API settings on manual input
  apiEndpointInput.addEventListener('change', () => {
    const endpoint = apiEndpointInput.value.trim() || PROD_API_URL;
    chrome.storage.local.set({ amazonScraperApiEndpoint: endpoint });
    updateEnvToggle(endpoint);
    updateApiBadge('Siap', 'badge-api-connected');
  });

  apiKeyInput.addEventListener('change', () => {
    chrome.storage.local.set({ amazonScraperApiKey: apiKeyInput.value.trim() });
  });

  // Test API Connection button
  testApiBtn.addEventListener('click', () => {
    const endpoint = apiEndpointInput.value.trim() || PROD_API_URL;
    const apiKey = apiKeyInput.value.trim() || DEFAULT_API_KEY;

    testApiBtn.disabled = true;
    testApiBtn.textContent = '...';
    apiResultStatus.textContent = 'Menguji koneksi ke server...';
    apiResultStatus.className = 'api-status-msg';

    chrome.runtime.sendMessage({
      action: 'TEST_API_CONNECTION',
      endpoint,
      apiKey
    }, (res) => {
      testApiBtn.disabled = false;
      testApiBtn.textContent = 'Test';

      if (res && res.success) {
        updateApiBadge('Terkoneksi', 'badge-api-connected');
        apiResultStatus.textContent = `✅ Server aktif (HTTP ${res.status || 200})`;
        apiResultStatus.className = 'api-status-msg success';
        showToast('Koneksi ke API berhasil!');
      } else {
        updateApiBadge('Error', 'badge-api-error');
        const errText = res?.error || `Gagal terhubung (${res?.status || 'Offline'})`;
        apiResultStatus.textContent = `❌ ${errText}`;
        apiResultStatus.className = 'api-status-msg error';
        showToast(`Gagal: ${errText}`, 3500);
      }
    });
  });

  // Send Data to API button
  sendToApiBtn.addEventListener('click', () => {
    if (!currentProduct) {
      showToast('Data produk belum siap dikirim.', 3000);
      return;
    }

    const endpoint = apiEndpointInput.value.trim() || PROD_API_URL;
    const apiKey = apiKeyInput.value.trim() || DEFAULT_API_KEY;

    // Persist latest settings
    chrome.storage.local.set({
      amazonScraperApiEndpoint: endpoint,
      amazonScraperApiKey: apiKey
    });

    // Make sure latest affiliate link is synced
    currentProduct.affiliateLink = currentAffiliateLink || currentProduct.affiliateLink || '';

    // Filter images based on user selection in Tab Gambar (if any selected)
    let imagesToSend = currentProduct.images || [];
    if (selectedImages && selectedImages.size > 0) {
      const subset = imagesToSend.filter(img => selectedImages.has(img.url));
      if (subset.length > 0) imagesToSend = subset;
    }

    const payloadData = {
      ...currentProduct,
      images: imagesToSend,
      creatorNotes: creatorNotesInput ? creatorNotesInput.value.trim() : ''
    };

    sendToApiBtn.disabled = true;
    sendToApiBtnText.textContent = 'Menyimpan...';
    apiResultStatus.textContent = 'Mengirim ke Agent Knowledge Vault...';
    apiResultStatus.className = 'api-status-msg';

    chrome.runtime.sendMessage({
      action: 'EXPORT_TO_API',
      endpoint,
      apiKey,
      data: payloadData
    }, (res) => {
      sendToApiBtn.disabled = false;
      sendToApiBtnText.textContent = '🚀 Simpan ke Knowledge Vault';

      if (res && res.success) {
        updateApiBadge('Tersimpan', 'badge-api-connected');
        const rehostedInfo = res.data?.rehostedImages
          ? ` (${res.data.rehostedImages} foto, ${res.data.rehostedVideos || 0} video)`
          : '';
        apiResultStatus.textContent = `✅ Saved to Creator Vault!${rehostedInfo}`;
        apiResultStatus.className = 'api-status-msg success';
        showToast('Saved to Creator Vault!', 3500);
      } else {
        updateApiBadge('Gagal', 'badge-api-error');
        const errText = res?.error || `Gagal menyimpan data (HTTP ${res?.status || 'Error'})`;
        apiResultStatus.textContent = `❌ ${errText}`;
        apiResultStatus.className = 'api-status-msg error';
        showToast(`Gagal: ${errText}`, 4000);
      }
    });
  });

  // Refresh Button
  refreshBtn.addEventListener('click', () => {
    init();
  });

  // Start initialization
  init();
});
