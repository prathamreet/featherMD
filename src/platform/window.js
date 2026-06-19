// Tauri window controls (minimize/maximize/close) and window state persistence.

import { config, saveConfig } from '../core/config.js';
import { isTauri } from '../core/state.js';
import { confirmDiscardChanges } from '../core/file-io.js';
import { isUpdateInProgress } from './updater.js';

export async function initWindowControls() {
  if ( !isTauri() ) return;

  try {
    const { getCurrentWindow } = await import( '@tauri-apps/api/window' );
    const appWindow = getCurrentWindow();

    document.getElementById( 'btn-minimize' ).addEventListener( 'click', () => appWindow.minimize() );
    document.getElementById( 'btn-maximize' ).addEventListener( 'click', async () => {
      const isMaximized = await appWindow.isMaximized();
      if ( isMaximized ) {
        appWindow.unmaximize();
      } else {
        appWindow.maximize();
      }
    } );
    document.getElementById( 'btn-close' ).addEventListener( 'click', () => appWindow.close() );
  } catch {
    console.log( 'Window controls not available in browser mode' );
  }
}

let windowResizeSaveTimer = null;
let windowResizeUnlisten = null;

// CF2-1: the single source of truth for "does a system tray actually exist".
// The Rust backend builds the tray only on Windows AND only when the user's
// sysTray preference is enabled, so this reflects reality — not just intent.
// Defaults to false so that, before it is resolved (and on every no-tray
// platform), closing QUITS rather than hiding into an unrecoverable window.
let _trayActive = false;

/** Synchronous getter for the cached tray state (see refreshTrayActive). */
export function isTrayActive() {
  return _trayActive;
}

/** Query the backend once for whether the tray is active, and cache it. */
export async function refreshTrayActive() {
  if ( !isTauri() ) {
    _trayActive = false;
    return false;
  }
  try {
    const { invoke } = await import( '@tauri-apps/api/core' );
    _trayActive = ( await invoke( 'tray_active' ) ) === true;
  } catch {
    _trayActive = false;
  }
  return _trayActive;
}

/**
 * Show the Tauri window. The window starts hidden (`visible: false` in
 * tauri.conf.json) to avoid the initial wrong-size flash; the orchestrator
 * must call this once the window has been sized/maximized from persisted
 * config. Idempotent and safe to call in browser dev mode (the Tauri import
 * fails silently → no-op).
 *
 * Requires `core:window:allow-show` in capabilities/default.json. Without
 * that permission Tauri 2 silently rejects the IPC and the window stays
 * hidden, which manifests as "the app launched but never appeared".
 */
export async function ensureWindowVisible() {
  let appWindow;
  try {
    const { getCurrentWindow } = await import( '@tauri-apps/api/window' );
    appWindow = getCurrentWindow();
  } catch {
    // Browser mode or Tauri unavailable - nothing to show.
    return;
  }
  try {
    await appWindow.show();
  } catch ( err ) {
    // Loud failure: a hidden window with no recovery path leaves the user
    // staring at an invisible process. Log so the cause is obvious.
    console.error( '[window] ensureWindowVisible: show() failed:', err );
  }
}

/**
 * Read the current maximized state. Returns false in browser dev mode or on
 * error so callers can treat it as "not maximized".
 */
export async function getWindowMaximized() {
  if ( !isTauri() ) return false;
  try {
    const { getCurrentWindow } = await import( '@tauri-apps/api/window' );
    return await getCurrentWindow().isMaximized();
  } catch {
    return false;
  }
}

/**
 * Maximize / unmaximize the window. Used by fullscreen preview mode (F11):
 * maximizing fills the work area (taskbar stays visible) and reliably resizes
 * the WebView, unlike OS borderless fullscreen which leaves a native-background
 * gap where the WebView lags the window. No-op in browser dev mode.
 */
export async function setWindowMaximized( on ) {
  if ( !isTauri() ) return;
  try {
    const { getCurrentWindow } = await import( '@tauri-apps/api/window' );
    const appWindow = getCurrentWindow();
    if ( on ) {
      await appWindow.maximize();
    } else {
      await appWindow.unmaximize();
    }
  } catch ( err ) {
    console.warn( 'Failed to toggle window maximize:', err );
  }
}

