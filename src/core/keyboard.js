// Global keyboard shortcuts. Wires DOM-level shortcuts to file ops,
// editor toggles, and the shortcuts modal.

import { config, saveConfig } from './config.js';
import { openFile, saveFile, saveFileAs, newFile, confirmDiscardChanges } from './file-io.js';
import { setSyncEnabled } from './sync.js';
import { setMenuChecked, setActiveFontFamily, setActiveTabSize } from '../ui/toolbar.js';
import { toggleShortcutsModal, openRecentFilesModal } from '../ui/dialogs.js';
import { cycleTheme } from '../ui/themes.js';
import { toggleFullscreen, isFullscreenActive, exitFullscreen } from '../ui/fullscreen.js';
import { closeWindow } from '../platform/window.js';

let _editorAPI = null;

// Cycle targets for the Alt-leader chords (Style menu mirrors these lists).
const FONT_FAMILIES = [ "'JetBrains Mono', monospace", 'monospace' ];
const TAB_SIZES = [ 2, 4 ];

// Leader-key state for the Alt+T / Alt+F / Alt+D "then Up/Down" chords.
let leader = null;
let leaderTimer = null;
const LEADER_WINDOW_MS = 2000;

export function initKeyboardShortcuts( editorAPI ) {
  _editorAPI = editorAPI;

  // Capture-phase handler for the leader chords. It runs before CodeMirror so
  // Up/Down (and Alt+Up/Down) can drive theme/font/tab cycling without the
  // editor also acting on the arrow keys. Inert unless a leader is armed.
  document.addEventListener( 'keydown', ( e ) => {
    if ( !leader ) return;

    if ( e.key === 'ArrowUp' ) {
      e.preventDefault();
      e.stopPropagation();
      cycleActiveLeader( 1 );
    } else if ( e.key === 'ArrowDown' ) {
      e.preventDefault();
      e.stopPropagation();
      cycleActiveLeader( -1 );
    } else if ( e.key === 'Escape' ) {
      e.preventDefault();
      e.stopPropagation();
      disarmLeader();
    } else if ( e.key === 'Alt' || e.key === 'Shift' || e.key === 'Control' || e.key === 'Meta' ) {
      // Bare modifier keydowns: keep the leader armed.
    } else if ( !( e.altKey && ( e.key === 't' || e.key === 'f' || e.key === 'd' ) ) ) {
      // Any other key cancels the chord (Alt+T/F/D re-arm via the main handler).
      disarmLeader();
    }
  }, true );

  document.addEventListener( 'keydown', ( e ) => {
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;

    if ( ctrl && !shift && e.key === 'o' ) {
      e.preventDefault();
      openFile();
    } else if ( ctrl && !shift && e.key === 's' ) {
      e.preventDefault();
      saveFile();
    } else if ( ctrl && shift && e.key === 'S' ) {
      e.preventDefault();
      saveFileAs();
    } else if ( ctrl && !shift && e.key === 'n' ) {
      e.preventDefault();
      newFile();
    } else if ( ctrl && !shift && ( e.key === 'r' || e.key === 'R' ) ) {
      e.preventDefault();
      openRecentFilesModal();
    } else if ( ctrl && shift && ( e.key === 'R' || e.key === 'r' ) ) {
      e.preventDefault();
      reloadApp();
    } else if ( ctrl && !shift && ( e.key === 'q' || e.key === 'Q' ) ) {
      e.preventDefault();
      closeWindow();
    } else if ( ctrl && !shift && e.key === 'p' ) {
      e.preventDefault();
      window.print();
    } else if ( e.key === 'F11' ) {
      e.preventDefault();
      toggleFullscreen();
    } else if ( e.key === 'Escape' && isFullscreenActive() ) {
      e.preventDefault();
      exitFullscreen();
    } else if ( e.altKey && e.key === 'z' ) {
      e.preventDefault();
      const current = config.wordWrap !== false;
      const next = !current;
      _editorAPI.setLineWrapping( next );
      config.wordWrap = next;
      saveConfig();
      setMenuChecked( 'toggle-word-wrap', next );
    } else if ( e.altKey && e.key === 'x' ) {
      e.preventDefault();
      const current = config.syncScroll !== false;
      const next = !current;
      setSyncEnabled( next );
      config.syncScroll = next;
      saveConfig();
      setMenuChecked( 'toggle-sync', next );
    } else if ( e.altKey && e.key === 'c' ) {
      e.preventDefault();
      const current = config.lineNumbers !== false;
      const next = !current;
      _editorAPI.setLineNumbers( next );
      config.lineNumbers = next;
      saveConfig();
      setMenuChecked( 'toggle-line-numbers', next );
    } else if ( e.altKey && e.key === 'p' ) {
      e.preventDefault();
      const current = config.showPageBreaks !== false;
      const next = !current;
      config.showPageBreaks = next;
      saveConfig();
      setMenuChecked( 'toggle-pb-visibility', next );
      const previewPane = document.getElementById( 'preview-pane' );
      if ( previewPane ) {
        if ( next ) {
          previewPane.classList.remove( 'hide-pb-markers' );
        } else {
          previewPane.classList.add( 'hide-pb-markers' );
        }
      }
    } else if ( e.altKey && e.key === 't' ) {
      e.preventDefault();
      armLeader( 'theme' );
    } else if ( e.altKey && e.key === 'f' ) {
      e.preventDefault();
      armLeader( 'font' );
    } else if ( e.altKey && e.key === 'd' ) {
      e.preventDefault();
      armLeader( 'tab' );
    } else if ( ctrl && ( e.key === '?' || ( shift && e.key === '/' ) ) ) {
      e.preventDefault();
      toggleShortcutsModal();
    }
  } );

  const badge = document.getElementById( 'zoom-badge' );
  if ( badge ) {
    badge.addEventListener( 'mouseenter', () => {
      badge.textContent = 'Reset';
    } );
    badge.addEventListener( 'mouseleave', () => {
      updateZoomBadge( config.fontSize || 14 );
    } );
    badge.addEventListener( 'click', ( e ) => {
      e.preventDefault();
      e.stopPropagation();
      const newSize = 14;
      document.documentElement.style.setProperty( '--font-size', `${ newSize }px` );
      config.fontSize = newSize;
      saveConfig();
      updateZoomBadge( newSize );
      _editorAPI.requestMeasure();
    } );
  }

  window.addEventListener( 'wheel', ( e ) => {
    if ( e.ctrlKey ) {
      e.preventDefault();
      const currentSize = config.fontSize || 14;
      if ( e.deltaY < 0 ) {
        // Scroll Up: Increase font size
        if ( currentSize < 36 ) {
          const newSize = currentSize + 1;
          document.documentElement.style.setProperty( '--font-size', `${ newSize }px` );
          config.fontSize = newSize;
          saveConfig();
          updateZoomBadge( newSize );
          _editorAPI.requestMeasure();
        }
      } else if ( e.deltaY > 0 ) {
        // Scroll Down: Decrease font size
        if ( currentSize > 8 ) {
          const newSize = currentSize - 1;
          document.documentElement.style.setProperty( '--font-size', `${ newSize }px` );
          config.fontSize = newSize;
          saveConfig();
          updateZoomBadge( newSize );
          _editorAPI.requestMeasure();
        }
      }
    }
  }, { passive: false } );
}

