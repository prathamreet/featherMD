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
    // Header bar
    'header-bar', 'header-left', 'header-icon', 'header-title', 'header-controls',
    'btn-minimize', 'btn-maximize', 'btn-close',
    // Menus
    'file-menu', 'view-menu', 'style-menu',

    // Recent files submenu
    'recent-files-submenu',
    // Split container
    'split-container', 'editor-pane', 'divider', 'preview-pane', 'preview-content',
    // Shortcuts modal
    'shortcuts-modal', 'btn-close-shortcuts',
    // Unsaved dialog
    'unsaved-dialog', 'unsaved-dialog-message',
    'unsaved-btn-cancel', 'unsaved-btn-discard', 'unsaved-btn-save',
    // Status bar
    'status-bar', 'status-filepath', 'status-words', 'status-chars', 'status-paragraphs',
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

// -- Menu Structure --

describe('HTML -- Menu Bar Structure', () => {
  it('should have 3 menu buttons (File, View, Style)', () => {
    const menuBtns = doc.querySelectorAll('.menu-btn');
    expect(menuBtns.length).toBe(3);
  });

  it('should have all 3 menu panels', () => {
    expect(doc.getElementById('file-menu')).toBeTruthy();
    expect(doc.getElementById('view-menu')).toBeTruthy();
    expect(doc.getElementById('style-menu')).toBeTruthy();
  });

  it('should have menu panels starting hidden', () => {
    expect(doc.getElementById('file-menu').hasAttribute('hidden')).toBe(true);
    expect(doc.getElementById('view-menu').hasAttribute('hidden')).toBe(true);
    expect(doc.getElementById('style-menu').hasAttribute('hidden')).toBe(true);
  });

  it('should have 10 theme items in style menu', () => {
    const items = doc.querySelectorAll('#style-menu .theme-item');
    expect(items.length).toBe(10);
  });

  it('should have correct data-theme attributes on theme items', () => {
    const expectedThemes = [
      'snow', 'solarized-light', 'github-light', 'sepia', 'gruvbox-light',
      'onyx', 'solarized-dark', 'github-dark', 'monokai', 'gruvbox-dark',
    ];
    const items = doc.querySelectorAll('#style-menu .theme-item');
    items.forEach((item, i) => {
      expect(item.getAttribute('data-theme')).toBe(expectedThemes[i]);
    });
  });

  it('should have 4 checkable items in view menu', () => {
    const items = doc.querySelectorAll('#view-menu .menu-item.checkable');
    expect(items.length).toBe(4);
  });

  it('should have file menu actions with keyboard shortcuts displayed', () => {
    const shortcuts = doc.querySelectorAll('#file-menu .menu-item-shortcut');
    expect(shortcuts.length).toBeGreaterThanOrEqual(4);
  });

  it('should have a Print menu item', () => {
    const printItem = doc.querySelector('[data-action="print"]');
    expect(printItem).toBeTruthy();
  });
});

// -- Modals & Panels --

describe('HTML -- Modals Initial State', () => {
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

  it('should show default stats text', () => {
    expect(doc.getElementById('status-words').textContent).toBe('0 words');
    expect(doc.getElementById('status-chars').textContent).toBe('0 chars');
    expect(doc.getElementById('status-paragraphs').textContent).toBe('0 paragraphs');
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

  it('should contain Ctrl+P print shortcut', () => {
    const tableHTML = doc.querySelector('.shortcuts-table').innerHTML;
    expect(tableHTML).toContain('Print');
  });

  it('should NOT contain Ctrl+comma settings shortcut', () => {
    const tableHTML = doc.querySelector('.shortcuts-table').innerHTML;
    expect(tableHTML).not.toContain('Settings');
  });
});

// -- Header Bar --

describe('HTML -- Header Bar', () => {
  it('should have data-tauri-drag-region on title area', () => {
    expect(doc.getElementById('header-title').hasAttribute('data-tauri-drag-region')).toBe(true);
  });

  it('should display "FeatherMD - Untitled" as default title text', () => {
    expect(doc.getElementById('header-title').textContent).toBe('FeatherMD - Untitled');
  });

  it('should have 3 window control buttons', () => {
    const controls = doc.querySelectorAll('#header-controls .title-btn');
    expect(controls.length).toBe(3);
  });
});
