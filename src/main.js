// ========================================
// Feather MD — Main Entry Point
// ========================================
// Wires editor ↔ preview ↔ Tauri IPC ↔ toolbar ↔ settings

import { initEditor } from './editor.js';
import { initPreview } from './preview.js';
import { initScrollSync, setSyncEnabled } from './sync.js';
import { initThemes, setTheme } from './themes.js';
import { initSettings, toggleSettings, updateRecentFiles, updateSettingsUI } from './settings.js';
import { initToolbar, setToolbarButtonActive } from './toolbar.js';
import { initUpdater } from './updater.js';

// ---- HMR-Resistant Persistent State ----
// Preserves editor path, dirty state, and line endings across hot-reloads
let editorAPI = null;
let previewAPI = null;
Object.defineProperty( window, 'currentFilePath', {
  get: () => window.__FEATHER_PATH__ || null,
  set: ( val ) => { window.__FEATHER_PATH__ = val; },
  configurable: true
} );
Object.defineProperty( window, 'isDirty', {
  get: () => window.__FEATHER_DIRTY__ || false,
  set: ( val ) => { window.__FEATHER_DIRTY__ = val; },
  configurable: true
} );
Object.defineProperty( window, 'lineEnding', {
  get: () => window.__FEATHER_LINE_ENDING__ || 'LF',
  set: ( val ) => { window.__FEATHER_LINE_ENDING__ = val; },
  configurable: true
} );
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
  windowWidth: 1200,
  windowHeight: 800,
};

let isTauri = false;

