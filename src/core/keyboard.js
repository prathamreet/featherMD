// Global keyboard shortcuts. Wires DOM-level shortcuts to file ops,
// editor toggles, and the shortcuts modal.

import { config, saveConfig } from './config.js';
import { openFile, saveFile, saveFileAs, newFile } from './file-io.js';
import { setSyncEnabled } from './sync.js';
import { setMenuChecked } from '../ui/toolbar.js';
import { toggleShortcutsModal } from '../ui/dialogs.js';

let _editorAPI = null;

export function initKeyboardShortcuts( editorAPI ) {
  _editorAPI = editorAPI;

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
    } else if ( ctrl && !shift && e.key === 'p' ) {
      e.preventDefault();
      window.print();
    } else if ( ctrl && !shift && e.key === 'l' ) {
      e.preventDefault();
      const current = config.lineNumbers !== false;
      const next = !current;
      _editorAPI.setLineNumbers( next );
      config.lineNumbers = next;
      saveConfig();
      setMenuChecked( 'toggle-line-numbers', next );
    } else if ( e.altKey && e.key === 'z' ) {
      e.preventDefault();
      const current = config.wordWrap !== false;
      const next = !current;
      _editorAPI.setLineWrapping( next );
      config.wordWrap = next;
      saveConfig();
      setMenuChecked( 'toggle-word-wrap', next );
    } else if ( e.altKey && e.key === 's' ) {
      e.preventDefault();
      const current = config.syncScroll !== false;
      const next = !current;
      setSyncEnabled( next );
      config.syncScroll = next;
      saveConfig();
      setMenuChecked( 'toggle-sync', next );
    } else if ( ctrl && ( e.key === '?' || ( shift && e.key === '/' ) ) ) {
      e.preventDefault();
      toggleShortcutsModal();
    }
  } );

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
        }
      } else if ( e.deltaY > 0 ) {
        // Scroll Down: Decrease font size
        if ( currentSize > 8 ) {
          const newSize = currentSize - 1;
          document.documentElement.style.setProperty( '--font-size', `${ newSize }px` );
          config.fontSize = newSize;
          saveConfig();
        }
      }
    }
  }, { passive: false } );
}
