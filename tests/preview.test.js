// ========================================
// Feather MD -- Markdown Preview Engine Tests
// ========================================
// Covers: rendering, sanitization, GFM elements, link handling, scroll API, edge cases

import { describe, it, expect, beforeEach } from 'vitest';
import { initPreview } from '../src/preview.js';

/**
 * Helper: create a parent+child mock DOM pair with scrollable dimensions.
 */
function createPreviewDOM(scrollHeight = 1000, clientHeight = 200) {
  const parentEl = document.createElement('div');
  const previewEl = document.createElement('div');
  parentEl.appendChild(previewEl);
  Object.defineProperty(parentEl, 'scrollHeight', { value: scrollHeight, writable: true });
  Object.defineProperty(parentEl, 'clientHeight', { value: clientHeight, writable: true });
  parentEl.scrollTop = 0;
  return { parentEl, previewEl };
}

// -- Core Rendering --

describe('Preview -- Core Markdown Rendering', () => {
  let previewEl, api;

  beforeEach(() => {
    ({ previewEl } = createPreviewDOM());
    api = initPreview(previewEl);
  });

  it('should render headings (h1-h6)', () => {
    api.renderMarkdown('# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6');
    expect(previewEl.querySelector('h1').textContent).toBe('H1');
    expect(previewEl.querySelector('h2').textContent).toBe('H2');
    expect(previewEl.querySelector('h3').textContent).toBe('H3');
    expect(previewEl.querySelector('h4').textContent).toBe('H4');
    expect(previewEl.querySelector('h5').textContent).toBe('H5');
    expect(previewEl.querySelector('h6').textContent).toBe('H6');
  });

  it('should render bold, italic, and strikethrough inline formatting', () => {
    api.renderMarkdown('**bold** *italic* ~~struck~~');
    expect(previewEl.innerHTML).toContain('<strong>bold</strong>');
    expect(previewEl.innerHTML).toContain('<em>italic</em>');
    expect(previewEl.innerHTML).toContain('<del>struck</del>');
  });

  it('should render inline code spans', () => {
    api.renderMarkdown('Use `const x = 1` here.');
    const code = previewEl.querySelector('code');
    expect(code).toBeTruthy();
    expect(code.textContent).toBe('const x = 1');
  });

  it('should render fenced code blocks', () => {
    api.renderMarkdown('```javascript\nconsole.log("test");\n```');
    const pre = previewEl.querySelector('pre');
    expect(pre).toBeTruthy();
    expect(pre.textContent).toContain('console.log("test");');
  });

  it('should render blockquotes', () => {
    api.renderMarkdown('> This is a quote');
    const bq = previewEl.querySelector('blockquote');
    expect(bq).toBeTruthy();
    expect(bq.textContent.trim()).toContain('This is a quote');
  });

  it('should render unordered lists', () => {
    api.renderMarkdown('- Item A\n- Item B\n- Item C');
    const items = previewEl.querySelectorAll('li');
    expect(items.length).toBe(3);
  });

  it('should render ordered lists', () => {
    api.renderMarkdown('1. First\n2. Second\n3. Third');
    const ol = previewEl.querySelector('ol');
    expect(ol).toBeTruthy();
    expect(ol.querySelectorAll('li').length).toBe(3);
  });

  it('should render horizontal rules', () => {
    api.renderMarkdown('Above\n\n---\n\nBelow');
    const hr = previewEl.querySelector('hr');
    expect(hr).toBeTruthy();
  });

  it('should render paragraphs with line breaks', () => {
    api.renderMarkdown('Line one.\n\nLine two.');
    const paragraphs = previewEl.querySelectorAll('p');
    expect(paragraphs.length).toBe(2);
  });

  it('should render images', () => {
    api.renderMarkdown('![Alt text](image.png)');
    const img = previewEl.querySelector('img');
    expect(img).toBeTruthy();
    expect(img.getAttribute('alt')).toBe('Alt text');
  });

  it('should handle empty string input without crashing', () => {
    api.renderMarkdown('');
    expect(previewEl.innerHTML).toBe('');
  });

  it('should handle whitespace-only input', () => {
    api.renderMarkdown('   \n\n   ');
    // Should not crash; output is whitespace or empty
    expect(previewEl.textContent.trim()).toBe('');
  });
});

// -- GFM Extensions --

describe('Preview -- GFM (GitHub Flavored Markdown) Elements', () => {
  let previewEl, api;

  beforeEach(() => {
    ({ previewEl } = createPreviewDOM());
    api = initPreview(previewEl);
  });

  it('should render GFM tables', () => {
    api.renderMarkdown('| Col A | Col B |\n|-------|-------|\n| 1     | 2     |\n| 3     | 4     |');
    const table = previewEl.querySelector('table');
    expect(table).toBeTruthy();
    const rows = table.querySelectorAll('tr');
    expect(rows.length).toBeGreaterThanOrEqual(2); // header + data rows
  });

  it('should render GFM task lists', () => {
    api.renderMarkdown('- [x] Done\n- [ ] Not done');
    const inputs = previewEl.querySelectorAll('input[type="checkbox"]');
    expect(inputs.length).toBe(2);
  });

  it('should render strikethrough text', () => {
    api.renderMarkdown('~~deleted text~~');
    const del = previewEl.querySelector('del');
    expect(del).toBeTruthy();
    expect(del.textContent).toBe('deleted text');
  });

  it('should auto-link URLs in GFM mode', () => {
    api.renderMarkdown('Visit https://example.com for info.');
    const link = previewEl.querySelector('a');
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('https://example.com');
  });
});

