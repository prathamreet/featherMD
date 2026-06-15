// ========================================
// Feather MD - Menu Bar Event Bindings
// ========================================

import { escapeHtml } from '../core/utils.js';

let _leaveTimeout = null;

function clearLeaveTimeout() {
  if (_leaveTimeout) {
    clearTimeout(_leaveTimeout);
    _leaveTimeout = null;
  }
}

/**
 * Initialize the header menu bar
 * @param {Object} handlers - callback map
 */
export function initToolbar(handlers) {

  // Menu dropdown wrapper handles mouse hover opening/closing and clicks
  document.querySelectorAll('.menu-dropdown').forEach((dropdown) => {
    const btn = dropdown.querySelector('.menu-btn');
    if (!btn) return;
    const menuId = btn.getAttribute('data-menu');
    const panel = document.getElementById(menuId);
    if (!panel) return;

    // Toggle panel on click
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      clearLeaveTimeout();
      const isHidden = panel.hidden;
      closeAllMenus();
      if (isHidden) {
        panel.hidden = false;
        btn.classList.add('open');
      }
    });

    // Hover mouse enter on button -> immediately open the menu!
    btn.addEventListener('mouseenter', () => {
      clearLeaveTimeout();
      closeAllMenus();
      panel.hidden = false;
      btn.classList.add('open');
    });

    // Hover mouse enter on dropdown -> immediately open the menu!
    dropdown.addEventListener('mouseenter', () => {
      clearLeaveTimeout();
      if (panel.hidden) {
        closeAllMenus();
        panel.hidden = false;
        btn.classList.add('open');
      }
    });

    // Hover mouse leave -> gracefully schedule closure of all menus!
    dropdown.addEventListener('mouseleave', () => {
      clearLeaveTimeout();
      _leaveTimeout = setTimeout(() => {
        closeAllMenus();
      }, 180); // 180ms graceful delay to prevent accidental micro-movement close
    });
  });

  // Close menus on outside click
  document.addEventListener('click', () => {
    closeAllMenus();
  });

  // Prevent menu panels from closing when clicking inside
  document.querySelectorAll('.menu-panel').forEach((panel) => {
    panel.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  });

  // File menu actions
  wireAction('new-file', () => { handlers.onNew(); closeAllMenus(); });
  wireAction('open-file', () => { handlers.onOpen(); closeAllMenus(); });
  wireAction('save-file', () => { handlers.onSave(); closeAllMenus(); });
  wireAction('save-as', () => { handlers.onSaveAs(); closeAllMenus(); });
  wireAction('recent-files', () => { handlers.onRecentFiles(); closeAllMenus(); });
  wireAction('print', () => { handlers.onPrint(); closeAllMenus(); });

  // View menu toggles
  wireAction('toggle-sync', (item) => {
    const checked = item.getAttribute('data-checked') !== 'true';
    item.setAttribute('data-checked', checked ? 'true' : 'false');
    handlers.onSyncToggle(checked);
  });

  wireAction('toggle-line-numbers', (item) => {
    const checked = item.getAttribute('data-checked') !== 'true';
    item.setAttribute('data-checked', checked ? 'true' : 'false');
    handlers.onLineNumbersToggle(checked);
  });

  wireAction('toggle-word-wrap', (item) => {
    const checked = item.getAttribute('data-checked') !== 'true';
    item.setAttribute('data-checked', checked ? 'true' : 'false');
    handlers.onWordWrapToggle(checked);
  });

  wireAction('toggle-pb-visibility', (item) => {
    const checked = item.getAttribute('data-checked') !== 'true';
    item.setAttribute('data-checked', checked ? 'true' : 'false');
    handlers.onPageBreaksToggle(checked);
  });

  wireAction('toggle-sys-tray', (item) => {
    const checked = item.getAttribute('data-checked') !== 'true';
    item.setAttribute('data-checked', checked ? 'true' : 'false');
    handlers.onSysTrayToggle(checked);
  });

  wireAction('toggle-editor-monospace', (item) => {
    const checked = item.getAttribute('data-checked') !== 'true';
    item.setAttribute('data-checked', checked ? 'true' : 'false');
    handlers.onEditorMonospaceToggle(checked);
  });

  // Style menu - theme (ISSUE-5: stay open so users can preview multiple themes;
  // menus close on mouseleave with the standard 180ms grace timeout).
  wireAction('set-theme', (item) => {
    const theme = item.getAttribute('data-theme');
    handlers.onThemeSelect(theme);
  });

  // Style menu - font family (stays open)
  wireAction('set-font', (item) => {
    const font = item.getAttribute('data-font');
    handlers.onFontFamily(font);
    document.querySelectorAll('.font-item').forEach((fi) => {
      fi.setAttribute('data-checked', fi === item ? 'true' : 'false');
    });
  });

  // Style menu - tab size (stays open)
  wireAction('set-tab', (item) => {
    const size = parseInt(item.getAttribute('data-tab'), 10);
    if (Number.isNaN(size)) return; // TS2-2: ignore a missing/malformed data-tab
    handlers.onTabSize(size);
    document.querySelectorAll('.tab-item').forEach((ti) => {
      ti.setAttribute('data-checked', ti === item ? 'true' : 'false');
    });
  });


}

