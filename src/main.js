// Feather MD — application entry. Wires editor ↔ preview ↔ Tauri IPC ↔
// toolbar ↔ settings. Each subsystem lives in its own module; this file is
// orchestration only.

import './core/state.js';
import { isTauri, setTauri } from './core/state.js';
import { config, loadConfig, saveConfig } from './core/config.js';
import { WELCOME_TEXT } from './core/welcome.js';
import {
  initFileIO,
  loadFileContent,
  openFile,
  saveFile,
  newFile,
  onRecentFileSelect,
} from './core/file-io.js';
import { initKeyboardShortcuts } from './core/keyboard.js';
import { initScrollSync, setSyncEnabled } from './core/sync.js';

import { initEditor } from './editor/editor.js';
import { initPreview } from './preview/preview.js';

import { initThemes, setTheme } from './ui/themes.js';
import { initSettings, toggleSettings, updateRecentFiles, updateSettingsUI } from './ui/settings.js';
import { initToolbar, setToolbarButtonActive } from './ui/toolbar.js';
import { initShortcutsModal, showUnsavedDialog } from './ui/dialogs.js';
import { initStatusBar, updateTitleBar, updateStatusBar, updateCursorPosition } from './ui/status-bar.js';
import { initDividerDrag } from './ui/divider.js';

import { initUpdater } from './platform/updater.js';
import { initWindowControls, initWindowSize } from './platform/window.js';

let editorAPI = null;
let previewAPI = null;

window.addEventListener( 'DOMContentLoaded', async () => {
  try {
    await import( '@tauri-apps/api/core' );
    setTauri( true );
  } catch {
    // Browser mode
  }

  await loadConfig();

  editorAPI = initEditor(
    document.getElementById( 'editor-pane' ),
    onContentChange,
    () => updateCursorPosition(),
  );
  previewAPI = initPreview( document.getElementById( 'preview-content' ) );

  initStatusBar( editorAPI );
  initFileIO( editorAPI );
  initScrollSync( editorAPI, previewAPI );

  initThemes( config, ( themeName ) => {
    config.theme = themeName;
    saveConfig();
  } );

  initSettings( config, onSettingChange );
  updateRecentFiles( config.recentFiles || [], onRecentFileSelect );

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

  applyPersistedConfig();
  initDividerDrag();
  initKeyboardShortcuts( editorAPI );
  initShortcutsModal();
  initWindowControls();

  if ( isTauri() ) {
    await wireTauriListeners();
    await initWindowSize();
  }

  initUpdater().catch( () => {} );
  applyFontSettings();

  if ( !currentFilePath ) {
    editorAPI.setValue( WELCOME_TEXT );
    editorAPI.focus();
  }
} );

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
    console.log( 'Tauri API not available — running in browser mode' );
  }

  try {
    const { listen } = await import( '@tauri-apps/api/event' );
    await listen( 'file-changed-on-disk', async ( event ) => {
      const { path } = event.payload;
      if ( path !== currentFilePath ) return;

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

// ---- Editor change debouncing ----
let renderPending = false;
let nextRenderText = null;

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
  } else if ( !isDirty ) {
    isDirty = true;
    updateTitleBar();
  }
}

// ---- Settings change handler ----
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
    editorAPI.setVimMode( true ).catch( ( err ) => {
      console.warn( 'Failed to apply persisted vim mode:', err );
    } );
  }

  setSyncEnabled( syncScroll );

  reflectToolbarState( 'btn-line-numbers', lineNumbers );
  reflectToolbarState( 'btn-word-wrap', wordWrap );
  reflectToolbarState( 'btn-sync-scroll', syncScroll );
  reflectToolbarState( 'btn-vim', vimMode );

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
