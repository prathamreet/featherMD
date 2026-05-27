// ========================================
// Feather MD — Main Entry Point
// ========================================
// Wires editor ↔ preview ↔ Tauri IPC ↔ toolbar ↔ settings

import { initEditor } from './editor.js';
import { initPreview } from './preview.js';
import { initScrollSync, setSyncEnabled } from './sync.js';
import { initThemes, setTheme } from './themes.js';
import { initSettings, toggleSettings } from './settings.js';
import { initToolbar, setToolbarButtonActive } from './toolbar.js';
import { initUpdater } from './updater.js';

// ---- HMR-Resistant Persistent State ----
// Preserves editor path, dirty state, and line endings across hot-reloads
let editorAPI = null;
let previewAPI = null;
Object.defineProperty(window, 'currentFilePath', {
  get: () => window.__FEATHER_PATH__ || null,
  set: (val) => { window.__FEATHER_PATH__ = val; },
  configurable: true
});
Object.defineProperty(window, 'isDirty', {
  get: () => window.__FEATHER_DIRTY__ || false,
  set: (val) => { window.__FEATHER_DIRTY__ = val; },
  configurable: true
});
Object.defineProperty(window, 'lineEnding', {
  get: () => window.__FEATHER_LINE_ENDING__ || 'LF',
  set: (val) => { window.__FEATHER_LINE_ENDING__ = val; },
  configurable: true
});
let config = {
  theme: null,
  fontSize: 14,
  fontFamily: "'JetBrains Mono', monospace",
  tabSize: 4,
  wordWrap: true,
  vimMode: false,
  lineNumbers: true,
  syncScroll: true,
  recentFiles: [],
  splitRatio: 0.5,
};

let isTauri = false;

// ---- Initialize ----
window.addEventListener('DOMContentLoaded', async () => {
  try {
    await import('@tauri-apps/api/core');
    isTauri = true;
  } catch {
    // Not running inside Tauri — browser mode
  }
  // Initialize editor
  editorAPI = initEditor(document.getElementById('editor-pane'), onContentChange, updateCursorPosition);

  // Initialize preview
  previewAPI = initPreview(document.getElementById('preview-content'));

  // Initialize scroll sync
  initScrollSync(editorAPI, previewAPI);

  // Initialize themes
  initThemes(config, (themeName) => {
    config.theme = themeName;
    saveConfig();
  });

  // Initialize settings
  initSettings(config, onSettingChange);

  // Initialize toolbar
  initToolbar({
    onOpen: openFile,
    onSave: saveFile,
    onNew: newFile,
    onSyncToggle: (enabled) => {
      setSyncEnabled(enabled);
      config.syncScroll = enabled;
      saveConfig();
    },
    onThemeSelect: (theme) => {
      setTheme(theme);
      config.theme = theme;
      saveConfig();
    },
    onLineNumbersToggle: (show) => {
      editorAPI.setLineNumbers(show);
      config.lineNumbers = show;
      saveConfig();
    },
    onWordWrapToggle: (wrap) => {
      editorAPI.setLineWrapping(wrap);
      config.wordWrap = wrap;
      saveConfig();
    },
    onVimToggle: async (enabled) => {
      await editorAPI.setVimMode(enabled);
      config.vimMode = enabled;
      saveConfig();
    },
    onSettings: toggleSettings,
  });

  // Initialize divider drag
  initDividerDrag();

  // Initialize keyboard shortcuts
  initKeyboardShortcuts();

  // Initialize shortcuts modal close bindings
  initShortcutsModal();

  // Initialize window controls (Tauri)
  initWindowControls();

  // Listen for Tauri file-opened event
  if (isTauri) {
    try {
      const { listen } = await import('@tauri-apps/api/event');
      listen('file-opened', (event) => {
        const { path, content } = event.payload;
        loadFileContent(path, content);
      });

      // Request initial file from backend if loaded via CLI / OS file association
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const initialFile = await invoke('get_initial_file');
        if (initialFile) {
          loadFileContent(initialFile.path, initialFile.content);
        }
      } catch (err) {
        console.error('Failed to retrieve initial file:', err);
      }

      // Handle close request (unsaved changes guard)
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const appWindow = getCurrentWindow();
      appWindow.onCloseRequested(async (event) => {
        // Unconditionally prevent the default close synchronously to handle the close flow programmatically
        event.preventDefault();

        if (isDirty) {
          const response = await showUnsavedDialog();

          if (response === 'save') {
            await saveFile();
            if (!isDirty) {
              await appWindow.destroy();
            }
            // If still dirty (user cancelled save-as dialog), keep window open
          } else if (response === 'discard') {
            isDirty = false;
            await appWindow.destroy();
          }
          // 'cancel' → keep window open (do nothing)
        } else {
          // If not dirty, destroy the window cleanly
          await appWindow.destroy();
        }
      });
    } catch {
      console.log('Tauri API not available — running in browser mode');
    }
  }

  // Check for app updates (Tauri only, non-blocking)
  initUpdater();

  // Apply font settings
  applyFontSettings();

  // Set initial content (welcome text) if no file was loaded
  if (!currentFilePath) {
    const welcomeText = `# Welcome to Feather MD v1.3.1

A lightweight markdown editor designed for speed and simplicity.

> **Update Successful!** You are now running **v1.3.1**, successfully delivered via the newly integrated over-the-air (OTA) auto-updater pipeline.

## Features

- **Auto-Updater** - Secure, instant OTA updates with cryptographic verification
- **Live Preview** - Real-time visual rendering of your writing
- **Synchronized Scrolling** - Dynamic split-pane scroll alignment
- **Premium Themes** - Clean aesthetic color palettes
- **Hotkeys** - Complete keyboard control via shortcuts

## Getting Started

Type here to start, or load a document using \`Ctrl+O\`.

### Code Blocks

\`\`\`javascript
function hello() {
  console.log("Hello from Feather MD v1.3.1!");
}
\`\`\`

### Tables

| Feature | Status |
|---------|--------|
| Editor | Ready |
| Preview | Ready |
| Sync Scroll | Ready |
| Auto-Updater | Running |

### Task List

- [x] Create initial draft
- [x] Integrate auto-updater
- [x] Release to production
- [ ] Write new articles

> **Tip:** Press \`Ctrl+?\` at any time to view all available keyboard shortcuts.
`;

    editorAPI.setValue(welcomeText);
    editorAPI.focus();
  }
});

