// Status bar + title bar updates.
// Reads window.currentFilePath / window.isDirty / window.lineEnding which are
// set up by core/state.js.

let _editorAPI = null;

export function initStatusBar( editorAPI ) {
  _editorAPI = editorAPI;
}

export function updateTitleBar() {
  const titleEl = document.getElementById( 'header-title' );
  let name = 'Untitled';
  if ( currentFilePath ) {
    const parts = currentFilePath.replace( /\\/g, '/' ).split( '/' );
    name = parts[ parts.length - 1 ];
  }
  const dot = isDirty ? ' *' : '';
  titleEl.textContent = `FeatherMD - ${ name }${ dot }`;
  document.title = titleEl.textContent;
}

export function updateStatusBar( text ) {
  const cleanText = stripMarkdown( text );
  const words = cleanText ? cleanText.trim().split( /\s+/ ).filter( Boolean ).length : 0;
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

  // Update selected words and total words count dynamically
  const text = _editorAPI.getValue();
  const selectedText = _editorAPI.getSelectedText();

  const cleanText = stripMarkdown( text );
  const words = cleanText ? cleanText.trim().split( /\s+/ ).filter( Boolean ).length : 0;
  document.getElementById( 'status-wordcount' ).textContent = `${ words } word${ words !== 1 ? 's' : '' }`;

  const cleanSelected = stripMarkdown( selectedText );
  const selWords = cleanSelected ? cleanSelected.trim().split( /\s+/ ).filter( Boolean ).length : 0;
  const selectedEl = document.getElementById( 'status-selected' );
  const separatorEl = document.getElementById( 'status-selected-separator' );

  if ( selWords > 0 ) {
    selectedEl.textContent = `${ selWords } selected`;
    selectedEl.style.display = '';
    separatorEl.style.display = '';
  } else {
    selectedEl.style.display = 'none';
    separatorEl.style.display = 'none';
  }
}

/**
 * Strips markdown characters to accurately count text words.
 */
function stripMarkdown(md) {
  if (!md) return '';
  // Replace links: [text](url) -> text
  let txt = md.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // Strip formatting characters: *, _, ~, `
  txt = txt.replace(/[\[\]\(\)\*_~`]/g, '');
  // Strip blockquote, header, and list markers at start of lines
  txt = txt.replace(/^\s*#+\s+/gm, '');
  txt = txt.replace(/^\s*>\s*/gm, '');
  txt = txt.replace(/^\s*[\-\*\+]\s+/gm, '');
  txt = txt.replace(/^\s*\d+\.\s+/gm, '');
  return txt;
}
