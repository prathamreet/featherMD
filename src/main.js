// Feather MD - application entry. Wires editor, preview, Tauri IPC,
// menu bar, and settings. Each subsystem lives in its own module; this file is
// orchestration only.
//
// Boot ordering (PERF-14):
//   Phase 1 — synchronous DOM mount with in-memory defaults. First paint < 50ms.
//   Phase 2 — async config load, theme apply, Tauri wiring. Welcome text is
//             shown immediately and overwritten if a CLI file arrives later.

import './core/state.js';
import { isTauri, setTauri } from './core/state.js';
import { config, loadConfig, saveConfig } from './core/config.js';
import { WELCOME_TEXT, EXAMPLES_TEXT } from './core/welcome.js';
import {
    initFileIO,
    loadFileContent,
    openFile,
    saveFile,
    saveFileAs,
    newFile,
    onRecentFileSelect,
    removeRecentFile,
    clearRecentFiles,
    confirmDiscardChanges,
} from './core/file-io.js';
import { initKeyboardShortcuts, updateZoomBadge } from './core/keyboard.js';
import { initScrollSync, setSyncEnabled } from './core/sync.js';

import { initEditor } from './editor/editor.js';
import { initPreview } from './preview/preview.js';

import { initThemes, setTheme } from './ui/themes.js';
import {
    initToolbar,
    setMenuChecked,
    setActiveTheme,
    setActiveFontFamily,
    setActiveTabSize,
    updateRecentFilesList,
} from './ui/toolbar.js';
import { initShortcutsModal, initRecentFilesModal, openRecentFilesModal } from './ui/dialogs.js';
import { initStatusBar, updateTitleBar, updateStatusBar, updateCursorPosition } from './ui/status-bar.js';
import { initDividerDrag } from './ui/divider.js';

import { initUpdater } from './platform/updater.js';
import { initWindowControls, initWindowSize, ensureWindowVisible, requestQuit, hideToTray, isTrayActive, refreshTrayActive } from './platform/window.js';

let editorAPI = null;
let previewAPI = null;

window.addEventListener('DOMContentLoaded', () => {
    // ---- Phase 1: synchronous mount ----
    // Apply OS-preferred theme up-front so the first paint matches the user's
    // preference; saved config (if any) overrides it during Phase 2.
    document.documentElement.setAttribute(
        'data-theme',
        window.matchMedia('(prefers-color-scheme: dark)').matches ? 'onyx' : 'snow',
    );

    editorAPI = initEditor(
        document.getElementById('editor-pane'),
        onContentChange,
        () => updateCursorPosition(),
    );
    previewAPI = initPreview(document.getElementById('preview-content'));

    initStatusBar(editorAPI);
    initFileIO(editorAPI);
    initScrollSync(editorAPI, previewAPI);
    initDividerDrag();
    initKeyboardShortcuts(editorAPI);
    initShortcutsModal();
    initRecentFilesModal();

    // ISSUE-16: Triple-click in preview jumps to the source in the editor.
    previewAPI.initPreviewClickToEdit((text) => {
        editorAPI.searchAndHighlight(text);
    });

    // Load the KaTeX/Mermaid examples only when the user asks — keeps those heavy
    // engines out of the cold-start renderer heap (see welcome.js).
    const previewContent = document.getElementById('preview-content');
    if (previewContent) {
        previewContent.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link || !(link.getAttribute('href') || '').endsWith('#examples')) return;
            e.preventDefault();
            editorAPI.setValue(EXAMPLES_TEXT);
            editorAPI.focus();
        });
    }

    const statusVersion = document.getElementById('status-version');
    if (statusVersion) {
        statusVersion.addEventListener('click', async (e) => {
            e.preventDefault();
            const url = 'https://github.com/prathamreet/featherMD';
            try {
                const { invoke } = await import('@tauri-apps/api/core');
                await invoke('plugin:opener|open_url', { url });
            } catch {
                window.open(url, '_blank');
            }
        });
    }
    // initWindowControls() lives in Phase 2 — it short-circuits on `!isTauri()`,
    // and `setTauri(true)` only flips during Phase 2 after the Tauri core import.

    editorAPI.setValue(WELCOME_TEXT);
    editorAPI.focus();

    initPrintThemeOverride();

    // ---- Phase 2: async config + Tauri ----
    bootAsync();
});

