// ========================================
// Feather MD - Settings Utilities
// ========================================
// Settings panel has been removed. All settings are now managed via the
// header menu bar (Style menu, View menu, font-size slider).
// This module only retains the updateRecentFiles helper.

import { updateRecentFilesMenu } from './toolbar.js';

/**
 * Update the recent files list in the File menu submenu.
 * Thin wrapper around the toolbar submenu builder.
 */
export function updateRecentFiles( recentFiles, onFileSelect ) {
  updateRecentFilesMenu( recentFiles, onFileSelect );
}
