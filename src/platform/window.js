// Tauri window controls (minimize/maximize/close) and window state persistence.

import { config, saveConfig } from '../core/config.js';
import { isTauri } from '../core/state.js';

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
 * Request a window close (Ctrl+Q). Routes through Tauri's close, which fires
 * the onCloseRequested handler wired in main.js so the unsaved-changes guard
 * still runs. No-op in browser dev mode.
 */
export async function closeWindow() {
  if ( !isTauri() ) return;
  try {
    const { getCurrentWindow } = await import( '@tauri-apps/api/window' );
    await getCurrentWindow().close();
  } catch ( err ) {
    console.warn( 'Failed to close window:', err );
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
