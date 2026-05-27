// ========================================
// Feather MD — Auto-Updater Module
// ========================================
// Checks for updates on app startup (Tauri only).
// Shows an unobtrusive banner when a new version is available.
// User can choose to download+install immediately, which relaunches the app.

import { escapeHtml } from './utils.js';

/**
 * Initialize the auto-update checker.
 * Call this once during app startup, after DOMContentLoaded.
 * Safe to call in browser mode — it silently no-ops.
 */
export async function initUpdater() {
  // Only run inside Tauri desktop context (probe via ESM import, not globals)
  let isTauri = false;
  try {
    await import('@tauri-apps/api/core');
    isTauri = true;
  } catch {
    // Not in Tauri
  }
  if (!isTauri) return;

  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    const { relaunch } = await import('@tauri-apps/plugin-process');

    const update = await check();
    if (!update) return; // Already on latest version

    showUpdateBanner(update, relaunch);
  } catch (err) {
    // Silently ignore update check failures (offline, server down, etc.)
    console.warn('[Updater] Update check failed:', err);
  }
}

/**
 * Create and display an update-available banner at the top of the app.
 */
function showUpdateBanner(update, relaunch) {
  // Don't show duplicate banners
  if (document.getElementById('update-banner')) return;

  const banner = document.createElement('div');
  banner.id = 'update-banner';
  banner.innerHTML = `
    <span class="update-banner-text">
      A new version <strong>v${escapeHtml(update.version)}</strong> is available!
    </span>
    <div class="update-banner-actions">
      <button id="update-btn-install" class="update-btn update-btn-primary">Update Now</button>
      <button id="update-btn-dismiss" class="update-btn update-btn-secondary">Later</button>
    </div>
  `;

  // Insert at the very top of the body, before the menu bar
  document.body.insertBefore(banner, document.body.firstChild);

  // Trigger slide-in animation
  requestAnimationFrame(() => banner.classList.add('visible'));

  // Dismiss button
  document.getElementById('update-btn-dismiss').addEventListener('click', () => {
    banner.classList.remove('visible');
    setTimeout(() => banner.remove(), 300);
  });

  // Install button
  document.getElementById('update-btn-install').addEventListener('click', async () => {
    const installBtn = document.getElementById('update-btn-install');
    installBtn.textContent = 'Downloading…';
    installBtn.disabled = true;

    try {
      // Download and install the update.
      // On Windows NSIS, this will automatically close and relaunch.
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started' && event.data.contentLength) {
          installBtn.textContent = 'Downloading… 0%';
        } else if (event.event === 'Progress') {
          // event.data.chunkLength is available but total progress isn't easily computed
          installBtn.textContent = 'Downloading…';
        } else if (event.event === 'Finished') {
          installBtn.textContent = 'Restarting…';
        }
      });

      // Relaunch the application into the new version
      await relaunch();
    } catch (err) {
      console.error('[Updater] Install failed:', err);
      installBtn.textContent = 'Update Failed';
      installBtn.disabled = false;
    }
  });
}

