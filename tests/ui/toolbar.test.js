// ========================================
// Feather MD -- Menu Bar Event Binding Tests
// ========================================
// Covers: menu open/close, hover-switch, action handlers, checkable items,
//         theme selection, font/tab size, font slider, recent files, click-outside

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  initToolbar,
  setMenuChecked,
  setActiveTheme,
  setActiveFontFamily,
  setActiveTabSize,
  updateRecentFilesList,
} from '../../src/ui/toolbar.js';

/**
 * Helper: create the full menu bar DOM structure required by toolbar.js
 */
function setupMenuBarDOM() {
  document.body.innerHTML = `
    <div id="header-bar">
      <div id="header-left">
        <div class="menu-dropdown">
          <button class="menu-btn" data-menu="file-menu">File</button>
          <div id="file-menu" class="menu-panel" hidden>
            <button class="menu-item" data-action="new-file">
              <span class="menu-item-label">New File</span>
            </button>
            <button class="menu-item" data-action="open-file">
              <span class="menu-item-label">Open</span>
            </button>
            <button class="menu-item" data-action="save-file">
              <span class="menu-item-label">Save</span>
            </button>
            <button class="menu-item" data-action="save-as">
              <span class="menu-item-label">Save As</span>
            </button>
            <button class="menu-item" data-action="recent-files">
              <span class="menu-item-label">Recent Files</span>
            </button>
            <button class="menu-item" data-action="print">
              <span class="menu-item-label">Print</span>
            </button>
          </div>
        </div>
        <div class="menu-dropdown">
          <button class="menu-btn" data-menu="view-menu">View</button>
          <div id="view-menu" class="menu-panel" hidden>
            <button class="menu-item checkable" data-action="toggle-sync" data-checked="true">
              <span class="menu-check"><svg></svg></span>
              <span class="menu-item-label">Sync Scroll</span>
            </button>
            <button class="menu-item checkable" data-action="toggle-line-numbers" data-checked="true">
              <span class="menu-check"><svg></svg></span>
              <span class="menu-item-label">Line Numbers</span>
            </button>
            <button class="menu-item checkable" data-action="toggle-word-wrap" data-checked="true">
              <span class="menu-check"><svg></svg></span>
              <span class="menu-item-label">Word Wrap</span>
            </button>
          </div>
        </div>
        <div class="menu-dropdown">
          <button class="menu-btn" data-menu="style-menu">Style</button>
          <div id="style-menu" class="menu-panel" hidden>
            <button class="menu-item checkable theme-item" data-action="set-theme" data-theme="snow" data-checked="true">
              <span class="menu-check"><svg></svg></span>
              <span class="menu-item-label">Snow</span>
            </button>
            <button class="menu-item checkable theme-item" data-action="set-theme" data-theme="onyx">
              <span class="menu-check"><svg></svg></span>
              <span class="menu-item-label">Onyx</span>
            </button>
            <button class="menu-item checkable font-item" data-action="set-font" data-font="'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" data-checked="true">
              <span class="menu-check"><svg></svg></span>
              <span class="menu-item-label">Inter</span>
            </button>
            <button class="menu-item checkable font-item" data-action="set-font" data-font="Georgia, Cambria, 'Times New Roman', serif">
              <span class="menu-check"><svg></svg></span>
              <span class="menu-item-label">Georgia</span>
            </button>
            <button class="menu-item checkable tab-item" data-action="set-tab" data-tab="2">
              <span class="menu-check"><svg></svg></span>
              <span class="menu-item-label">2 spaces</span>
            </button>
            <button class="menu-item checkable tab-item" data-action="set-tab" data-tab="4" data-checked="true">
              <span class="menu-check"><svg></svg></span>
              <span class="menu-item-label">4 spaces</span>
            </button>
          </div>
        </div>

      </div>
    </div>
    <div id="recent-files-modal" class="modal-overlay" hidden>
      <div id="recent-files-list">
        <div class="menu-item-empty">No recent files</div>
      </div>
    </div>
  `;
}

function createHandlers() {
  return {
    onOpen: vi.fn(),
    onSave: vi.fn(),
    onSaveAs: vi.fn(),
    onNew: vi.fn(),
    onRecentFiles: vi.fn(),
    onPrint: vi.fn(),
    onSyncToggle: vi.fn(),
    onThemeSelect: vi.fn(),
    onLineNumbersToggle: vi.fn(),
    onWordWrapToggle: vi.fn(),
    onFontSize: vi.fn(),
    onFontFamily: vi.fn(),
    onTabSize: vi.fn(),
  };
}

