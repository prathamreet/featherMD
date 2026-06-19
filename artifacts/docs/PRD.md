# PRD - Feather MD
### Lightweight Dual-Pane Markdown Editor for Windows & Linux
**Version:** 1.10.1
**Status:** Shipping (1.10.0 introduced the background auto-update flow; 1.10.1 current)
**Last updated:** 2026-06-19

---

## 1. Product Overview

**Feather MD** is a native-feeling, zero-bloat Markdown editor that opens instantly when double-clicking any `.md` file. It pairs a CodeMirror 6 editor with a live `marked.js` preview in a resizable split layout, ships ten themes, and installs from a sub-10 MB bundle on Windows and Linux. No Electron, no Node runtime, no background services.

### 1.1 Core Constraints (non-negotiable)
- Cold start: **< 100 ms** from double-click to visible content
- Installer size: **< 10 MB** (Windows NSIS) / **< 8 MB** (Debian .deb)
- Runtime RAM: **< 60 MB** for a 10,000-word file, **< 30 MB** idle
- Render lag: **< 200 ms** from keystroke to preview update
- CPU idle: **< 1%** when no typing; native OS file-event watcher, no polling timers
- No telemetry beyond the optional signed update check (see §3.9) and anonymous ping analytics (see §3.10)

---

## 2. Tech Stack (current)

| Layer | Technology | Why |
|---|---|---|
| Shell / native | **Tauri 2** (Rust) | Uses OS WebView, no bundled Chromium, ~5 MB binary |
| WebView runtime | **WebView2** (Win) / **WebKitGTK** (Linux) | Ships with OS, zero extra download |
| Editor | **CodeMirror 6** (tree-shaken) | ~300 KB gzip; compartments for hot-reconfig of line numbers / wrap / tab size / dynamic fonts |
| Markdown parser | **marked v15** | Synchronous GFM parser |
| Sanitizer | **DOMPurify v3** | XSS strip before `innerHTML` injection |
| Math parsing | **KaTeX v0.16** | LaTeX math expressions inline and display parsing (lazy-loaded) |
| Diagram parsing | **Mermaid v11** | Vector graphics rendering for diagrams (lazy-loaded) |
| Code highlighting | **highlight.js v11** | Lazy-loaded per-language via `import.meta.glob` |
| Bundler | **Vite 6** | HMR dev, single ~400 KB prod bundle + on-demand chunks |
| Themes | **CSS custom properties** | Single consolidated `base.css`, zero JS overhead, instant swap |
| File watcher | **`notify` crate v6** (Rust) | Event-driven OS hooks (`ReadDirectoryChangesW` on Windows, `inotify` on Linux). No polling. |
| Auto-updater | **`tauri-plugin-updater`** + **`tauri-plugin-process`** | Ed25519-signed releases, single startup check, user-gated install |
| Installer | **Tauri CLI** | `.exe` (Win NSIS), `.deb` + `.AppImage` (Linux) |
| Tests | **Vitest** + **jsdom** | 200+ specs across editor, preview, UI, sync, security, html, performance |
| Lint | **ESLint v9** (flat config) | Browser + node globals, custom globals for HMR-safe state |

**Excluded intentionally:** React, Vue, any UI framework, Electron, Monaco, ProseMirror, any CSS framework, Vim mode, in-app browser navigation.

---

## 3. Feature Specification