// ---- Content Change Handler ----
function onContentChange(text, isProgrammatic) {
  previewAPI.renderMarkdown(text);
  updateStatusBar(text);
  if (isProgrammatic) {
    isDirty = false;
    updateTitleBar();
  } else {
    if (!isDirty) {
      isDirty = true;
      updateTitleBar();
    }
  }
}

// ---- File Operations ----
async function openFile() {
  if (!await confirmDiscardChanges()) return;

  if (isTauri) {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { readTextFile } = await import('@tauri-apps/plugin-fs');
      const selected = await open({
        filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }],
      });
      if (selected) {
        const content = await readTextFile(selected);
        loadFileContent(selected, content);
      }
    } catch (e) {
      console.error('Failed to open file:', e);
    }
  } else {
    // Browser fallback: use file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.markdown,.txt';
    input.onchange = async () => {
      const file = input.files[0];
      if (file) {
        const text = await file.text();
        loadFileContent(file.name, text);
      }
    };
    input.click();
  }
}

async function saveFile() {
  if (isTauri && currentFilePath) {
    try {
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');
      await writeTextFile(currentFilePath, editorAPI.getValue());
      isDirty = false;
      updateTitleBar();
    } catch (e) {
      console.error('Failed to save file:', e);
    }
  } else {
    await saveFileAs();
  }
}

async function saveFileAs() {
  if (isTauri) {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');
      const path = await save({
        filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }],
      });
      if (path) {
        await writeTextFile(path, editorAPI.getValue());
        currentFilePath = path;
        isDirty = false;
        updateTitleBar();
      }
    } catch (e) {
      console.error('Failed to save file:', e);
    }
  } else {
    // Browser fallback: download
    const blob = new Blob([editorAPI.getValue()], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFilePath || 'untitled.md';
    a.click();
    URL.revokeObjectURL(url);
    isDirty = false;
    updateTitleBar();
  }
}

async function newFile() {
  if (!await confirmDiscardChanges()) return;
  currentFilePath = null;
  editorAPI.setValue('');
  isDirty = false;
  lineEnding = 'LF';
  updateTitleBar();
  updateStatusBar('');
  editorAPI.focus();
}

function loadFileContent(path, content) {
  currentFilePath = path;
  lineEnding = content.includes('\r\n') ? 'CRLF' : 'LF';
  editorAPI.setValue(content);
  isDirty = false;
  updateTitleBar();
  updateStatusBar(content);
  editorAPI.focus();
}