// ---- Initialize ----
window.addEventListener( 'DOMContentLoaded', async () => {
  try {
    await import( '@tauri-apps/api/core' );
    isTauri = true;
  } catch {
    // Not running inside Tauri — browser mode
  }

  // Load config natively or via localStorage before initializing UI
  await loadConfig();

  // Initialize editor
  editorAPI = initEditor( document.getElementById( 'editor-pane' ), onContentChange, updateCursorPosition );

  // Initialize preview
  previewAPI = initPreview( document.getElementById( 'preview-content' ) );

  // Initialize scroll sync
  initScrollSync( editorAPI, previewAPI );

  // Initialize themes
  initThemes( config, ( themeName ) => {
    config.theme = themeName;
    saveConfig();
  } );

  // Initialize settings
  initSettings( config, onSettingChange );

  // Initialize recent files rendering
  updateRecentFiles( config.recentFiles || [], onRecentFileSelect );

  // Initialize toolbar
  initToolbar( {
    onOpen: openFile,
    onSave: saveFile,
    onNew: newFile,
    onSyncToggle: ( enabled ) => {
      setSyncEnabled( enabled );
      config.syncScroll = enabled;
      saveConfig();
    },
    onThemeSelect: ( theme ) => {
      setTheme( theme );
      config.theme = theme;
      saveConfig();
    },
    onLineNumbersToggle: ( show ) => {
      editorAPI.setLineNumbers( show );
      config.lineNumbers = show;
      saveConfig();
    },
    onWordWrapToggle: ( wrap ) => {
      editorAPI.setLineWrapping( wrap );
      config.wordWrap = wrap;
      saveConfig();
      updateSettingsUI( config );
    },
    onVimToggle: async ( enabled ) => {
      await editorAPI.setVimMode( enabled );
      config.vimMode = enabled;
      saveConfig();
      updateSettingsUI( config );
    },
    onSettings: toggleSettings,
  } );

  // Restore persisted user preferences (editor toggles, split ratio, toolbar
  // button states). loadConfig() reads them, but until now nothing actually
  // applied them on startup.
  applyPersistedConfig();

  // Initialize divider drag
  initDividerDrag();

  // Initialize keyboard shortcuts
  initKeyboardShortcuts();

  // Initialize shortcuts modal close bindings
  initShortcutsModal();

  // Initialize window controls (Tauri)
  initWindowControls();

  // Listen for Tauri file-opened event
  if ( isTauri ) {
    try {
      // Request initial file from backend if loaded via CLI / OS file association
      try {
        const { invoke } = await import( '@tauri-apps/api/core' );
        const initialFile = await invoke( 'get_initial_file' );
        if ( initialFile ) {
          loadFileContent( initialFile.path, initialFile.content );
        }
      } catch ( err ) {
        console.error( 'Failed to retrieve initial file:', err );
      }

      // Handle close request (unsaved changes guard)
      const { getCurrentWindow } = await import( '@tauri-apps/api/window' );
      const appWindow = getCurrentWindow();
      appWindow.onCloseRequested( async ( event ) => {
        // Unconditionally prevent the default close synchronously to handle the close flow programmatically
        event.preventDefault();

        if ( isDirty ) {
          const response = await showUnsavedDialog();

          if ( response === 'save' ) {
            await saveFile();
            if ( !isDirty ) {
              await appWindow.destroy();
            }
            // If still dirty (user cancelled save-as dialog), keep window open
          } else if ( response === 'discard' ) {
            isDirty = false;
            await appWindow.destroy();
          }
          // 'cancel' → keep window open (do nothing)
        } else {
          // If not dirty, destroy the window cleanly
          await appWindow.destroy();
        }
      } );
    } catch {
      console.log( 'Tauri API not available — running in browser mode' );
    }

    // Listen for file-changed-on-disk event from Rust
    try {
      const { listen } = await import( '@tauri-apps/api/event' );
      await listen( 'file-changed-on-disk', async ( event ) => {
        const { path } = event.payload;
        // Ignore stale events for files we're no longer viewing.
        if ( path !== currentFilePath ) return;

        // PRD §3.1: clean buffer → auto-reload silently; dirty buffer → prompt.
        if ( !isDirty ) {
          try {
            const { readTextFile } = await import( '@tauri-apps/plugin-fs' );
            const content = await readTextFile( path );
            loadFileContent( path, content );
          } catch ( e ) {
            console.error( 'Failed to auto-reload file after disk change:', e );
          }
          return;
        }

        const { ask } = await import( '@tauri-apps/plugin-dialog' );
        const reload = await ask(
          `The file "${path}" has been modified on disk by another program.\n\nWould you like to reload it from disk? Unsaved editor changes will be overwritten.`,
          {
            title: 'File Modified Externally',
            kind: 'warning',
            okLabel: 'Reload File',
            cancelLabel: 'Keep Editor Version',
          }
        );
        if ( reload ) {
          try {
            const { readTextFile } = await import( '@tauri-apps/plugin-fs' );
            const content = await readTextFile( path );
            loadFileContent( path, content );
          } catch ( e ) {
            console.error( 'Failed to reload file after disk change:', e );
          }
        }
      } );
    } catch ( err ) {
      console.error( 'Failed to set up disk file watcher listener:', err );
    }

    // Restore + persist window size (PRD §9 windowWidth/windowHeight)
    await initWindowSize();
  }

  // Check for app updates (Tauri only, non-blocking; errors caught internally)
  initUpdater().catch(() => {});

  // Apply font settings
  applyFontSettings();

  // Set initial content (welcome text) if no file was loaded
  if ( !currentFilePath ) {
    const welcomeText = `# Welcome to the Markdown Editor

This editor is a lightweight Markdown writer designed for clean formatting. You can write using standard Markdown syntax, and it will render real-time HTML formatting on the fly.

---

## Getting Started

Use this default sandbox document to experiment with Markdown formatting. Here is a demonstration of the major supported elements:

### 1. Typography & Inline Styles
Format your text dynamically using:
* **Bold text** for emphasis
* *Italicized text* for styling
* ~~Strikethrough~~ to cross out items
* \`Inline code blocks\` for technical variables
* [Hyperlinks](https://en.wikipedia.org/wiki/Markdown) pointing to web addresses

> **Quote blocks** are structured with a vertical margin line to highlight references, warnings, or detailed side notes.

### 2. Lists & Checklists
Organize your tasks or outlines:
1. First structured item
   - Bulleted sub-point
   - Secondary sub-point
2. Second structured item

- [x] Completed task item
- [ ] Remaining task item

### 3. Syntax-Highlighted Code
Write block code snippet elements with language syntax mapping:

\`\`\`javascript
// Live preview rendering loop
function renderTemplate() {
  const content = "Hello world!";
  console.log(content);
}
\`\`\`

### 4. Structured Tables
Summarize datasets easily:

| Element Type | Syntax Example | Render Output |
| :--- | :--- | :--- |
| Headers | \`# Header 1\` | Styled Title Heading |
| Accent | \`*Text*\` | Slanted Typography |
| Highlight | \`\`Code\`\` | Monospaced Text |

---

*Press \`Ctrl + ?\` at any time to view all available system keyboard shortcuts.*
`;

    editorAPI.setValue( welcomeText );
    editorAPI.focus();
  }
} );

