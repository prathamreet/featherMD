// Status bar + title bar updates.
// Reads window.currentFilePath / window.isDirty / window.lineEnding which are
// set up by core/state.js.

let _editorAPI = null;

export function initStatusBar( editorAPI ) {
  _editorAPI = editorAPI;
}

export function updateTitleBar() {
  const titleEl = document.getElementById( 'title-bar-text' );
  let name = 'Untitled';
  if ( currentFilePath ) {
    const parts = currentFilePath.replace( /\\/g, '/' ).split( '/' );
    name = parts[ parts.length - 1 ];
  }
  titleEl.textContent = isDirty ? `Feather MD — •${ name }` : `Feather MD — ${ name }`;
  document.title = titleEl.textContent;
}

export function updateStatusBar( text ) {
  const words = text ? text.trim().split( /\s+/ ).filter( Boolean ).length : 0;
  document.getElementById( 'status-wordcount' ).textContent = `${ words } word${ words !== 1 ? 's' : '' }`;

  const pathEl = document.getElementById( 'status-filepath' );
  pathEl.textContent = currentFilePath || 'Untitled';
  pathEl.title = currentFilePath || 'Untitled';

  updateCursorPosition();
  document.getElementById( 'status-line-ending' ).textContent = lineEnding;
}

export function updateCursorPosition() {
  if ( !_editorAPI ) return;
  const { line, col } = _editorAPI.getCursorPosition();
  document.getElementById( 'status-cursor' ).textContent = `Ln ${ line }, Col ${ col }`;
}