// -- File Menu Actions --

describe('Toolbar -- File Menu Actions', () => {
  let handlers;

  beforeEach(() => {
    setupMenuBarDOM();
    handlers = createHandlers();
    initToolbar(handlers);
  });

  it('should fire onNew when New File action is clicked', () => {
    document.querySelector('[data-action="new-file"]').click();
    expect(handlers.onNew).toHaveBeenCalledOnce();
  });

  it('should fire onOpen when Open action is clicked', () => {
    document.querySelector('[data-action="open-file"]').click();
    expect(handlers.onOpen).toHaveBeenCalledOnce();
  });

  it('should fire onSave when Save action is clicked', () => {
    document.querySelector('[data-action="save-file"]').click();
    expect(handlers.onSave).toHaveBeenCalledOnce();
  });

  it('should fire onSaveAs when Save As action is clicked', () => {
    document.querySelector('[data-action="save-as"]').click();
    expect(handlers.onSaveAs).toHaveBeenCalledOnce();
  });

  it('should fire onPrint when Print action is clicked', () => {
    document.querySelector('[data-action="print"]').click();
    expect(handlers.onPrint).toHaveBeenCalledOnce();
  });

  it('should fire onRecentFiles when Recent Files action is clicked', () => {
    document.querySelector('[data-action="recent-files"]').click();
    expect(handlers.onRecentFiles).toHaveBeenCalledOnce();
  });
});

// -- Menu Open/Close --

describe('Toolbar -- Menu Open/Close', () => {
  let handlers;

  beforeEach(() => {
    setupMenuBarDOM();
    handlers = createHandlers();
    initToolbar(handlers);
  });

  it('should open File menu when File button is clicked', () => {
    const menu = document.getElementById('file-menu');
    expect(menu.hidden).toBe(true);
    document.querySelector('[data-menu="file-menu"]').click();
    expect(menu.hidden).toBe(false);
  });

  it('should close File menu when File button is clicked again', () => {
    const btn = document.querySelector('[data-menu="file-menu"]');
    btn.click(); // open
    btn.click(); // close
    expect(document.getElementById('file-menu').hidden).toBe(true);
  });

  it('should close all menus on click outside', () => {
    document.querySelector('[data-menu="file-menu"]').click();
    expect(document.getElementById('file-menu').hidden).toBe(false);
    document.dispatchEvent(new Event('click'));
    expect(document.getElementById('file-menu').hidden).toBe(true);
  });

  it('should close file menu and open view menu on hover-switch', () => {
    const fileBtn = document.querySelector('[data-menu="file-menu"]');
    const viewBtn = document.querySelector('[data-menu="view-menu"]');
    fileBtn.click(); // open file menu
    expect(document.getElementById('file-menu').hidden).toBe(false);
    viewBtn.dispatchEvent(new Event('mouseenter'));
    expect(document.getElementById('file-menu').hidden).toBe(true);
    expect(document.getElementById('view-menu').hidden).toBe(false);
  });
});

// -- View Menu Toggles --

describe('Toolbar -- View Menu Toggles', () => {
  let handlers;

  beforeEach(() => {
    setupMenuBarDOM();
    handlers = createHandlers();
    initToolbar(handlers);
  });

  it('should toggle sync scroll off and fire callback', () => {
    const item = document.querySelector('[data-action="toggle-sync"]');
    item.click(); // was true, now false
    expect(handlers.onSyncToggle).toHaveBeenCalledWith(false);
    expect(item.getAttribute('data-checked')).toBe('false');
  });

  it('should toggle sync scroll on again and fire callback', () => {
    const item = document.querySelector('[data-action="toggle-sync"]');
    item.click(); // false
    item.click(); // true
    expect(handlers.onSyncToggle).toHaveBeenCalledWith(true);
    expect(item.getAttribute('data-checked')).toBe('true');
  });

  it('should toggle line numbers and fire callback', () => {
    const item = document.querySelector('[data-action="toggle-line-numbers"]');
    item.click();
    expect(handlers.onLineNumbersToggle).toHaveBeenCalledWith(false);
  });

  it('should toggle word wrap and fire callback', () => {
    const item = document.querySelector('[data-action="toggle-word-wrap"]');
    item.click();
    expect(handlers.onWordWrapToggle).toHaveBeenCalledWith(false);
  });
});

