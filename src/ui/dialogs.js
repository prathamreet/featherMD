// Custom modal dialogs (unsaved-changes prompt, shortcuts help).

/**
 * Show the 3-button unsaved-changes dialog.
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
}
