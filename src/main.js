// ========================================
// Feather MD — Main Entry Point
// ========================================
// Wires editor ↔ preview ↔ Tauri IPC ↔ toolbar ↔ settings

import { initEditor } from './editor.js';
import { initPreview } from './preview.js';
import { initScrollSync, setSyncEnabled } from './sync.js';
import { initThemes, setTheme, getCurrentTheme } from './themes.js';
import { initSettings, toggleSettings } from './settings.js';
import { initToolbar, setToolbarButtonActive } from './toolbar.js';

// ---- State ----
let editorAPI = null;
let previewAPI = null;
let currentFilePath = null;
let isDirty = false;
let lineEnding = 'LF';
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

// ---- Detect Tauri environment ----
const isTauri = typeof window !== 'undefined' && !!(window.__TAURI__ || window.__TAURI_INTERNALS__);

// ---- Initialize ----
window.addEventListener('DOMContentLoaded', async () => {
  // Initialize editor
  editorAPI = initEditor(document.getElementById('editor-pane'), onContentChange);

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

      // Handle close request (unsaved changes guard)
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const appWindow = getCurrentWindow();
      appWindow.onCloseRequested(async (event) => {
        // Unconditionally prevent the default close synchronously to handle the close flow programmatically
        event.preventDefault();

        if (isDirty) {
          const { confirm } = await import('@tauri-apps/plugin-dialog');
          const confirmed = await confirm(
            'You have unsaved changes. Do you want to close without saving?',
            { title: 'Unsaved Changes', kind: 'warning' }
          );
          if (confirmed) {
            // Reset dirty flag to bypass any recursive close prevention
            isDirty = false;
            // If user clicked OK, destroy the window programmatically
            await appWindow.destroy();
          }
        } else {
          // If not dirty, destroy the window cleanly
          await appWindow.destroy();
        }
      });
    } catch (e) {
      console.log('Tauri API not available — running in browser mode');
    }
  }

  // Apply font settings
  applyFontSettings();

  // Set initial content (welcome text)
  const welcomeText = `# Welcome to Feather MD ✨

A lightweight, blazing-fast markdown editor.

## Features

- **Live Preview** — See your markdown rendered in real-time
- **Synchronized Scrolling** — Editor and preview scroll together
- **10 Themes** — Switch themes instantly from the toolbar
- **Keyboard Shortcuts** — Press \`Ctrl+?\` to see all shortcuts

## Getting Started

Start typing here, or open a file with \`Ctrl+O\`.

### Code Blocks

\`\`\`javascript
function hello() {
  console.log("Hello from Feather MD!");
}
\`\`\`

### Tables

| Feature | Status |
|---------|--------|
| Editor | ✅ Ready |
| Preview | ✅ Ready |
| Sync Scroll | ✅ Ready |
| Themes | ✅ 10 themes |

### Task List

- [x] Set up editor
- [x] Set up preview
- [x] Add themes
- [ ] Open a real \`.md\` file

> **Tip:** Use the toolbar above or keyboard shortcuts to explore all features.
`;

  editorAPI.setValue(welcomeText);
  editorAPI.focus();
});

// ---- Content Change Handler ----
function onContentChange(text) {
  previewAPI.renderMarkdown(text);
  updateStatusBar(text);
  if (!isDirty) {
    isDirty = true;
    updateTitleBar();
  }
}

// ---- File Operations ----
async function openFile() {
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

function newFile() {
  if (isDirty) {
    if (!confirm('You have unsaved changes. Create a new file anyway?')) {
      return;
    }
  }
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
  } catch (e) {
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

  // Update cursor position on editor selection change
  setInterval(() => {
    updateCursorPosition();
  }, 250);
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
  } catch (e) {
    // Ignore storage errors
  }
}

function loadConfig() {
  try {
    const stored = localStorage.getItem('feathermd-config');
    if (stored) {
      Object.assign(config, JSON.parse(stored));
    }
  } catch (e) {
    // Ignore storage errors
  }
}

// Load config on module init
loadConfig();