// ISSUE-11: Print output should always use the snow theme so the PDF stays
// legible regardless of the active editor theme.
//
// Two layers are needed because the print pipeline has two kinds of "themed"
// content:
//
//   1. CSS-variable-driven elements (text, backgrounds, code blocks, tables,
//      blockquotes, KaTeX). Switching `data-theme="snow"` on <html> re-themes
//      all of these in a single attribute write — every variable in the
//      document reads through that attribute. No re-render needed.
//
//   2. Mermaid diagrams. Their colours are *baked into the SVG* at render
//      time, so a CSS swap cannot touch them. They have to be re-rendered.
//      previewAPI.refreshForThemeChange() reads the current data-theme and
//      re-renders every diagram in place — calling it after the data-theme
//      swap above makes Mermaid emit snow-equivalent (default light) SVGs.
//
// `beforeprint` can't await async work (the print dialog opens before the
// handler resolves), so we wrap window.print() itself. Both the Ctrl+P
// shortcut and the File→Print menu funnel through window.print(), so a single
// wrap covers every print entry point. `afterprint` restores both layers
// once the dialog closes. The user's saved theme is never written to disk.
function initPrintThemeOverride() {
    let savedTheme = null;
    const originalPrint = window.print.bind(window);

    window.print = async function snowThemedPrint() {
        const current = document.documentElement.getAttribute('data-theme');
        if (current && current !== 'snow') {
            savedTheme = current;
            document.documentElement.setAttribute('data-theme', 'snow');
            // Re-render diagrams in the light Mermaid theme. No-ops instantly if
            // the document has no diagrams (refreshForThemeChange checks for that).
            if (previewAPI && typeof previewAPI.refreshForThemeChange === 'function') {
                try { await previewAPI.refreshForThemeChange(); } catch { /* keep printing */ }
            }
            // One paint frame so the swapped SVGs are fully laid out before the
            // print dialog takes its DOM snapshot.
            await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        }

        try {
            originalPrint();
        } finally {
            if (savedTheme) {
                document.documentElement.setAttribute('data-theme', savedTheme);
                savedTheme = null;
                if (previewAPI && typeof previewAPI.refreshForThemeChange === 'function') {
                    previewAPI.refreshForThemeChange();
                }
            }
        }
    };
}


async function bootAsync() {
    try {
        await runBootSequence();
        pingAnalytics();
    } finally {
        // ISSUE-10: Window is hidden via tauri.conf.json (`visible: false`) to avoid
        // a brief wrong-size flash on startup. Show it only after persisted size
        // has been applied. Run in finally so a crash inside boot does not leave
        // the window invisible forever.
        await ensureWindowVisible();
    }
}

async function runBootSequence() {
    try {
        await import('@tauri-apps/api/core');
        setTauri(true);
    } catch {
        // Browser mode
    }

    await loadConfig();

    initThemes(config, (themeName) => {
        config.theme = themeName;
        saveConfig();
        previewAPI.refreshForThemeChange();
    });

    updateRecentFilesList(config.recentFiles || [], onRecentFileSelect, removeRecentFile, clearRecentFiles);

    initToolbar({
        onOpen: openFile,
        onSave: saveFile,
        onSaveAs: saveFileAs,
        onNew: newFile,
        onRecentFiles: openRecentFilesModal,
        onPrint: () => window.print(),
        onSyncToggle: (enabled) => {
            setSyncEnabled(enabled);
            config.syncScroll = enabled;
            saveConfig();
        },
        onThemeSelect: (theme) => {
            setTheme(theme);
            config.theme = theme;
            saveConfig();
        },
        onLineNumbersToggle: (show) => {
            editorAPI.setLineNumbers(show);
            config.lineNumbers = show;
            saveConfig();
        },
        onWordWrapToggle: (wrap) => {
            editorAPI.setLineWrapping(wrap);
            config.wordWrap = wrap;
            saveConfig();
        },
        onPageBreaksToggle: (show) => {
            config.showPageBreaks = show;
            saveConfig();
            const previewPane = document.getElementById('preview-pane');
            if (previewPane) {
                if (show) {
                    previewPane.classList.remove('hide-pb-markers');
                } else {
                    previewPane.classList.add('hide-pb-markers');
                }
            }
        },
        onSysTrayToggle: async (enabled) => {
            // Toggle the tray icon LIVE via the backend — no relaunch (which
            // would break the dev server and discard the open file). Rust shows/
            // hides the icon and updates the tray-active state the close handler
            // reads, so the new behavior takes effect immediately.
            config.sysTray = enabled;
            saveConfig();
            try {
                const { invoke } = await import('@tauri-apps/api/core');
                await invoke('set_tray', { enabled });
                await refreshTrayActive();
            } catch {
                // browser mode, or no tray on this platform — nothing to toggle
            }
        },
        onFontSize: (size) => {
            document.documentElement.style.setProperty('--font-size', `${size}px`);
            config.fontSize = size;
            saveConfig();
            editorAPI.requestMeasure();
        },
        onFontFamily: (font) => {
            // ISSUE-15: the Font menu picks a reader-friendly family for the
            // PREVIEW/print surface (--font-reading). The editor and inline code
            // stay on --font-mono unless editorMonospace is set to false.
            document.documentElement.style.setProperty('--font-reading', font);
            config.fontFamily = font;
            applyEditorFont();
            saveConfig();
        },
        onEditorMonospaceToggle: (enabled) => {
            config.editorMonospace = enabled;
            applyEditorFont();
            saveConfig();
        },
        onTabSize: (size) => {
            editorAPI.setTabSize(size);
            config.tabSize = size;
            saveConfig();
        },
    });

    applyPersistedConfig();
    applyFontSettings();

    if (isTauri()) {
        await initWindowControls();
        await wireTauriListeners();
        await initWindowSize();
    }

    initUpdater().catch(() => { });
}


