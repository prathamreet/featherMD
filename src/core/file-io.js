// File-system operations: open/save/save-as/new + recent-files list +
// unsaved-changes guard. Wraps Tauri plugin-fs with a browser fallback.

import { config, saveConfig } from './config.js';
import { isTauri } from './state.js';
import { showUnsavedDialog } from '../ui/dialogs.js';
import { updateTitleBar, updateStatusBar } from '../ui/status-bar.js';
import { updateRecentFilesList } from '../ui/toolbar.js';

let _editorAPI = null;

// PERF-12: keep the isSaving echo-suppression window open long enough for
// the OS file watcher to emit and the listener to observe it. The native
// notify watcher fires within a few ms of write completion; 500ms is a
// generous, conservative ceiling.
const SAVE_ECHO_WINDOW_MS = 500;

export function initFileIO( editorAPI ) {
  _editorAPI = editorAPI;
}

function markSaveStart() {
  isSaving = true;
}

function markSaveEnd() {
  setTimeout( () => { isSaving = false; }, SAVE_ECHO_WINDOW_MS );
}

export async function openFile() {
  if ( !await confirmDiscardChanges() ) return;

  if ( isTauri() ) {
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

export async function saveFile() {
  if ( isTauri() && currentFilePath ) {
    try {
      markSaveStart();
      const { writeTextFile } = await import( '@tauri-apps/plugin-fs' );
      await writeTextFile( currentFilePath, _editorAPI.getValue() );
      isDirty = false;
      updateTitleBar();
      addToRecentFiles( currentFilePath );
    } catch ( e ) {
      console.error( 'Failed to save file:', e );
    } finally {
      markSaveEnd();
    }
  } else {
    await saveFileAs();
  }
}

export async function saveFileAs() {
  if ( isTauri() ) {
    try {
      const { save } = await import( '@tauri-apps/plugin-dialog' );
      const { writeTextFile } = await import( '@tauri-apps/plugin-fs' );
      const path = await save( {
        filters: [ { name: 'Markdown', extensions: [ 'md', 'markdown' ] } ],
      } );
      if ( path ) {
        markSaveStart();
        try {
          await writeTextFile( path, _editorAPI.getValue() );
          const isSamePath = path === currentFilePath;
          currentFilePath = path;
          isDirty = false;
          updateTitleBar();
          addToRecentFiles( path );

          // If the user picked a different file, start watching the new one.
          if ( !isSamePath ) {
            const { invoke } = await import( '@tauri-apps/api/core' );
            await invoke( 'watch_file', { path } );
          }
        } finally {
          markSaveEnd();
        }
      }
    } catch ( e ) {
      console.error( 'Failed to save file:', e );
    }
  } else {
    const blob = new Blob( [ _editorAPI.getValue() ], { type: 'text/markdown' } );
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

export async function newFile() {
  if ( !await confirmDiscardChanges() ) return;
  currentFilePath = null;
  _editorAPI.setValue( '' );
  isDirty = false;
  lineEnding = 'LF';
  updateTitleBar();
  updateStatusBar( '' );
  _editorAPI.focus();

  if ( isTauri() ) {
    try {
      const { invoke } = await import( '@tauri-apps/api/core' );
      await invoke( 'unwatch_file' );
    } catch ( e ) {
      console.error( 'Failed to unwatch file on newFile:', e );
    }
  }
}

export function loadFileContent( path, content ) {
  currentFilePath = path;
  lineEnding = content.includes( '\r\n' ) ? 'CRLF' : 'LF';
  _editorAPI.setValue( content );
  isDirty = false;
  updateTitleBar();
  updateStatusBar( content );
  _editorAPI.focus();

  if ( path ) {
    addToRecentFiles( path );
    if ( isTauri() ) {
      import( '@tauri-apps/api/core' ).then( ( { invoke } ) => {
        invoke( 'watch_file', { path } ).catch( e => console.error( 'Failed to watch file:', e ) );
      } ).catch( e => console.error( 'Failed to load invoke module:', e ) );
    }
  }
}

export async function onRecentFileSelect( filePath ) {
  if ( !await confirmDiscardChanges() ) return;

  if ( isTauri() ) {
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
  if ( !config.recentFiles ) config.recentFiles = [];
  config.recentFiles = config.recentFiles.filter( p => p !== path );
  config.recentFiles.unshift( path );
  if ( config.recentFiles.length > 10 ) config.recentFiles.pop();
  saveConfig();
  updateRecentFilesList( config.recentFiles, onRecentFileSelect );
}

/**
 * Returns true if it is safe to proceed (clean buffer, user saved, or
 * explicitly discarded). Returns false to abort.
 */
export async function confirmDiscardChanges() {
  if ( !isDirty ) return true;
  const response = await showUnsavedDialog();
  if ( response === 'save' ) {
    await saveFile();
    return !isDirty;
  }
  return response === 'discard';
}
