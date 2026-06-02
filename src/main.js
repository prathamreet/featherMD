// Feather MD - application entry. Wires editor, preview, Tauri IPC,
// menu bar, and settings. Each subsystem lives in its own module; this file is
// orchestration only.
//
// Boot ordering (PERF-14):
//   Phase 1 — synchronous DOM mount with in-memory defaults. First paint < 50ms.
//   Phase 2 — async config load, theme apply, Tauri wiring. Welcome text is
//             shown immediately and overwritten if a CLI file arrives later.

import './core/state.js';
import { isTauri, setTauri } from './core/state.js';
import { config, loadConfig, saveConfig } from './core/config.js';
import { WELCOME_TEXT } from './core/welcome.js';
import {
  initFileIO,
  loadFileContent,
  openFile,
  saveFile,
  saveFileAs,
  newFile,
  onRecentFileSelect,
} from './core/file-io.js';
import { initKeyboardShortcuts } from './core/keyboard.js';
import { initScrollSync, setSyncEnabled } from './core/sync.js';

import { initEditor } from './editor/editor.js';
import { initPreview } from './preview/preview.js';

import { initThemes, setTheme } from './ui/themes.js';
import {
  initToolbar,
  setMenuChecked,
  setActiveTheme,
  setActiveFontFamily,
  setActiveTabSize,
  setFontSizeSlider,
  updateRecentFilesMenu,
} from './ui/toolbar.js';
import { initShortcutsModal, showUnsavedDialog } from './ui/dialogs.js';
import { initStatusBar, updateTitleBar, updateStatusBar, updateCursorPosition } from './ui/status-bar.js';
import { initDividerDrag } from './ui/divider.js';

import { initUpdater } from './platform/updater.js';
import { initWindowControls, initWindowSize, ensureWindowVisible } from './platform/window.js';

let editorAPI = null;
let previewAPI = null;

window.addEventListener( 'DOMContentLoaded', () => {
  // ---- Phase 1: synchronous mount ----
  // Apply OS-preferred theme up-front so the first paint matches the user's
  // preference; saved config (if any) overrides it during Phase 2.
  document.documentElement.setAttribute(
    'data-theme',
    window.matchMedia( '(prefers-color-scheme: dark)' ).matches ? 'onyx' : 'snow',
  );

  editorAPI = initEditor(
    document.getElementById( 'editor-pane' ),
    onContentChange,
    () => updateCursorPosition(),
  );
  previewAPI = initPreview( document.getElementById( 'preview-content' ) );

  initStatusBar( editorAPI );
  initFileIO( editorAPI );
  initScrollSync( editorAPI, previewAPI );
  initDividerDrag();
  initKeyboardShortcuts( editorAPI );
  initShortcutsModal();
  // initWindowControls() lives in Phase 2 — it short-circuits on `!isTauri()`,
  // and `setTauri(true)` only flips during Phase 2 after the Tauri core import.

  editorAPI.setValue( WELCOME_TEXT );
  editorAPI.focus();

  // ---- Phase 2: async config + Tauri ----
  bootAsync();
} );

async function bootAsync() {
  try {
    await runBootSequence();
  } finally {
    // ISSUE-10: Window is hidden via tauri.conf.json (`visible: false`) to avoid
    // a brief wrong-size flash on startup. Show it only after persisted size
    // has been applied. Run in finally so a crash inside boot does not leave
    // the window invisible forever.
    await ensureWindowVisible();
  }
}

