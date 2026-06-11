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
  const stats = countStats( text );
  applyStats( stats );

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

  // CF-3: full-document word/char/paragraph stats are recomputed only on edits
  // (updateStatusBar, fired from onContentChange). Recomputing them here ran
  // getValue() + 16 regex passes over the entire document on every arrow key,
  // click, and selection change — a real frame-budget cliff on large files.
  // Cursor movement only needs Ln/Col and the (small) current-selection stats.
  const selectedText = _editorAPI.getSelectedText();

  const selectedEl = document.getElementById( 'status-selected' );
  const separatorEl = document.getElementById( 'status-selected-separator' );

  if ( selectedText.length > 0 ) {
    const sel = countStats( selectedText );
    if ( sel.words > 0 || sel.chars > 0 ) {
      const w = formatCount( sel.words, 'word' );
      const c = formatCount( sel.chars, 'char' );
      const p = formatCount( sel.paragraphs, 'para' );
      selectedEl.textContent = `(${ w }, ${ c }, ${ p }) sel`;
      selectedEl.style.display = '';
      separatorEl.style.display = '';
    } else {
      selectedEl.style.display = 'none';
      separatorEl.style.display = 'none';
    }
  } else {
    selectedEl.style.display = 'none';
    separatorEl.style.display = 'none';
  }
}

/**
 * Write total stats into their individual spans.
 */
function applyStats( stats ) {
  document.getElementById( 'status-words' ).textContent = formatCount( stats.words, 'word' );
  document.getElementById( 'status-chars' ).textContent = formatCount( stats.chars, 'char' );
  document.getElementById( 'status-paragraphs' ).textContent = formatCount( stats.paragraphs, 'paragraph' );
}

/**
 * Format a single stat value: "1 word" / "5 words".
 */
function formatCount( n, noun ) {
  return n === 1 ? `1 ${ noun }` : `${ n } ${ noun }s`;
}

/**
 * Count words, characters, and paragraphs from raw markdown text
 * after stripping syntax artifacts. Exported so the performance benchmark can
 * measure the real pipeline (AT2-2) rather than a stand-in.
 */
export function countStats( text ) {
  if ( !text ) return { words: 0, chars: 0, paragraphs: 0 };

  const clean = stripMarkdown( text );

  const trimmed = clean.trim();
  const words = trimmed ? trimmed.split( /\s+/ ).filter( Boolean ).length : 0;
  const chars = trimmed.length;

  // Paragraphs: groups of non-empty lines separated by blank lines.
  const paragraphs = trimmed
    ? trimmed.split( /\n\s*\n/ ).filter( ( block ) => block.trim().length > 0 ).length
    : 0;

  return { words, chars, paragraphs };
}

/**
 * Strips markdown syntax to extract only the prose content for accurate
 * word, character, and paragraph counting.
 *
 * Processing order matters: patterns that contain other patterns (e.g. fenced
 * code blocks containing inline markers) must be removed first.
 */
function stripMarkdown( md ) {
  if ( !md ) return '';

  let txt = md;

  // 1. Fenced code blocks (``` or ~~~) -- remove the entire block including content
  txt = txt.replace( /^(`{3,}|~{3,})[\s\S]*?^\1\s*$/gm, '' );

  // 2. HTML tags (including custom elements like <pb>)
  txt = txt.replace( /<[^>]+>/g, '' );

  // 3. Images: ![alt](url) -> alt
  txt = txt.replace( /!\[([^\]]*)\]\([^)]*\)/g, '$1' );

  // 4. Links: [text](url) -> text
  txt = txt.replace( /\[([^\]]+)\]\([^)]*\)/g, '$1' );

  // 5. Reference links: [text][ref] -> text
  txt = txt.replace( /\[([^\]]+)\]\[[^\]]*\]/g, '$1' );

  // 6. Reference definitions: [ref]: url "title"
  txt = txt.replace( /^\s*\[[^\]]+\]:\s+.*$/gm, '' );

  // 7. Table alignment rows: | :--- | :---: | ---: |
  txt = txt.replace( /^\|?[\s:]*-{3,}[\s:]*([\s:]*\|[\s:]*-{3,}[\s:]*)*\|?\s*$/gm, '' );

  // 8. Table pipes: strip leading/trailing pipe and split-pipes, keep cell text
  txt = txt.replace( /^\||\|$/gm, '' );
  txt = txt.replace( /\|/g, ' ' );

  // 9. Horizontal rules: ---, ***, ___ (standalone lines with 3+ repeated chars)
  txt = txt.replace( /^\s*([-*_])\s*(\1\s*){2,}$/gm, '' );

  // 10. Task list checkboxes: [x], [X], [ ]
  txt = txt.replace( /\[[ xX]\]\s*/g, '' );

  // 11. Blockquote markers at start of lines
  txt = txt.replace( /^\s*>+\s?/gm, '' );

  // 12. Heading markers at start of lines
  txt = txt.replace( /^\s*#{1,6}\s+/gm, '' );

  // 13. Unordered list markers at start of lines
  txt = txt.replace( /^\s*[-*+]\s+/gm, '' );

  // 14. Ordered list markers at start of lines
  txt = txt.replace( /^\s*\d+\.\s+/gm, '' );

  // 15. Inline formatting: bold/italic (*** ** * ___ __ _), strikethrough (~~),
  //     inline code (`)
  txt = txt.replace( /(\*{1,3}|_{1,3}|~~|`+)/g, '' );

  // 16. Escaped characters: \* \_ \` etc -> the character itself
  txt = txt.replace( /\\([\\`*_{}[\]()#+\-.!~|>])/g, '$1' );

  return txt;
}
