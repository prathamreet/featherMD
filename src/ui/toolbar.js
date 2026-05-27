// ========================================
// Feather MD — Toolbar Event Bindings
// ========================================

/**
 * Initialize toolbar button event handlers
 * @param {Object} handlers - Object with handler functions
 */
export function initToolbar(handlers) {
  // Open
  bindButton('btn-open', handlers.onOpen);

  // Save
  bindButton('btn-save', handlers.onSave);

  // New
  bindButton('btn-new', handlers.onNew);

  // Sync scroll toggle
  const syncBtn = document.getElementById('btn-sync-scroll');
  syncBtn.addEventListener('click', () => {
    const isActive = syncBtn.classList.toggle('active');
    handlers.onSyncToggle(isActive);
  });

  // Theme dropdown
  const themeBtn = document.getElementById('btn-theme');
  const themeMenu = document.getElementById('theme-menu');

  themeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = themeMenu.hidden;
    themeMenu.hidden = !isHidden;
  });

  // Close theme menu on click outside
  document.addEventListener('click', (e) => {
    if (!themeMenu.hidden && !themeMenu.contains(e.target) && e.target !== themeBtn) {
      themeMenu.hidden = true;
    }
  });

  // Theme item click
  themeMenu.addEventListener('click', (e) => {
    const item = e.target.closest('.dropdown-item');
    if (item) {
      const theme = item.getAttribute('data-theme');
      handlers.onThemeSelect(theme);
      themeMenu.hidden = true;
    }
  });

  // Line numbers toggle
  const lineNumBtn = document.getElementById('btn-line-numbers');
  lineNumBtn.addEventListener('click', () => {
    const isActive = lineNumBtn.classList.toggle('active');
    handlers.onLineNumbersToggle(isActive);
  });

  // Word wrap toggle
  const wordWrapBtn = document.getElementById('btn-word-wrap');
  wordWrapBtn.addEventListener('click', () => {
    const isActive = wordWrapBtn.classList.toggle('active');
    handlers.onWordWrapToggle(isActive);
  });

  // Vim mode toggle
  const vimBtn = document.getElementById('btn-vim');
  vimBtn.addEventListener('click', () => {
    const isActive = vimBtn.classList.toggle('active');
    handlers.onVimToggle(isActive);
  });

  // Settings
  bindButton('btn-settings', handlers.onSettings);
}

function bindButton(id, handler) {
  if (!handler) return;
  const btn = document.getElementById(id);
  if (btn) {
    btn.addEventListener('click', handler);
  }
}

/**
 * Update a toolbar button's active state
 */
export function setToolbarButtonActive(id, active) {
  const btn = document.getElementById(id);
  if (btn) {
    btn.classList.toggle('active', active);
  }
}
