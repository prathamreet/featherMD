// Application configuration: defaults, load/save with Tauri filesystem
// fallback to localStorage in browser mode.

import { isTauri } from './state.js';

export const config = {
  theme: null,
  fontSize: 14,
  fontFamily: "'JetBrains Mono', monospace",
  tabSize: 4,
  wordWrap: true,
  lineNumbers: true,
  syncScroll: true,
  recentFiles: [],
  splitRatio: 0.5,
  windowWidth: 1200,
  windowHeight: 800,
  windowMaximized: false,
};

export async function loadConfig() {
  if ( isTauri() ) {
    try {
      const { appConfigDir, join } = await import( '@tauri-apps/api/path' );
      const { exists, readTextFile } = await import( '@tauri-apps/plugin-fs' );

      const configDir = await appConfigDir();
      const configPath = await join( configDir, 'feathermd', 'config.json' );

      if ( await exists( configPath ) ) {
        const content = await readTextFile( configPath );
        Object.assign( config, JSON.parse( content ) );
        return;
      }
    } catch ( err ) {
      console.warn( 'Failed to load native config, falling back to localStorage:', err );
    }
  }

  try {
    const stored = localStorage.getItem( 'feathermd-config' );
    if ( stored ) {
      Object.assign( config, JSON.parse( stored ) );
    }
  } catch ( err ) {
    console.warn( 'Failed to load config from localStorage:', err );
  }
}

export async function saveConfig() {
  try {
    localStorage.setItem( 'feathermd-config', JSON.stringify( config ) );
  } catch ( err ) {
    console.warn( 'Failed to save to localStorage:', err );
  }

  if ( !isTauri() ) return;

  try {
    const { appConfigDir, join } = await import( '@tauri-apps/api/path' );
    const { exists, writeTextFile, mkdir } = await import( '@tauri-apps/plugin-fs' );

    const configDir = await appConfigDir();
    const feathermdDir = await join( configDir, 'feathermd' );

    if ( !( await exists( feathermdDir ) ) ) {
      await mkdir( feathermdDir, { recursive: true } );
    }

    const configPath = await join( feathermdDir, 'config.json' );
    await writeTextFile( configPath, JSON.stringify( config, null, 2 ) );
  } catch ( err ) {
    console.error( 'Failed to save config file natively:', err );
  }
}