let renderPending = false;
let nextRenderText = null;

// ---- Content Change Handler ----
function onContentChange( text, isProgrammatic ) {
  if ( isProgrammatic ) {
    renderPending = false;
    nextRenderText = null;
    previewAPI.renderMarkdown( text );
  } else {
    nextRenderText = text;
    if ( !renderPending ) {
      renderPending = true;
      requestAnimationFrame( () => {
        if ( nextRenderText !== null ) {
          previewAPI.renderMarkdown( nextRenderText );
          nextRenderText = null;
        }
        renderPending = false;
      } );
    }
  }
  updateStatusBar( text );
  if ( isProgrammatic ) {
    isDirty = false;
    updateTitleBar();
  } else {
    if ( !isDirty ) {
      isDirty = true;
      updateTitleBar();
    }
  }
}

// ---- File Operations ----
async function openFile() {
  if ( !await confirmDiscardChanges() ) return;

  if ( isTauri ) {
    try {
      const { open } = await import( '@tauri-apps/plugin-dialog' );
      const { readTextFile } = await import( '@tauri-apps/plugin-fs' );
      const selected = await open( {
        filters: [ { name: 'Markdown', extensions: [ 'md', 'markdown', 'txt' ] } ],
      } );
      if ( selected ) {
        const content = await readTextFile( selected );
        loadFileContent( selected, content );
      }
    } catch ( e ) {
      console.error( 'Failed to open file:', e );
    }
  } else {
    // Browser fallback: use file input
    const input = document.createElement( 'input' );
    input.type = 'file';
    input.accept = '.md,.markdown,.txt';
    input.onchange = async () => {
      const file = input.files[ 0 ];
      if ( file ) {
        const text = await file.text();
        loadFileContent( file.name, text );
      }
    };
    input.click();
  }
}

async function saveFile() {
  if ( isTauri && currentFilePath ) {
    try {
      const { invoke } = await import( '@tauri-apps/api/core' );
      await invoke( 'unwatch_file' );
      
      const { writeTextFile } = await import( '@tauri-apps/plugin-fs' );
      await writeTextFile( currentFilePath, editorAPI.getValue() );
      isDirty = false;
      updateTitleBar();
      
      await invoke( 'watch_file', { path: currentFilePath } );
    } catch ( e ) {
      console.error( 'Failed to save file:', e );
    }
  } else {
    await saveFileAs();
  }
}

async function saveFileAs() {
  if ( isTauri ) {
    try {
      const { save } = await import( '@tauri-apps/plugin-dialog' );
      const { writeTextFile } = await import( '@tauri-apps/plugin-fs' );
      const path = await save( {
        filters: [ { name: 'Markdown', extensions: [ 'md', 'markdown' ] } ],
      } );
      if ( path ) {
        const { invoke } = await import( '@tauri-apps/api/core' );
        await invoke( 'unwatch_file' );
        
        await writeTextFile( path, editorAPI.getValue() );
        currentFilePath = path;
        isDirty = false;
        updateTitleBar();
        
        await invoke( 'watch_file', { path } );
      }
    } catch ( e ) {
      console.error( 'Failed to save file:', e );
    }
  } else {
    // Browser fallback: download
    const blob = new Blob( [ editorAPI.getValue() ], { type: 'text/markdown' } );
    const url = URL.createObjectURL( blob );
    const a = document.createElement( 'a' );
    a.href = url;
    a.download = currentFilePath || 'untitled.md';
    a.click();
    URL.revokeObjectURL( url );
    isDirty = false;
    updateTitleBar();
  }
}

