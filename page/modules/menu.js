/* ==========================================================================
   FEATHER MD LANDING PAGE — MENUS MODULE
   ========================================================================== */

/**
 * Initializes desktop-grade active hover dropdown tracking and toggles open classes.
 */
export function initDropdownMenus(menuButtons, menuPanels) {
  const dropdownContainers = document.querySelectorAll('.editor-menu-dropdown');

  dropdownContainers.forEach(container => {
    const btn = container.querySelector('.editor-menu-btn');
    const panel = container.querySelector('.editor-menu-panel');

    if (!btn || !panel) return;

    let closeTimeout = null;

    container.addEventListener('mouseenter', () => {
      if (closeTimeout) clearTimeout(closeTimeout);
      
      // Close all other panels first
      menuPanels.forEach(p => {
        if (p !== panel) p.classList.remove('open');
      });
      menuButtons.forEach(b => {
        if (b !== btn) b.classList.remove('active');
      });

      // Open this panel
      panel.classList.add('open');
      btn.classList.add('active');
    });

    container.addEventListener('mouseleave', () => {
      closeTimeout = setTimeout(() => {
        panel.classList.remove('open');
        btn.classList.remove('active');
      }, 150);
    });

    // Prevent clicks inside the panel from bubbling up to document click-out handlers
    panel.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  });

  // Global click-out backup closing behavior
  document.addEventListener('click', () => {
    menuPanels.forEach(p => p.classList.remove('open'));
    menuButtons.forEach(b => b.classList.remove('active'));
  });
}
