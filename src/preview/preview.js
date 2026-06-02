// ========================================
// Feather MD — Preview Module (marked.js + DOMPurify + lazy highlight.js)
// ========================================

import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/core';

let previewEl = null;

// ---- @tauri-apps/api/core lazy-load (single-flight) ----
let coreModule = null;
let coreModulePromise = null;
function loadCore() {
  if (coreModule) return Promise.resolve(coreModule);
  if (coreModulePromise) return coreModulePromise;
  coreModulePromise = import('@tauri-apps/api/core')
    .then((m) => { coreModule = m; return m; })
    .catch(() => null);
  return coreModulePromise;
}
// Warm the cache on module load
loadCore();

// ---- Lazy language loading for highlight.js ----
// import.meta.glob lets Vite statically analyze every language file at build
// time and emit a separate chunk per language — satisfying PRD §3.8 < 450KB.
// The eager:false option keeps them out of the initial bundle.
const HLJS_LANG_MODULES = import.meta.glob(
  '../../node_modules/highlight.js/es/languages/*.js',
  { eager: false }
);

const loadedLangs = new Set();
const pendingLangs = new Map();
const failedLangs = new Set();

const LANG_ALIASES = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  rb: 'ruby',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  md: 'markdown',
  rs: 'rust',
  kt: 'kotlin',
  cs: 'csharp',
  htm: 'xml',
  html: 'xml',
  svg: 'xml',
  'c++': 'cpp',
  'c#': 'csharp',
  'objective-c': 'objectivec',
  'objc': 'objectivec',
  ps1: 'powershell',
  ps: 'powershell',
};

function resolveLangName(name) {
  if (!name) return null;
  const lower = name.toLowerCase();
  return LANG_ALIASES[lower] || lower;
}

function loadLanguage(name) {
  const resolved = resolveLangName(name);
  if (!resolved) return Promise.resolve(false);
  if (loadedLangs.has(resolved)) return Promise.resolve(true);
  if (failedLangs.has(resolved)) return Promise.resolve(false);
  if (pendingLangs.has(resolved)) return pendingLangs.get(resolved);

  const key = `../../node_modules/highlight.js/es/languages/${resolved}.js`;
  const loader = HLJS_LANG_MODULES[key];
  if (!loader) {
    failedLangs.add(resolved);
    return Promise.resolve(false);
  }
  const p = loader()
    .then((mod) => {
      const langFn = mod && (mod.default || mod);
      if (typeof langFn === 'function') {
        hljs.registerLanguage(resolved, langFn);
        loadedLangs.add(resolved);
        return true;
      }
      failedLangs.add(resolved);
      return false;
    })
    .catch(() => {
      failedLangs.add(resolved);
      return false;
    })
    .finally(() => {
      pendingLangs.delete(resolved);
    });

  pendingLangs.set(resolved, p);
  return p;
}

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

  const rawHtml = marked.parse(mdString);
  const clean = DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target'],
  });

  previewEl.innerHTML = clean;

  // Asynchronously highlight code blocks via lazy language loading.
  // We don't await — the preview shows unstyled code briefly, then
  // re-paints once the per-language chunk arrives.
  const codeBlocks = previewEl.querySelectorAll('pre code');
  codeBlocks.forEach((block) => {
    const cls = block.className || '';
    const match = cls.match(/language-([\w+-]+)/);
    if (!match) return;
    const lang = match[1];
    loadLanguage(lang).then((ok) => {
      if (!ok || !block.isConnected) return;
      try {
        hljs.highlightElement(block);
      } catch (err) {
        console.warn('Highlight.js failed to highlight block:', err);
      }
    });
  });

  // Resolve relative image paths via Tauri's asset protocol
  resolveImagePaths(previewEl);

  // Re-route external links through the OS browser (Tauri plugin-opener)
  attachExternalLinkHandlers(previewEl);

  // Restore approximate scroll position
  setScrollRatio(prevScrollRatio);
}

function resolveImagePaths(container) {
  const images = container.querySelectorAll('img[src]');
  if (images.length === 0) return;
  loadCore().then((core) => {
    if (!core || !core.convertFileSrc) return;
    images.forEach((img) => {
      const src = img.getAttribute('src');
      if (!src) return;
      if (src.startsWith('http://') || src.startsWith('https://')
        || src.startsWith('data:') || src.startsWith('asset:')) return;
      if (!window.currentFilePath) return;

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
        if (img.isConnected) {
          img.setAttribute('src', core.convertFileSrc(normalisedPath));
        }
      } catch (err) {
        console.warn('Failed to resolve relative image path:', err);
      }
    });
  });
}

function attachExternalLinkHandlers(container) {
  const links = container.querySelectorAll('a[href]');
  links.forEach((link) => {
    const href = link.getAttribute('href');
    if (!href) return;
    if (!(href.startsWith('http://') || href.startsWith('https://'))) return;

    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');

    link.addEventListener('click', (e) => {
      // In Tauri, target="_blank" navigates inside the webview rather than
      // launching the OS browser. Route through plugin-opener instead.
      if (coreModule && coreModule.invoke) {
        e.preventDefault();
        coreModule.invoke('plugin:opener|open_url', { url: href }).catch((err) => {
          console.warn('Failed to open URL via opener plugin:', err);
        });
      }
      // Outside Tauri (browser dev mode), let the default handler run.
    });
  });
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
