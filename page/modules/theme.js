/* ==========================================================================
   FEATHER MD LANDING PAGE — THEME ENGINE MODULE
   ========================================================================== */

/**
 * Applies a theme by setting attributes on the document element,
 * syncing checked dropdown state icons, and highlighting showcase cards.
 */
export function applyTheme(themeName, htmlEl, themeButtons, themeShowcaseCards) {
  htmlEl.setAttribute('data-theme', themeName);
  
  // Sync check icons in Editor Dropdown Menu
  themeButtons.forEach(btn => {
    const match = btn.getAttribute('data-theme') === themeName;
    btn.classList.toggle('checked', match);
    const checkIcon = btn.querySelector('.check-icon');
    if (checkIcon) checkIcon.textContent = match ? '✓' : '';
  });
  
  // Sync Selected active classes in the Showcase Grid
  themeShowcaseCards.forEach(card => {
    const match = card.getAttribute('data-target-theme') === themeName;
    card.classList.toggle('active', match);
  });

  // Update center titlebar label with active theme suffix
  const titleBarCenter = document.querySelector('.editor-titlebar-center');
  if (titleBarCenter) {
    titleBarCenter.textContent = `feathermd — getting-started.md [${themeName.toUpperCase()}]`;
  }
}

/**
 * Auto-detects operating system preferences on first launch to match onyx or snow.
 */
export function detectOSPreference(htmlEl, themeButtons, themeShowcaseCards) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = prefersDark ? 'onyx' : 'snow';
  applyTheme(initialTheme, htmlEl, themeButtons, themeShowcaseCards);
  return initialTheme;
}
