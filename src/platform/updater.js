// ========================================
// Feather MD — Auto-Updater Module
// ========================================
// Background auto-update with status communicated through the existing version
// text in the bottom-right status bar. Three phases:
//
//   idle      — version text shows "v1.9.2", clickable (opens GitHub repo).
//   updating  — version text shows "Updating...", click disabled.
//   ready     — version text shows "Restart App!", accent-colored, clickable
//               (relaunches after unsaved-changes guard).

import { confirmDiscardChanges } from '../core/file-io.js';

// Current update phase: 'idle' | 'updating' | 'ready'
let _phase = 'idle';

/**
 * Synchronous getter: true while a download/install is in progress.
 * Used by the close handler to warn when quitting mid-download.
 */
export function isUpdateInProgress() {
  return _phase === 'updating';
}

/**
 * Initialize the auto-update checker.
 * Call once during app startup, after DOMContentLoaded.
 * Safe to call in browser mode — silently no-ops.
 */
export async function initUpdater() {
  let isTauri = false;
  try {
    await import('@tauri-apps/api/core');
    isTauri = true;
  } catch {
    // Not in Tauri
  }
  if (!isTauri) return;

  const versionEl = document.getElementById('status-version');
  if (!versionEl) return;

  // Store the original version text and href so we can restore on failure.
  const originalText = versionEl.textContent;
  const originalHref = versionEl.getAttribute('href');

  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    const { relaunch } = await import('@tauri-apps/plugin-process');

    const update = await check();
    if (!update) return; // Already on latest version

    // ---- Phase: updating ----
    _phase = 'updating';
    versionEl.textContent = 'Updating...';
    versionEl.removeAttribute('href');
    versionEl.classList.add('update-in-progress');

    try {
      await update.downloadAndInstall();
    } catch (err) {
      // Download failed — silently revert to original state. The user never
      // knew an update was happening, so no error UI is needed.
      console.warn('[Updater] Download/install failed:', err);
      _phase = 'idle';
      versionEl.textContent = originalText;
      if (originalHref) versionEl.setAttribute('href', originalHref);
      versionEl.classList.remove('update-in-progress');
      return;
    }

    // ---- Phase: ready ----
    _phase = 'ready';
    versionEl.textContent = 'Restart App!';
    versionEl.classList.remove('update-in-progress');
    versionEl.classList.add('update-ready');
    versionEl.removeAttribute('href');

    // Replace the default click handler with the restart flow.
    // Use a capturing, once-installed listener via cloneNode to cleanly
    // remove any previous listeners set by main.js.
    const freshEl = versionEl.cloneNode(true);
    versionEl.replaceWith(freshEl);

    freshEl.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!(await confirmDiscardChanges())) return;
      try {
        await relaunch();
      } catch (err) {
        console.error('[Updater] Relaunch failed:', err);
      }
    });
  } catch (err) {
    // Update check itself failed (offline, server down, etc.)
    console.warn('[Updater] Update check failed:', err);
  }
}
