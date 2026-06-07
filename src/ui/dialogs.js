// Custom modal dialogs (unsaved-changes prompt, shortcuts help).

/**
 * Show the 3-button unsaved-changes dialog.
 *
 * Keyboard contract (ISSUE-8):
 *   - Tab / Shift+Tab cycle the three buttons (browser default; Save is focused
 *     on open so Enter activates Save by default).
 *   - Enter activates the focused button (browser default).
 *   - Escape cancels.
 *   - Single-letter shortcuts (no modifiers): S = Save, N = Don't Save,
 *     C = Cancel. Ignored when a modifier key is held so they do not collide
 *     with Ctrl+S etc.
 *
 * @returns {Promise<'save'|'discard'|'cancel'>}
 */
export function showUnsavedDialog() {
  return new Promise( ( resolve ) => {
    const dialog = document.getElementById( 'unsaved-dialog' );
    const btnSave = document.getElementById( 'unsaved-btn-save' );
    const btnDiscard = document.getElementById( 'unsaved-btn-discard' );
    const btnCancel = document.getElementById( 'unsaved-btn-cancel' );

    dialog.hidden = false;
    setTimeout( () => btnSave.focus(), 50 );

    function cleanup( result ) {
      dialog.hidden = true;
      btnSave.removeEventListener( 'click', onSave );
      btnDiscard.removeEventListener( 'click', onDiscard );
      btnCancel.removeEventListener( 'click', onCancel );
      dialog.removeEventListener( 'click', onOverlayClick );
      document.removeEventListener( 'keydown', onKeydown, true );
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
        e.stopPropagation();
        cleanup( 'cancel' );
        return;
      }
      // Ignore key shortcuts when any modifier is held — protects global
      // bindings (Ctrl+S, Alt+Z, etc.) from firing while the modal is open.
      if ( e.ctrlKey || e.metaKey || e.altKey || e.shiftKey ) return;

      const key = e.key.toLowerCase();
      if ( key === 's' ) {
        e.preventDefault();
        e.stopPropagation();
        cleanup( 'save' );
      } else if ( key === 'n' ) {
        e.preventDefault();
        e.stopPropagation();
        cleanup( 'discard' );
      } else if ( key === 'c' ) {
        e.preventDefault();
        e.stopPropagation();
        cleanup( 'cancel' );
      }
    }

    btnSave.addEventListener( 'click', onSave );
    btnDiscard.addEventListener( 'click', onDiscard );
    btnCancel.addEventListener( 'click', onCancel );
    dialog.addEventListener( 'click', onOverlayClick );
    // Capture phase so we beat the global keyboard.js listener for unmodified
    // S / N / C / Escape while the modal is open.
    document.addEventListener( 'keydown', onKeydown, true );
  } );
}

export function toggleShortcutsModal() {
  const modal = document.getElementById( 'shortcuts-modal' );
  modal.hidden = !modal.hidden;
}

export function initShortcutsModal() {
  const modal = document.getElementById( 'shortcuts-modal' );
  const closeBtn = document.getElementById( 'btn-close-shortcuts' );
  closeBtn?.addEventListener( 'click', () => {
    modal.hidden = true;
  } );
  modal?.addEventListener( 'click', ( e ) => {
    if ( e.target === modal ) modal.hidden = true;
  } );
  // Keyboard-first: Escape dismisses the modal while it is open.
  document.addEventListener( 'keydown', ( e ) => {
    if ( e.key === 'Escape' && modal && !modal.hidden ) {
      e.preventDefault();
      e.stopPropagation();
      modal.hidden = true;
    }
  } );
}

export function openRecentFilesModal() {
  const modal = document.getElementById( 'recent-files-modal' );
  if ( modal ) modal.hidden = false;
}

export function closeRecentFilesModal() {
  const modal = document.getElementById( 'recent-files-modal' );
  if ( modal ) modal.hidden = true;
}

export function initRecentFilesModal() {
  const modal = document.getElementById( 'recent-files-modal' );
  const closeBtn = document.getElementById( 'btn-close-recent' );
  closeBtn?.addEventListener( 'click', closeRecentFilesModal );
  modal?.addEventListener( 'click', ( e ) => {
    if ( e.target === modal ) closeRecentFilesModal();
  } );
  // Keyboard-first: Escape dismisses the modal while it is open.
  document.addEventListener( 'keydown', ( e ) => {
    if ( e.key === 'Escape' && modal && !modal.hidden ) {
      e.preventDefault();
      closeRecentFilesModal();
    }
  } );
}
