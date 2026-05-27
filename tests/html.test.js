// ========================================
// Feather MD -- HTML Structure & Accessibility Tests
// ========================================
// Validates the index.html DOM structure, required element IDs,
// aria labels, keyboard accessibility attributes, and SEO metadata.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { JSDOM } from 'jsdom';

let doc;

beforeAll(() => {
  const html = readFileSync(resolve(__dirname, '../index.html'), 'utf-8');
  const dom = new JSDOM(html);
  doc = dom.window.document;
});

// -- SEO & Head Metadata --

describe('HTML -- SEO & Head Metadata', () => {
  it('should have a <title> tag', () => {
    expect(doc.querySelector('title').textContent).toBe('Feather MD');
  });

  it('should have a charset meta tag', () => {
    const meta = doc.querySelector('meta[charset]');
    expect(meta).toBeTruthy();
    expect(meta.getAttribute('charset')).toBe('UTF-8');
  });

  it('should have a viewport meta tag', () => {
    const meta = doc.querySelector('meta[name="viewport"]');
    expect(meta).toBeTruthy();
  });

  it('should have lang attribute on <html>', () => {
    expect(doc.documentElement.getAttribute('lang')).toBe('en');
  });

  it('should have a default data-theme attribute', () => {
    expect(doc.documentElement.getAttribute('data-theme')).toBe('snow');
  });
});

// -- Required Element IDs --

describe('HTML -- Required Element IDs', () => {
  const requiredIds = [
    // Title bar
    'title-bar', 'title-bar-text', 'title-bar-controls',
    'btn-minimize', 'btn-maximize', 'btn-close',
    // Toolbar
    'toolbar', 'btn-open', 'btn-save', 'btn-new',
    'btn-sync-scroll', 'btn-theme', 'theme-menu',
    'btn-line-numbers', 'btn-word-wrap', 'btn-vim', 'btn-settings',
    // Split container
    'split-container', 'editor-pane', 'divider', 'preview-pane', 'preview-content',
    // Settings panel
    'settings-panel', 'btn-close-settings',
    'setting-font-size', 'setting-font-size-value',
    'setting-font-family', 'setting-tab-size',
    'setting-word-wrap', 'setting-vim-mode',
    // Shortcuts modal
    'shortcuts-modal', 'btn-close-shortcuts',
    // Unsaved dialog
    'unsaved-dialog', 'unsaved-dialog-message',
    'unsaved-btn-cancel', 'unsaved-btn-discard', 'unsaved-btn-save',
    // Status bar
    'status-bar', 'status-filepath', 'status-wordcount',
    'status-cursor', 'status-encoding', 'status-line-ending',
  ];

  requiredIds.forEach(id => {
    it(`should have element with id="${id}"`, () => {
      expect(doc.getElementById(id)).toBeTruthy();
    });
  });
});

// -- Accessibility: ARIA Labels --

describe('HTML -- Accessibility (ARIA labels)', () => {
  const labelledButtons = [
    { id: 'btn-minimize', label: 'Minimize' },
    { id: 'btn-maximize', label: 'Maximize' },
    { id: 'btn-close', label: 'Close' },
    { id: 'btn-open', label: 'Open file' },
    { id: 'btn-save', label: 'Save' },
    { id: 'btn-new', label: 'New file' },
    { id: 'btn-sync-scroll', label: 'Toggle sync scroll' },
    { id: 'btn-theme', label: 'Change theme' },
    { id: 'btn-line-numbers', label: 'Toggle line numbers' },
    { id: 'btn-word-wrap', label: 'Toggle word wrap' },
    { id: 'btn-vim', label: 'Toggle Vim mode' },
    { id: 'btn-settings', label: 'Settings' },
    { id: 'btn-close-settings', label: 'Close settings' },
    { id: 'btn-close-shortcuts', label: 'Close shortcuts' },
  ];

  labelledButtons.forEach(({ id, label }) => {
    it(`#${id} should have aria-label="${label}"`, () => {
      const el = doc.getElementById(id);
      expect(el).toBeTruthy();
      expect(el.getAttribute('aria-label')).toBe(label);
    });
  });
});

