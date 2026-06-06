// ========================================
// Feather MD — Preview Module (marked.js + DOMPurify + lazy highlight.js)
// ========================================

import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/core';
import { escapeHtml } from '../core/utils.js';

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

// ---- Math syntax (KaTeX) — marked extension ----
// Recognising $inline$ / $$display$$ as a marked extension means math is parsed
// before code spans and fences, so math written inside `code` or ``` blocks is
// left untouched. The raw TeX is parked in a data-tex attribute (HTML-escaped so
// it survives DOMPurify) and rendered in a post-sanitize pass (see renderMath).
function mathPlaceholder(text, display) {
  const cls = display ? 'fmd-math fmd-math-display' : 'fmd-math fmd-math-inline';
  return `<span class="${cls}" data-tex="${escapeHtml(text)}"></span>`;
}

marked.use({
  extensions: [
    {
      name: 'blockMath',
      level: 'block',
      start(src) { const i = src.indexOf('$$'); return i < 0 ? undefined : i; },
      tokenizer(src) {
        const m = /^\$\$([\s\S]+?)\$\$(?:\n+|$)/.exec(src);
        if (!m) return undefined;
        const text = m[1].trim();
        if (!text) return undefined;
        return { type: 'blockMath', raw: m[0], text };
      },
      renderer(token) {
        return `<div class="fmd-math fmd-math-display" data-tex="${escapeHtml(token.text)}"></div>`;
      },
    },
    {
      name: 'inlineMath',
      level: 'inline',
      start(src) { const i = src.indexOf('$'); return i < 0 ? undefined : i; },
      tokenizer(src) {
        // Inline display: $$...$$ kept on one line.
        let m = /^\$\$(?!\$)([^\n]+?)\$\$/.exec(src);
        if (m && m[1].trim()) {
          return { type: 'inlineMath', raw: m[0], text: m[1].trim(), display: true };
        }
        // Inline: $...$ — reject surrounding whitespace so currency such as
        // "$5 and $10" is never read as math. Escaped \$ is permitted.
        m = /^\$(?!\$)((?:\\\$|[^$\n])*?)\$(?!\$)/.exec(src);
        if (!m) return undefined;
        const inner = m[1];
        if (!inner || /^\s|\s$/.test(inner)) return undefined;
        return { type: 'inlineMath', raw: m[0], text: inner.replace(/\\\$/g, '$').trim(), display: false };
      },
      renderer(token) {
        return mathPlaceholder(token.text, token.display);
      },
    },
  ],
});

// ---- KaTeX + Mermaid lazy loaders (single-flight) ----
// Kept out of the initial bundle (PRD §3.8). The chunks load only the first time
// a document actually contains math or a diagram, so cold start and idle CPU are
// untouched for everyone else.
let katexModule = null;
let katexPromise = null;
function loadKatex() {
  if (katexModule) return Promise.resolve(katexModule);
  if (katexPromise) return katexPromise;
  katexPromise = (async () => {
    try {
      const mod = await import('katex');
      katexModule = mod.default || mod;
      return katexModule;
    } catch (err) {
      console.warn('Failed to load KaTeX:', err);
      katexPromise = null;
      return null;
    }
  })();
  return katexPromise;
}

let mermaidModule = null;
let mermaidPromise = null;
function loadMermaid() {
  if (mermaidModule) return Promise.resolve(mermaidModule);
  if (mermaidPromise) return mermaidPromise;
  mermaidPromise = (async () => {
    try {
      const mod = await import('mermaid');
      mermaidModule = mod.default || mod;
      return mermaidModule;
    } catch (err) {
      console.warn('Failed to load Mermaid:', err);
      mermaidPromise = null;
      return null;
    }
  })();
  return mermaidPromise;
}

// Mermaid bakes theme colours into the SVG, so its render is keyed by light/dark
// scheme and re-run when the theme flips. This list mirrors the dark half of the
// theme set in ui/themes.js.
const DARK_THEMES = new Set(['onyx', 'solarized-dark', 'github-dark', 'monokai', 'gruvbox-dark']);
function isDarkScheme() {
  return DARK_THEMES.has(document.documentElement.getAttribute('data-theme'));
}

