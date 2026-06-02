# PRD - Feather MD
### Lightweight Dual-Pane Markdown Editor for Windows & Linux
**Version:** 1.4.1
**Status:** Shipping (1.4.1 released 2026-05-29)
**Last updated:** 2026-05-31

---

## 1. Product Overview

**Feather MD** is a native-feeling, zero-bloat Markdown editor that opens instantly when double-clicking any `.md` file. It pairs a CodeMirror 6 editor with a live `marked.js` preview in a resizable 50/50 split, ships ten themes, and installs from a sub-10 MB bundle on Windows and Linux. No Electron, no Node runtime, no background services.

### 1.1 Core Constraints (non-negotiable)
- Cold start: **< 100 ms** from double-click to visible content
- Installer size: **< 10 MB** (Windows NSIS) / **< 8 MB** (Debian .deb)
- Runtime RAM: **< 60 MB** for a 10,000-word file, **< 30 MB** idle
- Render lag: **< 200 ms** from keystroke to preview update
- CPU idle: **< 1%** when no typing; native OS file-event watcher, no polling timers
- Zero telemetry. The only outbound request is the optional signed update check (see §3.9)

---

## 2. Tech Stack (current)

| Layer | Technology | Why |
|---|---|---|
| Shell / native | **Tauri 2** (Rust) | Uses OS WebView, no bundled Chromium, ~5 MB binary |
| WebView runtime | **WebView2** (Win) / **WebKitGTK** (Linux) | Ships with OS, zero extra download |
| Editor | **CodeMirror 6** (tree-shaken) | ~300 KB gzip; compartments for hot-reconfig of line numbers / wrap / tab size |
| Markdown parser | **marked v15** | Synchronous GFM parser |
| Sanitizer | **DOMPurify v3** | XSS strip before `innerHTML` injection |
| Code highlighting | **highlight.js v11** | Lazy-loaded per-language via `import.meta.glob` |
| Bundler | **Vite 6** | HMR dev, single ~400 KB prod bundle + on-demand chunks |
| Themes | **CSS custom properties** | Single consolidated `base.css`, zero JS overhead, instant swap |
| File watcher | **`notify` crate v6** (Rust) | Event-driven OS hooks (`ReadDirectoryChangesW` on Windows, `inotify` on Linux). No polling. |
| Auto-updater | **`tauri-plugin-updater`** + **`tauri-plugin-process`** | Ed25519-signed releases, single startup check, user-gated install |
| Installer | **Tauri CLI** | `.exe` (Win NSIS), `.deb` + `.AppImage` (Linux) |
| Tests | **Vitest** + **jsdom** | 200+ specs across editor, preview, UI, sync, security, html, performance |
| Lint | **ESLint v9** (flat config) | Browser + node globals, custom writable globals for HMR-safe state |

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
- Recent files: last 10 paths stored in local config, surfaced under `File > Recent Files` submenu
- File watcher: event-driven Rust `notify::RecommendedWatcher`
  - Watches the currently open file; **NonRecursive**, 50 ms debounce on event bursts (editors emit multiple syscalls per save)
  - On external modification with clean buffer → silently reloads
  - On external modification with unsaved edits → prompts via native ask dialog
  - Self-save echo suppression: frontend `isSaving` flag is set during `writeTextFile` and held for 500 ms; events arriving inside that window are ignored. **No `unwatch_file` / `watch_file` IPC round-trips on save.**

### 3.2 Editor Pane (left, default 50% width)
- CodeMirror 6 with `@codemirror/lang-markdown` and `@codemirror/language-data`
- Built-in extensions: history, fold gutter, bracket matching, close brackets, autocompletion, drop cursor, rectangular selection, crosshair cursor, active-line highlight, selection-match highlight, indent-on-input, default highlight style
- Line numbers: toggleable (`Ctrl+L`) via Compartment reconfigure
- Word wrap: on by default, toggleable (`Alt+Z`) via Compartment
- Tab size: 2 or 4 spaces (default 4, switchable in Style menu); `indentWithTab` inserts literal spaces of the chosen width
- Keymap: `closeBracketsKeymap`, `defaultKeymap`, `searchKeymap`, `historyKeymap`, `foldKeymap`, `indentWithTab`
- Find / replace: `Ctrl+F` / `Ctrl+H` via CodeMirror's built-in search panel
- Single `updateListener` handles both doc changes (150 ms debounced) and selection changes (event-driven cursor updates) - no duplicate listeners
- No spell-check (OS WebView handles this natively when enabled)