// ---- UI Updates ----
function updateTitleBar() {
  const titleEl = document.getElementById('title-bar-text');
  let name = 'Untitled';
  if (currentFilePath) {
    // Extract filename from path
    const parts = currentFilePath.replace(/\\/g, '/').split('/');
    name = parts[parts.length - 1];
  }
  titleEl.textContent = isDirty ? `Feather MD — •${name}` : `Feather MD — ${name}`;
  document.title = titleEl.textContent;
}

function updateStatusBar(text) {
  // Word count
  const words = text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  document.getElementById('status-wordcount').textContent = `${words} word${words !== 1 ? 's' : ''}`;

  // File path
  const pathEl = document.getElementById('status-filepath');
  pathEl.textContent = currentFilePath || 'Untitled';
  pathEl.title = currentFilePath || 'Untitled';

  // Cursor position (updated separately on selection change)
  updateCursorPosition();

  // Line ending
  document.getElementById('status-line-ending').textContent = lineEnding;
}

function updateCursorPosition() {
  if (!editorAPI) return;
  const { line, col } = editorAPI.getCursorPosition();
  document.getElementById('status-cursor').textContent = `Ln ${line}, Col ${col}`;
}

// ---- Divider Drag ----
function initDividerDrag() {
  const divider = document.getElementById('divider');
  const container = document.getElementById('split-container');
  const editorPane = document.getElementById('editor-pane');
  const previewPane = document.getElementById('preview-pane');

  let isDragging = false;

  divider.addEventListener('mousedown', (e) => {
    isDragging = true;
    divider.classList.add('dragging');
    document.body.classList.add('resizing');
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const rect = container.getBoundingClientRect();
    let ratio = (e.clientX - rect.left) / rect.width;
    ratio = Math.max(0.2, Math.min(0.8, ratio));
    editorPane.style.width = `${ratio * 100}%`;
    previewPane.style.width = `${(1 - ratio) * 100}%`;
    config.splitRatio = ratio;
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      divider.classList.remove('dragging');
      document.body.classList.remove('resizing');
      saveConfig();
    }
  });

  // Double-click to reset 50/50
  divider.addEventListener('dblclick', () => {
    editorPane.style.width = '50%';
    previewPane.style.width = '50%';
    config.splitRatio = 0.5;
    saveConfig();
  });
}

// ---- Window Controls (Tauri) ----
async function initWindowControls() {
  if (!isTauri) return;

  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const appWindow = getCurrentWindow();

    document.getElementById('btn-minimize').addEventListener('click', () => appWindow.minimize());
    document.getElementById('btn-maximize').addEventListener('click', async () => {
      const isMaximized = await appWindow.isMaximized();
      isMaximized ? appWindow.unmaximize() : appWindow.maximize();
    });
    document.getElementById('btn-close').addEventListener('click', () => appWindow.close());
  } catch {
    console.log('Window controls not available in browser mode');
  }
}

// ---- Keyboard Shortcuts ----
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;

    // Ctrl+O — Open
    if (ctrl && !shift && e.key === 'o') {
      e.preventDefault();
      openFile();
    }

    // Ctrl+S — Save
    if (ctrl && !shift && e.key === 's') {
      e.preventDefault();
      saveFile();
    }

    // Ctrl+Shift+S — Save As
    if (ctrl && shift && e.key === 'S') {
      e.preventDefault();
      saveFileAs();
    }

    // Ctrl+N — New
    if (ctrl && !shift && e.key === 'n') {
      e.preventDefault();
      newFile();
    }

    // Ctrl+L — Toggle line numbers
    if (ctrl && !shift && e.key === 'l') {
      e.preventDefault();
      const btn = document.getElementById('btn-line-numbers');
      const isActive = btn.classList.toggle('active');
      editorAPI.setLineNumbers(isActive);
      config.lineNumbers = isActive;
      saveConfig();
    }

    // Alt+Z — Toggle word wrap
    if (e.altKey && e.key === 'z') {
      e.preventDefault();
      const btn = document.getElementById('btn-word-wrap');
      const isActive = btn.classList.toggle('active');
      editorAPI.setLineWrapping(isActive);
      config.wordWrap = isActive;
      saveConfig();
    }

    // Alt+S — Toggle sync scroll
    if (e.altKey && e.key === 's') {
      e.preventDefault();
      const btn = document.getElementById('btn-sync-scroll');
      const isActive = btn.classList.toggle('active');
      setSyncEnabled(isActive);
      config.syncScroll = isActive;
      saveConfig();
    }

    // Ctrl+, — Settings
    if (ctrl && e.key === ',') {
      e.preventDefault();
      toggleSettings();
    }

    // Ctrl+? — Shortcuts modal
    if (ctrl && (e.key === '?' || (shift && e.key === '/'))) {
      e.preventDefault();
      toggleShortcutsModal();
    }
  });

}