// Content-keyed caches: typing never re-runs KaTeX/Mermaid for a block whose
// source is unchanged — only the block being edited pays the cost. Bounded so a
// long session cannot grow them without limit.
const MATH_CACHE_MAX = 256;
const MERMAID_CACHE_MAX = 64;
const mathCache = new Map();
const mermaidCache = new Map();

function lruGet(cache, key) {
  if (!cache.has(key)) return undefined;
  const value = cache.get(key);
  cache.delete(key);
  cache.set(key, value);
  return value;
}
function lruSet(cache, key, value, max) {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, value);
  while (cache.size > max) cache.delete(cache.keys().next().value);
}

let mermaidIdSeq = 0;
let mermaidInitTheme = null;

// Monotonic render token: async math/diagram passes abort when a newer render
// has started or their target node was detached, so stale output never lands.
let renderSeq = 0;
// Separate token for the in-place theme refresh path, so rapid Alt+T cycling
// can supersede an earlier refresh without touching the full-render seq.
let themeRefreshSeq = 0;
let lastHadMermaid = false;

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
  // JavaScript & TypeScript
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  // Python & Ruby
  py: 'python',
  python3: 'python',
  rb: 'ruby',
  ruby: 'ruby',
  // Shell scripts
  sh: 'bash',
  bash: 'bash',
  shell: 'bash',
  zsh: 'bash',
  // Markup / Styles
  yml: 'yaml',
  yaml: 'yaml',
  md: 'markdown',
  markdown: 'markdown',
  htm: 'xml',
  html: 'xml',
  xhtml: 'xml',
  svg: 'xml',
  xml: 'xml',
  css: 'css',
  scss: 'scss',
  sass: 'scss',
  less: 'less',
  stylus: 'stylus',
  styl: 'stylus',
  // Systems / Compilation
  rs: 'rust',
  rust: 'rust',
  go: 'go',
  golang: 'go',
  c: 'c',
  cpp: 'cpp',
  'c++': 'cpp',
  'c#': 'csharp',
  cs: 'csharp',
  csharp: 'csharp',
  java: 'java',
  kotlin: 'kotlin',
  kt: 'kotlin',
  swift: 'swift',
  dart: 'dart',
  // Other databases & configs
  sql: 'sql',
  json: 'json',
  json5: 'json',
  toml: 'ini',
  ini: 'ini',
  docker: 'dockerfile',
  dockerfile: 'dockerfile',
  diff: 'diff',
  patch: 'diff',
  ps1: 'powershell',
  ps: 'powershell',
  powershell: 'powershell',
};

function resolveLangName(name) {
  if (!name) return null;
  const lower = name.toLowerCase();
  return LANG_ALIASES[lower] || lower;
}