/**
 * Hide the window to the system tray. Used by Ctrl+Q and the close button so
 * the app stays alive in the background (preserving in-progress PDF prints).
 * The process only terminates via the tray's right-click "Quit" item
 * (requestQuit). No-op in browser dev mode.
 */
export async function hideToTray() {
  if ( !isTauri() ) return;
  try {
    const { getCurrentWindow } = await import( '@tauri-apps/api/window' );
    await getCurrentWindow().hide();
    // Ask WebView2 to trim its working set while hidden (Windows-only; no-op
    // elsewhere). show_main_window restores NORMAL on the way back.
    const { invoke } = await import( '@tauri-apps/api/core' );
    await invoke( 'set_webview_memory', { low: true } );
  } catch ( err ) {
    console.error( 'Failed to hide window to tray:', err );
  }
}

/**
 * Fully quit the application. Only reachable from the tray's right-click
 * "Quit" menu item.
 *
 * ISSUE-1: Every other exit path (close button, Ctrl+Q) hides to the tray so
 * in-progress PDF prints finish writing. This is the sole path that actually
 * terminates the process. It surfaces the window first, runs the
 * unsaved-changes guard, and exits via plugin-process so the tray icon is torn
 * down too. No-op in browser dev mode.
 */
export async function requestQuit() {
  if ( !isTauri() ) return;

  // Bring the window forward so the unsaved-changes dialog is visible even when
  // the quit was triggered from the tray while the window was hidden.
  try {
    const { getCurrentWindow } = await import( '@tauri-apps/api/window' );
    const appWindow = getCurrentWindow();
    await appWindow.show();
    await appWindow.setFocus();
  } catch {
    // ignore — proceed to the guard regardless
  }

  // ISSUE-1: warn the user if a background update download is still in
  // progress — quitting now would abort it. This covers every full-quit path
  // (close button when no tray, tray-quit menu item, Ctrl+Q without tray).
  if ( isUpdateInProgress() ) {
    try {
      const { ask } = await import( '@tauri-apps/plugin-dialog' );
      const closeAnyway = await ask(
        'A new update is currently downloading. If you close the app, the download will be interrupted. Close anyway?',
        {
          title: 'Update in Progress',
          kind: 'warning',
          okLabel: 'Close Anyway',
          cancelLabel: 'Wait for Update',
        }
      );
      if ( !closeAnyway ) return;
    } catch {
      // Dialog failed — fall through to quit
    }
  }

  if ( !( await confirmDiscardChanges() ) ) return;

  try {
    const { exit } = await import( '@tauri-apps/plugin-process' );
    await exit( 0 );
  } catch ( err ) {
    console.error( 'Failed to exit application:', err );
  }
}

export async function initWindowSize() {
  if ( !isTauri() ) return;

  try {
    const { getCurrentWindow, LogicalSize } = await import( '@tauri-apps/api/window' );
    const appWindow = getCurrentWindow();

    // Restore maximized state
    if ( config.windowMaximized === true ) {
      try {
        await appWindow.maximize();
      } catch ( err ) {
        console.warn( 'Failed to restore maximized state:', err );
      }
    } else {
      // Restore saved size (centered)
      const w = Number( config.windowWidth );
      const h = Number( config.windowHeight );
      if ( Number.isFinite( w ) && Number.isFinite( h ) && w >= 600 && h >= 400
        && ( w !== 1200 || h !== 800 ) ) {
        try {
          await appWindow.setSize( new LogicalSize( w, h ) );
        } catch ( err ) {
          console.warn( 'Failed to restore window size:', err );
        }
      }
    }

    // Persist window size on resize
    if ( windowResizeUnlisten ) windowResizeUnlisten();
    windowResizeUnlisten = await appWindow.onResized( async ( { payload: size } ) => {
      if ( !size ) return;

      // Check maximized state and persist
      try {
        const maximized = await appWindow.isMaximized();
        config.windowMaximized = maximized;
        if ( !maximized ) {
          config.windowWidth = size.width;
          config.windowHeight = size.height;
        }
      } catch {
        config.windowWidth = size.width;
        config.windowHeight = size.height;
      }

      clearTimeout( windowResizeSaveTimer );
      windowResizeSaveTimer = setTimeout( saveConfig, 500 );
    } );
  } catch ( err ) {
    console.warn( 'Failed to initialize window size persistence:', err );
  }
}
