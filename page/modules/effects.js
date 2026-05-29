/* ==========================================================================
   FEATHER MD LANDING PAGE — GRAPHIC EFFECTS MODULE
   ========================================================================== */

/**
 * Attaches smooth ambient glow shifting locked to mouse position coordinates.
 */
export function initAmbientGlowParallax(ambientGlow) {
  if (!ambientGlow) return;
  
  document.addEventListener('mousemove', (e) => {
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    
    // Smooth, restrained physics-like shift
    const offsetX = (mouseX - window.innerWidth / 2) * 0.1;
    const offsetY = (mouseY - window.innerHeight / 2) * 0.1;
    
    ambientGlow.style.transform = `translate(calc(-50% + ${offsetX}px), ${offsetY}px)`;
  });
}

/**
 * Initializes benchmarks lazy animation bars upon scrolling them into view.
 */
export function initBenchmarkReveal(benchmarkSection, benchmarkBars) {
  if (!benchmarkSection || benchmarkBars.length === 0) return;
  
  let animationTriggered = false;

  function checkScrollReveal() {
    if (animationTriggered) return;
    
    const rect = benchmarkSection.getBoundingClientRect();
    const isVisible = rect.top < window.innerHeight - 100;
    
    if (isVisible) {
      benchmarkBars.forEach(bar => {
        const targetWidth = bar.getAttribute('data-width');
        bar.style.width = targetWidth;
      });
      animationTriggered = true;
    }
  }

  // Reset bar widths to 0 initially for the animation transition trigger
  benchmarkBars.forEach(bar => {
    bar.style.width = '0%';
  });

  window.addEventListener('scroll', checkScrollReveal, { passive: true });
  
  // Trigger immediately in case user loads page already scrolled down
  setTimeout(checkScrollReveal, 400);
}
