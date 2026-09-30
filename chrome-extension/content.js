// content.js - ImgLy Element Picker & Live Website Preview

(function() {
  // Prevent multiple picker overlay registrations
  let currentElement = null;

  // ─── Helpers: XPath & CSS Selector ──────────────────────────────────────────

  function getXPath(el) {
    if (!el || el.nodeType !== 1) return '';
    if (el.id) return `//*[@id="${el.id}"]`;
    if (el === document.body) return '/html/body';

    let ix = 0;
    const siblings = el.parentNode ? el.parentNode.childNodes : [];
    for (let i = 0; i < siblings.length; i++) {
      const sibling = siblings[i];
      if (sibling === el) {
        return getXPath(el.parentNode) + '/' + el.tagName.toLowerCase() + '[' + (ix + 1) + ']';
      }
      if (sibling.nodeType === 1 && sibling.tagName === el.tagName) {
        ix++;
      }
    }
    return '';
  }

  function getCssSelector(el) {
    if (!el || el.nodeType !== 1) return '';
    if (el.id) return '#' + CSS.escape(el.id);

    const path = [];
    let current = el;
    while (current && current.nodeType === 1 && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      if (current.id) {
        selector = '#' + CSS.escape(current.id);
        path.unshift(selector);
        break;
      }
      let sibling = current;
      let nth = 1;
      while ((sibling = sibling.previousElementSibling)) {
        if (sibling.tagName.toLowerCase() === selector) nth++;
      }
      selector += `:nth-of-type(${nth})`;
      path.unshift(selector);
      current = current.parentElement;
    }
    return path.join(' > ');
  }

  // ─── Overlay-Piercing Image Candidate Resolution ──────────────────────────

  /**
   * Returns true when an element looks like a non-image overlay/gradient layer
   * that has no meaningful image content of its own.
   *
   * Criteria (any one is sufficient to flag as an overlay):
   *  - No visible text or real child content (empty / presentational div/span)
   *  - position absolute/fixed with inset-0-ish geometry (covers its parent)
   *  - background is a gradient (no url()) or transparent
   *  - pointer-events was likely meant to be none but isn't (common overlay pattern)
   *
   * We deliberately keep this conservative — only returns true for clearly
   * decorative covering layers, not for real content elements.
   */
  function looksLikeOverlay(el) {
    const tag = el.tagName.toLowerCase();

    // Only consider block-level covering elements, never <img>, <video>, <canvas>…
    const NEVER_OVERLAY = ['img', 'video', 'canvas', 'svg', 'picture', 'iframe',
                           'input', 'button', 'a', 'select', 'textarea'];
    if (NEVER_OVERLAY.includes(tag)) return false;

    const style = window.getComputedStyle(el);
    const pos = style.position;

    // Must be positioned (absolute/fixed) to cover something underneath
    if (pos !== 'absolute' && pos !== 'fixed') return false;

    // Must cover a meaningful area (not tiny UI widgets)
    const rect = el.getBoundingClientRect();
    if (rect.width < 40 || rect.height < 40) return false;

    // Background: gradient-only or transparent → pure overlay
    const bg = style.backgroundImage || '';
    const bgColor = style.backgroundColor || '';
    const hasUrlImage = /url\(['"]?(?!data:)[^)]+['"]?\)/.test(bg);
    if (hasUrlImage) return false; // has its own real background image → not a pure overlay

    // Must have no meaningful text content
    const text = (el.innerText || '').trim();
    if (text.length > 0) return false;

    // Must have no meaningful interactive or image children
    const hasImageChild = el.querySelector('img, video, canvas, svg, picture');
    if (hasImageChild) return false;

    return true;
  }

  /**
   * Scores a candidate element for how useful it is as an image selection target.
   * Higher = better candidate.
   */
  function imageScore(el) {
    const tag = el.tagName.toLowerCase();
    if (tag === 'img') return 100;
    const style = window.getComputedStyle(el);
    const bg = style.backgroundImage || '';
    if (/url\(['"]?(?!data:)[^)]+['"]?\)/.test(bg)) return 80;
    // Element that contains a child <img>
    if (el.querySelector('img')) return 60;
    return 0;
  }

  /**
   * Given the coordinates and the element returned by elementFromPoint,
   * inspect the full element stack at (x, y) and return the most relevant
   * image candidate — promoting an underlying image over a covering overlay.
   *
   * Falls back to rawElement when no better candidate is found so existing
   * behaviour is fully preserved for normal (non-overlay) elements.
   */
  function resolveImageCandidate(x, y, rawElement) {
    // Fast path: the top element is already a great image target
    if (imageScore(rawElement) >= 80) return rawElement;

    // Retrieve the full paint stack at these coordinates
    const stack = document.elementsFromPoint(x, y);

    // Filter out our own picker UI
    const candidates = stack.filter(
      (el) => el !== overlay && el !== highlight && el !== previewIndicator
    );

    // If the topmost real element is NOT an overlay, don't second-guess the
    // user — they intentionally hovered that element.
    if (!looksLikeOverlay(candidates[0])) return candidates[0] || rawElement;

    // The top element is an overlay. Walk down the stack looking for the best
    // image candidate that is *underneath* the overlay(s).
    let bestScore = -1;
    let bestEl = rawElement;

    for (const el of candidates) {
      // Stop once we leave the visually-covering overlay region
      if (looksLikeOverlay(el)) continue;

      const score = imageScore(el);
      if (score > bestScore) {
        bestScore = score;
        bestEl = el;
        // <img> is the best possible result — no need to keep looking
        if (score >= 100) break;
      }
    }

    return bestEl;
  }

  // ─── Element Finder with Multi-Tier Fallback ───────────────────────────────

  function locateElement(ctx) {
    if (!ctx) return null;

    // 1. By ID
    if (ctx.id) {
      const el = document.getElementById(ctx.id);
      if (el) return el;
    }

    // 2. By XPath
    if (ctx.xpath) {
      try {
        const result = document.evaluate(
          ctx.xpath,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        );
        if (result?.singleNodeValue) return result.singleNodeValue;
      } catch {
        // Fall through
      }
    }

    // 3. By CSS Selector
    if (ctx.selector) {
      try {
        const el = document.querySelector(ctx.selector);
        if (el) return el;
      } catch {
        // Fall through
      }
    }

    // 4. By Tag and Image Src
    if (ctx.imageSrc) {
      const tag = ctx.tagName || 'img';
      const candidates = Array.from(document.querySelectorAll(tag));
      for (const el of candidates) {
        if (el.src === ctx.imageSrc || el.currentSrc === ctx.imageSrc) {
          return el;
        }
        const bg = window.getComputedStyle(el).backgroundImage;
        if (bg && bg.includes(ctx.imageSrc)) {
          return el;
        }
      }
    }

    // 5. Proximity search by bounding rectangle
    if (ctx.originalBoundingRect && ctx.tagName) {
      const candidates = Array.from(document.querySelectorAll(ctx.tagName));
      let best = null;
      let minDiff = Infinity;
      const target = ctx.originalBoundingRect;

      for (const el of candidates) {
        const r = el.getBoundingClientRect();
        const top = r.top + window.scrollY;
        const left = r.left + window.scrollX;
        const diff =
          Math.abs(r.width - target.width) +
          Math.abs(r.height - target.height) +
          Math.abs(top - target.top) +
          Math.abs(left - target.left);

        if (diff < minDiff && diff < 100) {
          minDiff = diff;
          best = el;
        }
      }
      if (best) return best;
    }

    return null;
  }

  // ─── Extraction & Sending ──────────────────────────────────────────────────

  function extractAndSend(el) {
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();

    let imageSrc = '';
    let isBackgroundImage = false;

    if (el.tagName.toLowerCase() === 'img') {
      imageSrc = el.currentSrc || el.src;
    } else if (style.backgroundImage && style.backgroundImage !== 'none') {
      const match = style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
      if (match) {
        imageSrc = match[1];
        isBackgroundImage = true;
      }
    } else {
      const childImg = el.querySelector('img');
      if (childImg) {
        imageSrc = childImg.currentSrc || childImg.src;
      }
    }

    const data = {
      imageSrc,
      naturalWidth: el.naturalWidth || 0,
      naturalHeight: el.naturalHeight || 0,
      width: rect.width,
      height: rect.height,
      borderRadius: parseFloat(style.borderRadius) || 0,
      backgroundColor: style.backgroundColor,
      objectFit:
        style.objectFit && style.objectFit !== 'fill'
          ? style.objectFit
          : el.tagName.toLowerCase() === 'img'
          ? 'fill'
          : 'cover',
      positionX: 50,
      positionY: 50,
      sourceOrigin: window.location.origin,
      elementLabel: el.tagName.toLowerCase() + (el.className ? `.${el.className.split(' ').join('.')}` : ''),
    };

    // Parse object-position
    if (style.objectPosition) {
      const parts = style.objectPosition.split(' ');
      if (parts.length >= 2) {
        const parsePercent = (val) => {
          if (val.endsWith('%')) return parseFloat(val);
          if (val === 'center') return 50;
          if (val === 'left' || val === 'top') return 0;
          if (val === 'right' || val === 'bottom') return 100;
          return 50;
        };
        data.positionX = parsePercent(parts[0]);
        data.positionY = parsePercent(parts[1]);
      }
    } else if (style.backgroundPosition) {
      const parts = style.backgroundPosition.split(' ');
      if (parts.length >= 2) {
        const parsePercent = (val) => {
          if (val.endsWith('%')) return parseFloat(val);
          if (val === 'center') return 50;
          if (val === 'left' || val === 'top') return 0;
          if (val === 'right' || val === 'bottom') return 100;
          return 50;
        };
        data.positionX = parsePercent(parts[0]);
        data.positionY = parsePercent(parts[1]);
      }
    }

    // Rich original context for returning and Preview on Website
    data.originalContext = {
      tabId: null,
      url: window.location.href,
      sourceOrigin: window.location.origin,
      xpath: getXPath(el),
      selector: getCssSelector(el),
      elementLabel: data.elementLabel,
      tagName: el.tagName.toLowerCase(),
      id: el.id || '',
      className: el.className || '',
      imageSrc,
      isBackgroundImage,
      originalBoundingRect: {
        width: rect.width,
        height: rect.height,
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
      },
      originalStyles: {
        objectFit: el.style.objectFit || '',
        objectPosition: el.style.objectPosition || '',
        backgroundSize: el.style.backgroundSize || '',
        backgroundPosition: el.style.backgroundPosition || '',
        backgroundImage: el.style.backgroundImage || '',
      },
      initialPositionX: data.positionX,
      initialPositionY: data.positionY,
      initialObjectFit: data.objectFit,
    };

    chrome.runtime.sendMessage({
      type: 'IMGLY_EXTRACTED',
      payload: data,
    });
  }

  // ─── Live Preview Indicator UI ─────────────────────────────────────────────

  let previewIndicator = null;
  let activePreviewElement = null;

  function showPreviewIndicator(element, payload) {
    if (previewIndicator && previewIndicator.parentNode) {
      previewIndicator.parentNode.removeChild(previewIndicator);
    }

    activePreviewElement = element;
    const { previewState, css, editorTabId } = payload;
    const posX = Math.round(previewState.positionX);
    const posY = Math.round(previewState.positionY);

    const bar = document.createElement('div');
    bar.id = 'imgly-preview-bar';
    Object.assign(bar.style, {
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: '2147483647',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '10px 16px',
      backgroundColor: '#0d0d0d',
      color: '#f0f0f0',
      borderRadius: '9999px',
      border: '1px solid #3b82f6',
      boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(59, 130, 246, 0.3)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      userSelect: 'none',
      backdropFilter: 'blur(12px)',
    });

    // Content: Badge + readout
    const titleContainer = document.createElement('div');
    titleContainer.style.display = 'flex';
    titleContainer.style.alignItems = 'center';
    titleContainer.style.gap = '8px';

    const dot = document.createElement('span');
    Object.assign(dot.style, {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: '#10b981',
      display: 'inline-block',
      boxShadow: '0 0 8px #10b981',
    });

    const label = document.createElement('span');
    label.style.fontWeight = '600';
    label.textContent = 'ImgLy Preview:';

    const info = document.createElement('span');
    info.style.color = '#93c5fd';
    info.style.fontFamily = 'monospace';
    info.style.fontSize = '12px';
    info.textContent = `object-position: ${posX}% ${posY}%`;

    titleContainer.appendChild(dot);
    titleContainer.appendChild(label);
    titleContainer.appendChild(info);
    bar.appendChild(titleContainer);

    // Separator
    const sep = document.createElement('div');
    Object.assign(sep.style, { width: '1px', height: '16px', backgroundColor: '#333' });
    bar.appendChild(sep);

    // Actions container
    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.alignItems = 'center';
    actions.style.gap = '8px';

    // 1. Edit Again Button
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit Again';
    Object.assign(editBtn.style, {
      backgroundColor: '#2563eb',
      color: '#fff',
      border: 'none',
      padding: '5px 12px',
      borderRadius: '9999px',
      fontSize: '12px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    });
    editBtn.onmouseenter = () => (editBtn.style.backgroundColor = '#1d4ed8');
    editBtn.onmouseleave = () => (editBtn.style.backgroundColor = '#2563eb');
    editBtn.onclick = () => {
      chrome.runtime.sendMessage({
        type: 'IMGLY_EDIT_AGAIN',
        payload: { editorTabId },
      });
    };
    actions.appendChild(editBtn);

    // 2. Copy CSS Button
    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy CSS';
    Object.assign(copyBtn.style, {
      backgroundColor: '#1e1e1e',
      color: '#e0e0e0',
      border: '1px solid #444',
      padding: '5px 12px',
      borderRadius: '9999px',
      fontSize: '12px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    });
    copyBtn.onmouseenter = () => (copyBtn.style.backgroundColor = '#2a2a2a');
    copyBtn.onmouseleave = () => (copyBtn.style.backgroundColor = '#1e1e1e');
    copyBtn.onclick = () => {
      const textToCopy = css?.vanilla || `object-position: ${posX}% ${posY}%;`;
      navigator.clipboard.writeText(textToCopy).then(() => {
        const orig = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        copyBtn.style.color = '#34d399';
        setTimeout(() => {
          copyBtn.textContent = orig;
          copyBtn.style.color = '#e0e0e0';
        }, 1500);
      });
    };
    actions.appendChild(copyBtn);

    // 3. Exit / Revert Button
    const exitBtn = document.createElement('button');
    exitBtn.textContent = '✕';
    exitBtn.title = 'Revert and exit preview';
    Object.assign(exitBtn.style, {
      backgroundColor: 'transparent',
      color: '#888',
      border: 'none',
      padding: '4px 8px',
      borderRadius: '9999px',
      fontSize: '13px',
      cursor: 'pointer',
      marginLeft: '4px',
    });
    exitBtn.onmouseenter = () => (exitBtn.style.color = '#fff');
    exitBtn.onmouseleave = () => (exitBtn.style.color = '#888');
    exitBtn.onclick = () => {
      revertPreview(element);
    };
    actions.appendChild(exitBtn);

    bar.appendChild(actions);
    document.body.appendChild(bar);
    previewIndicator = bar;
  }

  function revertPreview(element) {
    if (element && element.__imglyOriginalStyles) {
      const orig = element.__imglyOriginalStyles;
      element.style.objectFit = orig.objectFit || '';
      element.style.objectPosition = orig.objectPosition || '';
      element.style.backgroundSize = orig.backgroundSize || '';
      element.style.backgroundPosition = orig.backgroundPosition || '';
      delete element.__imglyOriginalStyles;
    }
    if (previewIndicator && previewIndicator.parentNode) {
      previewIndicator.parentNode.removeChild(previewIndicator);
      previewIndicator = null;
    }
  }

  // ─── Listen for Messages from Background ───────────────────────────────────

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'IMGLY_APPLY_PREVIEW') {
      const { originalContext, previewState, css, editorTabId } = message.payload;
      const el = locateElement(originalContext);

      if (!el) {
        sendResponse({
          success: false,
          error: 'Could not locate the selected element on this page. The page structure may have changed.',
        });
        return true;
      }

      // Save original styles if not already saved
      if (!el.__imglyOriginalStyles) {
        el.__imglyOriginalStyles = {
          objectFit: el.style.objectFit || '',
          objectPosition: el.style.objectPosition || '',
          backgroundSize: el.style.backgroundSize || '',
          backgroundPosition: el.style.backgroundPosition || '',
        };
      }

      const posX = Math.round(previewState.positionX);
      const posY = Math.round(previewState.positionY);

      // Apply temporary styles matching the original element's implementation
      if (originalContext.isBackgroundImage) {
        el.style.backgroundPosition = `${posX}% ${posY}%`;
        if (previewState.objectFit) {
          el.style.backgroundSize = previewState.objectFit;
        }
      } else {
        el.style.objectFit = previewState.objectFit || 'cover';
        el.style.objectPosition = `${posX}% ${posY}%`;
      }

      // Scroll element smoothly into view
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch {
        // Fallback
        el.scrollIntoView();
      }

      // Flash highlight ring
      const prevOutline = el.style.outline;
      const prevOutlineOffset = el.style.outlineOffset;
      el.style.outline = '3px solid #3b82f6';
      el.style.outlineOffset = '2px';
      setTimeout(() => {
        el.style.outline = prevOutline;
        el.style.outlineOffset = prevOutlineOffset;
      }, 1500);

      // Show floating preview indicator
      showPreviewIndicator(el, { previewState, css, editorTabId });

      sendResponse({ success: true });
      return true;
    }

    if (message.type === 'IMGLY_REVERT_PREVIEW') {
      if (activePreviewElement) {
        revertPreview(activePreviewElement);
      }
      sendResponse({ success: true });
      return true;
    }
  });

  // ─── Element Picker Interaction ───────────────────────────────────────────

  // Only activate picker overlay if triggered
  if (window.__imglyPickerActive) return;
  window.__imglyPickerActive = true;

  const overlay = document.createElement('div');
  overlay.id = 'imgly-picker-overlay';
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    zIndex: '2147483647',
    pointerEvents: 'auto',
    cursor: 'crosshair',
    background: 'rgba(59, 130, 246, 0.08)',
    transition: 'all 0.1s ease',
  });

  const highlight = document.createElement('div');
  Object.assign(highlight.style, {
    position: 'fixed',
    pointerEvents: 'none',
    border: '2px solid #3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    zIndex: '2147483647',
    display: 'none',
    boxSizing: 'border-box',
    borderRadius: '4px',
    transition: 'all 0.08s ease',
  });

  document.body.appendChild(overlay);
  document.body.appendChild(highlight);

  const onMouseMove = (e) => {
    overlay.style.pointerEvents = 'none';
    const rawElement = document.elementFromPoint(e.clientX, e.clientY);
    overlay.style.pointerEvents = 'auto';

    if (rawElement && rawElement !== highlight && rawElement !== overlay && rawElement !== previewIndicator) {
      // Resolve through any covering overlay/gradient to the real image candidate
      const element = resolveImageCandidate(e.clientX, e.clientY, rawElement);
      currentElement = element;
      const rect = element.getBoundingClientRect();

      highlight.style.display = 'block';
      highlight.style.top = `${rect.top}px`;
      highlight.style.left = `${rect.left}px`;
      highlight.style.width = `${rect.width}px`;
      highlight.style.height = `${rect.height}px`;
    } else {
      currentElement = null;
      highlight.style.display = 'none';
    }
  };

  const cleanupPicker = () => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('click', onClick, true);
    window.removeEventListener('keydown', onKeyDown);
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    if (highlight.parentNode) highlight.parentNode.removeChild(highlight);
    window.__imglyPickerActive = false;
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cleanupPicker();
    }
  };

  const onClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (currentElement) {
      extractAndSend(currentElement);
    }

    cleanupPicker();
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('click', onClick, true);
  window.addEventListener('keydown', onKeyDown);
})();