async function newFile() {
  if ( !await confirmDiscardChanges() ) return;
  currentFilePath = null;
  editorAPI.setValue( '' );
  isDirty = false;
  lineEnding = 'LF';
  updateTitleBar();
  updateStatusBar( '' );
  editorAPI.focus();

  if ( isTauri ) {
    try {
      const { invoke } = await import( '@tauri-apps/api/core' );
      await invoke( 'unwatch_file' );
    } catch ( e ) {
      console.error( 'Failed to unwatch file on newFile:', e );
    }
  }
}

function loadFileContent( path, content ) {
  currentFilePath = path;
  lineEnding = content.includes( '\r\n' ) ? 'CRLF' : 'LF';
  editorAPI.setValue( content );
  isDirty = false;
  updateTitleBar();
  updateStatusBar( content );
  editorAPI.focus();

  if ( path ) {
    addToRecentFiles( path );
    if ( isTauri ) {
      import( '@tauri-apps/api/core' ).then( ( { invoke } ) => {
        invoke( 'watch_file', { path } ).catch( e => console.error( 'Failed to watch file:', e ) );
      } ).catch( e => console.error( 'Failed to load invoke module:', e ) );
    }
  }
}

async function onRecentFileSelect( filePath ) {
  if ( !await confirmDiscardChanges() ) return;

  if ( isTauri ) {
    try {
      const { readTextFile } = await import( '@tauri-apps/plugin-fs' );
      const content = await readTextFile( filePath );
      loadFileContent( filePath, content );
    } catch ( e ) {
      console.error( 'Failed to open recent file natively:', e );
    }
  } else {
    console.warn( 'Browser mode cannot read local paths from disk.' );
  }
}

function addToRecentFiles( path ) {
  if ( !config.recentFiles ) {
    config.recentFiles = [];
  }
  config.recentFiles = config.recentFiles.filter( p => p !== path );
  config.recentFiles.unshift( path );
  if ( config.recentFiles.length > 10 ) {
    config.recentFiles.pop();
  }
  saveConfig();
  updateRecentFiles( config.recentFiles, onRecentFileSelect );
}

// ---- UI Updates ----
function updateTitleBar() {
  const titleEl = document.getElementById( 'title-bar-text' );
  let name = 'Untitled';
  if ( currentFilePath ) {
    // Extract filename from path
    const parts = currentFilePath.replace( /\\/g, '/' ).split( '/' );
    name = parts[ parts.length - 1 ];
  }
  titleEl.textContent = isDirty ? `Feather MD — •${ name }` : `Feather MD — ${ name }`;
  document.title = titleEl.textContent;
}

function updateStatusBar( text ) {
  // Word count
  const words = text ? text.trim().split( /\s+/ ).filter( Boolean ).length : 0;
  document.getElementById( 'status-wordcount' ).textContent = `${ words } word${ words !== 1 ? 's' : '' }`;

  // File path
  const pathEl = document.getElementById( 'status-filepath' );
  pathEl.textContent = currentFilePath || 'Untitled';
  pathEl.title = currentFilePath || 'Untitled';

  // Cursor position (updated separately on selection change)
  updateCursorPosition();

  // Line ending
  document.getElementById( 'status-line-ending' ).textContent = lineEnding;
}

function updateCursorPosition() {
  if ( !editorAPI ) return;
  const { line, col } = editorAPI.getCursorPosition();
  document.getElementById( 'status-cursor' ).textContent = `Ln ${ line }, Col ${ col }`;
}

// ---- Divider Drag ----
function initDividerDrag() {
  const divider = document.getElementById( 'divider' );
  const container = document.getElementById( 'split-container' );
  const editorPane = document.getElementById( 'editor-pane' );
  const previewPane = document.getElementById( 'preview-pane' );

  let isDragging = false;

  divider.addEventListener( 'mousedown', ( e ) => {
    isDragging = true;
    divider.classList.add( 'dragging' );
    document.body.classList.add( 'resizing' );
    e.preventDefault();
  } );

  document.addEventListener( 'mousemove', ( e ) => {
    if ( !isDragging ) return;
    const rect = container.getBoundingClientRect();
    let ratio = ( e.clientX - rect.left ) / rect.width;
    ratio = Math.max( 0.2, Math.min( 0.8, ratio ) );
    editorPane.style.width = `${ ratio * 100 }%`;
    previewPane.style.width = `${ ( 1 - ratio ) * 100 }%`;
    config.splitRatio = ratio;
  } );

  document.addEventListener( 'mouseup', () => {
    if ( isDragging ) {
      isDragging = false;
      divider.classList.remove( 'dragging' );
      document.body.classList.remove( 'resizing' );
      saveConfig();
    }
  } );

  // Double-click to reset 50/50
  divider.addEventListener( 'dblclick', () => {
    editorPane.style.width = '50%';
    previewPane.style.width = '50%';
    config.splitRatio = 0.5;
    saveConfig();
  } );
}

