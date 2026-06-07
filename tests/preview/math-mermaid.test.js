// ========================================
// Feather MD -- Math (KaTeX) + Diagrams (Mermaid) Preview Tests
// ========================================
// Covers: math tokenization, currency/code false-positive guards, KaTeX render +
// trust:false safety, Mermaid routing, graceful diagram errors, and that the
// existing sanitization pipeline is unaffected by the new post-sanitize pass.
//
// KaTeX is pure string output, so it runs for real under jsdom. Mermaid needs SVG
// layout (getBBox) that jsdom lacks, so it is stubbed with a deterministic render.

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    parse: vi.fn(async (source) => {
      if (!source || !source.trim() || source.includes('%%FAIL%%')) return false;
      return true;
    }),
    render: vi.fn(async (id, source) => {
      if (source.includes('%%FAIL%%')) throw new Error('mermaid parse error');
      return { svg: `<svg class="mmd-stub" data-len="${source.length}"><text>diagram</text></svg>` };
    }),
  },
}));

import { initPreview } from '../../src/preview/preview.js';

function createPreviewDOM() {
  const parentEl = document.createElement('div');
  const previewEl = document.createElement('div');
  parentEl.appendChild(previewEl);
  Object.defineProperty(parentEl, 'scrollHeight', { value: 1000, writable: true });
  Object.defineProperty(parentEl, 'clientHeight', { value: 200, writable: true });
  parentEl.scrollTop = 0;
  return previewEl;
}

async function waitFor(predicate, timeout = 2000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (predicate()) return true;
    await new Promise((r) => setTimeout(r, 0));
  }
  return false;
}

// -- Math tokenization (synchronous placeholder layer) --

describe('Preview -- KaTeX Math Tokenization', () => {
  let previewEl, api;

  beforeEach(() => {
    previewEl = createPreviewDOM();
    api = initPreview(previewEl);
  });

  it('turns $...$ into an inline math placeholder carrying the raw TeX', () => {
    api.renderMarkdown('Energy is $E = mc^2$ today.');
    const span = previewEl.querySelector('.fmd-math-inline');
    expect(span).toBeTruthy();
    expect(span.getAttribute('data-tex')).toBe('E = mc^2');
  });

  it('turns $$...$$ into a centred display-math block', () => {
    api.renderMarkdown('$$\n\\int_0^1 x^2\\,dx\n$$');
    const block = previewEl.querySelector('.fmd-math-display');
    expect(block).toBeTruthy();
    expect(block.getAttribute('data-tex')).toContain('\\int_0^1');
  });

  it('does not treat currency like "$5 and $10" as math', () => {
    api.renderMarkdown('It costs $5 and $10 today.');
    expect(previewEl.querySelector('.fmd-math')).toBeNull();
    expect(previewEl.textContent).toContain('$5 and $10');
  });

  it('leaves math syntax inside inline code untouched', () => {
    api.renderMarkdown('Write `$x$` literally.');
    expect(previewEl.querySelector('.fmd-math')).toBeNull();
    expect(previewEl.querySelector('code').textContent).toBe('$x$');
  });

  it('leaves math syntax inside fenced code blocks untouched', () => {
    api.renderMarkdown('```\n$$ y = x $$\n```');
    expect(previewEl.querySelector('.fmd-math')).toBeNull();
    expect(previewEl.querySelector('pre code').textContent).toContain('$$ y = x $$');
  });

  it('leaves ordinary markdown free of math/diagram wrappers', () => {
    api.renderMarkdown('# Title\n\nJust **text** and a [link](https://x.com).');
    expect(previewEl.querySelector('.fmd-math')).toBeNull();
    expect(previewEl.querySelector('.fmd-mermaid')).toBeNull();
  });
});

// -- KaTeX rendering + safety (real engine) --