function isLanguageLoaded(name) {
  const resolved = resolveLangName(name);
  return !!resolved && loadedLangs.has(resolved);
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
    refreshForThemeChange,
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

  const seq = ++renderSeq;

  const prevScrollRatio = getScrollRatio();

  const rawHtml = marked.parse(mdString);
  const clean = DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target'],
    ADD_TAGS: ['pb'],
  });

  previewEl.innerHTML = clean;

  // Flatten <pb> elements: the browser's HTML parser treats unknown elements as
  // containers, nesting all subsequent sibling content inside them. Move any
  // children back out so <pb> acts as an empty block-level page-break marker.
  previewEl.querySelectorAll('pb').forEach((pb) => {
    const parent = pb.parentNode;
    if (!parent) return;
    const ref = pb.nextSibling;
    while (pb.firstChild) {
      parent.insertBefore(pb.firstChild, ref);
    }
  });

  // Highlight code blocks. If a language is already loaded, apply it synchronously
  // to avoid jank/flash of unstyled content. Otherwise, load it asynchronously.
  const codeBlocks = previewEl.querySelectorAll('pre code');
  codeBlocks.forEach((block) => {
    const cls = block.className || '';
    const match = cls.match(/language-([\w+-]+)/);
    if (!match) return;
    const lang = match[1];
    if (lang === 'mermaid' || lang === 'mmd') return; // rendered as a diagram below, not highlighted
    if (isLanguageLoaded(lang)) {
      try {
        hljs.highlightElement(block);
      } catch (err) {
        console.warn('Highlight.js failed to highlight block:', err);
      }
    } else {
      loadLanguage(lang).then((ok) => {
        if (!ok || !previewEl.contains(block)) return;
        try {
          hljs.highlightElement(block);
        } catch (err) {
          console.warn('Highlight.js failed to highlight block:', err);
        }
      });
    }
  });

  // Render math and diagrams in a post-sanitize pass. The markdown was already
  // sanitized above; KaTeX (trust:false) and Mermaid (securityLevel:'strict')
  // convert the sanitized source text into their own safe presentational DOM.
  // Both are content-keyed and abort on a stale render token.
  if (previewEl.querySelector('.fmd-math[data-tex]')) {
    renderMath(previewEl, seq);
  }
  lastHadMermaid = previewEl.querySelector('pre > code.language-mermaid, pre > code.language-mmd') !== null;
  if (lastHadMermaid) {
    renderMermaid(previewEl, seq);
  }

  // Resolve relative image paths via Tauri's asset protocol
  resolveImagePaths(previewEl);

  // Re-route external links through the OS browser (Tauri plugin-opener)
  attachExternalLinkHandlers(previewEl);

  // Restore approximate scroll position
  setScrollRatio(prevScrollRatio);
}

async function renderMath(root, seq) {
  const nodes = root.querySelectorAll('.fmd-math[data-tex]');
  if (nodes.length === 0) return;
  const katex = await loadKatex();
  if (!katex || seq !== renderSeq) return;

  nodes.forEach((el) => {
    if (!root.contains(el)) return;
    const tex = el.getAttribute('data-tex') || '';
    const display = el.classList.contains('fmd-math-display');
    const key = (display ? 'D' : 'I') + ' ' + tex;

    let html = lruGet(mathCache, key);
    if (html === undefined) {
      try {
        html = katex.renderToString(tex, {
          displayMode: display,
          throwOnError: false,
          strict: 'ignore',
          trust: false,
          output: 'htmlAndMathml',
        });
      } catch {
        html = `<span class="fmd-math-error" title="Invalid math expression">${escapeHtml(tex)}</span>`;
      }
      lruSet(mathCache, key, html, MATH_CACHE_MAX);
    }
    el.innerHTML = html;
  });
}

async function renderMermaid(root, seq) {
  const mermaid = await loadMermaid();
  if (!mermaid || seq !== renderSeq) return;

  // securityLevel 'strict' makes Mermaid encode HTML in labels and disable click
  // handlers; htmlLabels:false keeps labels as plain SVG text (no foreignObject).
  // Combined with the already-sanitized source, the rendered SVG is safe to inject.
  const theme = isDarkScheme() ? 'dark' : 'default';
  try {
    if (mermaidInitTheme !== theme) {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme,
        fontFamily: 'inherit',
        flowchart: { htmlLabels: false },
      });
      mermaidInitTheme = theme;
    }
  } catch (err) {
    console.warn('Mermaid initialize failed:', err);
  }

  const blocks = Array.from(root.querySelectorAll('pre > code.language-mermaid, pre > code.language-mmd'));
  for (const code of blocks) {
    if (seq !== renderSeq) return;
    const pre = code.parentElement;
    if (!pre || !root.contains(pre)) continue;

    const source = code.textContent || '';
    const key = theme + ' ' + source;

    let svg = lruGet(mermaidCache, key);
    if (svg === undefined) {
      svg = await tryRenderMermaid(mermaid, source);
      lruSet(mermaidCache, key, svg, MERMAID_CACHE_MAX);
    }

    if (seq !== renderSeq || !root.contains(pre)) return;
    pre.replaceWith(createMermaidWrap(svg, source));
  }
}

