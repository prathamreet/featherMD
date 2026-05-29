// ========================================
// Feather MD -- Settings Module Tests
// ========================================
// The settings panel has been removed. All settings are now managed
// via the header menu bar. This module only retains updateRecentFiles.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { updateRecentFiles } from '../../src/ui/settings.js';

/**
 * Helper: create the recent files submenu DOM structure.
 */
function setupRecentFilesDOM() {
  document.body.innerHTML = `
    <div id="recent-files-submenu">
      <div class="menu-item-empty">No recent files</div>
    </div>
  `;
}

// -- updateRecentFiles (wrapper) --

describe('Settings -- updateRecentFiles', () => {
  beforeEach(() => {
    setupRecentFilesDOM();
  });

  it('should show empty message when passed empty array', () => {
    updateRecentFiles([], vi.fn());
    const container = document.getElementById('recent-files-submenu');
    expect(container.querySelector('.menu-item-empty')).toBeTruthy();
  });

  it('should show empty message when passed null', () => {
    updateRecentFiles(null, vi.fn());
    const container = document.getElementById('recent-files-submenu');
    expect(container.querySelector('.menu-item-empty')).toBeTruthy();
  });

  it('should render file items for recent files', () => {
    updateRecentFiles(['/path/to/file.md'], vi.fn());
    const container = document.getElementById('recent-files-submenu');
    const items = container.querySelectorAll('.recent-submenu-item');
    expect(items.length).toBe(1);
  });

  it('should render multiple file items', () => {
    updateRecentFiles(['/a.md', '/b.md', '/c.md'], vi.fn());
    const container = document.getElementById('recent-files-submenu');
    const items = container.querySelectorAll('.recent-submenu-item');
    expect(items.length).toBe(3);
  });

  it('should display filename in the item', () => {
    updateRecentFiles(['/path/to/README.md'], vi.fn());
    const container = document.getElementById('recent-files-submenu');
    const name = container.querySelector('.recent-submenu-name');
    expect(name.textContent).toBe('README.md');
  });

  it('should fire callback when clicking a recent file item', () => {
    const spy = vi.fn();
    updateRecentFiles(['/path/to/file.md'], spy);
    const container = document.getElementById('recent-files-submenu');
    container.querySelector('.recent-submenu-item').click();
    expect(spy).toHaveBeenCalledWith('/path/to/file.md');
  });

  it('should handle Windows-style paths', () => {
    updateRecentFiles(['C:\\Users\\user\\docs\\file.md'], vi.fn());
    const container = document.getElementById('recent-files-submenu');
    const name = container.querySelector('.recent-submenu-name');
    expect(name.textContent).toBe('file.md');
  });

  it('should not crash with empty string paths', () => {
    expect(() => updateRecentFiles([''], vi.fn())).not.toThrow();
  });
});