### 3.1 File Handling
- Open file via CLI argument: `feathermd README.md`
- Open file via OS double-click (registered file association for `.md` and `.markdown`)
- Open file via `File > Open` or `Ctrl+O` (native Tauri dialog)
- Save: `Ctrl+S` - overwrites current file via `@tauri-apps/plugin-fs`
- Save As: `Ctrl+Shift+S` - native save dialog
- New file: `Ctrl+N` - blank editor, unsaved state, unwatches the previous file
- Unsaved-changes indicator: ` *` suffix in the unified header title (e.g. `FeatherMD - notes.md *`)
- On close with unsaved changes: custom three-button modal (Save / Don't Save / Cancel)
- Recent files: last 10 paths stored in local config, surfaced under `File > Recent Files` menu and modal
- File watcher: event-driven Rust `notify::RecommendedWatcher`
  - Watches the currently open file; **NonRecursive**, 50 ms debounce on event bursts (editors emit multiple syscalls per save)
  - On external modification with clean buffer → silently reloads
  - On external modification with unsaved edits → prompts via native ask dialog
  - Self-save echo suppression: frontend `isSaving` flag is set during `writeTextFile` and held for 500 ms; events arriving inside that window are ignored. **No `unwatch_file` / `watch_file` IPC round-trips on save.**

### 3.2 Editor Pane (left, resizable split width)
- CodeMirror 6 with `@codemirror/lang-markdown` and `@codemirror/language-data`
- Built-in extensions: history, fold gutter, bracket matching, close brackets, autocompletion, drop cursor, rectangular selection, crosshair cursor, active-line highlight, active-line gutter highlight, selection-match highlight, indent-on-input, default highlight style
- Line numbers: toggleable via View menu or `Alt+C` keyboard shortcut (Compartment reconfigure)
- Word wrap: on by default, toggleable via View menu or `Alt+Z` keyboard shortcut (Compartment reconfigure)
- Tab size: 1 to 6 spaces (default 4, switchable via Style > Tab Size horizontal segmented buttons submenu); pressing Tab inserts literal spaces at the cursor or indents the selection block
- Keymap: `closeBracketsKeymap`, `defaultKeymap`, `searchKeymap`, `historyKeymap`, `foldKeymap`, custom Tab handler
- Find / replace: `Ctrl+F` / `Ctrl+H` via CodeMirror's built-in search panel
- Single `updateListener` handles both doc changes (150 ms debounced) and selection changes (event-driven cursor updates) - no duplicate listeners
- Editor Font Family: toggleable between Editor Monospace (uses `--font-mono`) and Reader-friendly Font (uses `--font-reading` mapped from the Style > Font submenu), persisted as `editorMonospace` state in configuration

### 3.3 Preview Pane (right, resizable split width)
- Renders via `marked.parse` (synchronous), sanitized by `DOMPurify.sanitize`
- GFM enabled: tables, strikethrough, task lists, fenced code
- Debounce: **150 ms** after last keystroke (lives inside CodeMirror's update listener)
- Full Width Layout: utilizes the full automatic width of the preview pane (`100%` width)
- Code blocks: per-language `highlight.js` modules lazy-loaded via `import.meta.glob('/node_modules/highlight.js/lib/languages/*.js', { eager: false })` with single-flight de-duplication and alias resolution (`js`→`javascript`, `ts`→`typescript`, `rs`→`rust`, etc.)
- Math rendering: LaTeX math expressions (`$inline$` and `$$display$$`) parsed and rendered using KaTeX with in-memory caching
- Diagram rendering: Mermaid diagram code blocks (`mermaid` and `mmd`) parsed and rendered using Mermaid v11, with in-memory caching and light/dark theme refresh support
- Images with relative paths resolved against the open file's directory using Tauri's `convertFileSrc` asset protocol; absolute Windows paths are normalized to backslashes
- External links (`http://`, `https://`) intercepted and routed through `plugin:opener|open_url` so the OS browser handles them - no in-app navigation
- DOMPurify strips `<script>`, `<iframe>`, and event handlers
- Scroll position preserved across re-renders by capturing/restoring the scroll ratio around `innerHTML` rewrite

### 3.4 Synchronized Scrolling
- Algorithm: **scroll ratio** - `scrollRatio = scrollTop / (scrollHeight - clientHeight)`
- Source-tracking: `mouseenter` on each pane sets `activeSource`; only the active source drives the other pane
- Feedback-loop guard: `syncing` boolean flag, reset on the next `requestAnimationFrame`
- Toggle: toolbar `View > Sync Scroll` and `Alt+X` keyboard shortcut
- All scroll listeners registered with `{ passive: true }` for compositor-thread scroll
- Persisted in config; restored on boot

### 3.5 Themes - 10 total
**5 Light:**
1. `snow` - pure white, near-black text (default light)
2. `solarized-light` - warm cream, muted palette
3. `github-light` - GitHub docs style
4. `sepia` - warm beige, brown text (low eye strain)
5. `gruvbox-light` - retro warm light palette

**5 Dark:**
6. `onyx` - near-black, white text (default dark)
7. `solarized-dark` - classic Solarized Dark
8. `github-dark` - GitHub dark mode
9. `monokai` - dark background, vivid syntax
10. `gruvbox-dark` - retro warm dark palette

All 10 themes are defined as `:root[data-theme="name"] { ... }` blocks **consolidated into [src/styles/base.css](src/styles/base.css)**. Switching is one `setAttribute` call; no JS re-render, no flash, no extra stylesheet parses.

Theme auto-detection: reads `window.matchMedia('(prefers-color-scheme: dark)')` on first launch and picks `snow` (light) or `onyx` (dark). The OS preference is re-applied on every boot before config loads, so the first paint matches the user's system theme. Once the user explicitly picks a theme, the choice is persisted and OS-change events stop overriding it.

### 3.6 UI Shell
- **Unified 44 px header bar** combining title bar + toolbar:
  - Left: menu buttons (File / View / Style) and zoom indicator widget (`100%` reset button) separated by a subtle 1px line
  - Center: absolutely-centered current document title (drag region for Tauri window move)
  - Right: minimize / maximize / close window buttons (close button transitions to danger red accent on hover)
- `decorations: false` in `tauri.conf.json` - the header is fully custom HTML
- **Hover-intent dropdown menus:**
  - Open on `mouseenter`, close on `mouseleave` with a 180 ms grace timeout
  - Diagonal pointer bridge (`.submenu-panel::before`) prevents cursor-drift dismissal
  - Click-outside closes all menus
- Menus:
  - **File:** New File, Open, Save, Save As, Recent Files, Print
  - **View:** Word Wrap, Sync Scroll, Line Numbers, Show Page Breaks, System Tray (all checkable)
  - **Style:** Theme (submenu, grouped Light / Dark), Font (submenu with font families + Editor Monospace toggle), Tab Size (submenu with horizontal segmented button array from 1 to 6)
- Resizable split: drag the central divider; clamped 20% / 80% per pane; double-click resets to 50/50; ratio persisted
- Status bar (bottom, 26 px):
  - Left: file path (truncated, hover-tooltip with full path)
  - Right: selected statistics (word, character, and paragraph count shown dynamically as `(x words, y chars, z paras) sel` when text is highlighted) · total word count · total character count · total paragraph count · Ln/Col · UTF-8 encoding · LF/CRLF indicator · version link on the extreme right (opens the GitHub repo, and doubles as the auto-update status indicator - see §3.9)
  - Separators: Styled as 1px high-contrast lines using specific CSS `font-size: 0; color: transparent;` and `:not(.status-separator)` padding filters to avoid square blocks in WebView2
- Custom modals (no native confirm dialogs):
  - **Unsaved Changes Dialog:** Unified `.modal-body` overlay containing the title, message paragraph, and buttons (Save / Don't Save / Cancel) with an even `20px` gap and `24px` padding. Dismissable via overlay-click and Escape key
  - **Shortcuts Modal:** Headerless, borderless, wide landscape 2-column list fitting all keybindings on a single frame with zero vertical scrollbars. Dismissable via overlay-click and Escape key
  - **Recent Files Modal:** Headerless, borderless modal with file name color static on hover. Close button visually hidden (`style="display: none;"`) for tests. Dismissable via overlay-click and Escape key

### 3.7 Settings & Persistence
- Single JSON config file:
  - Linux: `~/.config/com.feathermd.app/feathermd/config.json`
  - Windows: `%APPDATA%\com.feathermd.app\feathermd\config.json`
- Browser-dev fallback: `localStorage` under key `feathermd-config`
- Settings UI lives entirely in the header dropdowns and the font-size slider - no dedicated side panel
- Persisted: theme, fontSize, fontFamily, tabSize, wordWrap, lineNumbers, syncScroll, recentFiles, windowWidth, windowHeight, windowMaximized, splitRatio, showPageBreaks, sysTray, editorMonospace

### 3.8 Performance Budget
| Metric | Budget | Measured (v1.10.x) |
|---|---|---|
| JS bundle (gzip, total) | < 450 KB | ~400 KB |
| CSS bundle (gzip) | < 30 KB | ~19 KB |
| First meaningful paint | < 80 ms | ~50-70 ms (synchronous editor mount before config IPC) |
| Keystroke → preview update | < 200 ms | ~155 ms (150 ms debounce + ~5 ms render) |
| Theme switch | < 16 ms | < 1 ms (single `setAttribute`) |
| Memory (idle, empty file) | < 30 MB | ~30 MB |
| Memory (10k-word file open) | < 60 MB | ~50 MB |
| CPU idle | < 1% | ~0% (event-driven watcher, no timers) |
| Save IPC round-trips | 1 | 1 (`writeTextFile`; watcher echo suppressed by frontend flag) |

### 3.9 Auto-Updater
The app runs one signed background update check on startup. **All status is surfaced through the existing version text in the bottom-right status bar - no banners, no modal pop-ups.** Implemented as a three-phase state machine in [src/platform/updater.js](src/platform/updater.js):

- **idle** - the version text shows `v<version>` and links to the GitHub repo
- **updating** - a newer release was found; the app downloads and installs it in the background. The text changes to **`Updating...`**, the link is removed, and clicks are disabled (`.update-in-progress`, `pointer-events: none`) so the user cannot accidentally open the browser mid-update. On Windows the NSIS installer runs in **`quiet`** mode (`plugins.updater.windows.installMode` in `tauri.conf.json`) - no Setup window, no progress wizard. This is compatible with the `currentUser` bundle install mode (no admin elevation needed)
- **ready** - once the update is staged, the text becomes **`Restart App!`** in the theme accent colour (`.update-ready`) as a subtle call-to-action

**Network & signing**
- **One outbound request** to `https://github.com/prathamreet/featherMD/releases/latest/download/latest.json` on app boot
- All release artifacts are signed with **Ed25519**; the public key is embedded in the binary, and the updater verifies the signature **before** writing anything
- No headers identifying the user beyond the standard HTTP User-Agent
- Update-check and download failures fail silently. On download failure the version text, link, and styling revert to the original idle state, so the user never sees an error

**Smart restart (clicking `Restart App!`)**
- Runs the existing `confirmDiscardChanges()` guard ([src/core/file-io.js](src/core/file-io.js)). With a dirty buffer it shows the Save / Don't Save / Cancel dialog: Save or Don't Save proceeds to `relaunch()`, Cancel aborts and leaves the text as `Restart App!` for a later retry. A clean buffer relaunches immediately

**Exit behaviour while an update is pending**
- *Staged (ready):* closing needs no prompt - Tauri applies the staged update on the next launch
- *Still downloading + system tray active:* closing just hides to the tray (no prompt); the download continues in the background
- *Still downloading + full quit* (close with no tray, tray "Quit", or Ctrl+Q without a tray): `requestQuit()` shows an **"Update in Progress"** warning (**Close Anyway** / **Wait for Update**) before the unsaved-changes guard, so the user can avoid aborting the download

User settings persist across the relaunch automatically - `saveConfig()` writes preferences to `config.json` in real time (see §3.7). The updater's CSP `connect-src` allowance is documented in §10.

### 3.10 Analytics
The app triggers an anonymous ping analytics call when online, sending the version, platform, language, and screen resolution:
- **One outbound request** to `https://feather-md-analytics-production.up.railway.app` on app boot
- No user-identifying data is sent
- Offline states fail silently without affecting user experience or boot speed

### 3.11 Printing & PDF Export
Printing (`Ctrl+P` or File → Print) funnels through a single wrapped `window.print()`, so every entry point gets identical treatment:
- **Forced light theme:** the output always renders in the `snow` palette regardless of the active editor theme. `initPrintThemeOverride()` ([src/main.js](src/main.js)) swaps `data-theme="snow"` and re-renders Mermaid diagrams (whose colours are baked into the SVG) in the light variant before printing, then restores the user's theme afterward. The saved theme is never written to disk.
- **Chrome stripping:** `@media print` rules hide the header bar, status bar, editor pane, divider, and modals, so only the rendered document prints.
- **Multi-page flow:** viewport height/overflow pinning is released so content flows across pages instead of being clipped to a single screen height; Mermaid/math internal scroll caps are lifted so full diagrams print.
- **Page breaks:** a `<pb>` tag forces a hard page break (`page-break-before: always`). The dashed `<pb>` marker's visibility in the preview is toggled via View → Show Page Breaks / `Alt+P`.
- **Layout protection:** code blocks and tables word-wrap at the page edge; tables, `<pre>`, blockquotes, and images avoid being split across pages; headings avoid being orphaned at the bottom of a page.

---

## 4. Platform Targets

| Platform | Tier | Artifact | Installer size |
|---|---|---|---|
| Windows 10 / 11 x64 | Primary | NSIS `.exe` | ~5.0 MB |
| Debian / Ubuntu x64 | Primary | `.deb` | ~7.8 MB |
| Linux generic x64 | Secondary | `.AppImage` | ~81 MB (bundles GTK + WebKit) |
| macOS | Roadmap | - | - |

### File Association Registration
- **Windows:** NSIS installer registers `.md` and `.markdown` via `bundle.fileAssociations` in `tauri.conf.json`; icon embedded in the `.exe`
- **Linux (`.deb`):** Tauri bundler generates a `feathermd.desktop` entry with `MimeType=text/markdown;text/x-markdown;` and runs `update-mime-database` post-install
- **AppImage:** Ships a `feathermd.desktop`; user runs `xdg-mime` once (documented in README)

---

## 5. Repository Structure

```
featherMD/
├── index.html                       Single HTML entry, custom header, dialogs DOM
├── package.json                     Frontend deps + npm scripts
├── vite.config.js                   Vite build config (Tauri-aware)
├── vitest.config.js                 Test runner config (jsdom env)
├── eslint.config.js                 Flat ESLint config with HMR-safe writable globals
│
├── src/                             Frontend source. All ESM, no transpilation.
│   ├── main.js                      App orchestrator. Phase 1 sync mount, phase 2 async config.
│   │
│   ├── editor/
│   │   └── editor.js                CodeMirror 6 setup. Single updateListener for
│   │                                docChanged + selectionSet. Compartments for line
│   │                                numbers, wrap, tab size.
│   │
│   ├── preview/
│   │   └── preview.js               marked → DOMPurify → innerHTML. Lazy highlight.js
│   │                                per language. convertFileSrc for relative images.
│   │                                Opener-plugin routing for external links.
│   │                                KaTeX and Mermaid modules lazy-loaded.
│   │
│   ├── ui/
│   │   ├── toolbar.js               Hover-intent menu dropdowns + 180 ms grace timeout.
│   │   │                            Wires File/View/Style actions and recent-files menu.
│   │   ├── themes.js                Theme application + prefers-color-scheme listener.
│   │   ├── dialogs.js               Custom unsaved-changes modal + shortcuts help modal.
│   │   ├── status-bar.js            Word count, cursor pos, file path, CRLF/LF.
│   │   ├── divider.js               Editor/preview split-pane drag handle.
│   │   └── fullscreen.js            F11 distraction-free preview (maximize-based).
│   │
│   ├── core/
│   │   ├── config.js                Defaults + Tauri appConfigDir / localStorage persistence.
│   │   ├── state.js                 HMR-resistant window state (currentFilePath, isDirty,
│   │   │                            isSaving, lineEnding).
│   │   ├── file-io.js               open / save / save-as / new + recent files +
│   │   │                            unsaved guard. Uses isSaving flag for echo suppression.
│   │   ├── keyboard.js              Global keyboard shortcut bindings.
│   │   ├── sync.js                  Bidirectional ratio-based scroll sync.
│   │   ├── welcome.js               Default welcome document.
│   │   └── utils.js                 escapeHtml (regex-based, no DOM allocations).
│   │
│   ├── platform/
│   │   ├── window.js                Tauri window controls + size/maximized persistence,
│   │   │                            hide-to-tray, tray-aware quit + mid-download guard.
│   │   └── updater.js               Ed25519-verified background auto-update. Drives the
│   │                                status-bar update phases (idle / updating / ready)
│   │                                and the unsaved-changes-guarded relaunch.
│   │
│   └── styles/
│       ├── base.css                 Layout, header, status bar, modals, ALL 10 THEMES.
│       ├── editor.css               CodeMirror chrome stripping + theme var binding.
│       ├── preview.css              Markdown preview typography + code block styling.
│       └── toolbar.css              Header menu dropdowns and submenus.
│
├── src-tauri/                       Rust backend.
│   ├── src/
│   │   ├── main.rs                  Tauri app entry (windows_subsystem guard).
│   │   └── lib.rs                   IPC commands: get_initial_file, watch_file,
│   │                                unwatch_file, tray_active, set_tray,
│   │                                set_webview_memory. notify::RecommendedWatcher with
│   │                                50 ms event-burst debounce. System-tray build +
│   │                                live toggle. WebView2 working-set trim on hide-to-tray.
│   ├── capabilities/
│   │   └── default.json             Tauri 2 permission scopes for plugins.
│   ├── icons/                       Platform icons (Windows .ico, Linux .png).
│   ├── tauri.conf.json              Window config, bundle targets, updater endpoint + pubkey, CSP.
│   ├── Cargo.toml                   Rust deps (tauri, plugins, notify, serde, serde_json).
│   └── build.rs                     Tauri build script.
│
├── tests/                           Vitest specs, mirrors src/ layout.
│   ├── editor/editor.test.js        API surface, compartments, cursor, scroll ratio.
│   ├── preview/
│   │   ├── preview.test.js          GFM rendering, code highlighting, scroll API.
│   │   └── math-mermaid.test.js     KaTeX math rendering + Mermaid diagrams preview.
│   ├── ui/
│   │   ├── toolbar.test.js          Menu wiring, dropdown behaviour, recent files.
│   │   ├── themes.test.js           Theme switching, OS detection, all 10 themes.
│   │   └── fullscreen.test.js       Fullscreen preview mode toggles + hints.
│   ├── core/sync.test.js            Bidirectional scroll sync + feedback-loop guard.
│   ├── html.test.js                 index.html structure, ARIA, accessibility.
│   ├── security.test.js             XSS, prototype pollution, permission scope guards.
│   └── performance.bench.js         Render latency, word count, theme swap benchmarks.
│
├── scripts/
│   ├── generate-report.js           Full audit: build + lint + tests + bench + sizes.
│   └── version-bump.js              Sync version across package.json / Cargo.toml /
│                                    tauri.conf.json / index.html.
│
├── .github/                         Issue templates, PR template, CI + release workflows.
│   └── workflows/                   GitHub Action workflows.
└── artifacts/                       Logo, screenshots, PRD, release logs.
```

---

## 6. Build, Dev, Test Commands

```bash
# Install dependencies
npm install

# Dev mode (hot reload)
npm run tauri dev

# Production build
npm run tauri build

# Tests
npm test                # Vitest specs (jsdom)
npm run test:coverage   # with coverage
npm run bench           # vitest bench (performance)
npm run lint            # ESLint
npm run report          # build + lint + tests + bench + bundle sizes

# Outputs:
# Windows:  src-tauri/target/release/bundle/nsis/Feather MD_1.10.1_x64-setup.exe
# Linux:    src-tauri/target/release/bundle/deb/Feather MD_1.10.1_amd64.deb
#           src-tauri/target/release/bundle/appimage/Feather MD_1.10.1_amd64.AppImage
```

---

## 7. Module Architecture

The app boots in two phases:

### Phase 1 - Synchronous mount (target: first paint < 50 ms)
On `DOMContentLoaded`:
1. Apply OS-preferred theme via `data-theme` attribute (avoids FOUC)
2. Mount CodeMirror editor + marked/DOMPurify preview with in-memory defaults
3. Wire status bar, file IO, scroll sync, divider, keyboard shortcuts, window controls
4. Show welcome document and focus the editor

### Phase 2 - Async configuration
1. Detect Tauri (`import('@tauri-apps/api/core')`); set `isTauri` flag
2. `loadConfig()` from `appConfigDir` (or localStorage)
3. `initThemes(config, ...)` applies saved theme over the OS-preferred fallback
4. `initToolbar(handlers)` binds menu actions
5. `applyPersistedConfig()` reconfigures CodeMirror compartments + reflects state in menus
6. Wire Tauri listeners:
   - `get_initial_file` IPC → load CLI-passed file
   - `open-file-from-args` event → open a file forwarded by a second (single-instance) launch
   - `tauri://close-requested` → hide to tray when a tray exists, else `requestQuit()` (unsaved-changes guard + mid-download update guard)
   - `tray-quit` event → `requestQuit()` (the only full-process-exit path)
   - `file-changed-on-disk` event → handle external edits, honour `isSaving` echo window
7. `initWindowSize()` restores window dimensions and maximized state, persists future resizes (debounced 500 ms)
8. `initUpdater()` runs the signed background update check; drives the status-bar update phases, silent on failure

### Subsystem map

| Subsystem | Module | Owns |
|---|---|---|
| Editor | `src/editor/editor.js` | CodeMirror 6 lifecycle, doc change debounce, cursor activity, compartment reconfigure |
| Preview | `src/preview/preview.js` | marked + DOMPurify pipeline, lazy `highlight.js`, KaTeX / Mermaid parsing, image path resolution, external link routing |
| Sync scroll | `src/core/sync.js` | Active-source tracking, ratio sync, feedback-loop guard |
| File IO | `src/core/file-io.js` | open / save / save-as / new, recent files, unsaved guard, `isSaving` echo flag |
| Config | `src/core/config.js` | Defaults + JSON persistence (Tauri / localStorage) |
| Keyboard | `src/core/keyboard.js` | Global shortcuts (Ctrl+O/S/Shift+S/N/R/Shift+R/Q/P/`.`), Alt+Z/X/C/P toggles, Alt+T/F/D leader chords, Ctrl+scroll zoom |
| Themes | `src/ui/themes.js` | Theme application, OS preference, persistence callback |
| Toolbar | `src/ui/toolbar.js` | Hover-intent menus, recent files builder, menu state accessors |
| Dialogs | `src/ui/dialogs.js` | Unsaved-changes modal, shortcuts help modal, recent files modal |
| Status bar | `src/ui/status-bar.js` | Word count, cursor pos, file path, line ending, selections count |
| Divider | `src/ui/divider.js` | Split-pane drag + double-click reset + persistence |
| Fullscreen | `src/ui/fullscreen.js` | F11 distraction-free preview mode (maximize-based; Esc / F11 to exit) |
| Window controls | `src/platform/window.js` | Minimize / maximize / close + size restore + resize-persist, hide to tray |
| Updater | `src/platform/updater.js` | Background update check, signature verification, status-bar phases (idle / updating / ready), unsaved-changes-guarded relaunch |
| State | `src/core/state.js` | HMR-resistant window-scoped flags |
| Backend | `src-tauri/src/lib.rs` | `get_initial_file`, `watch_file`, `unwatch_file`, `tray_active`, `set_tray`, `set_webview_memory` IPC commands; notify-based watcher, WebView2 memory and tray control |

---

## 8. What Is Explicitly Out of Scope

| Feature | Reason excluded |
|---|---|
| Vim mode | Removed in v1.4.0; omitted for simplified editor core |
| Settings panel | Removed in v1.4.0; all preferences via header dropdowns |
| Cloud sync | Adds network surface, privacy concerns |
| Collaborative editing | Single-user tool by design |
| Plugin system | Increases API surface; defeats lightweight goal |
| PDF export | Heavy dependency (puppeteer/wkhtmltopdf); use OS print-to-PDF |
| macOS build | Tauri-ready, requires code signing + notarization (roadmap) |
| Embedded browser navigation | OS browser handles external links via opener plugin |
| AI writing assist | Network calls, latency, privacy concerns |
| Tabs / MDI | Use multiple windows (Tauri supports this) |
| Spell check | OS WebView handles natively when enabled |
| Backlinks / graph view | Out of scope - use Obsidian for note vault workflows |

---

## 9. Config File Schema

```json
{
  "theme": "snow",
  "fontSize": 14,
  "fontFamily": "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  "tabSize": 4,
  "wordWrap": true,
  "lineNumbers": true,
  "syncScroll": true,
  "recentFiles": [
    "C:\\Users\\user\\notes\\README.md",
    "/home/user/projects/TODO.md"
  ],
  "windowWidth": 1200,
  "windowHeight": 800,
  "windowMaximized": false,
  "splitRatio": 0.5,
  "showPageBreaks": true,
  "sysTray": true,
  "editorMonospace": true
}
```

`theme` of `null` defers to OS preference on next boot. All other fields use the defaults shown above when missing.

---

## 10. Security & Privacy

### CSP (declared in `tauri.conf.json`)
```
default-src 'self';
style-src 'self' 'unsafe-inline';
font-src 'self';
img-src 'self' asset: http://asset.localhost https: data:;
connect-src 'self' https://github.com https://objects.githubusercontent.com https://release-assets.githubusercontent.com https://feather-md-analytics-production.up.railway.app
```

### Permission scopes (`src-tauri/capabilities/default.json`)
Tauri 2 capabilities are explicitly enumerated:
- `core:default`, `core:event:default`, `core:event:allow-listen`, `core:event:allow-emit`
- `opener:default`
- `dialog:default`, `dialog:allow-open`, `dialog:allow-save`
- `fs:default`, `fs:allow-read-text-file`, `fs:allow-read-file`, `fs:allow-write-text-file`, `fs:allow-write-file`, `fs:allow-mkdir`, `fs:allow-exists`, `fs:scope` (allow `**` for user-chosen files)
- `core:window:allow-{minimize,maximize,unmaximize,close,destroy,is-maximized,set-size,show,hide,set-focus}`
- `updater:default`, `process:default`, `process:allow-exit`

### Sanitization
- Every preview render is sanitized by **DOMPurify** with `USE_PROFILES: { html: true }` and an explicit `ADD_ATTR: ['target']` for routed external links
- No `<script>`, `<iframe>`, or event-handler attributes survive the pipeline

### Data egress
- Outbound HTTP only for the signed update check (§3.9) and anonymous ping analytics (§3.10). No file content, file paths, or user data is ever sent over the network.
- No crash reporting, no telemetry SDKs; the analytics ping (§3.10) carries only version, platform, language, and screen resolution.

---

## 11. Quality & Testing

### Test layout (Vitest + jsdom)
- `tests/editor/editor.test.js` - CodeMirror lifecycle, content management, cursor, compartments, scroll API
- `tests/preview/preview.test.js` - GFM rendering, XSS sanitization, code highlighting, scroll API
- `tests/preview/math-mermaid.test.js` - KaTeX math rendering and Mermaid diagrams preview layout
- `tests/ui/toolbar.test.js` - menu wiring, dropdown behaviour, recent files modal
- `tests/ui/themes.test.js` - all 10 themes apply, OS preference detection, persistence callback
- `tests/ui/fullscreen.test.js` - fullscreen preview mode toggles and exit hint behavior
- `tests/core/sync.test.js` - bidirectional scroll sync, feedback-loop guard
- `tests/html.test.js` - DOM structure, ARIA attributes, keyboard accessibility
- `tests/security.test.js` - SEC + CODE regression guards (XSS, prototype pollution, permission scopes)
- `tests/performance.bench.js` - render latency, word count, theme swap benchmarks

### Commands
| Command | Purpose |
|---|---|
| `npm test` | Vitest run |
| `npm run test:coverage` | with c8/v8 coverage |
| `npm run bench` | performance benchmarks |
| `npm run lint` | ESLint |
| `npm run report` | full audit: build + lint + tests + bench + bundle sizes |

### CI
`.github/workflows/ci.yml` runs the full report on every push and PR. `.github/workflows/release.yml` produces signed Windows/Linux artifacts and publishes `latest.json` for the auto-updater. `.github/workflows/deploy-pages.yml` deploys the landing page from `/page` on pushes that modify that directory.

---

## 12. Success Criteria (Definition of Done)

- [x] Double-click `.md` file on Windows 10/11 → app opens with file in < 100 ms
- [x] Double-click `.md` file on Ubuntu 22.04 → same
- [x] Type in editor → preview updates within ~155 ms (150 ms debounce + render)
- [x] Scroll either pane → other pane follows (ratio-accurate)
- [x] All 10 themes switch in < 16 ms with no flash
- [x] `Ctrl+S` saves; unsaved state shown in title bar (` *` suffix)
- [x] Installer < 10 MB on Windows (~5 MB) and < 8 MB on Debian (~7.8 MB)
- [x] RAM < 60 MB with a 10,000-word file open (~50 MB measured)
- [x] CPU < 1% when idle - native event-driven watcher, no polling timers
- [x] Save path does not pause/resume the watcher (single IPC, `isSaving` flag suppresses echo)
- [x] No file content or paths leave the device. The only outbound requests are the signed (Ed25519), user-gated background update check and an anonymous analytics ping (version/platform/language/resolution).
- [x] 200+ Vitest specs passing; CI runs the full report on every PR

---

## 13. Release & Versioning

- `package.json` is the source of truth for the version (set it via `npm version`, which also updates `package-lock.json`)
- `scripts/version-bump.js` (invoked by the `npm version` lifecycle) reads `package.json` and syncs the version into: `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, the status-bar version link in `index.html`, and the landing page (`page/styles.css` `page-version`, `page/index.html`)
- Release artifacts published via `.github/workflows/release.yml`:
  - `Feather.MD_<version>_x64-setup.exe` + `.sig`
  - `Feather.MD_<version>_amd64.deb`
  - `Feather.MD_<version>_amd64.AppImage` + `.sig`
  - `latest.json` (Tauri updater manifest with Ed25519 signatures)
- Release notes maintained in [release-logs.md](artifacts/docs/release-logs.md)

---

*End of PRD - Feather MD v1.10.1*
