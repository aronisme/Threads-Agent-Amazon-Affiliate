/**
 * Universal Video Sniffer & In-Page Overlay Export - Content Script for All Webpages (<all_urls>)
 * 1. Automatically places a floating "🚀 Export ke Stok" button in the top-right corner of every web video.
 * 2. Accurately extracts high-res video thumbnails/posters from social media DOMs (Threads, TikTok, Twitter/X, Reddit, Instagram, etc.).
 * 3. Provides detected video details to the extension popup.
 */

(function () {
  if (window.__videoSnifferInjected) {
    // If already injected, re-trigger button attachment for dynamic DOM
    if (typeof window.__amzAttachOverlayButtons === 'function') {
      window.__amzAttachOverlayButtons();
    }
    return;
  }
  window.__videoSnifferInjected = true;

  function cleanString(str) {
    if (!str) return '';
    return str.replace(/\s+/g, ' ').trim();
  }

  function resolveFullUrl(url) {
    if (!url) return '';
    try {
      return new URL(url, window.location.href).href;
    } catch {
      return url;
    }
  }

  // Floating In-Page Notification Toast
  function showInPageNotification(message, type = 'info') {
    let toast = document.getElementById('amz-inpage-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'amz-inpage-toast';
      document.body.appendChild(toast);
    }
    const bg =
      type === 'success'
        ? 'linear-gradient(135deg, #059669, #10b981)'
        : type === 'error'
        ? 'linear-gradient(135deg, #dc2626, #ef4444)'
        : 'linear-gradient(135deg, #4f46e5, #7c3aed)';

    toast.style.cssText = `
      position: fixed !important;
      top: 24px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      background: ${bg} !important;
      color: #ffffff !important;
      padding: 10px 18px !important;
      border-radius: 30px !important;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5) !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      z-index: 2147483647 !important;
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      border: 1px solid rgba(255, 255, 255, 0.3) !important;
      backdrop-filter: blur(10px) !important;
      -webkit-backdrop-filter: blur(10px) !important;
      opacity: 1 !important;
      transition: opacity 0.3s ease, transform 0.3s ease !important;
      pointer-events: none !important;
    `;
    toast.textContent = message;

    if (window.__amzToastTimer) clearTimeout(window.__amzToastTimer);
    window.__amzToastTimer = setTimeout(() => {
      if (toast) toast.style.opacity = '0';
    }, 4000);
  }

  // Multi-stage Smart Thumbnail Extractor
  function extractVideoPoster(vid) {
    if (!vid) return '';

    // 1. Direct poster attribute on <video>
    let poster =
      vid.poster ||
      vid.getAttribute('poster') ||
      vid.getAttribute('data-poster') ||
      vid.getAttribute('data-thumb') ||
      vid.getAttribute('thumbnail') ||
      '';
    if (poster) return resolveFullUrl(poster);

    // 2. Reddit <shreddit-player> attributes
    const shreddit = vid.closest('shreddit-player');
    if (shreddit) {
      const shPoster = shreddit.getAttribute('poster') || shreddit.getAttribute('preview');
      if (shPoster) return resolveFullUrl(shPoster);
    }

    // 3. Look inside immediate video wrapper / parent container
    const container = vid.parentElement;
    if (container) {
      const directImgs = Array.from(container.querySelectorAll('img'));
      for (const img of directImgs) {
        const src = img.currentSrc || img.src || img.getAttribute('data-src') || '';
        if (
          src &&
          !src.startsWith('data:image/svg') &&
          !src.includes('avatar') &&
          !src.includes('profile') &&
          !src.includes('emoji')
        ) {
          return resolveFullUrl(src);
        }
      }

      // Check background-image on container
      try {
        const bg = window.getComputedStyle(container).backgroundImage;
        if (bg && bg.startsWith('url(')) {
          const cleanBg = bg.replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '');
          if (cleanBg && !cleanBg.startsWith('data:')) return resolveFullUrl(cleanBg);
        }
      } catch (e) {}
    }

    // 4. Look inside broader Post/Card Context (Threads, Twitter, Reddit, TikTok, Instagram)
    const post = vid.closest(
      'article, [role="article"], [data-pressable-container="true"], [data-testid="post-container"], [data-testid="tweet"], .post, .feed-item'
    );
    if (post) {
      const postImgs = Array.from(post.querySelectorAll('img'));
      for (const img of postImgs) {
        const src = img.currentSrc || img.src || img.getAttribute('data-src') || '';
        if (
          !src ||
          src.startsWith('data:image/svg') ||
          src.includes('avatar') ||
          src.includes('profile') ||
          src.includes('emoji') ||
          src.includes('icon')
        ) {
          continue;
        }

        // Prioritize known media CDN URLs
        const isMediaCdn =
          src.includes('cdninstagram.com') ||
          src.includes('twimg.com/media') ||
          src.includes('ext_tw_video_thumb') ||
          src.includes('tiktokcdn') ||
          src.includes('redd.it') ||
          src.includes('cloudinary');

        const isLarge = (img.naturalWidth > 100 && img.naturalHeight > 100) || img.clientWidth > 100;
        if (isMediaCdn || isLarge) {
          return resolveFullUrl(src);
        }
      }
    }

    // 5. Canvas frame capture (if video has active dimensions & allows export)
    if (vid.videoWidth > 0 && vid.videoHeight > 0) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(vid.videoWidth, 360);
        canvas.height = Math.round((canvas.width / vid.videoWidth) * vid.videoHeight);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
        if (dataUrl && dataUrl.startsWith('data:image/jpeg') && dataUrl.length > 300) {
          return dataUrl;
        }
      } catch (corsErr) {
        // Tainted canvas fallback safely ignored
      }
    }

    // 6. If it's a Cloudinary video, auto-generate JPG thumbnail
    const vSrc = vid.currentSrc || vid.src || '';
    if (vSrc && vSrc.includes('res.cloudinary.com')) {
      return vSrc.replace(/\/upload\//i, '/upload/so_1/').replace(/\.mp4$/i, '.jpg');
    }

    return '';
  }

  // Extract contextual title for a video
  function extractVideoTitle(vid, index) {
    const postContext = vid.closest(
      'article, [role="article"], [data-pressable-container="true"], [data-testid="post-container"], [data-testid="tweet"], .post, .feed-item'
    );
    const contextHeading = postContext
      ? postContext.querySelector('h1, h2, h3, [slot="title"], [data-testid="post-comment-header"]')
      : null;

    const title =
      vid.getAttribute('title') ||
      vid.getAttribute('aria-label') ||
      (contextHeading ? cleanString(contextHeading.innerText) : '') ||
      (postContext ? cleanString(postContext.innerText).substring(0, 75) : '') ||
      document.title ||
      `Video #${index + 1}`;

    return cleanString(title);
  }

  // --- VIRAL STOCK VIDEO RULES ---
  // Threads viral clips & hooks are limited to maximum 90 seconds (1.5 minutes)
  const MAX_ALLOWED_DURATION_SECONDS = 90;

  // --- STREAMING / BLOB REAL VIDEO RESOLVERS ---
  // Resolves direct stream/MP4 URLs from MediaSource blob: streams (RedNote/Xiaohongshu, TikTok, Instagram, Twitter, etc.)

  // 1. Extract from RedNote / Xiaohongshu JSON state and script tags
  function extractRedNoteVideoUrl() {
    try {
      const scripts = Array.from(document.querySelectorAll('script'));
      for (const s of scripts) {
        const text = s.textContent || '';
        if (!text) continue;

        // Direct xhscdn / sns-video MP4 match
        const matchCdn = text.match(/https?:\/\/[a-zA-Z0-9-.]*(?:xhscdn\.com|xiaohongshu\.com)[^\s"'\\]*\.mp4[^\s"'\\]*/i) ||
                         text.match(/https?:\/\/[a-zA-Z0-9-.]*sns-video[^\s"'\\]*\.mp4[^\s"'\\]*/i);
        if (matchCdn) {
          let u = matchCdn[0].replace(/\\u002F/gi, '/').replace(/\\/g, '');
          if (u.startsWith('http')) return u;
        }

        // Match "masterUrl" or "backupUrl" in __INITIAL_STATE__
        const matchMaster = text.match(/"masterUrl"\s*:\s*"([^"]+)"/i) ||
                            text.match(/"backupUrl"\s*:\s*\[\s*"([^"]+)"/i);
        if (matchMaster && matchMaster[1]) {
          let u = matchMaster[1].replace(/\\u002F/gi, '/').replace(/\\/g, '');
          if (u.startsWith('http')) return u;
          if (u.includes('.mp4') || u.includes('stream')) {
            return `https://sns-video-bd.xhscdn.com/${u.replace(/^\/+/, '')}`;
          }
        }
      }
    } catch (e) {}
    return '';
  }

  // 2. Extract from standard DOM Meta tags & Preloads
  function extractMetaVideoUrl() {
    try {
      const selectors = [
        'meta[property="og:video"]',
        'meta[property="og:video:url"]',
        'meta[property="og:video:secure_url"]',
        'meta[name="twitter:player:stream"]',
        'link[rel="preload"][as="video"]',
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        const content = el?.getAttribute('content') || el?.getAttribute('href') || '';
        if (content && content.startsWith('http') && !content.startsWith('blob:') && !content.includes('.m3u8')) {
          return content;
        }
      }
    } catch (e) {}
    return '';
  }

  // 3. Extract from window.performance resource timing entries
  function extractPerformanceVideoUrl() {
    try {
      const entries = window.performance.getEntriesByType('resource') || [];
      // Search most recent requests first
      for (let i = entries.length - 1; i >= 0; i--) {
        const name = entries[i].name || '';
        if (!name || name.startsWith('blob:') || name.startsWith('data:')) continue;

        // Known media CDNs
        if (name.includes('xhscdn.com') && (name.includes('.mp4') || name.includes('sns-video'))) {
          return name;
        }
        if ((name.includes('tiktokcdn.com') || name.includes('byteoversea.com')) && name.includes('.mp4')) {
          return name;
        }
        if ((name.includes('cdninstagram.com') || name.includes('fbcdn.net')) && name.includes('.mp4')) {
          return name;
        }
        if (name.includes('twimg.com') && name.includes('.mp4')) {
          return name;
        }
        if (name.includes('v.redd.it') && name.includes('.mp4')) {
          return name;
        }
        if (name.match(/\.(mp4|webm|mov)(\?.*)?$/i)) {
          return name;
        }
        if (entries[i].initiatorType === 'media' && !name.includes('.m3u8')) {
          return name;
        }
      }
    } catch (e) {}
    return '';
  }

  // 4. Ask background worker for media intercepted via chrome.webRequest
  function askBackgroundForSniffedMedia() {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ action: 'GET_TAB_SNIFFED_VIDEOS' }, (res) => {
          if (res && res.success && Array.isArray(res.videos) && res.videos.length > 0) {
            resolve(res.videos[res.videos.length - 1]);
          } else {
            resolve('');
          }
        });
      } catch (e) {
        resolve('');
      }
    });
  }

  // 5. Scan generic script tags for MP4 URLs
  function scanScriptsForVideoUrl() {
    try {
      const scripts = Array.from(document.querySelectorAll('script'));
      for (const s of scripts) {
        const text = s.textContent || '';
        if (!text || text.length > 500000) continue;
        const match = text.match(/https?:\/\/[a-zA-Z0-9-.]+\/[^\s"'\\]+\.mp4(?:\?[^\s"'\\]*)?/i);
        if (match) {
          let u = match[0].replace(/\\u002F/gi, '/').replace(/\\/g, '');
          if (u.startsWith('http')) return u;
        }
      }
    } catch (e) {}
    return '';
  }

  // Comprehensive Real Video URL Resolver
  async function resolveRealVideoUrl(vid) {
    let directUrl = vid.currentSrc || vid.src || '';
    if (!directUrl) {
      const s = vid.querySelector('source');
      if (s) directUrl = s.getAttribute('src') || '';
    }
    if (!directUrl) {
      directUrl = vid.getAttribute('data-src') || vid.getAttribute('data-video-url') || '';
    }
    directUrl = resolveFullUrl(directUrl);

    // If it is already a direct HTTP MP4/media URL, return it directly!
    if (directUrl && !directUrl.startsWith('blob:')) {
      return directUrl;
    }

    // It is a blob: URL or empty! Resolve using layered extraction:
    const rednoteUrl = extractRedNoteVideoUrl();
    if (rednoteUrl) return rednoteUrl;

    const metaUrl = extractMetaVideoUrl();
    if (metaUrl) return metaUrl;

    const perfUrl = extractPerformanceVideoUrl();
    if (perfUrl) return perfUrl;

    const bgUrl = await askBackgroundForSniffedMedia();
    if (bgUrl) return bgUrl;

    const scriptUrl = scanScriptsForVideoUrl();
    if (scriptUrl) return scriptUrl;

    return directUrl;
  }

  // Full scan for extension popup
  function detectVideos() {
    const foundVideos = [];
    const seenUrls = new Set();

    // 1. Scan standard HTML5 <video> elements
    const videoElements = Array.from(document.querySelectorAll('video'));
    videoElements.forEach((vid, index) => {
      let candidateUrl = vid.currentSrc || vid.src || '';

      if (!candidateUrl) {
        const sources = Array.from(vid.querySelectorAll('source'));
        for (const s of sources) {
          const sSrc = s.getAttribute('src');
          if (sSrc) {
            candidateUrl = sSrc;
            break;
          }
        }
      }

      if (!candidateUrl) {
        candidateUrl =
          vid.getAttribute('data-src') ||
          vid.getAttribute('data-video-url') ||
          vid.getAttribute('data-url') ||
          '';
      }

      candidateUrl = resolveFullUrl(candidateUrl);

      // If blob, attempt resolving from page metadata or performance entries
      if (!candidateUrl || candidateUrl.startsWith('blob:')) {
        const resolved = extractRedNoteVideoUrl() || extractMetaVideoUrl() || extractPerformanceVideoUrl() || scanScriptsForVideoUrl();
        if (resolved) candidateUrl = resolved;
      }

      if (candidateUrl && !seenUrls.has(candidateUrl) && !candidateUrl.startsWith('blob:')) {
        seenUrls.add(candidateUrl);

        const title = extractVideoTitle(vid, index);
        const poster = extractVideoPoster(vid);
        const dur = vid.duration && !isNaN(vid.duration) ? Math.round(vid.duration) : null;

        foundVideos.push({
          url: candidateUrl,
          title: title.substring(0, 100),
          poster: poster,
          duration: dur,
          isTooLong: dur ? dur > MAX_ALLOWED_DURATION_SECONDS : false,
          width: vid.videoWidth || null,
          height: vid.videoHeight || null,
          pageTitle: document.title,
          sourcePage: window.location.href,
        });
      }
    });

    // 2. Scan Reddit <shreddit-player> components
    const shredditPlayers = Array.from(document.querySelectorAll('shreddit-player'));
    shredditPlayers.forEach((sp, idx) => {
      const spUrl = resolveFullUrl(sp.getAttribute('src') || sp.getAttribute('stream-url') || '');
      const spPoster = resolveFullUrl(sp.getAttribute('poster') || sp.getAttribute('preview') || '');
      if (spUrl && !seenUrls.has(spUrl) && !spUrl.startsWith('blob:')) {
        seenUrls.add(spUrl);
        const parentPost = sp.closest('article, [data-testid="post-container"]');
        const postHeading = parentPost ? parentPost.querySelector('h1, h2, h3, [slot="title"]') : null;
        foundVideos.push({
          url: spUrl,
          title: cleanString(postHeading?.innerText || document.title || `Reddit Video #${idx + 1}`).substring(0, 100),
          poster: spPoster,
          duration: null,
          width: null,
          height: null,
          pageTitle: document.title,
          sourcePage: window.location.href,
        });
      }
    });

    // 3. Scan direct links to media files
    const mediaLinks = Array.from(
      document.querySelectorAll('a[href$=".mp4"], a[href$=".mov"], a[href$=".webm"]')
    );
    mediaLinks.forEach((a, idx) => {
      const fullUrl = resolveFullUrl(a.getAttribute('href'));
      if (fullUrl && !seenUrls.has(fullUrl)) {
        seenUrls.add(fullUrl);
        foundVideos.push({
          url: fullUrl,
          title: cleanString(a.innerText || a.getAttribute('title') || document.title || `Media Link #${idx + 1}`).substring(0, 100),
          poster: '',
          duration: null,
          width: null,
          height: null,
          pageTitle: document.title,
          sourcePage: window.location.href,
        });
      }
    });

    return foundVideos;
  }

  // Anti-Duplication Cache
  const exportedUrlsCache = new Set();

  function loadExportedUrls() {
    try {
      chrome.storage.local.get(['amzExportedVideoUrls'], (res) => {
        if (res && Array.isArray(res.amzExportedVideoUrls)) {
          res.amzExportedVideoUrls.forEach((u) => {
            if (u) exportedUrlsCache.add(u.toLowerCase());
          });
          updateInPageButtonsState();
        }
      });
    } catch (e) {}
  }

  function markUrlAsExported(url, sourceUrl) {
    if (url) {
      exportedUrlsCache.add(url.toLowerCase());
      const pathOnly = url.split('?')[0];
      if (pathOnly && pathOnly.length > 20) exportedUrlsCache.add(pathOnly.toLowerCase());
    }
    if (sourceUrl) {
      exportedUrlsCache.add(sourceUrl.toLowerCase());
    }
    try {
      chrome.storage.local.get(['amzExportedVideoUrls'], (res) => {
        const list = Array.isArray(res.amzExportedVideoUrls) ? res.amzExportedVideoUrls : [];
        if (url && !list.includes(url)) list.push(url);
        const pathOnly = url ? url.split('?')[0] : '';
        if (pathOnly && pathOnly.length > 20 && !list.includes(pathOnly)) list.push(pathOnly);
        if (sourceUrl && !list.includes(sourceUrl)) list.push(sourceUrl);
        if (list.length > 600) list.splice(0, list.length - 600);
        chrome.storage.local.set({ amzExportedVideoUrls: list });
      });
    } catch (e) {}
  }

  function isVideoAlreadyExported(videoUrl, pageUrl) {
    if (!videoUrl) return false;
    const vLower = videoUrl.toLowerCase();
    if (exportedUrlsCache.has(vLower)) return true;
    const pathOnly = vLower.split('?')[0];
    if (pathOnly && pathOnly.length > 20 && exportedUrlsCache.has(pathOnly)) return true;
    if (pageUrl && exportedUrlsCache.has(pageUrl.toLowerCase())) return true;
    return false;
  }

  function updateInPageButtonsState() {
    document.querySelectorAll('.amz-video-overlay-btn').forEach((btn) => {
      const vUrl = btn.dataset.videoUrl;
      if (vUrl && isVideoAlreadyExported(vUrl, window.location.href)) {
        btn.innerHTML = `<span>✅</span> <span class="amz-btn-text" style="font-weight: 700; font-size: 11px;">Sudah di Stok</span>`;
        btn.style.background = 'rgba(5, 150, 105, 0.9) !important';
        btn.style.borderColor = 'rgba(52, 211, 153, 0.6) !important';
      }
    });
  }

  // Listen for storage changes across tabs/popups
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.amzExportedVideoUrls) {
        loadExportedUrls();
      }
    });
  } catch (e) {}

  loadExportedUrls();

  // --- IN-PAGE FLOATING EXPORT BUTTON IN TOP CORNER OF VIDEOS ---
  function attachInPageExportButton(vid, index) {
    if (!vid) return;

    // Avoid attaching multiple times
    if (vid.dataset.amzExportAttached === 'true') return;

    // Find the visible player container
    let container = vid.parentElement;
    if (!container) return;

    // If container is an inline wrapper or too small, step up to the visual container
    if (container.clientWidth < 80 && container.parentElement) {
      container = container.parentElement;
    }

    // Check if container already has our button
    if (container.querySelector('.amz-video-overlay-btn')) return;

    // Ensure container is positioned so absolute positioning works
    const computedPos = window.getComputedStyle(container).position;
    if (computedPos === 'static') {
      container.style.position = 'relative';
    }

    vid.dataset.amzExportAttached = 'true';

    let initialUrl = vid.currentSrc || vid.src || '';
    if (!initialUrl) {
      const s = vid.querySelector('source');
      if (s) initialUrl = s.getAttribute('src') || '';
    }
    initialUrl = resolveFullUrl(initialUrl);

    const alreadyExported = isVideoAlreadyExported(initialUrl, window.location.href);

    // Create the floating button
    const btn = document.createElement('button');
    btn.className = 'amz-video-overlay-btn';
    btn.type = 'button';
    btn.dataset.videoUrl = initialUrl || '';
    btn.setAttribute('title', alreadyExported ? 'Video ini sudah tersimpan di Stok Media Vercel' : 'Export video ini langsung ke Stok Media & AI Vision (Vercel Cloud)');

    const updateButtonVisual = () => {
      const isExp = isVideoAlreadyExported(btn.dataset.videoUrl || initialUrl, window.location.href);
      const curDur = vid.duration && !isNaN(vid.duration) ? Math.round(vid.duration) : null;
      const isTooLong = curDur && curDur > MAX_ALLOWED_DURATION_SECONDS;

      if (isExp) {
        btn.innerHTML = `
          <span style="font-size: 13px; line-height: 1;">✅</span>
          <span class="amz-btn-text" style="font-weight: 700; font-size: 11px; letter-spacing: 0.3px;">Sudah di Stok</span>
        `;
        btn.style.background = 'rgba(5, 150, 105, 0.95)';
        btn.style.borderColor = 'rgba(52, 211, 153, 0.6)';
        btn.setAttribute('title', 'Video ini sudah tersimpan di Stok Media Vercel');
      } else if (isTooLong) {
        btn.innerHTML = `
          <span style="font-size: 13px; line-height: 1;">⚠️</span>
          <span class="amz-btn-text" style="font-weight: 700; font-size: 11px; letter-spacing: 0.3px;">Terlalu Panjang (${curDur}s)</span>
        `;
        btn.style.background = 'rgba(180, 83, 9, 0.95)';
        btn.style.borderColor = 'rgba(245, 158, 11, 0.6)';
        btn.setAttribute('title', `Video berdurasi ${curDur}s (> 90 detik). Stok media viral dibatasi maksimal 90 detik.`);
      } else {
        btn.innerHTML = `
          <span style="font-size: 13px; line-height: 1;">🚀</span>
          <span class="amz-btn-text" style="font-weight: 700; font-size: 11px; letter-spacing: 0.3px;">Export ke Stok</span>
        `;
        btn.style.background = 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)';
        btn.style.borderColor = 'rgba(255, 255, 255, 0.4)';
        btn.setAttribute('title', 'Export video ini langsung ke Stok Media & AI Vision (Vercel Cloud)');
      }
    };

    updateButtonVisual();
    vid.addEventListener('loadedmetadata', updateButtonVisual);
    vid.addEventListener('durationchange', updateButtonVisual);

    btn.style.cssText = `
      position: absolute !important;
      top: 10px !important;
      right: 10px !important;
      z-index: 2147483647 !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
      color: #ffffff !important;
      border: 1px solid rgba(255, 255, 255, 0.4) !important;
      padding: 6px 12px !important;
      border-radius: 20px !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      font-size: 11px !important;
      cursor: pointer !important;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.45) !important;
      backdrop-filter: blur(8px) !important;
      -webkit-backdrop-filter: blur(8px) !important;
      opacity: 0.92 !important;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
      pointer-events: auto !important;
      user-select: none !important;
    `;

    btn.addEventListener('mouseenter', () => {
      btn.style.opacity = '1.0';
      btn.style.transform = 'scale(1.05)';
      btn.style.boxShadow = '0 6px 20px rgba(124, 58, 237, 0.65)';
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.opacity = '0.92';
      btn.style.transform = 'scale(1.0)';
      btn.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.45)';
    });

    // Handle 1-Click Export from Page (With Duration Filter & Blob Stream Resolving)
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();

      // 0. Duration Guard: Block videos that are too long (> 90 seconds)
      const currentDuration = vid.duration && !isNaN(vid.duration) ? Math.round(vid.duration) : null;
      if (currentDuration && currentDuration > MAX_ALLOWED_DURATION_SECONDS) {
        showInPageNotification(`⚠️ Video terlalu panjang (${currentDuration} detik / > 1.5 menit). Stok Media Viral dibatasi maksimal 90 detik agar kuota hemat & performa Threads optimal.`, 'error');
        return;
      }

      let videoUrl = vid.currentSrc || vid.src || '';
      if (!videoUrl) {
        const s = vid.querySelector('source');
        if (s) videoUrl = s.getAttribute('src') || '';
      }
      if (!videoUrl) {
        videoUrl = vid.getAttribute('data-src') || vid.getAttribute('data-video-url') || '';
      }
      videoUrl = resolveFullUrl(videoUrl);

      // 1. Client-side Anti-Duplicate Guard
      if (isVideoAlreadyExported(videoUrl, window.location.href)) {
        showInPageNotification('ℹ️ Video ini sudah ada di Stok Media Vercel Anda! (Hemat kuota & AI)', 'info');
        btn.innerHTML = `<span>✅</span> <span style="font-weight:700;font-size:11px;">Sudah di Stok</span>`;
        btn.style.background = 'rgba(5, 150, 105, 0.9)';
        btn.style.borderColor = 'rgba(52, 211, 153, 0.6)';
        return;
      }

      // 2. If video is a MediaSource blob: or empty, resolve the actual direct stream URL!
      if (!videoUrl || videoUrl.startsWith('blob:')) {
        showInPageNotification('🔍 Mendeteksi direct stream URL video...', 'info');
        const resolved = await resolveRealVideoUrl(vid);
        if (resolved && !resolved.startsWith('blob:')) {
          videoUrl = resolved;
        }
      }

      if (!videoUrl || videoUrl.startsWith('blob:')) {
        showInPageNotification('⚠️ URL video belum siap atau terlindungi enkripsi DRM streaming. Coba putar video 1-2 detik lalu klik lagi.', 'error');
        return;
      }

      btn.dataset.videoUrl = videoUrl;

      // Re-check anti-duplicate with the resolved stream URL
      if (isVideoAlreadyExported(videoUrl, window.location.href)) {
        showInPageNotification('ℹ️ Video ini sudah ada di Stok Media Vercel Anda! (Hemat kuota & AI)', 'info');
        btn.innerHTML = `<span>✅</span> <span style="font-weight:700;font-size:11px;">Sudah di Stok</span>`;
        btn.style.background = 'rgba(5, 150, 105, 0.9)';
        btn.style.borderColor = 'rgba(52, 211, 153, 0.6)';
        return;
      }

      const title = extractVideoTitle(vid, index);
      const poster = extractVideoPoster(vid);

      btn.disabled = true;
      btn.innerHTML = `
        <span style="display:inline-block;animation:amz-spin 1s linear infinite;">⏳</span>
        <span style="font-weight:700;font-size:11px;">Menyimpan...</span>
      `;
      btn.style.background = '#374151';

      showInPageNotification('⏳ Mengirim video ke Stok Media & AI Vision (Vercel)...', 'info');

      chrome.runtime.sendMessage({
        action: 'EXPORT_VIDEO_TO_MEDIA_STOCK',
        videoUrl: videoUrl,
        title: title,
        sourceUrl: window.location.href,
        thumbnailUrl: poster,
        duration: currentDuration,
        category: 'AUTO',
        notes: `Exported via In-Page Overlay Button from ${window.location.href}`,
      }, (res) => {
        btn.disabled = false;
        if (res && res.success) {
          // Cache URL immediately so it will never be duplicated
          markUrlAsExported(videoUrl, window.location.href);

          btn.innerHTML = `<span>✅</span> <span style="font-weight:700;font-size:11px;">Sudah di Stok</span>`;
          btn.style.background = 'rgba(5, 150, 105, 0.9)';
          btn.style.borderColor = 'rgba(52, 211, 153, 0.6)';

          if (res.isDuplicate) {
            showInPageNotification(`ℹ️ Video ini sudah ada di Stok Media sebelumnya ("${res.title || 'Viral'}"). Otomatis dicegah duplikasi (hemat kuota & AI)!`, 'info');
          } else {
            showInPageNotification(`✅ Video "${res.title || 'Viral'}" ${currentDuration ? `(${currentDuration}s)` : ''} berhasil masuk Stok Media Vercel!`, 'success');
          }
        } else {
          btn.innerHTML = `<span>❌</span> <span style="font-weight:700;font-size:11px;">Gagal</span>`;
          btn.style.background = '#dc2626';
          showInPageNotification(`❌ Gagal: ${res?.error || 'Koneksi gagal'}`, 'error');
          setTimeout(() => {
            updateButtonVisual();
          }, 4500);
        }
      });
    });

    container.appendChild(btn);
  }

  // Scan and inject overlay buttons on all videos in page
  function attachOverlayButtons() {
    const videos = Array.from(document.querySelectorAll('video'));
    videos.forEach((vid, idx) => {
      attachInPageExportButton(vid, idx);
    });

    const shredditPlayers = Array.from(document.querySelectorAll('shreddit-player'));
    shredditPlayers.forEach((sp, idx) => {
      const vid = sp.querySelector('video') || sp;
      attachInPageExportButton(vid, idx);
    });
  }
  window.__amzAttachOverlayButtons = attachOverlayButtons;

  // Run on page load
  attachOverlayButtons();

  // Also monitor dynamic feed loading (Threads, TikTok, Twitter, Reddit infinite scroll)
  const observer = new MutationObserver(() => {
    attachOverlayButtons();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Listen to messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'DETECT_PAGE_VIDEOS' || request.action === 'DETECT_VIDEOS') {
      try {
        const videos = detectVideos();
        // Also ensure in-page overlay buttons are up to date
        attachOverlayButtons();
        sendResponse({
          success: true,
          videos,
          count: videos.length,
          pageTitle: document.title,
          pageUrl: window.location.href,
        });
      } catch (err) {
        sendResponse({ success: false, error: err.message, videos: [] });
      }
      return true;
    }
  });
})();
