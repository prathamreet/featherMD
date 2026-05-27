// ========================================
// Feather MD -- Theme Manager Tests
// ========================================
// Covers: initialization, OS detection, manual switching, callback firing,
//         theme validation, dropdown DOM sync, all 10 themes enumeration

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initThemes, setTheme, applyTheme, getCurrentTheme, getThemes } from '../src/themes.js';

/**
 * Helper: set up DOM and matchMedia mock.
 */
function setupThemeDOM(prefersDark = false) {
  document.documentElement.removeAttribute('data-theme');

  document.body.innerHTML = `
    <div id="theme-menu">
      <button class="dropdown-item" data-theme="snow">Snow</button>
      <button class="dropdown-item" data-theme="solarized-light">Solarized Light</button>
      <button class="dropdown-item" data-theme="github-light">GitHub Light</button>
      <button class="dropdown-item" data-theme="sepia">Sepia</button>
      <button class="dropdown-item" data-theme="gruvbox-light">Gruvbox Light</button>
      <button class="dropdown-item" data-theme="onyx">Onyx</button>
      <button class="dropdown-item" data-theme="solarized-dark">Solarized Dark</button>
      <button class="dropdown-item" data-theme="github-dark">GitHub Dark</button>
      <button class="dropdown-item" data-theme="monokai">Monokai</button>
      <button class="dropdown-item" data-theme="gruvbox-dark">Gruvbox Dark</button>
    </div>
  `;

  vi.stubGlobal('matchMedia', vi.fn().mockImplementation(query => ({
    matches: prefersDark,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })));
}

// -- Initialization --

describe('Themes -- Initialization', () => {
  it('should default to "snow" when OS prefers light mode and no config', () => {
    setupThemeDOM(false);
    initThemes(null);
    expect(getCurrentTheme()).toBe('snow');
    expect(document.documentElement.getAttribute('data-theme')).toBe('snow');
  });

  it('should default to "onyx" when OS prefers dark mode and no config', () => {
    setupThemeDOM(true);
    initThemes(null);
    expect(getCurrentTheme()).toBe('onyx');
    expect(document.documentElement.getAttribute('data-theme')).toBe('onyx');
  });

  it('should load theme from config if valid', () => {
    setupThemeDOM(false);
    initThemes({ theme: 'monokai' });
    expect(getCurrentTheme()).toBe('monokai');
  });

  it('should fall back to OS detection if config has invalid theme', () => {
    setupThemeDOM(false);
    initThemes({ theme: 'nonexistent-theme' });
    expect(getCurrentTheme()).toBe('snow');
  });

  it('should fall back to OS detection if config is null', () => {
    setupThemeDOM(true);
    initThemes(null);
    expect(getCurrentTheme()).toBe('onyx');
  });

  it('should fall back to OS detection if config object has no theme key', () => {
    setupThemeDOM(false);
    initThemes({ fontSize: 14 });
    expect(getCurrentTheme()).toBe('snow');
  });
});

// -- Manual Switching --

describe('Themes -- Manual Switching', () => {
  beforeEach(() => setupThemeDOM(false));

  it('should apply theme to DOM data-theme attribute', () => {
    initThemes(null);
    setTheme('github-dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('github-dark');
  });

  it('should update getCurrentTheme after switching', () => {
    initThemes(null);
    setTheme('solarized-dark');
    expect(getCurrentTheme()).toBe('solarized-dark');
  });

  it('should reject invalid theme names silently', () => {
    initThemes(null);
    const before = getCurrentTheme();
    applyTheme('invalid-name');
    expect(getCurrentTheme()).toBe(before);
  });
});

// -- Theme Callback --

describe('Themes -- Change Callback', () => {
  it('should fire onThemeChange callback when theme is applied', () => {
    setupThemeDOM(false);
    const spy = vi.fn();
    initThemes(null, spy);
    // initThemes calls applyTheme internally, which fires the callback
    expect(spy).toHaveBeenCalledWith('snow');
  });

  it('should fire onThemeChange callback on setTheme', () => {
    setupThemeDOM(false);
    const spy = vi.fn();
    initThemes(null, spy);
    spy.mockClear();
    setTheme('onyx');
    expect(spy).toHaveBeenCalledWith('onyx');
  });
});

// -- Dropdown DOM Sync --

describe('Themes -- Dropdown Active State Sync', () => {
  beforeEach(() => setupThemeDOM(false));

  it('should mark current theme item as active in dropdown', () => {
    initThemes(null);
    setTheme('monokai');
    const monokaiBtn = document.querySelector('#theme-menu [data-theme="monokai"]');
    const snowBtn = document.querySelector('#theme-menu [data-theme="snow"]');
    expect(monokaiBtn.classList.contains('active')).toBe(true);
    expect(snowBtn.classList.contains('active')).toBe(false);
  });

  it('should switch active class when switching themes', () => {
    initThemes(null);
    setTheme('sepia');
    expect(document.querySelector('#theme-menu [data-theme="sepia"]').classList.contains('active')).toBe(true);
    setTheme('gruvbox-dark');
    expect(document.querySelector('#theme-menu [data-theme="sepia"]').classList.contains('active')).toBe(false);
    expect(document.querySelector('#theme-menu [data-theme="gruvbox-dark"]').classList.contains('active')).toBe(true);
  });
});

// -- Theme Enumeration --

describe('Themes -- Enumeration', () => {
  it('should expose exactly 10 themes', () => {
    expect(getThemes().length).toBe(10);
  });

  it('should include all 5 light themes', () => {
    const themes = getThemes();
    ['snow', 'solarized-light', 'github-light', 'sepia', 'gruvbox-light'].forEach(t => {
      expect(themes).toContain(t);
    });
  });

  it('should include all 5 dark themes', () => {
    const themes = getThemes();
    ['onyx', 'solarized-dark', 'github-dark', 'monokai', 'gruvbox-dark'].forEach(t => {
      expect(themes).toContain(t);
    });
  });

  it('should successfully apply each of the 10 themes', () => {
    setupThemeDOM(false);
    initThemes(null);
    getThemes().forEach(theme => {
      applyTheme(theme);
      expect(getCurrentTheme()).toBe(theme);
      expect(document.documentElement.getAttribute('data-theme')).toBe(theme);
    });
  });
});
