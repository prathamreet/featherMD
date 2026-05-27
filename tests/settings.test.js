// ========================================
// Feather MD -- Settings Panel Tests
// ========================================
// Covers: initialization from config, each control type change callback,
//         panel open/close toggle, close button, edge cases

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initSettings, toggleSettings, closeSettings } from '../src/settings.js';

/**
 * Helper: create the settings panel DOM structure.
 */
function setupSettingsDOM() {
  document.body.innerHTML = `
    <button id="btn-settings"></button>
    <div id="settings-panel" class="settings-panel" hidden>
      <button id="btn-close-settings"></button>
      <input type="range" id="setting-font-size" min="12" max="20" value="14" />
      <span id="setting-font-size-value">14px</span>
      <select id="setting-font-family">
        <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
        <option value="'Fira Code', monospace">Fira Code</option>
        <option value="'Cascadia Code', monospace">Cascadia Code</option>
        <option value="monospace">System Monospace</option>
      </select>
      <select id="setting-tab-size">
        <option value="2">2 spaces</option>
        <option value="4" selected>4 spaces</option>
      </select>
      <input type="checkbox" id="setting-word-wrap" checked />
      <input type="checkbox" id="setting-vim-mode" />
    </div>
  `;
}

const DEFAULT_CONFIG = {
  fontSize: 14,
  fontFamily: "'JetBrains Mono', monospace",
  tabSize: 4,
  wordWrap: true,
  vimMode: false,
};

// -- Initialization --

describe('Settings -- Initialization from Config', () => {
  let spy;

  beforeEach(() => {
    setupSettingsDOM();
    closeSettings();
    spy = vi.fn();
    initSettings({ ...DEFAULT_CONFIG }, spy);
  });

  it('should set font size slider value from config', () => {
    expect(document.getElementById('setting-font-size').value).toBe('14');
  });

  it('should set font size display label from config', () => {
    expect(document.getElementById('setting-font-size-value').textContent).toBe('14px');
  });

  it('should set tab size select from config', () => {
    expect(document.getElementById('setting-tab-size').value).toBe('4');
  });

  it('should set word wrap checkbox from config (true)', () => {
    expect(document.getElementById('setting-word-wrap').checked).toBe(true);
  });

  it('should set vim mode checkbox from config (false)', () => {
    expect(document.getElementById('setting-vim-mode').checked).toBe(false);
  });

  it('should initialize with non-default config values', () => {
    setupSettingsDOM();
    initSettings({ ...DEFAULT_CONFIG, fontSize: 18, tabSize: 2, wordWrap: false, vimMode: true }, spy);
    expect(document.getElementById('setting-font-size').value).toBe('18');
    expect(document.getElementById('setting-tab-size').value).toBe('2');
    expect(document.getElementById('setting-word-wrap').checked).toBe(false);
    expect(document.getElementById('setting-vim-mode').checked).toBe(true);
  });
});

// -- Change Callbacks --

describe('Settings -- Change Callbacks', () => {
  let spy;

  beforeEach(() => {
    setupSettingsDOM();
    closeSettings();
    spy = vi.fn();
    initSettings({ ...DEFAULT_CONFIG }, spy);
  });

  it('should fire callback with (fontSize, value) on slider input', () => {
    const input = document.getElementById('setting-font-size');
    input.value = '18';
    input.dispatchEvent(new Event('input'));
    expect(spy).toHaveBeenCalledWith('fontSize', 18);
  });

  it('should update display label when font size changes', () => {
    const input = document.getElementById('setting-font-size');
    input.value = '16';
    input.dispatchEvent(new Event('input'));
    expect(document.getElementById('setting-font-size-value').textContent).toBe('16px');
  });

  it('should fire callback with (fontFamily, value) on select change', () => {
    const select = document.getElementById('setting-font-family');
    select.value = 'monospace';
    select.dispatchEvent(new Event('change'));
    expect(spy).toHaveBeenCalledWith('fontFamily', 'monospace');
  });

  it('should fire callback with (tabSize, number) on select change', () => {
    const select = document.getElementById('setting-tab-size');
    select.value = '2';
    select.dispatchEvent(new Event('change'));
    expect(spy).toHaveBeenCalledWith('tabSize', 2);
  });

  it('should fire callback with (wordWrap, false) when unchecked', () => {
    const checkbox = document.getElementById('setting-word-wrap');
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change'));
    expect(spy).toHaveBeenCalledWith('wordWrap', false);
  });

  it('should fire callback with (wordWrap, true) when checked', () => {
    const checkbox = document.getElementById('setting-word-wrap');
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change'));
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    expect(spy).toHaveBeenCalledWith('wordWrap', true);
  });

  it('should fire callback with (vimMode, true) when enabled', () => {
    const checkbox = document.getElementById('setting-vim-mode');
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    expect(spy).toHaveBeenCalledWith('vimMode', true);
  });

  it('should fire callback with (vimMode, false) when disabled', () => {
    const checkbox = document.getElementById('setting-vim-mode');
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change'));
    expect(spy).toHaveBeenCalledWith('vimMode', false);
  });

  it('should handle rapid successive changes without errors', () => {
    const input = document.getElementById('setting-font-size');
    for (let i = 12; i <= 20; i++) {
      input.value = String(i);
      input.dispatchEvent(new Event('input'));
    }
    expect(spy).toHaveBeenCalledTimes(9);
    expect(spy).toHaveBeenLastCalledWith('fontSize', 20);
  });
});

// -- Panel Toggle --

describe('Settings -- Panel Toggle', () => {
  beforeEach(() => {
    setupSettingsDOM();
    closeSettings();
    initSettings({ ...DEFAULT_CONFIG }, vi.fn());
  });

  it('should start with panel closed', () => {
    expect(document.getElementById('settings-panel').classList.contains('open')).toBe(false);
  });

  it('should open panel on first toggle', () => {
    toggleSettings();
    expect(document.getElementById('settings-panel').classList.contains('open')).toBe(true);
    expect(document.getElementById('settings-panel').hidden).toBe(false);
  });

  it('should add "active" class to settings button when open', () => {
    toggleSettings();
    expect(document.getElementById('btn-settings').classList.contains('active')).toBe(true);
  });

  it('should add "open" class to panel when open', () => {
    toggleSettings();
    expect(document.getElementById('settings-panel').classList.contains('open')).toBe(true);
  });

  it('should close panel on closeSettings()', () => {
    toggleSettings(); // open
    closeSettings();
    expect(document.getElementById('settings-panel').classList.contains('open')).toBe(false);
  });

  it('should remove "active" class from settings button on close', () => {
    toggleSettings(); // open
    closeSettings();
    expect(document.getElementById('btn-settings').classList.contains('active')).toBe(false);
  });

  it('should close panel on second toggle (open then close)', () => {
    toggleSettings(); // open
    toggleSettings(); // close
    expect(document.getElementById('settings-panel').classList.contains('open')).toBe(false);
  });
});

// -- Close Button --

describe('Settings -- Close Button', () => {
  beforeEach(() => {
    setupSettingsDOM();
    closeSettings();
    initSettings({ ...DEFAULT_CONFIG }, vi.fn());
  });

  it('should close settings when close button is clicked', () => {
    toggleSettings(); // open
    document.getElementById('btn-close-settings').click();
    expect(document.getElementById('settings-panel').classList.contains('open')).toBe(false);
  });
});
