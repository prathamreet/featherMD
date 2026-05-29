// ========================================
// Feather MD - Theme Manager
// ========================================

import { setActiveTheme } from './toolbar.js';

const THEMES = [
  'snow',
  'solarized-light',
  'github-light',
  'sepia',
  'gruvbox-light',
  'onyx',
  'solarized-dark',
  'github-dark',
  'monokai',
  'gruvbox-dark',
];

let currentTheme = 'snow';
let userPickedTheme = false;
let onThemeChangeCallback = null;

/**
 * Initialize themes - reads from config or detects OS preference
 * @param {Object} config - Loaded config object
 * @param {Function} onThemeChange - Callback when theme changes
 */
export function initThemes( config, onThemeChange ) {
  onThemeChangeCallback = onThemeChange;

  if ( config && config.theme && THEMES.includes( config.theme ) ) {
    currentTheme = config.theme;
    userPickedTheme = true;
  } else {
    currentTheme = detectOSTheme();
  }

  applyTheme( currentTheme );

  // Listen for OS theme changes
  const mq = window.matchMedia( '(prefers-color-scheme: dark)' );
  mq.addEventListener( 'change', ( e ) => {
    if ( !userPickedTheme ) {
      const newTheme = e.matches ? 'onyx' : 'snow';
      applyTheme( newTheme );
    }
  } );

  // Update menu active state
  setActiveTheme( currentTheme );
}

/**
 * Detect OS color scheme preference
 */
function detectOSTheme() {
  return window.matchMedia( '(prefers-color-scheme: dark)' ).matches ? 'onyx' : 'snow';
}

/**
 * Apply a theme by name
 */
export function applyTheme( name ) {
  if ( !THEMES.includes( name ) ) return;
  currentTheme = name;
  document.documentElement.setAttribute( 'data-theme', name );
  setActiveTheme( name );
  if ( onThemeChangeCallback ) {
    onThemeChangeCallback( name );
  }
}

/**
 * Set theme from user selection (marks as user-picked)
 */
export function setTheme( name ) {
  userPickedTheme = true;
  applyTheme( name );
}
