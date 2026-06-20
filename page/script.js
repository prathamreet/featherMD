/* global Lenis */
/* ==========================================================================
   FEATHER MD LANDING PAGE — MAIN COORDINATOR SCRIPT (VANILLA JS MODULE)

   The interactive editor is now the REAL Feather MD app, embedded via an
   <iframe> (#demo-frame in index.html). It is built from /src and served at
   ./demo/ by the Pages deploy workflow, running in browser mode. This script
   therefore only drives the landing page itself: ambient lighting, smooth
   scrolling, and the dynamic latest-release download links.
   ========================================================================== */

import { initAmbientGlowParallax } from './modules/effects.js';

document.addEventListener( 'DOMContentLoaded', () => {

  // Disable browser scroll restoration and force the viewport to the top on reload.
  if ( 'scrollRestoration' in history ) {
    history.scrollRestoration = 'manual';
  }
  window.scrollTo( 0, 0 );

  // Prevent the browser from auto-scrolling to a hash section on reload/refresh.
  if ( window.location.hash ) {
    history.replaceState( '', document.title, window.location.pathname + window.location.search );
  }

  // Ambient background glow parallax (landing-page effect).
  initAmbientGlowParallax( document.getElementById( 'ambient-glow' ) );

  // ---- Live-demo iframe: click-to-activate so the page can scroll past it ----
  // A tall, scrollable iframe traps wheel scrolling. Keep it pointer-events:none
  // (visible but inert) so wheel events reach the page; activate interaction on
  // click, and re-arm when the pointer leaves the demo so page scroll returns.
  const demoFrame = document.getElementById( 'demo-frame' );
  const demoActivate = document.getElementById( 'demo-activate' );
  const demoFrameWrap = document.getElementById( 'demo-frame-wrap' );
  if ( demoFrame && demoActivate && demoFrameWrap ) {
    demoActivate.addEventListener( 'click', () => {
      demoFrame.style.pointerEvents = 'auto';
      demoActivate.style.display = 'none';
      try { demoFrame.contentWindow.focus(); } catch ( _ ) { /* cross-frame focus may be blocked */ }
    } );
    demoFrameWrap.addEventListener( 'mouseleave', () => {
      demoFrame.style.pointerEvents = 'none';
      demoActivate.style.display = 'flex';
    } );

    // Mirror the editor's active theme onto the WHOLE landing page, so switching
    // theme inside the demo repaints the page too. The iframe is same-origin
    // (both served from the Pages site), so we can watch its <html data-theme>.
    // styles.css defines the same 10 [data-theme] variants the app uses.
    demoFrame.addEventListener( 'load', () => {
      let innerDoc;
      try { innerDoc = demoFrame.contentDocument; } catch ( _ ) { return; }
      if ( !innerDoc || !innerDoc.documentElement ) return;
      const mirror = () => {
        const theme = innerDoc.documentElement.getAttribute( 'data-theme' );
        if ( theme ) document.documentElement.setAttribute( 'data-theme', theme );
      };
      mirror();
      new MutationObserver( mirror ).observe( innerDoc.documentElement, {
        attributes: true,
        attributeFilter: [ 'data-theme' ],
      } );
    } );
  }

  // ---- Lenis smooth scroll engine ----
  const lenis = new Lenis( {
    duration: 1.2,
    easing: ( t ) => Math.min( 1, 1.001 - Math.pow( 2, -10 * t ) ),
    smooth: true,
    mouseMultiplier: 1,
    smoothTouch: false,
    infinite: false
  } );

  function raf( time ) {
    lenis.raf( time );
    requestAnimationFrame( raf );
  }
  requestAnimationFrame( raf );

  // Intercept in-page anchor jumps for Lenis kinetic smoothness.
  document.querySelectorAll( 'a[href^="#"]' ).forEach( ( anchor ) => {
    anchor.addEventListener( 'click', function ( e ) {
      e.preventDefault();
      const targetId = this.getAttribute( 'href' );
      if ( targetId === '#' ) return;
      lenis.scrollTo( targetId, { duration: 1.2 } );
    } );
  } );

  // Velocity-controlled hero -> demo scrolljacking.
  let isScrollJacking = false;

  window.addEventListener( 'wheel', ( e ) => {
    const scrollY = window.scrollY;
    const heroSection = document.querySelector( '.hero-section' );
    if ( !heroSection ) return;
    const heroHeight = heroSection.offsetHeight;

    // Scroll Down from Hero to Editor
    if ( scrollY < 20 && e.deltaY > 0 && !isScrollJacking ) {
      e.preventDefault();
      isScrollJacking = true;
      lenis.scrollTo( '#editor-section', {
        duration: 1.4,
        onComplete: () => {
          setTimeout( () => { isScrollJacking = false; }, 200 );
        }
      } );
    }
    // Scroll Up from Editor to Hero
    else if ( scrollY > 20 && scrollY < heroHeight + 80 && e.deltaY < 0 && !isScrollJacking ) {
      const editorSection = document.getElementById( 'editor-section' );
      if ( editorSection ) {
        const rect = editorSection.getBoundingClientRect();
        if ( rect.top >= -20 && rect.top <= 120 ) {
          e.preventDefault();
          isScrollJacking = true;
          lenis.scrollTo( 0, {
            duration: 1.4,
            onComplete: () => {
              setTimeout( () => { isScrollJacking = false; }, 200 );
            }
          } );
        }
      }
    }
  }, { passive: false } );

  // ---- Dynamic live fetch for the latest GitHub release assets ----
  async function fetchLatestReleaseDetails() {
    try {
      const response = await fetch( 'https://api.github.com/repos/prathamreet/featherMD/releases/latest' );
      if ( !response.ok ) return;
      const data = await response.json();

      const assets = data.assets || [];
      const versionTag = data.tag_name || 'latest';

      // Update version tag elements dynamically
      [ 'dl-win-ver', 'dl-deb-ver', 'dl-app-ver' ].forEach( ( id ) => {
        const el = document.getElementById( id );
        if ( el ) el.textContent = versionTag;
      } );

      // Map assets to download columns dynamically
      assets.forEach( ( asset ) => {
        const name = asset.name.toLowerCase();
        const sizeMB = ( asset.size / ( 1024 * 1024 ) ).toFixed( 1 );
        const url = asset.browser_download_url;

        if ( name.endsWith( '.exe' ) ) {
          const btn = document.getElementById( 'dl-win-btn' );
          if ( btn ) {
            btn.setAttribute( 'href', url );
            btn.querySelector( 'span' ).textContent = `Download .exe (${ sizeMB } MB)`;
          }
        } else if ( name.endsWith( '.deb' ) ) {
          const btn = document.getElementById( 'dl-deb-btn' );
          if ( btn ) {
            btn.setAttribute( 'href', url );
            btn.querySelector( 'span' ).textContent = `Download .deb (${ sizeMB } MB)`;
          }
        } else if ( name.endsWith( '.appimage' ) ) {
          const btn = document.getElementById( 'dl-app-btn' );
          if ( btn ) {
            btn.setAttribute( 'href', url );
            btn.querySelector( 'span' ).textContent = `Download .AppImage (${ sizeMB } MB)`;
          }
        }
      } );
    } catch ( err ) {
      console.warn( 'Failed to dynamically fetch latest release:', err );
    }
  }

  fetchLatestReleaseDetails();
} );