// ---- Tauri IPC listeners ----
async function wireTauriListeners() {
    try {
        const { invoke } = await import('@tauri-apps/api/core');
        const initialFile = await invoke('get_initial_file');
        if (initialFile) {
            loadFileContent(initialFile.path, initialFile.content);
        }
    } catch (err) {
        console.error('Failed to retrieve initial file:', err);
    }

    try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const appWindow = getCurrentWindow();

        // Resolve the real tray state once before any close can happen.
        await refreshTrayActive();

        appWindow.onCloseRequested(async (event) => {
            event.preventDefault();

            try {
                const maximized = await appWindow.isMaximized();
                config.windowMaximized = maximized;
                await saveConfig();
            } catch {
                // ignore
            }

            // ISSUE-1: hide the window so in-progress PDF prints finish in the
            // background — but only when a tray genuinely exists to restore from.
            // Otherwise (tray disabled, or a tray-less platform) quit outright so
            // the window can't vanish into an unrecoverable process.
            if (isTrayActive()) {
                await hideToTray();
            } else {
                await requestQuit();
            }
        });

        const { listen } = await import('@tauri-apps/api/event');
        // The tray's right-click "Quit" is the only path that terminates the
        // process. Every other exit (close button, Ctrl+Q) hides to the tray.
        await listen('tray-quit', () => { requestQuit(); });

        // CF2-1: a second launch (single-instance) forwards its file argument
        // here so it opens in this running instance instead of a duplicate process.
        await listen('open-file-from-args', async (event) => {
            const path = event.payload;
            if (!path) return;
            if (!(await confirmDiscardChanges())) return;
            try {
                const { readTextFile } = await import('@tauri-apps/plugin-fs');
                const content = await readTextFile(path);
                loadFileContent(path, content);
            } catch (e) {
                console.error('Failed to open forwarded file:', e);
            }
        });
    } catch {
        console.log('Tauri API not available - running in browser mode');
    }

    try {
        const { listen } = await import('@tauri-apps/api/event');
        await listen('file-changed-on-disk', async (event) => {
            const { path } = event.payload;
            if (path !== currentFilePath) return;

            // PERF-12: ignore the watcher echo from our own writeTextFile.
            if (isSaving) return;

            if (!isDirty) {
                try {
                    const { readTextFile } = await import('@tauri-apps/plugin-fs');
                    const content = await readTextFile(path);
                    loadFileContent(path, content);
                } catch (e) {
                    console.error('Failed to auto-reload file after disk change:', e);
                }
                return;
            }

            const { ask } = await import('@tauri-apps/plugin-dialog');
            const reload = await ask(
                `The file "${path}" has been modified on disk by another program.\n\nWould you like to reload it from disk? Unsaved editor changes will be overwritten.`,
                {
                    title: 'File Modified Externally',
                    kind: 'warning',
                    okLabel: 'Reload File',
                    cancelLabel: 'Keep Editor Version',
                }
            );
            if (reload) {
                try {
                    const { readTextFile } = await import('@tauri-apps/plugin-fs');
                    const content = await readTextFile(path);
                    loadFileContent(path, content);
                } catch (e) {
                    console.error('Failed to reload file after disk change:', e);
                }
            }
        });
    } catch (err) {
        console.error('Failed to set up disk file watcher listener:', err);
    }
}

