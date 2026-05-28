// Tauri window controls (minimize/maximize/close) and window size persistence.

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
      isMaximized ? appWindow.unmaximize() : appWindow.maximize();
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

    if ( windowResizeUnlisten ) windowResizeUnlisten();
    windowResizeUnlisten = await appWindow.onResized( ( { payload: size } ) => {
      if ( !size ) return;
      config.windowWidth = size.width;
      config.windowHeight = size.height;
      clearTimeout( windowResizeSaveTimer );
      windowResizeSaveTimer = setTimeout( saveConfig, 500 );
    } );
  } catch ( err ) {
    console.warn( 'Failed to initialize window size persistence:', err );
  }
}