// -- Security: XSS / Sanitization --

describe('Preview -- XSS Sanitization (DOMPurify)', () => {
  let previewEl, api;

  beforeEach(() => {
    ({ previewEl } = createPreviewDOM());
    api = initPreview(previewEl);
  });

  it('should strip <script> tags', () => {
    api.renderMarkdown('Safe text\n<script>alert("xss")</script>');
    expect(previewEl.innerHTML).not.toContain('<script>');
    expect(previewEl.innerHTML).not.toContain('alert');
  });

  it('should strip onerror and other event handler attributes', () => {
    api.renderMarkdown('<img src="x" onerror="alert(1)">');
    expect(previewEl.innerHTML).not.toContain('onerror');
  });

  it('should strip onclick attributes', () => {
    api.renderMarkdown('<div onclick="alert(1)">click me</div>');
    expect(previewEl.innerHTML).not.toContain('onclick');
  });

  it('should strip javascript: protocol in links', () => {
    api.renderMarkdown('[click](javascript:alert(1))');
    const link = previewEl.querySelector('a');
    if (link) {
      const href = link.getAttribute('href');
      expect(href === null || !href.includes('javascript:')).toBe(true);
    }
  });

  it('should strip <iframe> tags', () => {
    api.renderMarkdown('<iframe src="https://evil.com"></iframe>');
    expect(previewEl.querySelector('iframe')).toBeNull();
  });

  it('should strip <style> tags with malicious CSS', () => {
    api.renderMarkdown('<style>body { background: url("javascript:alert(1)") }</style>');
    expect(previewEl.querySelector('style')).toBeNull();
  });

  it('should preserve safe HTML elements like <em>, <strong>, <code>', () => {
    api.renderMarkdown('**safe bold** and `safe code`');
    expect(previewEl.querySelector('strong')).toBeTruthy();
    expect(previewEl.querySelector('code')).toBeTruthy();
  });
});

// -- Link Handling --

describe('Preview -- External Link Handling', () => {
  let previewEl, api;

  beforeEach(() => {
    ({ previewEl } = createPreviewDOM());
    api = initPreview(previewEl);
  });

  it('should set target="_blank" on HTTPS links', () => {
    api.renderMarkdown('[GitHub](https://github.com)');
    const link = previewEl.querySelector('a');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(link.getAttribute('rel')).toContain('noreferrer');
  });

  it('should set target="_blank" on HTTP links', () => {
    api.renderMarkdown('[Example](http://example.com)');
    const link = previewEl.querySelector('a');
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('should NOT set target="_blank" on internal anchor links', () => {
    api.renderMarkdown('[Section](#section-1)');
    const link = previewEl.querySelector('a');
    expect(link.getAttribute('target')).toBeNull();
  });

  it('should NOT set target="_blank" on relative path links', () => {
    api.renderMarkdown('[Other file](./other.md)');
    const link = previewEl.querySelector('a');
    expect(link.getAttribute('target')).toBeNull();
  });

  it('should handle multiple links with mixed external and internal types', () => {
    api.renderMarkdown('[Ext](https://a.com) [Int](#b) [Ext2](http://c.com)');
    const links = previewEl.querySelectorAll('a');
    expect(links.length).toBe(3);
    expect(links[0].getAttribute('target')).toBe('_blank');
    expect(links[1].getAttribute('target')).toBeNull();
    expect(links[2].getAttribute('target')).toBe('_blank');
  });
});

// -- Scroll Ratio API --

describe('Preview -- Scroll Ratio API', () => {
  let previewEl, parentEl, api;

  beforeEach(() => {
    ({ parentEl, previewEl } = createPreviewDOM());
    api = initPreview(previewEl);
  });

  it('should return 0 when scrolled to top', () => {
    parentEl.scrollTop = 0;
    expect(api.getScrollRatio()).toBe(0);
  });

  it('should return correct ratio at 50% scroll', () => {
    parentEl.scrollTop = 400; // max = 1000-200 = 800; 400/800 = 0.5
    expect(api.getScrollRatio()).toBe(0.5);
  });

  it('should return 1 when scrolled to bottom', () => {
    parentEl.scrollTop = 800; // max = 800; 800/800 = 1.0
    expect(api.getScrollRatio()).toBe(1);
  });

  it('should set scroll position from ratio', () => {
    api.setScrollRatio(0.25);
    expect(parentEl.scrollTop).toBe(200); // 0.25 * 800 = 200
  });

  it('should set scroll position to 0 for ratio 0', () => {
    parentEl.scrollTop = 500;
    api.setScrollRatio(0);
    expect(parentEl.scrollTop).toBe(0);
  });

  it('should handle zero-height container (no scroll) gracefully', () => {
    const { previewEl: pEl } = createPreviewDOM(200, 200); // scrollHeight === clientHeight
    const noScrollApi = initPreview(pEl);
    expect(noScrollApi.getScrollRatio()).toBe(0);
  });

  it('should return correct scrollDOM reference', () => {
    expect(api.getScrollDOM()).toBe(parentEl);
  });
});
