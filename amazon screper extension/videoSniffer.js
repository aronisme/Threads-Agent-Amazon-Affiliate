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

      if (candidateUrl && !seenUrls.has(candidateUrl) && !candidateUrl.startsWith('blob:')) {
        seenUrls.add(candidateUrl);

        const title = extractVideoTitle(vid, index);
        const poster = extractVideoPoster(vid);

        foundVideos.push({
          url: candidateUrl,
          title: title.substring(0, 100),
          poster: poster,
          duration: vid.duration && !isNaN(vid.duration) ? Math.round(vid.duration) : null,
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

    // Create the floating button
    const btn = document.createElement('button');
    btn.className = 'amz-video-overlay-btn';
    btn.type = 'button';
    btn.setAttribute('title', 'Export video ini langsung ke Stok Media & AI Vision (Vercel Cloud)');
    btn.innerHTML = `
      <span style="font-size: 13px; line-height: 1;">🚀</span>
      <span class="amz-btn-text" style="font-weight: 700; font-size: 11px; letter-spacing: 0.3px;">Export ke Stok</span>
    `;

    btn.style.cssText = `
      position: absolute !important;
      top: 10px !important;
      right: 10px !important;
      z-index: 2147483647 !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
      background: linear-gradient(135deg, #7c3aed 0%, #db2777 100%) !important;
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
      opacity: 0.9 !important;
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
      btn.style.opacity = '0.9';
      btn.style.transform = 'scale(1.0)';
      btn.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.45)';
    });

    // Handle 1-Click Export from Page
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();

      let videoUrl = vid.currentSrc || vid.src || '';
      if (!videoUrl) {
        const s = vid.querySelector('source');
        if (s) videoUrl = s.getAttribute('src') || '';
      }
      if (!videoUrl) {
        videoUrl = vid.getAttribute('data-src') || vid.getAttribute('data-video-url') || '';
      }
      videoUrl = resolveFullUrl(videoUrl);

      if (!videoUrl || videoUrl.startsWith('blob:')) {
        showInPageNotification('⚠️ URL video belum siap atau menggunakan streaming blob khusus. Coba putar video terlebih dahulu.', 'error');
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
        category: 'AUTO',
        notes: `Exported via In-Page Overlay Button from ${window.location.href}`,
      }, (res) => {
        btn.disabled = false;
        if (res && res.success) {
          btn.innerHTML = `<span>✅</span> <span style="font-weight:700;font-size:11px;">Tersimpan!</span>`;
          btn.style.background = 'linear-gradient(135deg, #059669, #10b981)';
          showInPageNotification(`✅ Video "${res.title || 'Viral'}" berhasil masuk Stok Media Vercel!`, 'success');
          setTimeout(() => {
            btn.innerHTML = `<span>🚀</span><span style="font-weight:700;font-size:11px;">Export ke Stok</span>`;
            btn.style.background = 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)';
          }, 4500);
        } else {
          btn.innerHTML = `<span>❌</span> <span style="font-weight:700;font-size:11px;">Gagal</span>`;
          btn.style.background = '#dc2626';
          showInPageNotification(`❌ Gagal: ${res?.error || 'Koneksi gagal'}`, 'error');
          setTimeout(() => {
            btn.innerHTML = `<span>🚀</span><span style="font-weight:700;font-size:11px;">Export ke Stok</span>`;
            btn.style.background = 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)';
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