// ---- Window Controls (Tauri) ----
async function initWindowControls() {
  if ( !isTauri ) return;

  try {
    const { getCurrentWindow } = await import( '@tauri-apps/api/window' );
    const appWindow = getCurrentWindow();

    document.getElementById( 'btn-minimize' ).addEventListener( 'click', () => appWindow.minimize() );
    document.getElementById( 'btn-maximize' ).addEventListener( 'click', async () => {
      const isMaximized = await appWindow.isMaximized();
      isMaximized ? appWindow.unmaximize() : appWindow.maximize();
    } );
    document.getElementById( 'btn-close' ).addEventListener( 'click', () => appWindow.close() );
  } catch {
    console.log( 'Window controls not available in browser mode' );
  }
}

// ---- Keyboard Shortcuts ----
function initKeyboardShortcuts() {
  document.addEventListener( 'keydown', ( e ) => {
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;

    // Ctrl+O — Open
    if ( ctrl && !shift && e.key === 'o' ) {
      e.preventDefault();
      openFile();
    }

    // Ctrl+S — Save
    if ( ctrl && !shift && e.key === 's' ) {
      e.preventDefault();
      saveFile();
    }

    // Ctrl+Shift+S — Save As
    if ( ctrl && shift && e.key === 'S' ) {
      e.preventDefault();
      saveFileAs();
    }

    // Ctrl+N — New
    if ( ctrl && !shift && e.key === 'n' ) {
      e.preventDefault();
      newFile();
    }

    // Ctrl+L — Toggle line numbers
    if ( ctrl && !shift && e.key === 'l' ) {
      e.preventDefault();
      const btn = document.getElementById( 'btn-line-numbers' );
      const isActive = btn.classList.toggle( 'active' );
      editorAPI.setLineNumbers( isActive );
      config.lineNumbers = isActive;
      saveConfig();
    }

    // Alt+Z — Toggle word wrap
    if ( e.altKey && e.key === 'z' ) {
      e.preventDefault();
      const btn = document.getElementById( 'btn-word-wrap' );
      const isActive = btn.classList.toggle( 'active' );
      editorAPI.setLineWrapping( isActive );
      config.wordWrap = isActive;
      saveConfig();
      updateSettingsUI( config );
    }

    // Alt+S — Toggle sync scroll
    if ( e.altKey && e.key === 's' ) {
      e.preventDefault();
      const btn = document.getElementById( 'btn-sync-scroll' );
      const isActive = btn.classList.toggle( 'active' );
      setSyncEnabled( isActive );
      config.syncScroll = isActive;
      saveConfig();
    }

    // Ctrl+, — Settings
    if ( ctrl && e.key === ',' ) {
      e.preventDefault();
      toggleSettings();
    }

    // Ctrl+? — Shortcuts modal
    if ( ctrl && ( e.key === '?' || ( shift && e.key === '/' ) ) ) {
      e.preventDefault();
      toggleShortcutsModal();
    }
  } );

}

// ---- Unsaved Changes Guard (CODE-01: consolidated from openFile + newFile) ----
// Returns true if it is safe to proceed (user saved or discarded), false to abort.
async function confirmDiscardChanges() {
  if ( !isDirty ) return true;
  const response = await showUnsavedDialog();
  if ( response === 'save' ) {
    await saveFile();
    return !isDirty; // true if save succeeded, false if cancelled
  }
  return response === 'discard';
}

