// Global keyboard shortcuts. Wires DOM-level shortcuts to file ops,
// settings, editor toggles, and the shortcuts modal.

import { config, saveConfig } from './config.js';
import { openFile, saveFile, saveFileAs, newFile } from './file-io.js';
import { setSyncEnabled } from './sync.js';
import { toggleSettings, updateSettingsUI } from '../ui/settings.js';
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
    } else if ( ctrl && !shift && e.key === 'l' ) {
      e.preventDefault();
      const btn = document.getElementById( 'btn-line-numbers' );
      const isActive = btn.classList.toggle( 'active' );
      _editorAPI.setLineNumbers( isActive );
      config.lineNumbers = isActive;
      saveConfig();
    } else if ( e.altKey && e.key === 'z' ) {
      e.preventDefault();
      const btn = document.getElementById( 'btn-word-wrap' );
      const isActive = btn.classList.toggle( 'active' );
      _editorAPI.setLineWrapping( isActive );
      config.wordWrap = isActive;
      saveConfig();
      updateSettingsUI( config );
    } else if ( e.altKey && e.key === 's' ) {
      e.preventDefault();
      const btn = document.getElementById( 'btn-sync-scroll' );
      const isActive = btn.classList.toggle( 'active' );
      setSyncEnabled( isActive );
      config.syncScroll = isActive;
      saveConfig();
    } else if ( ctrl && e.key === ',' ) {
      e.preventDefault();
      toggleSettings();
    } else if ( ctrl && ( e.key === '?' || ( shift && e.key === '/' ) ) ) {
      e.preventDefault();
      toggleShortcutsModal();
    }
  } );
}
