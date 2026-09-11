/**
 * Universal Video Sniffer - Content Script for All Webpages (<all_urls>)
 * Detects HTML5 videos, direct media files, social media player elements (Threads, TikTok, Instagram, Reddit, X),
 * and provides video details to the extension popup for 1-click export to Media Stock.
 */

(function () {
  if (window.__videoSnifferInjected) return;
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

  function isValidVideoUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const clean = url.trim().toLowerCase();
    if (clean.startsWith('blob:') || clean.startsWith('data:')) return false; // Blobs cannot be exported directly without streaming
    return (
      clean.includes('.mp4') ||
      clean.includes('.mov') ||
      clean.includes('.webm') ||
      clean.includes('/video/') ||
      clean.includes('video.twimg.com') ||
      clean.includes('v.redd.it') ||
      clean.includes('fbcdn.net') ||
      clean.includes('cdninstagram.com') ||
      clean.includes('tiktokcdn') ||
      clean.includes('media-amazon.com') ||
      clean.includes('cloudinary.com')
    );
  }

  function detectVideos() {
    const foundVideos = [];
    const seenUrls = new Set();

    // 1. Scan standard HTML5 <video> elements
    const videoElements = Array.from(document.querySelectorAll('video'));
    videoElements.forEach((vid, index) => {
      let candidateUrl = vid.currentSrc || vid.src || '';

      // Check inner <source> tags if video.src is empty
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

      candidateUrl = resolveFullUrl(candidateUrl);

      // Check fallback data attributes if standard src is empty
      if (!candidateUrl) {
        candidateUrl =
          vid.getAttribute('data-src') ||
          vid.getAttribute('data-video-url') ||
          vid.getAttribute('data-url') ||
          '';
        candidateUrl = resolveFullUrl(candidateUrl);
      }

      if (candidateUrl && !seenUrls.has(candidateUrl) && !candidateUrl.startsWith('blob:')) {
        seenUrls.add(candidateUrl);

        // Extract title context
        const parentContext = vid.closest('article, [role="article"], .post, .feed-item, div');
        const contextHeading = parentContext ? parentContext.querySelector('h1, h2, h3, p, span') : null;

        const title =
          vid.getAttribute('title') ||
          vid.getAttribute('aria-label') ||
          (contextHeading ? cleanString(contextHeading.innerText) : '') ||
          document.title ||
          `Video #${index + 1}`;

        const poster = resolveFullUrl(vid.poster || vid.getAttribute('data-poster') || '');

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

    // 2. Scan links to MP4/WebM files on the page
    const mediaLinks = Array.from(document.querySelectorAll('a[href$=".mp4"], a[href$=".mov"], a[href$=".webm"]'));
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

    // 3. Scan meta tags for video og:video / twitter:player:stream
    const ogVideo =
      document.querySelector('meta[property="og:video"]')?.getAttribute('content') ||
      document.querySelector('meta[property="og:video:secure_url"]')?.getAttribute('content') ||
      document.querySelector('meta[name="twitter:player:stream"]')?.getAttribute('content');

    if (ogVideo) {
      const fullUrl = resolveFullUrl(ogVideo);
      if (fullUrl && !seenUrls.has(fullUrl)) {
        seenUrls.add(fullUrl);
        const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
        foundVideos.push({
          url: fullUrl,
          title: (document.querySelector('meta[property="og:title"]')?.getAttribute('content') || document.title).substring(0, 100),
          poster: resolveFullUrl(ogImage),
          duration: null,
          width: null,
          height: null,
          pageTitle: document.title,
          sourcePage: window.location.href,
        });
      }
    }

    return foundVideos;
  }

  // Listen to messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'DETECT_PAGE_VIDEOS' || request.action === 'DETECT_VIDEOS') {
      try {
        const videos = detectVideos();
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
