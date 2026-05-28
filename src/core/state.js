// HMR-resistant persistent state.
// Stored on window so values survive Vite hot-reloads of any module.

Object.defineProperty( window, 'currentFilePath', {
  get: () => window.__FEATHER_PATH__ || null,
  set: ( val ) => { window.__FEATHER_PATH__ = val; },
  configurable: true,
} );

Object.defineProperty( window, 'isDirty', {
  get: () => window.__FEATHER_DIRTY__ || false,
  set: ( val ) => { window.__FEATHER_DIRTY__ = val; },
  configurable: true,
} );

Object.defineProperty( window, 'lineEnding', {
  get: () => window.__FEATHER_LINE_ENDING__ || 'LF',
  set: ( val ) => { window.__FEATHER_LINE_ENDING__ = val; },
  configurable: true,
} );

let _isTauri = false;
export const isTauri = () => _isTauri;
export const setTauri = ( v ) => { _isTauri = !!v; };
