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
  setFontSizeSlider,
  updateRecentFilesMenu,
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
            <div class="menu-submenu">
              <button class="menu-item has-submenu" data-action="recent-files">
                <span class="menu-item-label">Recent Files</span>
              </button>
              <div class="submenu-panel" id="recent-files-submenu">
                <div class="menu-item-empty">No recent files</div>
              </div>
            </div>
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
            <button class="menu-item checkable font-item" data-action="set-font" data-font="'JetBrains Mono', monospace" data-checked="true">
              <span class="menu-check"><svg></svg></span>
              <span class="menu-item-label">JetBrains Mono</span>
            </button>
            <button class="menu-item checkable font-item" data-action="set-font" data-font="monospace">
              <span class="menu-check"><svg></svg></span>
              <span class="menu-item-label">System Monospace</span>
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
        <div id="font-size-control">
          <label id="font-size-label" for="header-font-size">14px</label>
          <input type="range" id="header-font-size" min="12" max="20" value="14" />
        </div>
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

  it('should close menu after theme selection', () => {
    // Open style menu first
    document.querySelector('[data-menu="style-menu"]').click();
    expect(document.getElementById('style-menu').hidden).toBe(false);
    document.querySelector('[data-theme="onyx"]').click();
    expect(document.getElementById('style-menu').hidden).toBe(true);
  });
});

// -- Font Size Slider --

describe('Toolbar -- Font Size Slider', () => {
  let handlers;

  beforeEach(() => {
    setupMenuBarDOM();
    handlers = createHandlers();
    initToolbar(handlers);
  });

  it('should fire onFontSize when slider value changes', () => {
    const slider = document.getElementById('header-font-size');
    slider.value = '18';
    slider.dispatchEvent(new Event('input'));
    expect(handlers.onFontSize).toHaveBeenCalledWith(18);
  });

  it('should update label when slider value changes', () => {
    const slider = document.getElementById('header-font-size');
    slider.value = '16';
    slider.dispatchEvent(new Event('input'));
    expect(document.getElementById('font-size-label').textContent).toBe('16px');
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

// -- setFontSizeSlider Utility --

describe('Toolbar -- setFontSizeSlider Utility', () => {
  beforeEach(() => setupMenuBarDOM());

  it('should update slider value and label', () => {
    setFontSizeSlider(18);
    expect(document.getElementById('header-font-size').value).toBe('18');
    expect(document.getElementById('font-size-label').textContent).toBe('18px');
  });
});

// -- updateRecentFilesMenu Utility --

describe('Toolbar -- updateRecentFilesMenu', () => {
  beforeEach(() => setupMenuBarDOM());

  it('should show empty message when no recent files', () => {
    updateRecentFilesMenu([], vi.fn());
    const container = document.getElementById('recent-files-submenu');
    expect(container.querySelector('.menu-item-empty')).toBeTruthy();
  });

  it('should render recent file items', () => {
    updateRecentFilesMenu(['/path/to/file.md', '/path/to/other.md'], vi.fn());
    const container = document.getElementById('recent-files-submenu');
    const items = container.querySelectorAll('.recent-submenu-item');
    expect(items.length).toBe(2);
  });

  it('should fire callback when a recent file is clicked', () => {
    const spy = vi.fn();
    updateRecentFilesMenu(['/path/to/file.md'], spy);
    const container = document.getElementById('recent-files-submenu');
    container.querySelector('.recent-submenu-item').click();
    expect(spy).toHaveBeenCalledWith('/path/to/file.md');
  });
});

// -- setActiveFontFamily Utility --

describe('Toolbar -- setActiveFontFamily Utility', () => {
  beforeEach(() => setupMenuBarDOM());

  it('should mark the correct font family as checked', () => {
    setActiveFontFamily('monospace');
    expect(document.querySelector('.font-item[data-font="monospace"]').getAttribute('data-checked')).toBe('true');
    expect(document.querySelector('.font-item[data-font="\'JetBrains Mono\', monospace"]').getAttribute('data-checked')).toBe('false');
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

