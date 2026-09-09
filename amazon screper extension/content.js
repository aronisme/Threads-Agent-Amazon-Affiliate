/**
 * Amazon Product & Media Scraper - Content Script
 * Extracts product information, specifications, high-res images, and MP4 videos.
 */

(function () {
  // Prevent duplicate execution
  if (window.__amazonScraperInjected) return;
  window.__amazonScraperInjected = true;

  function cleanString(str) {
    if (!str) return '';
    return str
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&rlm;/g, '')
      .replace(/&lrm;/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function getElementText(selector, root = document) {
    const el = root.querySelector(selector);
    return el ? cleanString(el.innerText) : '';
  }

  function getElementAttr(selector, attr, root = document) {
    const el = root.querySelector(selector);
    return el ? el.getAttribute(attr) : null;
  }

  function scrapeProductDetails() {
    const url = window.location.href;

    // 1. Basic Info
    const title =
      getElementText('#productTitle') ||
      getElementText('#title span') ||
      getElementAttr('input#productTitle', 'value') ||
      getElementAttr('meta[name="title"]', 'content') ||
      '';

    const brand =
      getElementText('#bylineInfo') ||
      getElementText('#bylineInfo_feature_div a') ||
      '';

    const brandUrl = getElementAttr('#bylineInfo', 'href') || '';

    const asin =
      getElementAttr('input#twister-plus-asin', 'value') ||
      getElementAttr('input#ASIN', 'value') ||
      getElementAttr('input[name="ASIN"]', 'value') ||
      getElementAttr('#averageCustomerReviews', 'data-asin') ||
      (url.match(/\/dp\/([A-Z0-9]{10})/i) || [])[1] ||
      '';

    // 2. Pricing & Currency
    const currency =
      getElementText('.priceToPay .a-price-symbol') ||
      getElementAttr('input#priceSymbol', 'value') ||
      getElementAttr('input[name*="currencyCode"]', 'value') ||
      '';

    const priceWhole = getElementText('.priceToPay .a-price-whole');
    const priceFraction = getElementText('.priceToPay .a-price-fraction');
    let price = '';
    if (priceWhole) {
      price = `${currency ? currency + ' ' : ''}${priceWhole}${priceFraction ? '.' + priceFraction : ''}`;
    } else {
      price =
        getElementText('.priceToPay [aria-hidden="true"]') ||
        getElementText('#apex-pricetopay-accessibility-label') ||
        getElementText('.a-price .a-offscreen') ||
        getElementAttr('input#priceValue', 'value') ||
        '';
    }

    const listPrice =
      getElementText('.basisPrice .a-offscreen') ||
      getElementText('.apex-basisprice-offscreen-label') ||
      getElementText('.apex-basisprice-value .a-offscreen') ||
      '';

    const discount =
      getElementText('.savingsPercentage') ||
      getElementText('.apex-savings-percentage') ||
      '';

    // 3. Rating & Reviews
    const rating =
      getElementAttr('#acrPopover', 'title') ||
      getElementText('#acrPopover .a-icon-alt') ||
      getElementText('#averageCustomerReviews .a-icon-star-small') ||
      '';

    const reviewCount =
      getElementText('#acrCustomerReviewText') ||
      getElementText('#averageCustomerReviews #acrCustomerReviewText') ||
      '';

    // 4. Stock & Availability
    const availability =
      getElementText('#availability .primary-availability-message') ||
      getElementText('#availability span') ||
      getElementText('#twisterAvailability') ||
      '';

    const isOutOfStock = Boolean(
      document.querySelector('#outOfStock') ||
      /out of stock/i.test(availability)
    );

    // 5. Merchant & Buybox
    const seller =
      getElementText('div[offer-display-feature-name="desktop-merchant-info"] .offer-display-feature-text-message') ||
      getElementText('#sellerProfileTriggerId') ||
      getElementText('#merchant-info') ||
      '';

    const returnPolicy =
      getElementText('div[offer-display-feature-name="desktop-return-info"] .offer-display-feature-text-message') ||
      '';

    // 6. Breadcrumbs (Categories)
    const breadcrumbs = Array.from(
      document.querySelectorAll('#wayfinding-breadcrumbs_feature_div ul li span.a-list-item a')
    )
      .map(a => cleanString(a.innerText))
      .filter(Boolean);

    // 7. Variations (Color, Size)
    const selectedColor =
      getElementText('#inline-twister-expanded-dimension-text-color_name') ||
      getElementText('#variation_color_name .selection') ||
      '';

    const selectedSize =
      getElementText('#inline-twister-expanded-dimension-text-size_name') ||
      getElementText('#variation_size_name .selection') ||
      '';

    const colorOptions = Array.from(
      document.querySelectorAll('#inline-twister-expander-content-color_name li img.swatch-image')
    ).map(img => ({
      name: cleanString(img.getAttribute('alt')),
      swatchUrl: img.getAttribute('src')
    })).filter(c => c.name);

    const sizeOptions = Array.from(
      document.querySelectorAll('#inline-twister-expander-content-size_name li')
    ).map(li => cleanString(li.innerText)).filter(Boolean);

    // 8. Key Features & Bullets ("About this item")
    const bullets = Array.from(
      document.querySelectorAll(
        '#feature-bullets ul li span.a-list-item, #pqv-feature-bullets ul li span.a-list-item'
      )
    )
      .map(span => cleanString(span.innerText))
      .filter(Boolean);

    // Apparel / Quick Facts (e.g. Fabric, Care, Origin)
    const quickFacts = [];
    document.querySelectorAll('#productFactsDesktopExpander .product-facts-detail').forEach(row => {
      const key = getElementText('.a-col-left span', row);
      const val = getElementText('.a-col-right span', row);
      if (key && val) quickFacts.push({ key, val });
    });

    // 9. Product Description
    const description =
      getElementText('#productDescription p span') ||
      getElementText('#productDescription') ||
      '';

    // 10. Specifications / Technical Details
    const specifications = {};
    // Table format: voyager or prodDetTable
    document.querySelectorAll('table.voyager-ns-desktop-table tr, table.prodDetTable tr').forEach(tr => {
      const th = tr.querySelector('th');
      const td = tr.querySelector('td');
      if (th && td) {
        const key = cleanString(th.innerText);
        const val = cleanString(td.innerText);
        if (key && val) specifications[key] = val;
      }
    });
    // Bullet list format: detailBullets_feature_div
    document.querySelectorAll('#detailBullets_feature_div ul.detail-bullet-list li').forEach(li => {
      const keyEl = li.querySelector('span.a-text-bold');
      if (keyEl) {
        const key = cleanString(keyEl.innerText).replace(/[:\s]+$/, '');
        const fullText = cleanString(li.innerText);
        const val = cleanString(fullText.replace(keyEl.innerText, '')).replace(/^[:\s]+/, '');
        if (key && val) specifications[key] = val;
      }
    });

    // 11. IMAGES (High Resolution Extraction)
    let images = [];
    const htmlContent = document.documentElement.innerHTML;

    // Method A: ImageBlockATF Script parsing (Best quality up to 1500-2500px)
    const scriptMatch = htmlContent.match(/'colorImages':\s*(\{[\s\S]*?\}),\s*'colorToAsin'/);
    if (scriptMatch) {
      const initialMatch = scriptMatch[1].match(/'initial':\s*A\.\$\.parseJSON\('([\s\S]*?)'\)/);
      if (initialMatch) {
        try {
          const parsed = JSON.parse(initialMatch[1].replace(/\\'/g, "'").replace(/\\"/g, '"'));
          parsed.forEach(item => {
            const highRes = item.hiRes || item.large;
            if (highRes) {
              images.push({
                url: highRes,
                thumbUrl: item.thumb || item.large,
                variant: item.variant || 'MAIN',
                isHiRes: Boolean(item.hiRes)
              });
            }
          });
        } catch (e) {
          console.warn('ImageBlockATF JSON parse failed, using fallback', e);
        }
      }
    }

    // Method B: Fallback from DOM elements
    if (images.length === 0) {
      const mainImg = document.querySelector('#imgTagWrapperId img, img[data-a-image-name="landingImage"], #landingImage');
      if (mainImg) {
        const hiRes = mainImg.getAttribute('data-old-hires');
        const dynamicImgs = mainImg.getAttribute('data-a-dynamic-image');
        let bestUrl = hiRes;

        if (!bestUrl && dynamicImgs) {
          try {
            const dynObj = JSON.parse(dynamicImgs);
            const urls = Object.keys(dynObj);
            if (urls.length > 0) bestUrl = urls[urls.length - 1];
          } catch (e) {}
        }
        if (!bestUrl) bestUrl = mainImg.src;

        if (bestUrl) {
          images.push({
            url: bestUrl,
            thumbUrl: mainImg.src,
            variant: 'MAIN',
            isHiRes: Boolean(hiRes)
          });
        }
      }

      // Add thumbnail gallery images converted to hi-res
      document.querySelectorAll('#altImages ul li.imageThumbnail img, #altImages .a-button-thumbnail img').forEach((thumb, idx) => {
        const thumbSrc = thumb.src;
        if (thumbSrc && !thumbSrc.includes('video') && !thumbSrc.includes('play-button')) {
          // Amazon URL transformation trick: replace resolution filter with SL1500
          const hiResUrl = thumbSrc.replace(/\._AC_[^.]+\./, '._AC_SL1500_.');
          images.push({
            url: hiResUrl,
            thumbUrl: thumbSrc,
            variant: `PT0${idx + 1}`,
            isHiRes: true
          });
        }
      });
    }

    // Deduplicate images by URL
    const seenUrls = new Set();
    const uniqueImages = [];
    images.forEach(img => {
      if (img.url && !seenUrls.has(img.url)) {
        seenUrls.add(img.url);
        uniqueImages.push(img);
      }
    });

    // 12. VIDEOS (MP4 & HLS Extraction)
    const videos = [];
    const videoMetaElem = document.querySelector('div.video-items-metadata, [data-video-items]');
    if (videoMetaElem) {
      try {
        const rawAttr = videoMetaElem.getAttribute('data-video-items');
        if (rawAttr) {
          const parsedVideos = JSON.parse(rawAttr);
          parsedVideos.forEach((v, idx) => {
            let mp4Url = null;
            if (v.videoPreviewAssets) {
              const parts = v.videoPreviewAssets.split(',');
              mp4Url = parts.find(p => p.startsWith('http') && p.includes('.mp4')) || parts[0];
            }

            videos.push({
              id: v.asin || `video_${idx}`,
              title: v.title || `Product Video ${idx + 1}`,
              duration: v.formattedDuration || '',
              thumbnail: v.videoImageUrlUnchanged || v.hiResVideoImageUrl || v.videoImageUrl || '',
              mp4Url: mp4Url,
              hlsUrl: v.videoURL || null,
              creator: v.vendorName || v.publicName || 'Amazon Creator'
            });
          });
        }
      } catch (e) {
        console.warn('Video metadata parsing error:', e);
      }
    }

    // Fallback: check DOM video tags
    if (videos.length === 0) {
      document.querySelectorAll('video').forEach((v, idx) => {
        const src = v.currentSrc || v.src || v.querySelector('source')?.src;
        if (src && src.startsWith('http')) {
          videos.push({
            id: `video_${idx}`,
            title: `Product Video ${idx + 1}`,
            duration: '',
            thumbnail: v.poster || (uniqueImages[0] ? uniqueImages[0].url : ''),
            mp4Url: src.includes('.mp4') ? src : null,
            hlsUrl: src.includes('.m3u8') ? src : null,
            creator: 'Amazon Seller'
          });
        }
      });
    }

    // 13. SiteStripe & Affiliate Details
    const hasSiteStripe = Boolean(
      document.querySelector(
        '#amzn-ss-get-link-button, #amzn-ss-text-link, #amzn-ss-get-link-container'
      )
    );

    const trackingId =
      getElementAttr('#amzn-ss-tracking-id-dropdown-text', 'value') ||
      getElementText('#amzn-ss-tracking-id-dropdown-text option') ||
      getElementAttr('#amzn-ss-store-id-dropdown-text', 'value') ||
      '';

    return {
      success: true,
      asin,
      title,
      brand,
      brandUrl,
      url,
      price,
      listPrice,
      discount,
      currency,
      rating,
      reviewCount,
      availability,
      isOutOfStock,
      seller,
      returnPolicy,
      breadcrumbs,
      selectedColor,
      selectedSize,
      colorOptions,
      sizeOptions,
      bullets,
      quickFacts,
      description,
      specifications,
      images: uniqueImages,
      videos: videos,
      hasSiteStripe,
      trackingId,
      scrapedAt: new Date().toISOString()
    };
  }

  // Helper to trigger realistic mouse/pointer events for Amazon AUI
  function triggerFullClick(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const clientX = rect.left + rect.width / 2;
    const clientY = rect.top + rect.height / 2;
    const opts = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: clientX,
      clientY: clientY,
      button: 0,
      buttons: 1
    };

    if (window.PointerEvent) {
      el.dispatchEvent(new PointerEvent('pointerdown', opts));
    }
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    if (window.PointerEvent) {
      el.dispatchEvent(new PointerEvent('pointerup', opts));
    }
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    el.dispatchEvent(new MouseEvent('click', opts));
    if (typeof el.click === 'function') {
      el.click();
    }
    return true;
  }

  // Helper to extract best tracking ID
  function findTrackingId() {
    const trackingSelectors = [
      '#amzn-ss-tracking-id-dropdown-text option:checked',
      '#amzn-ss-tracking-id-dropdown-text option[selected]',
      '#amzn-ss-tracking-id-dropdown-text',
      'select[name="amzn-ss-tracking-id-dropdown-text"] option:checked',
      'select[name="amzn-ss-tracking-id-dropdown-text"]',
      '#amzn-ss-tracking-id-dropdown-text-announce .a-dropdown-prompt',
      '.amzn-ss-tracking-id-col .a-dropdown-prompt'
    ];
    for (const sel of trackingSelectors) {
      const el = document.querySelector(sel);
      const val = el ? (el.value || el.textContent || '').trim() : '';
      if (val && val.includes('-20')) return val;
      if (val && !val.toLowerCase().includes('select') && val.length > 3) return val;
    }

    const storeSelectors = [
      '#amzn-ss-store-id-dropdown-text option:checked',
      '#amzn-ss-store-id-dropdown-text option[selected]',
      '#amzn-ss-store-id-dropdown-text',
      'select[name="amzn-ss-store-dropdown-text"] option:checked',
      'select[name="amzn-ss-store-dropdown-text"]',
      '#amzn-ss-store-dropdown-text-announce .a-dropdown-prompt',
      '.amzn-ss-store-tag-col .a-dropdown-prompt'
    ];
    for (const sel of storeSelectors) {
      const el = document.querySelector(sel);
      const val = el ? (el.value || el.textContent || '').trim() : '';
      if (val && !val.toLowerCase().includes('select') && val.length > 3) {
        return val.endsWith('-20') ? val : `${val}-20`;
      }
    }
    return '';
  }

  // Automated SiteStripe Affiliate Link Trigger
  async function triggerSiteStripeClick(format = 'short') {
    const getLinkSpan = document.querySelector('#amzn-ss-text-link');
    const getLinkBtn = document.querySelector(
      '#amzn-ss-get-link-button, #amzn-ss-get-link-container button, #amzn-ss-text-link button'
    );

    let trackingId = findTrackingId();
    const asin =
      document.querySelector('input#twister-plus-asin, input#ASIN, input[name="ASIN"]')?.value ||
      (window.location.href.match(/\/dp\/([A-Z0-9]{10})/i) || [])[1] ||
      '';

    const fallbackLink = asin && trackingId
      ? `https://www.amazon.com/dp/${asin}?tag=${trackingId}`
      : window.location.href;

    if (!getLinkBtn && !getLinkSpan) {
      return {
        success: false,
        reason: 'Toolbar SiteStripe tidak ditemukan di halaman ini. Pastikan akun Amazon Associates aktif.',
        fallbackLink,
        trackingId
      };
    }

    // Step 1: Open "Get Link" popover only if not already open
    const isPopoverOpen = () => {
      const popover = document.querySelector(
        '#amzn-ss-popover-text-preload-content-container, .amzn-ss-popover-text-preload-content-container, #amzn-ss-copy-affiliate-link-btn'
      );
      return popover && (popover.offsetParent !== null || (popover.style.display !== 'none' && popover.style.display !== ''));
    };

    if (!isPopoverOpen()) {
      if (getLinkBtn) triggerFullClick(getLinkBtn);
      else if (getLinkSpan) triggerFullClick(getLinkSpan);
    }

    // Step 2: Wait for popover content container to be visible
    for (let i = 0; i < 25; i++) {
      if (isPopoverOpen()) break;
      await new Promise(r => setTimeout(r, 100));
    }

    // Re-check tracking ID now that popover is open
    const freshTag = findTrackingId();
    if (freshTag) trackingId = freshTag;

    // Step 3: Switch format (Short Link or Full Link)
    if (format === 'full') {
      const fullSpan = document.querySelector('span[data-action="amzn-ss-get-link-fulllink"]');
      const fullRadio = document.querySelector('#amzn-ss-full-link-radio-button input, #amzn-ss-full-link-radio-button, label[for="amzn-ss-full-link-radio-button"]');
      if (fullSpan) triggerFullClick(fullSpan);
      else if (fullRadio) triggerFullClick(fullRadio);
    } else {
      const shortSpan = document.querySelector('span[data-action="amzn-ss-get-link-shortlink"]');
      const shortRadio = document.querySelector('#amzn-ss-short-link-radio-button input, #amzn-ss-short-link-radio-button, label[for="amzn-ss-short-link-radio-button"]');
      if (shortSpan) triggerFullClick(shortSpan);
      else if (shortRadio) triggerFullClick(shortRadio);
    }

    await new Promise(r => setTimeout(r, 200));

    // Step 4: Click the "Copy affiliate link" button
    const copySpan = document.querySelector('span[data-action="amzn-ss-copy-affiliate-link"]');
    const copyBtn = document.querySelector(
      '#amzn-ss-copy-affiliate-link-btn-announce, #amzn-ss-copy-affiliate-link-btn button, #amzn-ss-copy-affiliate-link-btn'
    );

    if (copyBtn) triggerFullClick(copyBtn);
    else if (copySpan) triggerFullClick(copySpan);

    // Step 5: Wait for copy action completion (toast or spinner)
    for (let i = 0; i < 20; i++) {
      const toast = document.querySelector('#amzn-ss-copy-toast');
      const spinner = document.querySelector('.amzn-ss-copy-spinner');
      if (toast && (toast.style.display !== 'none' || toast.classList.contains('a-fade-in'))) break;
      if (spinner && spinner.style.display === 'none' && i > 3) break;
      await new Promise(r => setTimeout(r, 100));
    }

    // Check if any textarea in popover holds the link
    let domLink = null;
    const textareas = document.querySelectorAll(
      '#amzn-ss-popover-text-preload-content-container textarea, #amzn-ss-text-shortlink-textarea, #amzn-ss-text-fulllink-textarea, textarea.amzn-ss-textarea'
    );
    for (const ta of textareas) {
      if (ta.value && (ta.value.startsWith('http://') || ta.value.startsWith('https://'))) {
        domLink = ta.value.trim();
        break;
      }
    }

    // Step 6: Automatically Close the Popover cleanly!
    await new Promise(r => setTimeout(r, 150));
    const closeBtn = document.querySelector(
      'button[data-action="a-popover-close"], .a-popover-inner button[data-action="a-popover-close"], .a-button-close, .a-popover-inner button[aria-label="Close"], .a-popover-wrapper button.a-button-close'
    );
    if (closeBtn) {
      triggerFullClick(closeBtn);
    }

    const finalTrackingId = findTrackingId() || trackingId;
    const computedFallback = asin && finalTrackingId
      ? `https://www.amazon.com/dp/${asin}?tag=${finalTrackingId}`
      : window.location.href;

    return {
      success: true,
      domLink: domLink,
      fallbackLink: computedFallback,
      trackingId: finalTrackingId
    };
  }

  // --- On-Page Floating Quick Action Dock ---
  function initFloatingQuickDock() {
    // Only inject on Amazon product pages
    const hasAsin = !!(
      document.querySelector('input#twister-plus-asin, input#ASIN, input[name="ASIN"]') ||
      window.location.href.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i)
    );
    if (!hasAsin) return;
    if (document.getElementById('amz-scraper-quick-dock')) return;

    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.id = 'amz-scraper-dock-styles';
    styleEl.textContent = `
      #amz-scraper-quick-dock {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        display: flex;
        flex-direction: column;
        gap: 8px;
        align-items: flex-end;
        pointer-events: auto;
      }
      .amz-dock-main {
        display: flex;
        align-items: center;
        gap: 6px;
        background: linear-gradient(135deg, rgba(17, 24, 39, 0.96) 0%, rgba(31, 41, 55, 0.98) 100%);
        border: 1.5px solid rgba(255, 153, 0, 0.6);
        border-radius: 40px;
        padding: 5px 8px 5px 6px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 16px rgba(255, 153, 0, 0.25);
        backdrop-filter: blur(12px);
        transition: all 0.25s ease;
      }
      .amz-dock-main:hover {
        border-color: rgba(255, 153, 0, 0.95);
        box-shadow: 0 12px 35px rgba(0, 0, 0, 0.6), 0 0 24px rgba(255, 153, 0, 0.4);
      }
      .amz-dock-btn-action {
        background: linear-gradient(135deg, #ff9900 0%, #e67a00 100%);
        color: #111827;
        border: none;
        font-size: 13px;
        font-weight: 700;
        padding: 7px 15px;
        border-radius: 30px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        box-shadow: 0 2px 10px rgba(255, 153, 0, 0.35);
        transition: all 0.2s ease;
      }
      .amz-dock-btn-action:hover {
        filter: brightness(1.08);
        transform: translateY(-1px);
      }
      .amz-dock-btn-action:disabled {
        opacity: 0.65;
        cursor: not-allowed;
        transform: none;
      }
      .amz-dock-icon-btn {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #f3f4f6;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 13px;
        transition: all 0.2s ease;
      }
      .amz-dock-icon-btn:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      .amz-dock-env-pill {
        background: rgba(16, 185, 129, 0.2);
        border: 1px solid rgba(16, 185, 129, 0.5);
        color: #10b981;
        font-size: 10px;
        font-weight: 800;
        padding: 3px 8px;
        border-radius: 20px;
        cursor: pointer;
        text-transform: uppercase;
        transition: all 0.2s ease;
      }
      .amz-dock-env-pill.local {
        background: rgba(59, 130, 246, 0.2);
        border-color: rgba(59, 130, 246, 0.5);
        color: #60a5fa;
      }
      .amz-dock-drawer {
        background: rgba(17, 24, 39, 0.96);
        border: 1px solid rgba(255, 153, 0, 0.5);
        border-radius: 10px;
        padding: 8px 10px;
        width: 310px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(10px);
      }
      .amz-dock-input {
        width: 100%;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: 6px;
        color: #fff;
        padding: 6px 10px;
        font-size: 12px;
        outline: none;
        box-sizing: border-box;
      }
      .amz-dock-input:focus {
        border-color: #ff9900;
      }
      .amz-dock-toast {
        background: #111827;
        border: 1.5px solid #10b981;
        color: #f3f4f6;
        padding: 8px 16px;
        border-radius: 30px;
        font-size: 12px;
        font-weight: 600;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
        white-space: nowrap;
      }
      .amz-dock-toast.error {
        border-color: #ef4444;
        color: #fecaca;
      }
      .amz-dock-minimized {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        background: linear-gradient(135deg, #ff9900 0%, #e67a00 100%);
        color: #111827;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        font-weight: 800;
        cursor: pointer;
        box-shadow: 0 6px 20px rgba(255, 153, 0, 0.45);
        border: 2px solid #fff;
        transition: transform 0.2s ease;
      }
      .amz-dock-minimized:hover {
        transform: scale(1.1);
      }
      #amz-scraper-quick-dock .hidden {
        display: none !important;
      }
    `;
    document.head.appendChild(styleEl);

    // Create Container
    const dockContainer = document.createElement('div');
    dockContainer.id = 'amz-scraper-quick-dock';

    let currentEnv = 'prod';
    const PROD_URL = 'https://threads-agent-amazon-affiliate.vercel.app/api/products/ingest';
    const LOCAL_URL = 'http://localhost:3000/api/products/ingest';
    const DEFAULT_KEY = 'threads_agent_secret_cron_key_999';

    dockContainer.innerHTML = `
      <div id="amz-dock-toast" class="amz-dock-toast hidden"></div>

      <div id="amz-dock-note-drawer" class="amz-dock-drawer hidden">
        <input type="text" id="amz-dock-note-input" placeholder="Note untuk AI (misal: bahannya adem, cutting oversized)..." class="amz-dock-input">
      </div>

      <div id="amz-dock-main" class="amz-dock-main">
        <button id="amz-quick-scan-btn" class="amz-dock-btn-action" type="button" title="Scan & Kirim Produk ke Creator Vault">
          <span>⚡</span>
          <span id="amz-quick-scan-text">Scan & Kirim ke Vault</span>
        </button>
        <button id="amz-dock-note-toggle" class="amz-dock-icon-btn" type="button" title="Tambah Creator Personal Note">📝</button>
        <button id="amz-dock-env-toggle" class="amz-dock-env-pill" type="button" title="Ganti Server: Prod / Local">Prod</button>
        <button id="amz-dock-min-btn" class="amz-dock-icon-btn" type="button" title="Kecilkan tombol">✕</button>
      </div>

      <div id="amz-dock-min-icon" class="amz-dock-minimized hidden" title="Buka AMZ Scraper Quick Dock">
        ⚡
      </div>
    `;

    document.body.appendChild(dockContainer);

    // DOM References
    const mainBar = document.getElementById('amz-dock-main');
    const minIcon = document.getElementById('amz-dock-min-icon');
    const minBtn = document.getElementById('amz-dock-min-btn');
    const scanBtn = document.getElementById('amz-quick-scan-btn');
    const scanText = document.getElementById('amz-quick-scan-text');
    const noteToggle = document.getElementById('amz-dock-note-toggle');
    const noteDrawer = document.getElementById('amz-dock-note-drawer');
    const noteInput = document.getElementById('amz-dock-note-input');
    const envToggle = document.getElementById('amz-dock-env-toggle');
    const toastEl = document.getElementById('amz-dock-toast');

    let toastTimer = null;
    function showDockToast(msg, isError = false, duration = 3500) {
      if (toastTimer) clearTimeout(toastTimer);
      toastEl.textContent = msg;
      toastEl.className = isError ? 'amz-dock-toast error' : 'amz-dock-toast';
      toastTimer = setTimeout(() => {
        toastEl.className = 'amz-dock-toast hidden';
      }, duration);
    }

    // Toggle minimize
    minBtn.addEventListener('click', () => {
      mainBar.classList.add('hidden');
      noteDrawer.classList.add('hidden');
      minIcon.classList.remove('hidden');
    });

    minIcon.addEventListener('click', () => {
      minIcon.classList.add('hidden');
      mainBar.classList.remove('hidden');
    });

    // Toggle note input
    noteToggle.addEventListener('click', () => {
      noteDrawer.classList.toggle('hidden');
      if (!noteDrawer.classList.contains('hidden')) {
        noteInput.focus();
      }
    });

    // Toggle environment (Prod vs Local)
    envToggle.addEventListener('click', () => {
      if (currentEnv === 'prod') {
        currentEnv = 'local';
        envToggle.textContent = 'Local';
        envToggle.classList.add('local');
        showDockToast('Target: Localhost:3000');
      } else {
        currentEnv = 'prod';
        envToggle.textContent = 'Prod';
        envToggle.classList.remove('local');
        showDockToast('Target: Vercel Prod');
      }
    });

    // Quick Scan & Send Execution
    scanBtn.addEventListener('click', async () => {
      scanBtn.disabled = true;
      scanText.textContent = 'Memindai & Ambil Link...';

      try {
        // 1. Scrape product data
        const product = scrapeProductDetails();

        // 2. Trigger SiteStripe to get short link and auto-close popover
        const stripeRes = await triggerSiteStripeClick('short');

        // 3. Read short link from clipboard (since page was clicked) or fallback
        let affiliateLink = stripeRes?.domLink || '';
        if (!affiliateLink || !affiliateLink.includes('amzn.to/')) {
          try {
            const clip = (await navigator.clipboard.readText() || '').trim();
            if (clip && clip.includes('amzn.to/')) {
              affiliateLink = clip;
            }
          } catch (e) {}
        }
        if (!affiliateLink) {
          affiliateLink = stripeRes?.fallbackLink || product.url;
        }

        product.affiliateLink = affiliateLink;
        product.creatorNotes = noteInput ? noteInput.value.trim() : '';

        // 4. Retrieve settings & send to background API
        chrome.storage.local.get(['amazonScraperApiEndpoint', 'amazonScraperApiKey'], (stored) => {
          let targetEndpoint = currentEnv === 'local' ? LOCAL_URL : PROD_URL;
          if (stored.amazonScraperApiEndpoint && currentEnv !== 'local') {
            targetEndpoint = stored.amazonScraperApiEndpoint;
          }
          const targetKey = stored.amazonScraperApiKey || DEFAULT_KEY;

          scanText.textContent = 'Menyimpan ke Vault...';

          chrome.runtime.sendMessage({
            action: 'EXPORT_TO_API',
            endpoint: targetEndpoint,
            apiKey: targetKey,
            data: product
          }, (res) => {
            scanBtn.disabled = false;

            if (res && res.success) {
              scanText.textContent = '✅ Saved to Creator Vault!';
              const rehosted = res.data?.rehostedImages ? ` (${res.data.rehostedImages} foto, ${res.data.rehostedVideos || 0} video)` : '';
              showDockToast(`🎉 Saved to Creator Vault!${rehosted}`);

              setTimeout(() => {
                scanText.textContent = 'Scan & Kirim ke Vault';
              }, 3500);
            } else {
              scanText.textContent = '❌ Gagal Kirim';
              const err = res?.error || `Error HTTP ${res?.status || 'Unknown'}`;
              showDockToast(`❌ Gagal: ${err}`, true, 4500);

              setTimeout(() => {
                scanText.textContent = 'Scan & Kirim ke Vault';
              }, 4000);
            }
          });
        });

      } catch (err) {
        scanBtn.disabled = false;
        scanText.textContent = 'Scan & Kirim ke Vault';
        showDockToast(`❌ Error: ${err.message}`, true, 4000);
      }
    });
  }

  // Auto-inject dock when page is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFloatingQuickDock);
  } else {
    initFloatingQuickDock();
  }

  // Check periodically or on popstate in case of Amazon client navigation
  setTimeout(initFloatingQuickDock, 1500);
  window.addEventListener('popstate', () => setTimeout(initFloatingQuickDock, 1000));

  // Listen for messages from Popup or Background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'SCRAPE_PRODUCT') {
      try {
        const productData = scrapeProductDetails();
        sendResponse({ success: true, data: productData });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
      return true;
    }

    if (request.action === 'TRIGGER_SITESTRIPE_CLICK' || request.action === 'GET_AFFILIATE_LINK') {
      triggerSiteStripeClick(request.format || 'short')
        .then(result => sendResponse(result))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;
    }

    return true;
  });
})();
