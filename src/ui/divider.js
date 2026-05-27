// Editor/preview split-pane drag handle.

import { config, saveConfig } from '../core/config.js';

export function initDividerDrag() {
  const divider = document.getElementById( 'divider' );
  const container = document.getElementById( 'split-container' );
  const editorPane = document.getElementById( 'editor-pane' );
  const previewPane = document.getElementById( 'preview-pane' );

  let isDragging = false;

  divider.addEventListener( 'mousedown', ( e ) => {
    isDragging = true;
    divider.classList.add( 'dragging' );
    document.body.classList.add( 'resizing' );
    e.preventDefault();
  } );

  document.addEventListener( 'mousemove', ( e ) => {
    if ( !isDragging ) return;
    const rect = container.getBoundingClientRect();
    let ratio = ( e.clientX - rect.left ) / rect.width;
    ratio = Math.max( 0.2, Math.min( 0.8, ratio ) );
    editorPane.style.width = `${ ratio * 100 }%`;
    previewPane.style.width = `${ ( 1 - ratio ) * 100 }%`;
    config.splitRatio = ratio;
  } );

  document.addEventListener( 'mouseup', () => {
    if ( isDragging ) {
      isDragging = false;
      divider.classList.remove( 'dragging' );
      document.body.classList.remove( 'resizing' );
      saveConfig();
    }
  } );

  divider.addEventListener( 'dblclick', () => {
    editorPane.style.width = '50%';
    previewPane.style.width = '50%';
    config.splitRatio = 0.5;
    saveConfig();
  } );
}