async function runBootSequence() {
  try {
    await import( '@tauri-apps/api/core' );
    setTauri( true );
  } catch {
    // Browser mode
  }

  await loadConfig();

  initThemes( config, ( themeName ) => {
    config.theme = themeName;
    saveConfig();
  } );

  updateRecentFilesMenu( config.recentFiles || [], onRecentFileSelect );

  initToolbar( {
    onOpen: openFile,
    onSave: saveFile,
    onSaveAs: saveFileAs,
    onNew: newFile,
    onPrint: () => window.print(),
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
    },
    onFontSize: ( size ) => {
      document.documentElement.style.setProperty( '--font-size', `${ size }px` );
      config.fontSize = size;
      saveConfig();
    },
    onFontFamily: ( font ) => {
      document.documentElement.style.setProperty( '--font-mono', font );
      config.fontFamily = font;
      saveConfig();
    },
    onTabSize: ( size ) => {
      editorAPI.setTabSize( size );
      config.tabSize = size;
      saveConfig();
    },
  } );

  applyPersistedConfig();
  applyFontSettings();

  if ( isTauri() ) {
    await initWindowControls();
    await wireTauriListeners();
    await initWindowSize();
  }

  initUpdater().catch( () => {} );
}


// ---- Tauri IPC listeners ----
async function wireTauriListeners() {
  try {
    const { invoke } = await import( '@tauri-apps/api/core' );
    const initialFile = await invoke( 'get_initial_file' );
    if ( initialFile ) {
      loadFileContent( initialFile.path, initialFile.content );
    }
  } catch ( err ) {
    console.error( 'Failed to retrieve initial file:', err );
  }

  try {
    const { getCurrentWindow } = await import( '@tauri-apps/api/window' );
    const appWindow = getCurrentWindow();
    appWindow.onCloseRequested( async ( event ) => {
      event.preventDefault();

      try {
        const maximized = await appWindow.isMaximized();
        config.windowMaximized = maximized;
        await saveConfig();
      } catch {
        // ignore
      }

      if ( isDirty ) {
        const response = await showUnsavedDialog();

        if ( response === 'save' ) {
          await saveFile();
          if ( !isDirty ) {
            await appWindow.destroy();
          }
        } else if ( response === 'discard' ) {
          isDirty = false;
          await appWindow.destroy();
        }
      } else {
        await appWindow.destroy();
      }
    } );
  } catch {
    console.log( 'Tauri API not available - running in browser mode' );
  }

  try {
    const { listen } = await import( '@tauri-apps/api/event' );
    await listen( 'file-changed-on-disk', async ( event ) => {
      const { path } = event.payload;
      if ( path !== currentFilePath ) return;

      // PERF-12: ignore the watcher echo from our own writeTextFile.
      if ( isSaving ) return;

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
        `The file "${ path }" has been modified on disk by another program.\n\nWould you like to reload it from disk? Unsaved editor changes will be overwritten.`,
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
}

// ---- Editor change handler (synchronous; debounce lives in CodeMirror) ----
function onContentChange( text, isProgrammatic ) {
  previewAPI.renderMarkdown( text );
  updateStatusBar( text );

  if ( isProgrammatic ) {
    isDirty = false;
    updateTitleBar();
  } else if ( !isDirty ) {
    isDirty = true;
    updateTitleBar();
  }
}

// ---- Apply persisted preferences on startup ----
function applyPersistedConfig() {
  if ( !editorAPI ) return;

  const lineNumbers = config.lineNumbers !== false;
  const wordWrap = config.wordWrap !== false;
  const syncScroll = config.syncScroll !== false;
  const tabSize = config.tabSize || 4;

  editorAPI.setLineNumbers( lineNumbers );
  editorAPI.setLineWrapping( wordWrap );
  editorAPI.setTabSize( tabSize );

  setSyncEnabled( syncScroll );

  // Reflect state in View menu
  setMenuChecked( 'toggle-line-numbers', lineNumbers );
  setMenuChecked( 'toggle-word-wrap', wordWrap );
  setMenuChecked( 'toggle-sync', syncScroll );

  // Reflect state in Style menu
  setActiveTheme( config.theme || 'snow' );
  setActiveFontFamily( config.fontFamily || "'JetBrains Mono', monospace" );
  setActiveTabSize( tabSize );
  setFontSizeSlider( config.fontSize || 14 );

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

function applyFontSettings() {
  if ( config.fontSize ) {
    document.documentElement.style.setProperty( '--font-size', `${ config.fontSize }px` );
  }
  if ( config.fontFamily ) {
    document.documentElement.style.setProperty( '--font-mono', config.fontFamily );
  }
}