// ---- Unsaved Changes Dialog ----
// Custom 3-button dialog: Save / Don't Save / Cancel
// Returns a Promise that resolves to 'save', 'discard', or 'cancel'
function showUnsavedDialog() {
  return new Promise( ( resolve ) => {
    const dialog = document.getElementById( 'unsaved-dialog' );
    const btnSave = document.getElementById( 'unsaved-btn-save' );
    const btnDiscard = document.getElementById( 'unsaved-btn-discard' );
    const btnCancel = document.getElementById( 'unsaved-btn-cancel' );

    dialog.hidden = false;

    // Focus the Save button by default for keyboard accessibility
    setTimeout( () => btnSave.focus(), 50 );

    function cleanup( result ) {
      dialog.hidden = true;
      btnSave.removeEventListener( 'click', onSave );
      btnDiscard.removeEventListener( 'click', onDiscard );
      btnCancel.removeEventListener( 'click', onCancel );
      dialog.removeEventListener( 'click', onOverlayClick );
      document.removeEventListener( 'keydown', onKeydown );
      resolve( result );
    }

    function onSave() { cleanup( 'save' ); }
    function onDiscard() { cleanup( 'discard' ); }
    function onCancel() { cleanup( 'cancel' ); }
    function onOverlayClick( e ) {
      if ( e.target === dialog ) cleanup( 'cancel' );
    }
    function onKeydown( e ) {
      if ( e.key === 'Escape' ) {
        e.preventDefault();
        cleanup( 'cancel' );
      }
    }

    btnSave.addEventListener( 'click', onSave );
    btnDiscard.addEventListener( 'click', onDiscard );
    btnCancel.addEventListener( 'click', onCancel );
    dialog.addEventListener( 'click', onOverlayClick );
    document.addEventListener( 'keydown', onKeydown );
  } );
}

// ---- Shortcuts Modal ----
function toggleShortcutsModal() {
  const modal = document.getElementById( 'shortcuts-modal' );
  modal.hidden = !modal.hidden;
}

function initShortcutsModal() {
  const modal = document.getElementById( 'shortcuts-modal' );
  const closeBtn = document.getElementById( 'btn-close-shortcuts' );
  closeBtn?.addEventListener( 'click', () => {
    modal.hidden = true;
  } );
  modal?.addEventListener( 'click', ( e ) => {
    if ( e.target === modal ) modal.hidden = true;
  } );
}

// ---- Settings Change Handler ----
function onSettingChange( key, value ) {
  config[ key ] = value;

  switch ( key ) {
    case 'fontSize':
      document.documentElement.style.setProperty( '--font-size', `${ value }px` );
      break;
    case 'fontFamily':
      document.documentElement.style.setProperty( '--font-mono', value );
      break;
    case 'tabSize':
      editorAPI.setTabSize( value );
      break;
    case 'wordWrap':
      editorAPI.setLineWrapping( value );
      setToolbarButtonActive( 'btn-word-wrap', value );
      break;
    case 'vimMode':
      editorAPI.setVimMode( value ).catch( ( err ) => {
        console.warn( 'Failed to toggle Vim mode:', err );
      } );
      setToolbarButtonActive( 'btn-vim', value );
      break;
  }

  saveConfig();
}

// ---- Font Settings ----
function applyFontSettings() {
  if ( config.fontSize ) {
    document.documentElement.style.setProperty( '--font-size', `${ config.fontSize }px` );
  }
  if ( config.fontFamily ) {
    document.documentElement.style.setProperty( '--font-mono', config.fontFamily );
  }
}

// ---- Apply persisted preferences on startup ----
// Editor defaults are line-numbers ON, line-wrapping ON, tab-size 4, vim OFF.
// Sync defaults to enabled. Toolbar HTML hardcodes the .active class. None of
// that respects saved user state until this runs.
function applyPersistedConfig() {
  if ( !editorAPI ) return;

  const lineNumbers = config.lineNumbers !== false;
  const wordWrap = config.wordWrap !== false;
  const syncScroll = config.syncScroll !== false;
  const vimMode = config.vimMode === true;
  const tabSize = config.tabSize || 4;

  editorAPI.setLineNumbers( lineNumbers );
  editorAPI.setLineWrapping( wordWrap );
  editorAPI.setTabSize( tabSize );
  if ( vimMode ) {
    // setVimMode is async (lazy import of @replit/codemirror-vim); fire-and-forget
    editorAPI.setVimMode( true ).catch( ( err ) => {
      console.warn( 'Failed to apply persisted vim mode:', err );
    } );
  }

  setSyncEnabled( syncScroll );

  reflectToolbarState( 'btn-line-numbers', lineNumbers );
  reflectToolbarState( 'btn-word-wrap', wordWrap );
  reflectToolbarState( 'btn-sync-scroll', syncScroll );
  reflectToolbarState( 'btn-vim', vimMode );

  // Split ratio
  const ratio = typeof config.splitRatio === 'number' ? config.splitRatio : 0.5;
  if ( Math.abs( ratio - 0.5 ) > 0.001 ) {
    const editorPane = document.getElementById( 'editor-pane' );
    const previewPane = document.getElementById( 'preview-pane' );
    if ( editorPane && previewPane ) {
      const clamped = Math.max( 0.2, Math.min( 0.8, ratio ) );
      editorPane.style.width = `${ clamped * 100 }%`;
      previewPane.style.width = `${ ( 1 - clamped ) * 100 }%`;
    }
  }
}