// -- Theme Dropdown --

describe('HTML -- Theme Dropdown Structure', () => {
  it('should have exactly 10 theme items in dropdown', () => {
    const items = doc.querySelectorAll('#theme-menu .dropdown-item');
    expect(items.length).toBe(10);
  });

  it('should have 5 light themes followed by 5 dark themes', () => {
    const labels = doc.querySelectorAll('#theme-menu .dropdown-group-label');
    expect(labels.length).toBe(2);
    expect(labels[0].textContent).toBe('Light');
    expect(labels[1].textContent).toBe('Dark');
  });

  it('should have correct data-theme attributes on all dropdown items', () => {
    const expectedThemes = [
      'snow', 'solarized-light', 'github-light', 'sepia', 'gruvbox-light',
      'onyx', 'solarized-dark', 'github-dark', 'monokai', 'gruvbox-dark',
    ];
    const items = doc.querySelectorAll('#theme-menu .dropdown-item');
    items.forEach((item, i) => {
      expect(item.getAttribute('data-theme')).toBe(expectedThemes[i]);
    });
  });

  it('should start with theme menu hidden', () => {
    expect(doc.getElementById('theme-menu').hasAttribute('hidden')).toBe(true);
  });
});

// -- Modals & Panels --

describe('HTML -- Modals & Panels Initial State', () => {
  it('should start with settings panel hidden', () => {
    expect(doc.getElementById('settings-panel').hasAttribute('hidden')).toBe(true);
  });

  it('should start with shortcuts modal hidden', () => {
    expect(doc.getElementById('shortcuts-modal').hasAttribute('hidden')).toBe(true);
  });

  it('should start with unsaved dialog hidden', () => {
    expect(doc.getElementById('unsaved-dialog').hasAttribute('hidden')).toBe(true);
  });
});

// -- Status Bar --

describe('HTML -- Status Bar Initial Content', () => {
  it('should show "Untitled" as default file path', () => {
    expect(doc.getElementById('status-filepath').textContent).toBe('Untitled');
  });

  it('should show "0 words" as default word count', () => {
    expect(doc.getElementById('status-wordcount').textContent).toBe('0 words');
  });

  it('should show "Ln 1, Col 1" as default cursor position', () => {
    expect(doc.getElementById('status-cursor').textContent).toBe('Ln 1, Col 1');
  });

  it('should show "UTF-8" as encoding', () => {
    expect(doc.getElementById('status-encoding').textContent).toBe('UTF-8');
  });

  it('should show "LF" as default line ending', () => {
    expect(doc.getElementById('status-line-ending').textContent).toBe('LF');
  });
});

// -- Keyboard Shortcuts Table --

describe('HTML -- Keyboard Shortcuts Table', () => {
  it('should list all keyboard shortcuts', () => {
    const rows = doc.querySelectorAll('.shortcuts-table tbody tr');
    expect(rows.length).toBeGreaterThanOrEqual(10);
  });

  it('should contain Ctrl+O shortcut entry', () => {
    const tableHTML = doc.querySelector('.shortcuts-table').innerHTML;
    expect(tableHTML).toContain('Open file');
  });

  it('should contain Ctrl+S shortcut entry', () => {
    const tableHTML = doc.querySelector('.shortcuts-table').innerHTML;
    expect(tableHTML).toContain('Save');
  });
});

// -- Title Bar --

describe('HTML -- Custom Title Bar', () => {
  it('should have data-tauri-drag-region on title bar', () => {
    expect(doc.getElementById('title-bar').hasAttribute('data-tauri-drag-region')).toBe(true);
  });

  it('should display "Feather MD" as default title text', () => {
    expect(doc.getElementById('title-bar-text').textContent).toBe('Feather MD');
  });

  it('should have 3 window control buttons', () => {
    const controls = doc.querySelectorAll('#title-bar-controls .title-btn');
    expect(controls.length).toBe(3);
  });
});