### 3.3 Preview Pane (right, default 50% width)
- Renders via `marked.parse` (synchronous), sanitized by `DOMPurify.sanitize`
- GFM enabled: tables, strikethrough, task lists, fenced code
- Debounce: **150 ms** after last keystroke (lives inside CodeMirror's update listener)
- No intermediate `requestAnimationFrame` queue - render is invoked synchronously from the debounced callback
- Code blocks: per-language `highlight.js` modules lazy-loaded via `import.meta.glob('/node_modules/highlight.js/lib/languages/*.js', { eager: false })` with single-flight de-duplication and alias resolution (`js`→`javascript`, `ts`→`typescript`, `rs`→`rust`, etc.)
- Images with relative paths resolved against the open file's directory using Tauri's `convertFileSrc` asset protocol; absolute Windows paths are normalized to backslashes
- External links (`http://`, `https://`) intercepted and routed through `plugin:opener|open_url` so the OS browser handles them - no in-app navigation
- DOMPurify strips `<script>`, `<iframe>`, and event handlers
- Scroll position preserved across re-renders by capturing/restoring the scroll ratio around `innerHTML` rewrite

### 3.4 Synchronized Scrolling
- Algorithm: **scroll ratio** - `scrollRatio = scrollTop / (scrollHeight - clientHeight)`
- Source-tracking: `mouseenter` on each pane sets `activeSource`; only the active source drives the other pane
- Feedback-loop guard: `syncing` boolean flag, reset on the next `requestAnimationFrame`
- Toggle: toolbar `View > Sync Scroll` and `Alt+S` keyboard shortcut
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
- **Unified 40 px header bar** combining what was previously a title bar + toolbar:
  - Left: brand icon (with version tooltip via `::after`), menu buttons (File / View / Style), font-size slider
  - Center: absolutely-centered current document title (drag region for Tauri window move)
  - Right: minimize / maximize / close window buttons
- `decorations: false` in `tauri.conf.json` - the header is fully custom HTML
- **Hover-intent dropdown menus:**
  - Open on `mouseenter`, close on `mouseleave` with a 180 ms grace timeout
  - Diagonal pointer bridge (`.submenu-panel::before`) prevents cursor-drift dismissal
  - Click-outside closes all menus
- Menus:
  - **File:** New File, Open, Save, Save As, Recent Files (submenu), Print
  - **View:** Sync Scroll, Line Numbers, Word Wrap (all checkable)
  - **Style:** Theme (submenu, grouped Light / Dark), Font (submenu), Tab Size (submenu)
- Resizable split: drag the central divider; clamped 20% / 80% per pane; double-click resets to 50/50; ratio persisted
- Status bar (bottom, 24 px): file path (truncated, hover-tooltip with full path) · word count · line:col · encoding (UTF-8) · CRLF/LF indicator
- Custom modals (no native confirm dialogs):
  - **Unsaved Changes:** three-button overlay (Save / Don't Save / Cancel) with overlay-click and Escape dismiss
  - **Shortcuts help:** `Ctrl+?` opens a list of all keybindings

### 3.7 Settings & Persistence
- Single JSON config file:
  - Linux: `~/.config/com.feathermd.app/feathermd/config.json`
  - Windows: `%APPDATA%\com.feathermd.app\feathermd\config.json`
- Browser-dev fallback: `localStorage` under key `feathermd-config`
- Settings UI lives entirely in the header dropdowns and the font-size slider - no dedicated side panel
- Persisted: theme, font size (12-20 px), font family, tab size, word wrap, line numbers, sync scroll, window dimensions, maximized state, split ratio, recent files

### 3.8 Performance Budget
| Metric | Budget | Measured (v1.4.1) |
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
The app ships a single network-touching feature: a signed update check on startup. This is a deliberate trade-off against §1.1's "zero telemetry" guideline, scoped narrowly:

- **One outbound request** to `https://github.com/prathamreet/featherMD/releases/latest/download/latest.json` on app boot
- No analytics, no headers identifying the user beyond the standard HTTP User-Agent
- All release artifacts are signed with **Ed25519**; the public key is embedded in the binary
- The updater verifies the signature on `latest.json` **before** writing anything
- A new version surfaces as a slide-in banner; the user explicitly clicks **Update Now** to download and install
- On install, `tauri-plugin-process::relaunch()` swaps to the new binary
- CSP in `tauri.conf.json` allows `connect-src` only for `github.com` / `objects.githubusercontent.com` / `*.github.com`
- Update check failures fail silently (no error UI when offline)

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
│   │
│   ├── ui/
│   │   ├── toolbar.js               Hover-intent menu dropdowns + 180 ms grace timeout.
│   │   │                            Wires File/View/Style actions and recent-files menu.
│   │   ├── themes.js                Theme application + prefers-color-scheme listener.
│   │   ├── dialogs.js               Custom unsaved-changes modal + shortcuts help modal.
│   │   ├── status-bar.js            Word count, cursor pos, file path, CRLF/LF.
│   │   └── divider.js               Editor/preview split-pane drag handle.
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
│   │   ├── window.js                Tauri window controls + size/maximized persistence.
│   │   └── updater.js               Ed25519-verified auto-update banner.
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
│   │                                unwatch_file. notify::RecommendedWatcher with
│   │                                50 ms event-burst debounce.
│   ├── capabilities/
│   │   └── default.json             Tauri 2 permission scopes for plugins.
│   ├── icons/                       Platform icons (Windows .ico, Linux .png).
│   ├── tauri.conf.json              Window config, bundle targets, updater endpoint + pubkey, CSP.
│   ├── Cargo.toml                   Rust deps (tauri, plugins, notify, serde, serde_json).
│   └── build.rs                     Tauri build script.
│
├── tests/                           Vitest specs, mirrors src/ layout.
│   ├── editor/editor.test.js        API surface, compartments, cursor, scroll ratio.
│   ├── preview/preview.test.js      Rendering, sanitization, GFM, scroll, link routing.
│   ├── ui/
│   │   ├── toolbar.test.js          Menu wiring, dropdowns, recent files builder.
│   │   └── themes.test.js           Theme switching, OS detection, all 10 themes.
│   ├── core/sync.test.js            Bidirectional scroll sync + feedback-loop guard.
│   ├── html.test.js                 index.html structure, ARIA, accessibility.
│   ├── security.test.js             XSS, prototype pollution, permission scope guards.
│   └── performance.bench.js         Render latency, word count, theme swap benchmarks.
│
├── scripts/
│   ├── generate-report.js           Full audit: build + lint + tests + bench + sizes.
│   └── version-bump.js              Sync version across package.json / Cargo.toml /
│                                    tauri.conf.json / base.css.
│
├── .github/                         Issue templates, PR template, CI + release workflows.
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
# Windows:  src-tauri/target/release/bundle/nsis/Feather MD_1.4.1_x64-setup.exe
# Linux:    src-tauri/target/release/bundle/deb/Feather MD_1.4.1_amd64.deb
#           src-tauri/target/release/bundle/appimage/Feather MD_1.4.1_amd64.AppImage
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
   - `tauri://close-requested` → unsaved-changes guard
   - `file-changed-on-disk` event → handle external edits, honour `isSaving` echo window
7. `initWindowSize()` restores window dimensions and maximized state, persists future resizes (debounced 500 ms)
8. `initUpdater()` checks for a signed release (silent on failure)

### Subsystem map

| Subsystem | Module | Owns |
|---|---|---|
| Editor | `src/editor/editor.js` | CodeMirror 6 lifecycle, doc change debounce, cursor activity, compartment reconfigure |
| Preview | `src/preview/preview.js` | marked + DOMPurify pipeline, lazy `highlight.js`, image path resolution, external link routing |
| Sync scroll | `src/core/sync.js` | Active-source tracking, ratio sync, feedback-loop guard |
| File IO | `src/core/file-io.js` | open / save / save-as / new, recent files, unsaved guard, `isSaving` echo flag |
| Config | `src/core/config.js` | Defaults + JSON persistence (Tauri / localStorage) |
| Keyboard | `src/core/keyboard.js` | Global shortcuts (Ctrl+S/O/N/L/F/H/?, Alt+Z/S, etc.) |
| Themes | `src/ui/themes.js` | Theme application, OS preference, persistence callback |
| Toolbar | `src/ui/toolbar.js` | Hover-intent menus, recent files builder, menu state accessors |
| Dialogs | `src/ui/dialogs.js` | Unsaved-changes modal, shortcuts help modal |
| Status bar | `src/ui/status-bar.js` | Word count, cursor pos, file path, line ending |
| Divider | `src/ui/divider.js` | Split-pane drag + double-click reset + persistence |
| Window controls | `src/platform/window.js` | Minimize / maximize / close + size restore + resize-persist |
| Updater | `src/platform/updater.js` | Update check, signature verification, install banner |
| State | `src/core/state.js` | HMR-resistant window-scoped flags |
| Backend | `src-tauri/src/lib.rs` | `get_initial_file`, `watch_file`, `unwatch_file` IPC commands; notify-based watcher |

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
  "fontFamily": "'JetBrains Mono', monospace",
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
  "splitRatio": 0.5
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
img-src 'self' asset: https: data:;
connect-src 'self' https://github.com https://objects.githubusercontent.com https://*.github.com
```

### Permission scopes (`src-tauri/capabilities/default.json`)
Tauri 2 capabilities are explicitly enumerated:
- `core:default`, `core:event:allow-listen`, `core:event:allow-emit`
- `dialog:allow-open`, `dialog:allow-save`
- `fs:allow-read-text-file`, `fs:allow-write-text-file`, `fs:allow-mkdir`, `fs:scope` (allow `**` for user-chosen files)
- `core:window:allow-{minimize,maximize,unmaximize,close,destroy,is-maximized,set-size}`
- `opener:default`, `updater:default`, `process:default`

### Sanitization
- Every preview render is sanitized by **DOMPurify** with `USE_PROFILES: { html: true }` and an explicit `ADD_ATTR: ['target']` for routed external links
- No `<script>`, `<iframe>`, or event-handler attributes survive the pipeline

### Data egress
- Outbound HTTP only for the signed update check (§3.9). No file content, file paths, or user data is ever sent over the network.
- No analytics, no crash reporting, no telemetry SDKs.

---

## 11. Quality & Testing

### Test layout (Vitest + jsdom)
- `tests/editor/editor.test.js` - CodeMirror lifecycle, content management, cursor, compartments, scroll API
- `tests/preview/preview.test.js` - GFM rendering, XSS sanitization, code highlighting, scroll API
- `tests/ui/toolbar.test.js` - menu wiring, dropdown behaviour, recent files
- `tests/ui/themes.test.js` - all 10 themes apply, OS preference detection, persistence callback
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
- [x] No telemetry. Auto-update check is the sole outbound request, signed (Ed25519) and user-gated for install.
- [x] 200+ Vitest specs passing; CI runs the full report on every PR

---

## 13. Release & Versioning

- Versions live in `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, and the brand icon tooltip in `src/styles/base.css`
- `scripts/version-bump.js` (invoked by the `npm version` lifecycle) syncs all four
- Release artifacts published via `.github/workflows/release.yml`:
  - `Feather.MD_<version>_x64-setup.exe` + `.sig`
  - `Feather.MD_<version>_amd64.deb`
  - `Feather.MD_<version>_amd64.AppImage` + `.sig`
  - `latest.json` (Tauri updater manifest with Ed25519 signatures)
- Release notes maintained in [release-logs.md](artifacts/docs/release-logs.md)

---

*End of PRD - Feather MD v1.4.1*
