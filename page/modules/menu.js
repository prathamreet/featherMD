/* ==========================================================================
   FEATHER MD LANDING PAGE — MENUS MODULE
   ========================================================================== */

/**
 * Initializes desktop-grade active dropdown tracking and toggles open classes.
 */
export function initDropdownMenus(menuButtons, menuPanels) {
  let isMenuTracking = false;

  menuButtons.forEach(btn => {
    // Click behavior
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const panelId = btn.id.replace('demo-menu-', 'panel-');
      const targetPanel = document.getElementById(panelId);
      
      const isOpen = targetPanel.classList.contains('open');
      
      // Close all first
      menuPanels.forEach(p => p.classList.remove('open'));
      menuButtons.forEach(b => b.classList.remove('active'));
      
      if (!isOpen) {
        targetPanel.classList.add('open');
        btn.classList.add('active');
        isMenuTracking = true; // Engage active tracking
      } else {
        isMenuTracking = false; // Disengage tracking
      }
    });

    // Hover tracking behavior (standard desktop menu experience)
    btn.addEventListener('mouseenter', () => {
      if (!isMenuTracking) return;
      
      const panelId = btn.id.replace('demo-menu-', 'panel-');
      const targetPanel = document.getElementById(panelId);
      
      menuPanels.forEach(p => p.classList.remove('open'));
      menuButtons.forEach(b => b.classList.remove('active'));
      
      targetPanel.classList.add('open');
      btn.classList.add('active');
    });
  });

  // Click outside closes dropdown panels
  document.addEventListener('click', () => {
    menuPanels.forEach(p => p.classList.remove('open'));
    menuButtons.forEach(b => b.classList.remove('active'));
    isMenuTracking = false;
  });

  menuPanels.forEach(p => {
    p.addEventListener('click', (e) => e.stopPropagation());
  });

  // Close menus instantly upon clicking any action item or theme selector
  const menuActionItems = document.querySelectorAll('.editor-menu-item:not(.checkable), .theme-select-btn');
  menuActionItems.forEach(item => {
    item.addEventListener('click', () => {
      menuPanels.forEach(p => p.classList.remove('open'));
      menuButtons.forEach(b => b.classList.remove('active'));
      isMenuTracking = false;
    });
  });
}
