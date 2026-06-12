// Application configuration: defaults, load/save with Tauri filesystem
// fallback to localStorage in browser mode.

import { isTauri } from './state.js';

// Canonical defaults. `config` starts as a copy; sanitizeConfig() falls back to
// these per-field when a loaded value is missing or the wrong type/range.
const DEFAULTS = Object.freeze( {
  theme: null,
  fontSize: 14,
  // ISSUE-15: reader-friendly PREVIEW font (see --font-reading). Default = Inter.
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  tabSize: 4,
  wordWrap: true,
  lineNumbers: true,
  syncScroll: true,
  recentFiles: [],
  splitRatio: 0.5,
  windowWidth: 1200,
  windowHeight: 800,
  windowMaximized: false,
  showPageBreaks: true,
  // Whether closing/Ctrl+Q hides the app to the system tray (true) or quits outright (false).
  sysTray: true,
} );

// RR2-2: the pre-reader-fonts builds defaulted fontFamily to the editor mono
// stack. That now drives the preview's --font-reading, which would render the
// preview in monospace for upgraders. Migrate that specific legacy default to
// the new reader default; a deliberately-chosen value is left untouched.
const LEGACY_MONO_FONT = "'JetBrains Mono', monospace";

export const config = { ...DEFAULTS, recentFiles: [] };

export async function loadConfig() {
  let loaded = false;

  if ( isTauri() ) {
    try {
      const { appConfigDir, join } = await import( '@tauri-apps/api/path' );
      const { exists, readTextFile } = await import( '@tauri-apps/plugin-fs' );

      const configDir = await appConfigDir();
      const configPath = await join( configDir, 'feathermd', 'config.json' );

      if ( await exists( configPath ) ) {
        const content = await readTextFile( configPath );
        Object.assign( config, JSON.parse( content ) );
        loaded = true;
      }
    } catch ( err ) {
      console.warn( 'Failed to load native config, falling back to localStorage:', err );
    }
  }

  if ( !loaded ) {
    try {
      const stored = localStorage.getItem( 'feathermd-config' );
      if ( stored ) {
        Object.assign( config, JSON.parse( stored ) );
      }
    } catch ( err ) {
      console.warn( 'Failed to load config from localStorage:', err );
    }
  }

  // TS-2: a corrupted or hand-edited config.json could carry wrong types or
  // out-of-range values (e.g. fontSize "abc", splitRatio NaN, recentFiles as a
  // number). Coerce/clamp every field back to a sane value so a bad file can't
  // brick the UI.
  sanitizeConfig();
}

function clampNumber( value, min, max, fallback ) {
  const n = Number( value );
  if ( !Number.isFinite( n ) ) return fallback;
  return Math.min( max, Math.max( min, n ) );
}

function toBool( value, fallback ) {
  return typeof value === 'boolean' ? value : fallback;
}

function sanitizeConfig() {
  config.fontSize = clampNumber( config.fontSize, 8, 36, DEFAULTS.fontSize );
  config.tabSize = ( config.tabSize === 2 || config.tabSize === 4 ) ? config.tabSize : DEFAULTS.tabSize;
  config.splitRatio = clampNumber( config.splitRatio, 0.2, 0.8, DEFAULTS.splitRatio );
  config.windowWidth = clampNumber( config.windowWidth, 600, 100000, DEFAULTS.windowWidth );
  config.windowHeight = clampNumber( config.windowHeight, 400, 100000, DEFAULTS.windowHeight );

  config.wordWrap = toBool( config.wordWrap, DEFAULTS.wordWrap );
  config.lineNumbers = toBool( config.lineNumbers, DEFAULTS.lineNumbers );
  config.syncScroll = toBool( config.syncScroll, DEFAULTS.syncScroll );
  config.showPageBreaks = toBool( config.showPageBreaks, DEFAULTS.showPageBreaks );
  config.windowMaximized = toBool( config.windowMaximized, DEFAULTS.windowMaximized );
  config.sysTray = toBool( config.sysTray, DEFAULTS.sysTray );

  if ( config.theme !== null && typeof config.theme !== 'string' ) config.theme = DEFAULTS.theme;
  if ( config.fontFamily === LEGACY_MONO_FONT ) config.fontFamily = DEFAULTS.fontFamily;
  if ( typeof config.fontFamily !== 'string' || !config.fontFamily ) config.fontFamily = DEFAULTS.fontFamily;

  config.recentFiles = Array.isArray( config.recentFiles )
    ? config.recentFiles.filter( ( p ) => typeof p === 'string' )
    : [];
}

// RR-2: serialize native writes. Multiple paths (zoom, resize, theme, toggles)
// call saveConfig() independently; without a queue two overlapping async writes
// to the same file can interleave and lose a change or corrupt config.json.
let saveChain = Promise.resolve();

export function saveConfig() {
  // localStorage mirror is synchronous, so it can't interleave — write it eagerly.
  try {
    localStorage.setItem( 'feathermd-config', JSON.stringify( config ) );
  } catch ( err ) {
    console.warn( 'Failed to save to localStorage:', err );
  }

  if ( !isTauri() ) return Promise.resolve();

  saveChain = saveChain.then( saveConfigNative ).catch( ( err ) => {
    console.error( 'Failed to save config file natively:', err );
  } );
  return saveChain;
}

async function saveConfigNative() {
  const { appConfigDir, join } = await import( '@tauri-apps/api/path' );
  const { exists, writeTextFile, mkdir } = await import( '@tauri-apps/plugin-fs' );

  const configDir = await appConfigDir();
  const feathermdDir = await join( configDir, 'feathermd' );

  if ( !( await exists( feathermdDir ) ) ) {
    await mkdir( feathermdDir, { recursive: true } );
  }

  const configPath = await join( feathermdDir, 'config.json' );
  await writeTextFile( configPath, JSON.stringify( config, null, 2 ) );
}
