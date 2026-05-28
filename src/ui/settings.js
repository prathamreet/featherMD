// ========================================
// Feather MD — Settings Panel Logic
// ========================================

import { escapeHtml } from '../core/utils.js';

let settingsOpen = false;
let config = {};
let onConfigChangeCallback = null;

/**
 * Initialize the settings panel
 * @param {Object} initialConfig - Current config object
 * @param {Function} onConfigChange - Called when any setting changes with (key, value)
 */
export function initSettings(initialConfig, onConfigChange) {
  config = { ...initialConfig };
  onConfigChangeCallback = onConfigChange;

  // Note: the toolbar (toolbar.js) owns the click binding for #btn-settings via
  // the onSettings callback. Binding it here too would call toggleSettings twice
  // per click and immediately re-close the panel.
  const btnClose = document.getElementById('btn-close-settings');
  btnClose.addEventListener('click', closeSettings);

  // Font size
  const fontSizeInput = document.getElementById('setting-font-size');
  const fontSizeValue = document.getElementById('setting-font-size-value');
  fontSizeInput.value = config.fontSize || 14;
  fontSizeValue.textContent = `${fontSizeInput.value}px`;
  fontSizeInput.addEventListener('input', () => {
    const val = parseInt(fontSizeInput.value, 10);
    fontSizeValue.textContent = `${val}px`;
    updateSetting('fontSize', val);
  });

  // Font family
  const fontFamilySelect = document.getElementById('setting-font-family');
  if (config.fontFamily) {
    fontFamilySelect.value = config.fontFamily;
  }
  fontFamilySelect.addEventListener('change', () => {
    updateSetting('fontFamily', fontFamilySelect.value);
  });

  // Tab size
  const tabSizeSelect = document.getElementById('setting-tab-size');
  tabSizeSelect.value = config.tabSize || 4;
  tabSizeSelect.addEventListener('change', () => {
    updateSetting('tabSize', parseInt(tabSizeSelect.value, 10));
  });

  // Word wrap toggle
  const wordWrapToggle = document.getElementById('setting-word-wrap');
  wordWrapToggle.checked = config.wordWrap !== false;
  wordWrapToggle.addEventListener('change', () => {
    updateSetting('wordWrap', wordWrapToggle.checked);
  });

  // Vim mode toggle
  const vimToggle = document.getElementById('setting-vim-mode');
  vimToggle.checked = config.vimMode === true;
  vimToggle.addEventListener('change', () => {
    updateSetting('vimMode', vimToggle.checked);
  });
}

function updateSetting(key, value) {
  config[key] = value;
  if (onConfigChangeCallback) {
    onConfigChangeCallback(key, value);
  }
}

export function toggleSettings() {
  settingsOpen = !settingsOpen;
  const panel = document.getElementById('settings-panel');
  const btnSettings = document.getElementById('btn-settings');
  if (settingsOpen) {
    panel.hidden = false;
    // Force reflow before adding class for animation
    panel.offsetHeight;
    panel.classList.add('open');
    btnSettings.classList.add('active');
  } else {
    closeSettings();
  }
}

export function closeSettings() {
  settingsOpen = false;
  const panel = document.getElementById('settings-panel');
  const btnSettings = document.getElementById('btn-settings');
  panel.classList.remove('open');
  btnSettings.classList.remove('active');
  setTimeout(() => {
    panel.hidden = true;
  }, 200);
}


/**
 * Update the settings panel UI to match a new configuration state
 */
export function updateSettingsUI(newConfig) {
  Object.assign(config, newConfig);

  const wordWrapToggle = document.getElementById('setting-word-wrap');
  if (wordWrapToggle) {
    wordWrapToggle.checked = config.wordWrap !== false;
  }

  const vimToggle = document.getElementById('setting-vim-mode');
  if (vimToggle) {
    vimToggle.checked = config.vimMode === true;
  }
}

/**
 * Dynamically rebuild the Recent Files UI container
 */
export function updateRecentFiles(recentFiles, onFileSelect) {
  const container = document.getElementById('settings-recent-files');
  if (!container) return;

  if (!recentFiles || recentFiles.length === 0) {
    container.innerHTML = '<div class="recent-files-empty">No recent files</div>';
    return;
  }

  container.innerHTML = '';
  recentFiles.forEach((filePath) => {
    const item = document.createElement('div');
    item.className = 'recent-file-item';
    
    // Extract filename
    const parts = filePath.replace(/\\/g, '/').split('/');
    const name = parts.pop() || 'Untitled';
    
    item.innerHTML = `
      <span class="recent-file-name" title="${escapeHtml(name)}">${escapeHtml(name)}</span>
      <span class="recent-file-path" title="${escapeHtml(filePath)}">${escapeHtml(filePath)}</span>
    `;
    
    item.addEventListener('click', () => {
      if (onFileSelect) {
        onFileSelect(filePath);
      }
    });
    
    container.appendChild(item);
  });
}