// ---- Alt-leader chord helpers (theme / font / tab cycling) ----

function armLeader( name ) {
  leader = name;
  clearTimeout( leaderTimer );
  leaderTimer = setTimeout( () => { leader = null; }, LEADER_WINDOW_MS );
}

function disarmLeader() {
  leader = null;
  clearTimeout( leaderTimer );
}

function cycleActiveLeader( direction ) {
  if ( leader === 'theme' ) {
    cycleTheme( direction );
  } else if ( leader === 'font' ) {
    cycleFont( direction );
  } else if ( leader === 'tab' ) {
    cycleTab( direction );
  }
  // Re-arm so the user can keep pressing Up/Down within the window.
  armLeader( leader );
}

function cycleFont( direction ) {
  const cur = config.fontFamily || FONT_FAMILIES[ 0 ];
  let idx = FONT_FAMILIES.indexOf( cur );
  if ( idx === -1 ) idx = 0;
  const next = FONT_FAMILIES[ ( idx + direction + FONT_FAMILIES.length ) % FONT_FAMILIES.length ];
  document.documentElement.style.setProperty( '--font-mono', next );
  config.fontFamily = next;
  saveConfig();
  setActiveFontFamily( next );
  _editorAPI.requestMeasure();
}

function cycleTab( direction ) {
  const cur = config.tabSize || 4;
  let idx = TAB_SIZES.indexOf( cur );
  if ( idx === -1 ) idx = TAB_SIZES.indexOf( 4 );
  const next = TAB_SIZES[ ( idx + direction + TAB_SIZES.length ) % TAB_SIZES.length ];
  _editorAPI.setTabSize( next );
  config.tabSize = next;
  saveConfig();
  setActiveTabSize( next );
}

// Guarded reload (Ctrl+Shift+R): warn on unsaved changes, then re-run boot from
// persisted config.
async function reloadApp() {
  if ( await confirmDiscardChanges() ) {
    window.location.reload();
  }
}

export function updateZoomBadge( size ) {
  const badge = document.getElementById( 'zoom-badge' );
  if ( !badge ) return;
  const percent = Math.round( ( size / 14 ) * 100 );
  badge.textContent = `${ percent }%`;
}