function wireAction(action, callback) {
  document.querySelectorAll(`[data-action="${action}"]`).forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      callback(el);
    });
  });
}

function closeAllMenus() {
  clearLeaveTimeout();
  document.querySelectorAll('.menu-panel').forEach((p) => {
    p.hidden = true;
  });
  document.querySelectorAll('.menu-btn').forEach((b) => {
    b.classList.remove('open');
  });
}

/**
 * Sync a View menu checkbox to match a boolean state
 */
export function setMenuChecked(action, checked) {
  const item = document.querySelector(`[data-action="${action}"]`);
  if (item) {
    item.setAttribute('data-checked', checked ? 'true' : 'false');
  }
}

/**
 * Update theme checkmarks
 */
export function setActiveTheme(themeName) {
  document.querySelectorAll('.theme-item').forEach((item) => {
    const t = item.getAttribute('data-theme');
    item.setAttribute('data-checked', t === themeName ? 'true' : 'false');
  });
}

/**
 * Update font family checkmarks
 */
export function setActiveFontFamily(font) {
  document.querySelectorAll('.font-item').forEach((item) => {
    const f = item.getAttribute('data-font');
    item.setAttribute('data-checked', f === font ? 'true' : 'false');
  });
}

/**
 * Update tab size checkmarks
 */
export function setActiveTabSize(size) {
  document.querySelectorAll('.tab-item').forEach((item) => {
    const s = item.getAttribute('data-tab');
    item.setAttribute('data-checked', parseInt(s, 10) === size ? 'true' : 'false');
  });
}



/**
 * Render the recent-files list into the Recent Files modal. Selecting an item
 * closes the modal and invokes the open-file callback. Each item has a remove
 * button, and a "Clear All" footer appears when the list is non-empty.
 */
export function updateRecentFilesList(recentFiles, onFileSelect, onRemove, onClear) {
  const container = document.getElementById('recent-files-list');
  if (!container) return;

  if (!recentFiles || recentFiles.length === 0) {
    container.innerHTML = '<div class="menu-item-empty">No recent files</div>';
    return;
  }

  container.innerHTML = '';
  recentFiles.forEach((filePath) => {
    const parts = filePath.replace(/\\/g, '/').split('/');
    const name = parts.pop() || 'Untitled';

    const btn = document.createElement('button');
    btn.className = 'recent-file-item';

    const info = document.createElement('div');
    info.className = 'recent-file-info';
    info.innerHTML = `
      <span class="recent-file-name" title="${escapeHtml(name)}">${escapeHtml(name)}</span>
      <span class="recent-file-path" title="${escapeHtml(filePath)}">${escapeHtml(filePath)}</span>
    `;

    const removeBtn = document.createElement('span');
    removeBtn.className = 'recent-file-remove';
    removeBtn.title = 'Remove from list';
    removeBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5">
      <line x1="3" y1="3" x2="9" y2="9"/>
      <line x1="9" y1="3" x2="3" y2="9"/>
    </svg>`;
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (onRemove) onRemove(filePath);
    });

    btn.appendChild(info);
    btn.appendChild(removeBtn);

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const modal = document.getElementById('recent-files-modal');
      if (modal) modal.hidden = true;
      if (onFileSelect) onFileSelect(filePath);
    });
    container.appendChild(btn);
  });

  const clearBtn = document.createElement('button');
  clearBtn.className = 'recent-files-clear';
  clearBtn.textContent = 'Clear All';
  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (onClear) onClear();
  });
  container.appendChild(clearBtn);
}