describe('Preview -- KaTeX Rendering', () => {
  let previewEl, api;

  beforeEach(() => {
    previewEl = createPreviewDOM();
    api = initPreview(previewEl);
  });

  it('renders math to KaTeX output once the engine loads', async () => {
    api.renderMarkdown('$a + b = c$');
    const ok = await waitFor(() => previewEl.querySelector('.fmd-math-inline .katex'));
    expect(ok).toBe(true);
  });

  it('does not produce javascript: links from \\href in math (trust:false)', async () => {
    api.renderMarkdown('$\\href{javascript:alert(1)}{x}$');
    await waitFor(() => previewEl.querySelector('.fmd-math-inline').innerHTML.length > 0);
    expect(previewEl.querySelector('a[href^="javascript:"]')).toBeNull();
    expect(previewEl.querySelector('a[href*="javascript"]')).toBeNull();
  });

  it('renders invalid math as an inline error instead of throwing', async () => {
    expect(() => api.renderMarkdown('$\\frac{1}{$')).not.toThrow();
    // KaTeX (throwOnError:false) fills the placeholder rather than leaving it empty.
    const ok = await waitFor(() => previewEl.querySelector('.fmd-math-inline').innerHTML.length > 0);
    expect(ok).toBe(true);
  });
});

// -- Mermaid routing + rendering (stubbed engine) --

describe('Preview -- Mermaid Diagrams', () => {
  let previewEl, api;

  beforeEach(() => {
    previewEl = createPreviewDOM();
    api = initPreview(previewEl);
  });

  it('routes a ```mermaid fence to the diagram renderer, not syntax highlighting', async () => {
    api.renderMarkdown('```mermaid\nflowchart TD\nA-->B\n```');

    const codeBefore = previewEl.querySelector('code.language-mermaid');
    expect(codeBefore).toBeTruthy();
    expect(codeBefore.querySelector('.hljs-keyword')).toBeNull();

    const ok = await waitFor(() => previewEl.querySelector('.fmd-mermaid'));
    expect(ok).toBe(true);
    expect(previewEl.querySelector('.fmd-mermaid svg.mmd-stub')).toBeTruthy();
    // The original <pre><code> is replaced, not duplicated.
    expect(previewEl.querySelector('code.language-mermaid')).toBeNull();
  });

  it('treats a ```mmd fence as a Mermaid alias and renders it as a diagram', async () => {
    api.renderMarkdown('```mmd\nflowchart LR\nA-->B\n```');

    const codeBefore = previewEl.querySelector('code.language-mmd');
    expect(codeBefore).toBeTruthy();
    expect(codeBefore.querySelector('.hljs-keyword')).toBeNull();

    const ok = await waitFor(() => previewEl.querySelector('.fmd-mermaid'));
    expect(ok).toBe(true);
    expect(previewEl.querySelector('.fmd-mermaid svg.mmd-stub')).toBeTruthy();
    expect(previewEl.querySelector('code.language-mmd')).toBeNull();
  });

  it('shows a graceful error block when a diagram fails to parse', async () => {
    api.renderMarkdown('```mermaid\n%%FAIL%%\n```');
    const ok = await waitFor(() => previewEl.querySelector('.fmd-mermaid-error'));
    expect(ok).toBe(true);
    const errBlock = previewEl.querySelector('.fmd-mermaid-error');
    expect(errBlock.querySelector('pre code').textContent).toContain('%%FAIL%%');
  });
});

// -- Sanitization still holds with the new post-sanitize pass --

describe('Preview -- Sanitization With Math/Diagrams Present', () => {
  let previewEl, api;

  beforeEach(() => {
    previewEl = createPreviewDOM();
    api = initPreview(previewEl);
  });

  it('still strips <script> when math is in the same document', () => {
    api.renderMarkdown('Math $x^2$ then\n<script>alert("xss")</script>');
    expect(previewEl.innerHTML).not.toContain('<script>');
    expect(previewEl.innerHTML).not.toContain('alert');
    expect(previewEl.querySelector('.fmd-math-inline')).toBeTruthy();
  });

  it('keeps the data-tex placeholder attribute intact through DOMPurify', () => {
    api.renderMarkdown('$a < b$');
    const span = previewEl.querySelector('.fmd-math-inline');
    expect(span).toBeTruthy();
    // The "<" must round-trip as text, never as a tag.
    expect(span.getAttribute('data-tex')).toBe('a < b');
  });
});