// ---- Unsaved Changes Guard (CODE-01: consolidated from openFile + newFile) ----
// Returns true if it is safe to proceed (user saved or discarded), false to abort.
async function confirmDiscardChanges() {
  if (!isDirty) return true;
  const response = await showUnsavedDialog();
  if (response === 'save') {
    await saveFile();
    return !isDirty; // true if save succeeded, false if cancelled
  }
  return response === 'discard';
}

// ---- Unsaved Changes Dialog ----
// Custom 3-button dialog: Save / Don't Save / Cancel
// Returns a Promise that resolves to 'save', 'discard', or 'cancel'
function showUnsavedDialog() {
  return new Promise((resolve) => {
    const dialog = document.getElementById('unsaved-dialog');
    const btnSave = document.getElementById('unsaved-btn-save');
    const btnDiscard = document.getElementById('unsaved-btn-discard');
    const btnCancel = document.getElementById('unsaved-btn-cancel');

    dialog.hidden = false;

    // Focus the Save button by default for keyboard accessibility
    setTimeout(() => btnSave.focus(), 50);

    function cleanup(result) {
      dialog.hidden = true;
      btnSave.removeEventListener('click', onSave);
      btnDiscard.removeEventListener('click', onDiscard);
      btnCancel.removeEventListener('click', onCancel);
      dialog.removeEventListener('click', onOverlayClick);
      document.removeEventListener('keydown', onKeydown);
      resolve(result);
    }

    function onSave() { cleanup('save'); }
    function onDiscard() { cleanup('discard'); }
    function onCancel() { cleanup('cancel'); }
    function onOverlayClick(e) {
      if (e.target === dialog) cleanup('cancel');
    }
    function onKeydown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        cleanup('cancel');
      }
    }

    btnSave.addEventListener('click', onSave);
    btnDiscard.addEventListener('click', onDiscard);
    btnCancel.addEventListener('click', onCancel);
    dialog.addEventListener('click', onOverlayClick);
    document.addEventListener('keydown', onKeydown);
  });
}

// ---- Shortcuts Modal ----
function toggleShortcutsModal() {
  const modal = document.getElementById('shortcuts-modal');
  modal.hidden = !modal.hidden;
}

function initShortcutsModal() {
  const modal = document.getElementById('shortcuts-modal');
  const closeBtn = document.getElementById('btn-close-shortcuts');
  closeBtn?.addEventListener('click', () => {
    modal.hidden = true;
  });
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.hidden = true;
  });
}

// ---- Settings Change Handler ----
function onSettingChange(key, value) {
  config[key] = value;

  switch (key) {
    case 'fontSize':
      document.documentElement.style.setProperty('--font-size', `${value}px`);
      break;
    case 'fontFamily':
      document.documentElement.style.setProperty('--font-mono', value);
      break;
    case 'tabSize':
      editorAPI.setTabSize(value);
      break;
    case 'wordWrap':
      editorAPI.setLineWrapping(value);
      setToolbarButtonActive('btn-word-wrap', value);
      break;
    case 'vimMode':
      editorAPI.setVimMode(value);
      setToolbarButtonActive('btn-vim', value);
      break;
  }

  saveConfig();
}

// ---- Font Settings ----
function applyFontSettings() {
  if (config.fontSize) {
    document.documentElement.style.setProperty('--font-size', `${config.fontSize}px`);
  }
  if (config.fontFamily) {
    document.documentElement.style.setProperty('--font-mono', config.fontFamily);
  }
}

// ---- Config Persistence ----
function saveConfig() {
  // For now, save to localStorage (Tauri will use fs in Phase 3)
  try {
    localStorage.setItem('feathermd-config', JSON.stringify(config));
  } catch {
    // Ignore storage errors
  }
}

function loadConfig() {
  try {
    const stored = localStorage.getItem('feathermd-config');
    if (stored) {
      Object.assign(config, JSON.parse(stored));
    }
  } catch {
    // Ignore storage errors
  }
}

// Load config on module init
loadConfig();
