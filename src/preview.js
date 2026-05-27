// ========================================
// Feather MD — Preview Module (marked.js + DOMPurify)
// ========================================

import { marked } from 'marked';
import DOMPurify from 'dompurify';

let previewEl = null;

/**
 * Initialize the preview pane
 * @param {HTMLElement} domEl - The preview content container
 * @returns {Object} Preview API
 */
export function initPreview(domEl) {
  previewEl = domEl;

  // Configure marked for GFM
  marked.setOptions({
    gfm: true,
    breaks: false,
    pedantic: false,
  });

  return {
    renderMarkdown,
    getScrollRatio,
    setScrollRatio,
    getScrollDOM: () => previewEl.parentElement,
  };
}

/**
 * Render markdown string to preview pane
 * @param {string} mdString - Raw markdown text
 */
function renderMarkdown(mdString) {
  if (!previewEl) return;

  const prevScrollRatio = getScrollRatio();

  // Parse and sanitize
  const rawHtml = marked.parse(mdString);
  const clean = DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target'],
  });

  previewEl.innerHTML = clean;

  // Make external links open in new tab/browser
  const links = previewEl.querySelectorAll('a[href]');
  links.forEach((link) => {
    const href = link.getAttribute('href');
    if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    }
  });

  // Restore approximate scroll position
  setScrollRatio(prevScrollRatio);
}

/**
 * Get scroll ratio of preview pane
 */
function getScrollRatio() {
  if (!previewEl) return 0;
  const scrollEl = previewEl.parentElement;
  const max = scrollEl.scrollHeight - scrollEl.clientHeight;
  return max > 0 ? scrollEl.scrollTop / max : 0;
}

/**
 * Set scroll ratio of preview pane
 */
function setScrollRatio(ratio) {
  if (!previewEl) return;
  const scrollEl = previewEl.parentElement;
  const max = scrollEl.scrollHeight - scrollEl.clientHeight;
  scrollEl.scrollTop = ratio * max;
}