// Render-with-guards. Mermaid 11's parse() short-circuits invalid input before
// render() can emit its "Syntax error" fallback SVG (the cartoon bomb), and a
// final regex catches versions that still slip an error SVG through.
async function tryRenderMermaid(mermaid, source) {
  if (typeof mermaid.parse === 'function') {
    try {
      const result = await mermaid.parse(source, { suppressErrors: true });
      if (result === false) return null;
    } catch {
      return null;
    }
  }
  try {
    const out = await mermaid.render('fmd-mmd-' + (mermaidIdSeq++), source);
    const raw = out && out.svg;
    if (!raw) return null;
    if (/aria-roledescription="error"|class="error-icon"/.test(raw)) return null;
    return raw;
  } catch {
    return null;
  }
}

function createMermaidWrap(svg, source) {
  const wrap = document.createElement('div');
  applyMermaidContent(wrap, svg, source);
  return wrap;
}

// Fill (or refill) a mermaid wrapper's class + content. Used by both the initial
// post-sanitize render and the theme refresh; the data-source attribute lets the
// theme refresh re-render in place without parsing the markdown again.
function applyMermaidContent(wrap, svg, source) {
  wrap.setAttribute('data-source', source);
  if (svg) {
    wrap.className = 'fmd-mermaid';
    wrap.innerHTML = svg;
  } else {
    wrap.className = 'fmd-mermaid fmd-mermaid-error';
    wrap.replaceChildren();

    const header = document.createElement('div');
    header.className = 'fmd-mermaid-error-msg';
    // Inline glyph kept tiny and themed via currentColor — no emoji, no asset.
    header.innerHTML =
      '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M8 1.75 14.5 13.25 H 1.5 Z"/><line x1="8" y1="6.25" x2="8" y2="9.5"/><circle cx="8" cy="11.4" r="0.7" fill="currentColor" stroke="none"/>' +
      '</svg>';
    const label = document.createElement('span');
    label.textContent = 'Diagram could not be rendered. Check the syntax below.';
    header.appendChild(label);

    const srcPre = document.createElement('pre');
    const srcCode = document.createElement('code');
    srcCode.textContent = source || '(empty diagram)';
    srcPre.appendChild(srcCode);

    wrap.append(header, srcPre);
  }
}

// Re-render diagrams after a light/dark theme switch. KaTeX inherits the preview
// text colour, so only Mermaid needs invalidating — and only when the current
// document has a diagram, keeping theme switches free otherwise (PRD §3.8).
//
// Re-rendering in place (rather than re-running the full markdown pipeline)
// keeps the preview's scrollHeight stable across the swap, so the editor↔preview
// scroll position doesn't jump. Each container is height-pinned for the async
// window so even the diagram's own box can't collapse-then-grow between themes.
async function refreshForThemeChange() {
  if (!lastHadMermaid || !previewEl) return;
  const seq = ++themeRefreshSeq;

  const mermaid = await loadMermaid();
  if (!mermaid || seq !== themeRefreshSeq) return;

  const theme = isDarkScheme() ? 'dark' : 'default';
  try {
    if (mermaidInitTheme !== theme) {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme,
        fontFamily: 'inherit',
        flowchart: { htmlLabels: false },
      });
      mermaidInitTheme = theme;
    }
  } catch (err) {
    console.warn('Mermaid initialize failed:', err);
  }

  const wrappers = Array.from(previewEl.querySelectorAll('.fmd-mermaid[data-source]'));
  for (const wrap of wrappers) {
    if (seq !== themeRefreshSeq) return;
    const source = wrap.getAttribute('data-source') || '';
    const key = theme + ' ' + source;

    let svg = lruGet(mermaidCache, key);
    if (svg === undefined) {
      svg = await tryRenderMermaid(mermaid, source);
      lruSet(mermaidCache, key, svg, MERMAID_CACHE_MAX);
    }

    if (seq !== themeRefreshSeq || !previewEl.contains(wrap)) return;

    const pinned = wrap.offsetHeight;
    if (pinned > 0) wrap.style.minHeight = pinned + 'px';
    applyMermaidContent(wrap, svg, source);
    requestAnimationFrame(() => {
      if (previewEl && previewEl.contains(wrap)) wrap.style.minHeight = '';
    });
  }
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
