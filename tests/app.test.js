import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initPreview } from '../src/preview.js';
import { initThemes, setTheme, applyTheme, getCurrentTheme, getThemes } from '../src/themes.js';

describe('Feather MD — Markdown Preview Engine', () => {
  let previewEl;
  let parentEl;

  beforeEach(() => {
    // Set up mock DOM elements
    parentEl = document.createElement('div');
    previewEl = document.createElement('div');
    parentEl.appendChild(previewEl);

    // Mock parent scroll container properties
    Object.defineProperty(parentEl, 'scrollHeight', { value: 1000, writable: true });
    Object.defineProperty(parentEl, 'clientHeight', { value: 200, writable: true });
    parentEl.scrollTop = 0;
  });

  it('should render and sanitize standard Markdown to HTML', () => {
    const api = initPreview(previewEl);
    api.renderMarkdown('# Hello World\nThis is a **bold** statement.');

    expect(previewEl.innerHTML).toContain('<h1>Hello World</h1>');
    expect(previewEl.innerHTML).toContain('This is a <strong>bold</strong> statement.');
  });

  it('should securely sanitize dangerous HTML tags (XSS guard)', () => {
    const api = initPreview(previewEl);
    api.renderMarkdown('# Safe Header\n<script>alert("hack")</script><img src="x" onerror="alert(1)">');

    expect(previewEl.innerHTML).toContain('<h1>Safe Header</h1>');
    expect(previewEl.innerHTML).not.toContain('<script>');
    expect(previewEl.innerHTML).not.toContain('onerror');
  });

  it('should force HTTP/HTTPS external links to open in a new browser tab', () => {
    const api = initPreview(previewEl);
    api.renderMarkdown('[GitHub](https://github.com) and [Internal Page](#internal)');

    const links = previewEl.querySelectorAll('a');
    expect(links.length).toBe(2);

    const githubLink = Array.from(links).find(l => l.textContent === 'GitHub');
    const internalLink = Array.from(links).find(l => l.textContent === 'Internal Page');

    expect(githubLink.getAttribute('target')).toBe('_blank');
    expect(githubLink.getAttribute('rel')).toContain('noopener');

    expect(internalLink.getAttribute('target')).toBeNull();
  });

  it('should correctly calculate and set scroll ratios', () => {
    const api = initPreview(previewEl);

    // max scroll = scrollHeight (1000) - clientHeight (200) = 800
    parentEl.scrollTop = 400; // 50% scroll
    expect(api.getScrollRatio()).toBe(0.5);

    api.setScrollRatio(0.25);
    expect(parentEl.scrollTop).toBe(200);
  });
});

describe('Feather MD — Theme Manager', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    
    // Mock theme dropdown DOM elements to prevent querySelectorAll crashes
    document.body.innerHTML = `
      <div id="theme-menu">
        <button class="dropdown-item" data-theme="snow">Snow</button>
        <button class="dropdown-item" data-theme="onyx">Onyx</button>
        <button class="dropdown-item" data-theme="gruvbox-dark">Gruvbox Dark</button>
      </div>
    `;

    // Mock window.matchMedia
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));
  });

  it('should load default OS light/dark theme when no config is passed', () => {
    initThemes(null);
    expect(getCurrentTheme()).toBe('snow');
    expect(document.documentElement.getAttribute('data-theme')).toBe('snow');
  });

  it('should load preferred theme defined in configuration', () => {
    initThemes({ theme: 'gruvbox-dark' });
    expect(getCurrentTheme()).toBe('gruvbox-dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('gruvbox-dark');
  });

  it('should correctly apply selected theme manually', () => {
    initThemes(null);
    setTheme('onyx');
    expect(getCurrentTheme()).toBe('onyx');
    expect(document.documentElement.getAttribute('data-theme')).toBe('onyx');
  });

  it('should toggle active classes on theme dropdown items', () => {
    initThemes(null);
    setTheme('onyx');

    const snowBtn = document.querySelector('#theme-menu [data-theme="snow"]');
    const onyxBtn = document.querySelector('#theme-menu [data-theme="onyx"]');

    expect(snowBtn.classList.contains('active')).toBe(false);
    expect(onyxBtn.classList.contains('active')).toBe(true);
  });
});
