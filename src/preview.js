// ========================================
// Feather MD — Preview Module (marked.js + DOMPurify)
// ========================================

import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';

let previewEl = null;

// Dynamic import hoisting to prevent loop allocations and race conditions
let convertFileSrc = null;
import('@tauri-apps/api/core').then((m) => {
  convertFileSrc = m.convertFileSrc;
}).catch(() => {});

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
 * Extract the parent directory from a file path
 */
function getParentDirectory(filePath) {
  if (!filePath) return '';
  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  parts.pop();
  return parts.join('/') + '/';
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

  // Highlight code blocks
  const codeBlocks = previewEl.querySelectorAll('pre code');
  codeBlocks.forEach((block) => {
    try {
      hljs.highlightElement(block);
    } catch (err) {
      console.warn('Highlight.js failed to highlight block:', err);
    }
  });

  // Resolve relative image paths
  const images = previewEl.querySelectorAll('img[src]');
  images.forEach((img) => {
    const src = img.getAttribute('src');
    if (src && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:') && !src.startsWith('asset:') && !src.startsWith('https://asset.localhost')) {
      if (window.currentFilePath) {
        const parentDir = getParentDirectory(window.currentFilePath);
        let absolutePath = '';
        if (src.startsWith('./')) {
          absolutePath = parentDir + src.substring(2);
        } else if (src.startsWith('../')) {
          let currentDir = parentDir;
          let tempSrc = src;
          while (tempSrc.startsWith('../')) {
            const dirParts = currentDir.replace(/\/$/, '').split('/');
            dirParts.pop();
            currentDir = dirParts.join('/') + '/';
            tempSrc = tempSrc.substring(3);
          }
          absolutePath = currentDir + tempSrc;
        } else {
          absolutePath = parentDir + src;
        }

        try {
          let normalisedPath = absolutePath;
          if (normalisedPath.match(/^[A-Za-z]:/)) {
            normalisedPath = normalisedPath.replace(/\//g, '\\');
          }
          
          if (convertFileSrc) {
            img.setAttribute('src', convertFileSrc(normalisedPath));
          } else {
            import('@tauri-apps/api/core').then((m) => {
              convertFileSrc = m.convertFileSrc;
              if (img.isConnected) {
                img.setAttribute('src', convertFileSrc(normalisedPath));
              }
            }).catch(err => {
              console.warn('Failed to import convertFileSrc dynamically:', err);
            });
          }
        } catch (err) {
          console.warn('Failed to resolve relative image path:', err);
        }
      }
    }
  });

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
