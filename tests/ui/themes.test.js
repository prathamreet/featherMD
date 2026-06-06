// ========================================
// Feather MD -- Theme Manager Tests
// ========================================
// Covers: initialization, OS detection, manual switching, callback firing,
//         theme validation, menu active state sync, all 10 themes enumeration

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initThemes, setTheme, applyTheme, cycleTheme } from '../../src/ui/themes.js';

const THEMES = ['snow', 'solarized-light', 'github-light', 'sepia', 'gruvbox-light', 'onyx', 'solarized-dark', 'github-dark', 'monokai', 'gruvbox-dark'];

/**
 * Helper: set up DOM and matchMedia mock.
 */
function setupThemeDOM(prefersDark = false) {
  document.documentElement.removeAttribute('data-theme');

  document.body.innerHTML = `
    <div id="style-menu">
      <button class="menu-item checkable theme-item" data-action="set-theme" data-theme="snow">
        <span class="menu-check"><svg></svg></span>
        <span class="menu-item-label">Snow</span>
      </button>
      <button class="menu-item checkable theme-item" data-action="set-theme" data-theme="solarized-light">
        <span class="menu-check"><svg></svg></span>
        <span class="menu-item-label">Solarized Light</span>
      </button>
      <button class="menu-item checkable theme-item" data-action="set-theme" data-theme="github-light">
        <span class="menu-check"><svg></svg></span>
        <span class="menu-item-label">GitHub Light</span>
      </button>
      <button class="menu-item checkable theme-item" data-action="set-theme" data-theme="sepia">
        <span class="menu-check"><svg></svg></span>
        <span class="menu-item-label">Sepia</span>
      </button>
      <button class="menu-item checkable theme-item" data-action="set-theme" data-theme="gruvbox-light">
        <span class="menu-check"><svg></svg></span>
        <span class="menu-item-label">Gruvbox Light</span>
      </button>
      <button class="menu-item checkable theme-item" data-action="set-theme" data-theme="onyx">
        <span class="menu-check"><svg></svg></span>
        <span class="menu-item-label">Onyx</span>
      </button>
      <button class="menu-item checkable theme-item" data-action="set-theme" data-theme="solarized-dark">
        <span class="menu-check"><svg></svg></span>
        <span class="menu-item-label">Solarized Dark</span>
      </button>
      <button class="menu-item checkable theme-item" data-action="set-theme" data-theme="github-dark">
        <span class="menu-check"><svg></svg></span>
        <span class="menu-item-label">GitHub Dark</span>
      </button>
      <button class="menu-item checkable theme-item" data-action="set-theme" data-theme="monokai">
        <span class="menu-check"><svg></svg></span>
        <span class="menu-item-label">Monokai</span>
      </button>
      <button class="menu-item checkable theme-item" data-action="set-theme" data-theme="gruvbox-dark">
        <span class="menu-check"><svg></svg></span>
        <span class="menu-item-label">Gruvbox Dark</span>
      </button>
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
    expect(document.documentElement.getAttribute('data-theme')).toBe('snow');
  });

  it('should default to "onyx" when OS prefers dark mode and no config', () => {
    setupThemeDOM(true);
    initThemes(null);
    expect(document.documentElement.getAttribute('data-theme')).toBe('onyx');
  });

  it('should load theme from config if valid', () => {
    setupThemeDOM(false);
    initThemes({ theme: 'monokai' });
    expect(document.documentElement.getAttribute('data-theme')).toBe('monokai');
  });

  it('should fall back to OS detection if config has invalid theme', () => {
    setupThemeDOM(false);
    initThemes({ theme: 'nonexistent-theme' });
    expect(document.documentElement.getAttribute('data-theme')).toBe('snow');
  });

  it('should fall back to OS detection if config is null', () => {
    setupThemeDOM(true);
    initThemes(null);
    expect(document.documentElement.getAttribute('data-theme')).toBe('onyx');
  });

  it('should fall back to OS detection if config object has no theme key', () => {
    setupThemeDOM(false);
    initThemes({ fontSize: 14 });
    expect(document.documentElement.getAttribute('data-theme')).toBe('snow');
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

  it('should update the DOM after switching', () => {
    initThemes(null);
    setTheme('solarized-dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('solarized-dark');
  });

  it('should reject invalid theme names silently', () => {
    initThemes(null);
    const before = document.documentElement.getAttribute('data-theme');
    applyTheme('invalid-name');
    expect(document.documentElement.getAttribute('data-theme')).toBe(before);
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

// -- Menu Active State Sync --

describe('Themes -- Menu Active State Sync', () => {
  beforeEach(() => setupThemeDOM(false));

  it('should mark current theme item as checked in menu', () => {
    initThemes(null);
    setTheme('monokai');
    const monokaiBtn = document.querySelector('.theme-item[data-theme="monokai"]');
    const snowBtn = document.querySelector('.theme-item[data-theme="snow"]');
    expect(monokaiBtn.getAttribute('data-checked')).toBe('true');
    expect(snowBtn.getAttribute('data-checked')).toBe('false');
  });

  it('should switch checked state when switching themes', () => {
    initThemes(null);
    setTheme('sepia');
    expect(document.querySelector('.theme-item[data-theme="sepia"]').getAttribute('data-checked')).toBe('true');
    setTheme('gruvbox-dark');
    expect(document.querySelector('.theme-item[data-theme="sepia"]').getAttribute('data-checked')).toBe('false');
    expect(document.querySelector('.theme-item[data-theme="gruvbox-dark"]').getAttribute('data-checked')).toBe('true');
  });
});

// -- Theme Cycling (Alt+T leader chord) --

describe('Themes -- Cycling', () => {
  beforeEach(() => setupThemeDOM(false));

  it('should advance to the next theme when cycling forward', () => {
    initThemes(null); // snow (index 0)
    const next = cycleTheme(1);
    expect(next).toBe('solarized-light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('solarized-light');
  });

  it('should wrap to the last theme when cycling backward from the first', () => {
    initThemes(null); // snow (index 0)
    const prev = cycleTheme(-1);
    expect(prev).toBe('gruvbox-dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('gruvbox-dark');
  });

  it('should wrap to the first theme when cycling forward from the last', () => {
    initThemes({ theme: 'gruvbox-dark' });
    const next = cycleTheme(1);
    expect(next).toBe('snow');
  });

  it('should persist the cycled theme via the change callback', () => {
    const spy = vi.fn();
    initThemes(null, spy);
    spy.mockClear();
    cycleTheme(1);
    expect(spy).toHaveBeenCalledWith('solarized-light');
  });
});

// -- Theme Enumeration --

describe('Themes -- Enumeration', () => {
  it('should have exactly 10 themes', () => {
    expect(THEMES.length).toBe(10);
  });

  it('should include all 5 light themes', () => {
    ['snow', 'solarized-light', 'github-light', 'sepia', 'gruvbox-light'].forEach(t => {
      expect(THEMES).toContain(t);
    });
  });

  it('should include all 5 dark themes', () => {
    ['onyx', 'solarized-dark', 'github-dark', 'monokai', 'gruvbox-dark'].forEach(t => {
      expect(THEMES).toContain(t);
    });
  });

  it('should successfully apply each of the 10 themes', () => {
    setupThemeDOM(false);
    initThemes(null);
    THEMES.forEach(theme => {
      applyTheme(theme);
      expect(document.documentElement.getAttribute('data-theme')).toBe(theme);
    });
  });
});
