// ========================================
// Feather MD -- Toolbar Event Binding Tests
// ========================================
// Covers: button click handlers, toggle state management, theme dropdown
//         visibility, click-outside dismiss, setToolbarButtonActive utility

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initToolbar, setToolbarButtonActive } from '../../src/ui/toolbar.js';

/**
 * Helper: create the full toolbar DOM structure required by toolbar.js
 */
function setupToolbarDOM() {
  document.body.innerHTML = `
    <button id="btn-open" class="toolbar-btn"></button>
    <button id="btn-save" class="toolbar-btn"></button>
    <button id="btn-new" class="toolbar-btn"></button>
    <button id="btn-sync-scroll" class="toolbar-btn active"></button>
    <div id="theme-dropdown">
      <button id="btn-theme" class="toolbar-btn"></button>
      <div id="theme-menu" class="dropdown-menu" hidden>
        <button class="dropdown-item" data-theme="snow">Snow</button>
        <button class="dropdown-item" data-theme="onyx">Onyx</button>
      </div>
    </div>
    <button id="btn-line-numbers" class="toolbar-btn active"></button>
    <button id="btn-word-wrap" class="toolbar-btn active"></button>
    <button id="btn-vim" class="toolbar-btn"></button>
    <button id="btn-settings" class="toolbar-btn"></button>
  `;
}

// -- Button Click Handlers --

describe('Toolbar -- Button Click Handlers', () => {
  let handlers;

  beforeEach(() => {
    setupToolbarDOM();
    handlers = {
      onOpen: vi.fn(),
      onSave: vi.fn(),
      onNew: vi.fn(),
      onSyncToggle: vi.fn(),
      onThemeSelect: vi.fn(),
      onLineNumbersToggle: vi.fn(),
      onWordWrapToggle: vi.fn(),
      onVimToggle: vi.fn(),
      onSettings: vi.fn(),
    };
    initToolbar(handlers);
  });

  it('should fire onOpen when open button is clicked', () => {
    document.getElementById('btn-open').click();
    expect(handlers.onOpen).toHaveBeenCalledOnce();
  });

  it('should fire onSave when save button is clicked', () => {
    document.getElementById('btn-save').click();
    expect(handlers.onSave).toHaveBeenCalledOnce();
  });

  it('should fire onNew when new button is clicked', () => {
    document.getElementById('btn-new').click();
    expect(handlers.onNew).toHaveBeenCalledOnce();
  });

  it('should fire onSettings when settings button is clicked', () => {
    document.getElementById('btn-settings').click();
    expect(handlers.onSettings).toHaveBeenCalledOnce();
  });
});

// -- Toggle Buttons --

describe('Toolbar -- Toggle Button State', () => {
  let handlers;

  beforeEach(() => {
    setupToolbarDOM();
    handlers = {
      onOpen: vi.fn(),
      onSave: vi.fn(),
      onNew: vi.fn(),
      onSyncToggle: vi.fn(),
      onThemeSelect: vi.fn(),
      onLineNumbersToggle: vi.fn(),
      onWordWrapToggle: vi.fn(),
      onVimToggle: vi.fn(),
      onSettings: vi.fn(),
    };
    initToolbar(handlers);
  });

  it('should toggle sync scroll and fire callback with new state', () => {
    const btn = document.getElementById('btn-sync-scroll');
    // Initially has 'active' class, clicking should remove it
    btn.click();
    expect(handlers.onSyncToggle).toHaveBeenCalledWith(false);
    // Click again to re-enable
    btn.click();
    expect(handlers.onSyncToggle).toHaveBeenCalledWith(true);
  });

  it('should toggle line numbers and fire callback with new state', () => {
    const btn = document.getElementById('btn-line-numbers');
    btn.click(); // was active, now inactive
    expect(handlers.onLineNumbersToggle).toHaveBeenCalledWith(false);
  });

  it('should toggle word wrap and fire callback with new state', () => {
    const btn = document.getElementById('btn-word-wrap');
    btn.click(); // was active, now inactive
    expect(handlers.onWordWrapToggle).toHaveBeenCalledWith(false);
  });

  it('should toggle vim mode and fire callback with new state', () => {
    const btn = document.getElementById('btn-vim');
    btn.click(); // was inactive, now active
    expect(handlers.onVimToggle).toHaveBeenCalledWith(true);
  });
});

// -- Theme Dropdown --

describe('Toolbar -- Theme Dropdown', () => {
  let handlers;

  beforeEach(() => {
    setupToolbarDOM();
    handlers = {
      onOpen: vi.fn(),
      onSave: vi.fn(),
      onNew: vi.fn(),
      onSyncToggle: vi.fn(),
      onThemeSelect: vi.fn(),
      onLineNumbersToggle: vi.fn(),
      onWordWrapToggle: vi.fn(),
      onVimToggle: vi.fn(),
      onSettings: vi.fn(),
    };
    initToolbar(handlers);
  });

  it('should open theme menu when theme button is clicked', () => {
    const menu = document.getElementById('theme-menu');
    expect(menu.hidden).toBe(true);
    document.getElementById('btn-theme').click();
    expect(menu.hidden).toBe(false);
  });

  it('should close theme menu when theme button is clicked again', () => {
    const menu = document.getElementById('theme-menu');
    document.getElementById('btn-theme').click(); // open
    document.getElementById('btn-theme').click(); // close
    expect(menu.hidden).toBe(true);
  });

  it('should fire onThemeSelect and close menu when a theme item is clicked', () => {
    const menu = document.getElementById('theme-menu');
    document.getElementById('btn-theme').click(); // open
    const onyxItem = menu.querySelector('[data-theme="onyx"]');
    onyxItem.click();
    expect(handlers.onThemeSelect).toHaveBeenCalledWith('onyx');
    expect(menu.hidden).toBe(true);
  });

  it('should close theme menu on click outside', () => {
    const menu = document.getElementById('theme-menu');
    document.getElementById('btn-theme').click(); // open
    expect(menu.hidden).toBe(false);
    // Click on document body (outside the menu)
    document.body.click();
    expect(menu.hidden).toBe(true);
  });
});

// -- setToolbarButtonActive Utility --

describe('Toolbar -- setToolbarButtonActive Utility', () => {
  beforeEach(() => setupToolbarDOM());

  it('should add "active" class when active=true', () => {
    setToolbarButtonActive('btn-vim', true);
    expect(document.getElementById('btn-vim').classList.contains('active')).toBe(true);
  });

  it('should remove "active" class when active=false', () => {
    setToolbarButtonActive('btn-sync-scroll', false);
    expect(document.getElementById('btn-sync-scroll').classList.contains('active')).toBe(false);
  });

  it('should not crash for a non-existent button ID', () => {
    expect(() => setToolbarButtonActive('nonexistent', true)).not.toThrow();
  });
});