function reflectToolbarState( id, active ) {
  const btn = document.getElementById( id );
  if ( btn ) btn.classList.toggle( 'active', active );
}

// ---- Window size restore + persist (PRD §9) ----
let windowResizeSaveTimer = null;
let windowResizeUnlisten = null;
async function initWindowSize() {
  try {
    const { getCurrentWindow, LogicalSize } = await import( '@tauri-apps/api/window' );
    const appWindow = getCurrentWindow();

    const w = Number( config.windowWidth );
    const h = Number( config.windowHeight );
    if ( Number.isFinite( w ) && Number.isFinite( h ) && w >= 600 && h >= 400
      && ( w !== 1200 || h !== 800 ) ) {
      try {
        await appWindow.setSize( new LogicalSize( w, h ) );
      } catch ( err ) {
        console.warn( 'Failed to restore window size:', err );
      }
    }

    // Store unlisten so the listener is not orphaned if called again
    if ( windowResizeUnlisten ) windowResizeUnlisten();
    windowResizeUnlisten = await appWindow.onResized( ( { payload: size } ) => {
      if ( !size ) return;
      config.windowWidth = size.width;
      config.windowHeight = size.height;
      clearTimeout( windowResizeSaveTimer );
      windowResizeSaveTimer = setTimeout( saveConfig, 500 );
    } );
  } catch ( err ) {
    console.warn( 'Failed to initialize window size persistence:', err );
  }
}

// ---- Config Persistence ----
async function saveConfig() {
  try {
    localStorage.setItem( 'feathermd-config', JSON.stringify( config ) );
  } catch ( err ) {
    console.warn( 'Failed to save to localStorage:', err );
  }

  if ( isTauri ) {
    try {
      const { appConfigDir, join } = await import( '@tauri-apps/api/path' );
      const { exists, writeTextFile, mkdir } = await import( '@tauri-apps/plugin-fs' );
      
      const configDir = await appConfigDir();
      const feathermdDir = await join( configDir, 'feathermd' );
      
      const dirExists = await exists( feathermdDir );
      if ( !dirExists ) {
        await mkdir( feathermdDir, { recursive: true } );
      }
      
      const configPath = await join( feathermdDir, 'config.json' );
      await writeTextFile( configPath, JSON.stringify( config, null, 2 ) );
    } catch ( err ) {
      console.error( 'Failed to save config file natively:', err );
    }
  }
}

async function loadConfig() {
  if ( isTauri ) {
    try {
      const { appConfigDir, join } = await import( '@tauri-apps/api/path' );
      const { exists, readTextFile } = await import( '@tauri-apps/plugin-fs' );
      
      const configDir = await appConfigDir();
      const configPath = await join( configDir, 'feathermd', 'config.json' );
      
      const fileExists = await exists( configPath );
      if ( fileExists ) {
        const content = await readTextFile( configPath );
        const parsed = JSON.parse( content );
        Object.assign( config, parsed );
        return;
      }
    } catch ( err ) {
      console.warn( 'Failed to load native config, falling back to localStorage:', err );
    }
  }

  try {
    const stored = localStorage.getItem( 'feathermd-config' );
    if ( stored ) {
      Object.assign( config, JSON.parse( stored ) );
    }
  } catch ( err ) {
    console.warn( 'Failed to load config from localStorage:', err );
  }
}
