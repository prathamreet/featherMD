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