// ---- Editor change handler (synchronous; debounce lives in CodeMirror) ----
function onContentChange(text, isProgrammatic) {
    previewAPI.renderMarkdown(text);
    updateStatusBar(text);

    if (isProgrammatic) {
        isDirty = false;
        updateTitleBar();
    } else if (!isDirty) {
        isDirty = true;
        updateTitleBar();
    }
}

// ---- Apply persisted preferences on startup ----
function applyPersistedConfig() {
    if (!editorAPI) return;

    const lineNumbers = config.lineNumbers !== false;
    const wordWrap = config.wordWrap !== false;
    const syncScroll = config.syncScroll !== false;
    const tabSize = config.tabSize || 4;

    editorAPI.setLineNumbers(lineNumbers);
    editorAPI.setLineWrapping(wordWrap);
    editorAPI.setTabSize(tabSize);

    setSyncEnabled(syncScroll);

    const showPageBreaks = config.showPageBreaks !== false;

    // Reflect state in View menu
    setMenuChecked('toggle-line-numbers', lineNumbers);
    setMenuChecked('toggle-word-wrap', wordWrap);
    setMenuChecked('toggle-sync', syncScroll);
    setMenuChecked('toggle-pb-visibility', showPageBreaks);
    setMenuChecked('toggle-sys-tray', config.sysTray !== false);

    const previewPane = document.getElementById('preview-pane');
    if (previewPane) {
        if (showPageBreaks) {
            previewPane.classList.remove('hide-pb-markers');
        } else {
            previewPane.classList.add('hide-pb-markers');
        }
    }

    // Reflect state in Style menu
    setActiveTheme(config.theme || 'snow');
    setActiveFontFamily(config.fontFamily || "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif");
    setActiveTabSize(tabSize);


    const ratio = typeof config.splitRatio === 'number' ? config.splitRatio : 0.5;
    if (Math.abs(ratio - 0.5) > 0.001) {
        const editorPane = document.getElementById('editor-pane');
        const previewPane = document.getElementById('preview-pane');
        if (editorPane && previewPane) {
            const clamped = Math.max(0.2, Math.min(0.8, ratio));
            editorPane.style.width = `${clamped * 100}%`;
            previewPane.style.width = `${(1 - clamped) * 100}%`;
        }
    }
}

function applyFontSettings() {
    if (config.fontSize) {
        document.documentElement.style.setProperty('--font-size', `${config.fontSize}px`);
    }
    if (config.fontFamily) {
        document.documentElement.style.setProperty('--font-reading', config.fontFamily);
    }
    applyEditorFont();
    updateZoomBadge(config.fontSize || 14);
}

function applyEditorFont() {
    const useMonospace = config.editorMonospace !== false;
    if (useMonospace) {
        document.documentElement.style.setProperty('--font-editor', 'var(--font-mono)');
    } else {
        document.documentElement.style.setProperty('--font-editor', 'var(--font-reading)');
    }
    setMenuChecked('toggle-editor-monospace', useMonospace);
}

async function pingAnalytics() {
    if (navigator.onLine === false) return; // Silent exit if completely offline

    try {
        const versionEl = document.getElementById('status-version');
        const version = versionEl ? versionEl.textContent.trim().replace(/^v/, '') : '0.0.0';

        const platform = encodeURIComponent(navigator.platform || 'unknown');
        const language = encodeURIComponent(navigator.language || 'unknown');
        const resolution = encodeURIComponent(`${window.screen.width}x${window.screen.height}`);

        const ANALYTICS_URL = 'https://feather-md-analytics-production.up.railway.app';

        await fetch(`${ANALYTICS_URL}/ping?version=${version}&platform=${platform}&language=${language}&resolution=${resolution}`, {
            method: 'POST',
            mode: 'no-cors'
        });
    } catch {
        // Silent fail to ensure user experience is not affected when backend is unreachable/offline
    }
}