// -- Theme Selection --

describe('Toolbar -- Theme Selection', () => {
  let handlers;

  beforeEach(() => {
    setupMenuBarDOM();
    handlers = createHandlers();
    initToolbar(handlers);
  });

  it('should fire onThemeSelect when a theme item is clicked', () => {
    const onyxItem = document.querySelector('[data-theme="onyx"]');
    onyxItem.click();
    expect(handlers.onThemeSelect).toHaveBeenCalledWith('onyx');
  });

  it('should stay open after theme selection', () => {
    // Open style menu first
    document.querySelector('[data-menu="style-menu"]').click();
    expect(document.getElementById('style-menu').hidden).toBe(false);
    document.querySelector('[data-theme="onyx"]').click();
    expect(document.getElementById('style-menu').hidden).toBe(false);
  });
});



// -- setMenuChecked Utility --

describe('Toolbar -- setMenuChecked Utility', () => {
  beforeEach(() => setupMenuBarDOM());

  it('should set data-checked to true', () => {
    setMenuChecked('toggle-sync', true);
    expect(document.querySelector('[data-action="toggle-sync"]').getAttribute('data-checked')).toBe('true');
  });

  it('should set data-checked to false', () => {
    setMenuChecked('toggle-sync', false);
    expect(document.querySelector('[data-action="toggle-sync"]').getAttribute('data-checked')).toBe('false');
  });

  it('should not crash for a non-existent action', () => {
    expect(() => setMenuChecked('nonexistent', true)).not.toThrow();
  });
});

// -- setActiveTheme Utility --

describe('Toolbar -- setActiveTheme Utility', () => {
  beforeEach(() => setupMenuBarDOM());

  it('should mark the correct theme as checked', () => {
    setActiveTheme('onyx');
    expect(document.querySelector('[data-theme="onyx"]').getAttribute('data-checked')).toBe('true');
    expect(document.querySelector('[data-theme="snow"]').getAttribute('data-checked')).toBe('false');
  });
});



// -- updateRecentFilesList Utility --

describe('Toolbar -- updateRecentFilesList', () => {
  beforeEach(() => setupMenuBarDOM());

  it('should show empty message when no recent files', () => {
    updateRecentFilesList([], vi.fn());
    const container = document.getElementById('recent-files-list');
    expect(container.querySelector('.menu-item-empty')).toBeTruthy();
  });

  it('should render recent file items', () => {
    updateRecentFilesList(['/path/to/file.md', '/path/to/other.md'], vi.fn());
    const container = document.getElementById('recent-files-list');
    const items = container.querySelectorAll('.recent-file-item');
    expect(items.length).toBe(2);
  });

  it('should fire callback when a recent file is clicked', () => {
    const spy = vi.fn();
    updateRecentFilesList(['/path/to/file.md'], spy);
    const container = document.getElementById('recent-files-list');
    container.querySelector('.recent-file-item').click();
    expect(spy).toHaveBeenCalledWith('/path/to/file.md');
  });

  it('should close the recent files modal when an item is selected', () => {
    const modal = document.getElementById('recent-files-modal');
    modal.hidden = false;
    updateRecentFilesList(['/path/to/file.md'], vi.fn());
    document.getElementById('recent-files-list').querySelector('.recent-file-item').click();
    expect(modal.hidden).toBe(true);
  });
});

// -- setActiveFontFamily Utility --

describe('Toolbar -- setActiveFontFamily Utility', () => {
  beforeEach(() => setupMenuBarDOM());

  it('should mark the correct font family as checked', () => {
    const georgia = "Georgia, Cambria, 'Times New Roman', serif";
    setActiveFontFamily(georgia);
    const [inter, geo] = document.querySelectorAll('.font-item');
    expect(geo.getAttribute('data-checked')).toBe('true');
    expect(inter.getAttribute('data-checked')).toBe('false');
  });
});

// -- setActiveTabSize Utility --

describe('Toolbar -- setActiveTabSize Utility', () => {
  beforeEach(() => setupMenuBarDOM());

  it('should mark the correct tab size as checked', () => {
    setActiveTabSize(2);
    expect(document.querySelector('.tab-item[data-tab="2"]').getAttribute('data-checked')).toBe('true');
    expect(document.querySelector('.tab-item[data-tab="4"]').getAttribute('data-checked')).toBe('false');
  });
});

