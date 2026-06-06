// Fullscreen preview mode (F11).
//
// Toggles a distraction-free, preview-only surface: the body gains the
// `fullscreen-preview` class (CSS hides the header, editor, divider, and status
// bar so only the preview remains), and — under Tauri — the window is maximized
// so the preview fills the work area. Maximize (rather than OS borderless
// fullscreen) is deliberate: borderless fullscreen on Windows resizes the
// window ahead of the WebView, leaving a taskbar-height strip of native (black)
// window background that no CSS can cover. Maximize keeps the taskbar visible
// and resizes the WebView cleanly. Ctrl+scroll zoom keeps working because both
// panes are sized from the shared `--font-size` variable.

import { getWindowMaximized, setWindowMaximized } from '../platform/window.js';

let active = false;
let hintTimer = null;
// Remembers whether the window was already maximized on entry, so exiting
// restores the prior state instead of always unmaximizing.
let wasMaximized = false;

export function isFullscreenActive() {
  return active;
}

export function toggleFullscreen() {
  return active ? exitFullscreen() : enterFullscreen();
}

export async function enterFullscreen() {
  if ( active ) return;
  active = true;
  wasMaximized = await getWindowMaximized();
  document.body.classList.add( 'fullscreen-preview' );
  showHint();
  await setWindowMaximized( true );
}

export async function exitFullscreen() {
  if ( !active ) return;
  active = false;
  document.body.classList.remove( 'fullscreen-preview' );
  hideHint();
  if ( !wasMaximized ) await setWindowMaximized( false );
}

// A small auto-fading hint so the user is never stranded with no visible chrome.
function showHint() {
  let hint = document.getElementById( 'fullscreen-hint' );
  if ( !hint ) {
    hint = document.createElement( 'div' );
    hint.id = 'fullscreen-hint';
    document.body.appendChild( hint );
  }
  hint.textContent = 'Press Esc or F11 to exit fullscreen';
  // Force reflow so the fade-in animation restarts on repeated entries.
  void hint.offsetWidth;
  hint.classList.add( 'show' );
  clearTimeout( hintTimer );
  hintTimer = setTimeout( () => hint.classList.remove( 'show' ), 2500 );
}

function hideHint() {
  clearTimeout( hintTimer );
  const hint = document.getElementById( 'fullscreen-hint' );
  if ( hint ) hint.classList.remove( 'show' );
}
