# PRD — Feather MD
### Lightweight Dual-Pane Markdown Editor for Windows & Linux
**Version:** 1.0.0  
**Agent:** AI Coding Agent  
**Last updated:** 2026-05-26  

---

## 1. Product Overview

**Feather MD** is a native-feeling, zero-bloat markdown editor that opens instantly when double-clicking any `.md` file. It provides a 50/50 split editor-preview with precise synchronized scrolling, 10 themes, and a tiny installer — no Electron, no Node.js runtime, no background services.

### 1.1 Core Constraints (non-negotiable)
- Cold start: **< 100ms** from double-click to visible content
- Installer size: **< 10MB**
- Runtime RAM: **< 60MB** for a 10,000-word file
- Render lag: **< 200ms** from keystroke to preview update
- CPU idle: **< 1%** when no typing (no polling loops, no timers running without user activity)
- Zero telemetry, zero network calls at runtime

---

## 2. Tech Stack (frozen)

| Layer | Technology | Reason |
|---|---|---|
| Shell / native | **Tauri 2** (Rust) | Uses OS WebView — no bundled Chromium; ~5MB binary |
| WebView runtime | **WebView2** (Win) / **WebKitGTK** (Linux) | Ships with OS, zero extra download |
| Editor component | **CodeMirror 6** — tree-shaken | ~300KB gzip; exposes precise scroll positions |
| MD renderer | **marked.js v15** + **DOMPurify** | Synchronous HTML parsing with sanitization |
| Code block styling | **highlight.js v11** | Lazy-loaded language syntax highlighting modules |
| Bundler | **Vite 6** | HMR dev, single ~400KB prod bundle |
| Themes | **CSS custom properties only** | Zero JS overhead; instant swap |
| Installer | **Tauri CLI** | `.exe` (Win NSIS), `.deb` + `.AppImage` (Linux) |

**Excluded intentionally:** React, Vue, any UI framework, Electron, Monaco, ProseMirror, any CSS framework.

---

## 3. Feature Specification

### 3.1 File Handling
- Open file via CLI argument: `feathermd README.md`
- Open file via OS double-click (registered file association)
- Open file via `File > Open` or `Ctrl+O` (native file picker)
- Save: `Ctrl+S` — overwrites current file
- Save As: `Ctrl+Shift+S` — native save dialog
- New file: `Ctrl+N` — blank editor, unsaved state
- Unsaved changes indicator: `•` prefix in title bar
- On close with unsaved changes: OS-native confirm dialog
- Recent files: last 10 files stored in local config (no cloud)
- File watcher: custom Rust-based async polling loop monitors the active file. If the file is modified externally, the user is prompted to reload it.

### 3.2 Editor Pane (left, 50% width)
- CodeMirror 6 with Markdown language support
- Syntax highlighting: headings, bold, italic, code spans, links, blockquotes
- Line numbers: toggleable (`Ctrl+L`)
- Word wrap: on by default, toggleable (`Alt+Z`)
- Tab size: 4 spaces (configurable in Style menu)
- Keyboard shortcuts: default bindings (Vim mode is out of scope)
- Find/replace: `Ctrl+F` / `Ctrl+H` — CodeMirror's built-in panel
- Auto-close: brackets, backticks, quotes
- No spell-check (keeps it light; OS spell-check handles this in WebView)

### 3.3 Preview Pane (right, 50% width)
- Renders via `marked.js` — synchronous, no async/worker overhead
- Sanitized via `DOMPurify` before injection
- Debounce: **150ms** after last keystroke before re-render
- Supported elements: all CommonMark + GFM (tables, strikethrough, task lists, fenced code)
- Code blocks: syntax highlighted via **highlight.js auto** subset (only languages detected, lazy-loaded per block, ~20KB base)
- Images with relative paths resolved against the open file's directory
- External links open in OS default browser (not in-app)
- No iframes, no script tags in preview (DOMPurify strips them)

### 3.4 Synchronized Scrolling
- Algorithm: **scroll ratio** — `scrollRatio = editorTopLine / totalLines`
- Apply same ratio to preview: `previewEl.scrollTop = scrollRatio * previewEl.scrollHeight`
- Scroll source: whichever pane the user last interacted with drives the other
- Lock/unlock sync: toolbar button + `Alt+S` — when unlocked, panes scroll independently
- No polling: driven entirely by `scroll` events (passive listeners)

### 3.5 Themes — 10 total
**5 Light:**
1. `snow` — pure white, black text (default)
2. `solarized-light` — warm cream, muted palette
3. `github-light` — GitHub docs style
4. `sepia` — warm beige, brown text (low eye strain)
5. `gruvbox-light` — retro warm light palette

**5 Dark:**
6. `onyx` — near-black, white text (default dark)
7. `solarized-dark` — classic Solarized Dark
8. `github-dark` — GitHub dark mode
9. `monokai` — dark background, vivid syntax
10. `gruvbox-dark` — retro warm dark palette

Each theme is a single CSS custom-property block applied to `[data-theme="name"]` on `<html>`. Switching is one attribute set — no JS re-render, no flash.

Theme auto-detection: reads OS `prefers-color-scheme` on first launch; picks `snow` (light) or `onyx` (dark).

### 3.6 UI Shell
- Custom title bar: Tauri decorations off, custom HTML title bar (drag handle + window controls)
- Toolbar/Menu bar: Custom HTML drop-down menu bar (File, View, Style) + font-size range slider:
  - File: New File, Open, Save, Save As, Recent Files, Print
  - View: Sync Scroll, Line Numbers, Word Wrap
  - Style: Themes (snow, solarized, github, etc.), Monospace Font selection, Tab Size (2 / 4 spaces)
- No menu bar by default — all actions via keyboard or toolbar
- Native menu bar (`File`, `Edit`, `View`) available as fallback / accessibility
- Resizable split: drag the center divider; minimum 20% / maximum 80% per pane; double-click divider to reset 50/50
- Status bar (bottom, 24px): file path · word count · line:column · encoding (always UTF-8) · CRLF/LF indicator

### 3.7 Settings
- Single JSON config file: `~/.config/feathermd/config.json` (Linux) / `%APPDATA%\feathermd\config.json` (Win)
- Settings are managed directly via the menu bar drop-down selectors and slider controls (Style menu, View menu, and font-size control). A dedicated side-panel settings menu is omitted for streamlined, keyboard-accessible UX.
- Persisted settings: theme, font size (12-20px), font family, tab size, word wrap state, line numbers state, sync scroll state, window dimensions, maximized state, and split ratio.

### 3.8 Performance Budget (enforced per phase)
| Metric | Budget |
|---|---|
| JS bundle (gzip) | < 450KB total |
| CSS (gzip) | < 30KB |
| First meaningful paint | < 80ms |
| Keystroke → preview update | < 200ms (150ms debounce + < 50ms render) |
| Theme switch | < 16ms (single frame) |
| Memory (idle, 10k-word file) | < 60MB |
| Memory (idle, empty file) | < 30MB |

---

## 4. Platform Targets

| Platform | Target | Artifact |
|---|---|---|
| Windows 10/11 x64 | Primary | `.exe` NSIS installer |
| Debian/Ubuntu x64 | Primary | `.deb` package |
| Linux generic x64 | Secondary | `.AppImage` |
| macOS | Out of scope v1 | — |

### File Association Registration
- **Windows:** NSIS installer writes `HKEY_CLASSES_ROOT\.md` → `feathermd.md`; icon embedded in `.exe`
- **Linux (deb):** `feathermd.desktop` file with `MimeType=text/markdown;text/x-markdown;`; `update-mime-database` runs post-install
- **AppImage:** Ships `feathermd.desktop` alongside; user runs `xdg-mime` manually (documented in README)

---

## 5. Repository Structure

```
feathermd/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs          # Rust main function
│   │   └── lib.rs           # Tauri app orchestration & background async watch commands
│   ├── icons/               # App icons (png 32/128/256, ico, icns)
│   ├── Cargo.toml
│   └── tauri.conf.json      # Bundle config, file associations, permissions
├── src/
│       ├── monokai.css
│       └── gruvbox-dark.css
├── index.html
├── vite.config.js
├── package.json
└── README.md
```

---

## 6. Build & Dev Commands

```bash
# Install dependencies
npm install

# Dev mode (hot reload)
npm run tauri dev

# Production build
npm run tauri build

# Outputs:
# Windows:  src-tauri/target/release/bundle/nsis/feathermd_1.0.0_x64-setup.exe
# Linux:    src-tauri/target/release/bundle/deb/feathermd_1.0.0_amd64.deb
#           src-tauri/target/release/bundle/appimage/feathermd_1.0.0_amd64.AppImage
```

---

## 7. Phases & Sessions

---

### PHASE 1 — Project Scaffold
**Goal:** Tauri + Vite project boots, blank window appears on both platforms.

#### Session 1.1 — Init & Config
**Inputs:** Nothing (greenfield)  
**Tasks:**
1. `npm create tauri-app@latest feathermd` — select Vanilla JS + Vite template
2. Configure `tauri.conf.json`:
   - `productName: "Feather MD"`
   - `identifier: "com.feathermd.app"`
   - `windows.decorations: false` (custom title bar)
   - `windows.minWidth: 600`, `minHeight: 400`
   - `bundle.targets: ["nsis", "deb", "appimage"]`
   - File associations: `.md`, `.markdown`
3. Set `allowlist` permissions to minimum: `fs.readFile`, `fs.writeFile`, `dialog.open`, `dialog.save`, `window.close/minimize/maximize`
4. Add app icons (use Tauri's `icon.png` generator from a provided SVG feather icon)
5. Verify: `npm run tauri dev` opens blank window

**Deliverables:** Boilerplate project, window opens, no errors in console  
**Performance check:** Window appears in < 500ms in dev mode (< 100ms in release)

---

#### Session 1.2 — Base Layout
**Inputs:** Session 1.1 complete  
**Tasks:**
1. `index.html` — skeleton: `#title-bar`, `#toolbar`, `#split-container` (flex row), `#status-bar`
2. `styles/base.css`:
   - `#split-container`: `display: flex; height: calc(100vh - titlebar - toolbar - statusbar)`
   - `#editor-pane`, `#preview-pane`: `width: 50%; overflow: auto`
   - `#divider`: `width: 5px; cursor: col-resize; background: var(--border)`
3. Custom title bar: drag region via `data-tauri-drag-region`, min/max/close buttons calling `appWindow.minimize()` etc.
4. Status bar: static placeholders for now
5. `styles/base.css` custom properties: `--bg`, `--bg-secondary`, `--text`, `--text-muted`, `--border`, `--accent`
6. Implement divider drag-to-resize with mouse events; double-click resets to 50/50

**Deliverables:** Layout visible with correct proportions; divider draggable  
**No JS libraries yet — pure DOM**

---

### PHASE 2 — Editor + Preview Core
**Goal:** Type in left pane, see rendered markdown in right pane.

#### Session 2.1 — CodeMirror 6 Editor
**Inputs:** Phase 1 complete  
**Packages to install:**
```
@codemirror/view @codemirror/state @codemirror/language
@codemirror/lang-markdown @codemirror/commands
@codemirror/language-data @lezer/highlight
```
**Tasks:**
1. `src/editor.js` — create `initEditor(domEl, onChange)`:
   - Extensions: `markdown()`, `lineNumbers()`, `highlightActiveLine()`, `history()`, `defaultKeymap`, `searchKeymap`, `EditorView.lineWrapping`
   - `onChange` callback: fires debounced (150ms) with current doc string
   - Expose `getScrollRatio()` → `view.scrollDOM.scrollTop / view.scrollDOM.scrollHeight`
   - Expose `setScrollRatio(ratio)` → sets `view.scrollDOM.scrollTop`
2. `styles/editor.css` — strip CodeMirror default chrome; inherit `--bg`, `--text`, `--font-mono` variables
3. Wire into `main.js`: `initEditor(document.getElementById('editor-pane'), onContentChange)`
4. Verify: typing shows text, no layout shift

**Deliverables:** Editor renders, accepts input, fires onChange  
**Bundle check:** `vite build --report` — CodeMirror chunk < 320KB gzip

---

#### Session 2.2 — marked.js Preview
**Inputs:** Session 2.1 complete  
**Packages to install:** `marked@^9` `dompurify`  
**Tasks:**
1. `src/preview.js` — `initPreview(domEl)`:
   - Configure `marked`: `gfm: true`, `breaks: false`, `mangle: false`, `headerIds: false`
   - Export `renderMarkdown(mdString)`:
     - `const rawHtml = marked.parse(mdString)`
     - `const clean = DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } })`
     - `previewEl.innerHTML = clean`
   - Expose `getScrollRatio()` and `setScrollRatio(ratio)` — same pattern as editor
2. `styles/preview.css` — typography for rendered MD: heading sizes, code blocks, blockquotes, tables
3. Wire: `onContentChange(text) → renderMarkdown(text)`
4. Verify: typing `# Hello` shows styled `<h1>Hello</h1>` in preview

**Deliverables:** Preview renders all GFM elements correctly  
**Performance check:** `console.time` around `marked.parse` for a 5000-word doc — must be < 5ms

---

#### Session 2.3 — Synchronized Scrolling
**Inputs:** Session 2.2 complete  
**Tasks:**
1. `src/sync.js` — `initScrollSync(editorAPI, previewAPI)`:
   - Track `activeSource: 'editor' | 'preview' | null`
   - `editorScrollEl.addEventListener('scroll', ..., { passive: true })` → if `activeSource === 'editor'`, apply ratio to preview
   - `previewEl.addEventListener('scroll', ..., { passive: true })` → if `activeSource === 'preview'`, apply ratio to editor
   - On `mouseenter` of each pane: set `activeSource`
   - Prevent feedback loops: use a `syncing` boolean flag; set true before programmatic scroll, false after
2. Export `setSyncEnabled(bool)` for toolbar toggle
3. Toolbar button wires to `setSyncEnabled`; button shows active state
4. Verify: scrolling either pane moves the other; no jank; no infinite loop

**Deliverables:** Sync scroll works bidirectionally; toggle works  
**Performance check:** Scroll handler must complete in < 1ms (passive listener, simple math only)

---

### PHASE 3 — File System Integration
**Goal:** Open real `.md` files, save them, handle CLI args and double-click.

#### Session 3.1 — Tauri File Commands
**Inputs:** Phase 2 complete  
**Tasks:**
1. `src-tauri/src/commands.rs`:
   ```rust
   #[tauri::command]
   async fn read_file(path: String) -> Result<String, String>
   
   #[tauri::command]
   async fn write_file(path: String, content: String) -> Result<(), String>
   ```
2. Register commands in `main.rs` `.invoke_handler(tauri::generate_handler![read_file, write_file])`
3. `src-tauri/src/main.rs` — handle CLI args:
   - Check `std::env::args()` for a file path argument
   - Emit `file-opened` event to frontend with path + content
4. `src/main.js`:
   - `listen('file-opened', ({ payload }) => openFile(payload))`
   - `openFile({ path, content })`: loads content into editor, updates title bar, stores `currentFilePath`
   - `Ctrl+O`: `invoke('dialog.open', { filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }] })` → `invoke('read_file', { path })`
   - `Ctrl+S`: `invoke('write_file', { path: currentFilePath, content: editor.getValue() })`
   - `Ctrl+Shift+S`: `dialog.save` → `write_file`
5. Title bar: `"Feather MD — filename.md"` / `"Feather MD — •filename.md"` (unsaved)
6. Unsaved guard: `listen('tauri://close-requested', ...)` → if dirty, show `confirm()` dialog before close

**Deliverables:** Open, edit, save cycle works end-to-end  

---

#### Session 3.2 — File Associations & OS Integration
**Inputs:** Session 3.1 complete  
**Tasks:**
1. `tauri.conf.json` — add file associations:
   ```json
   "bundle": {
     "fileAssociations": [
       { "ext": ["md", "markdown"], "name": "Markdown", "description": "Markdown file" }
     ]
   }
   ```
2. Windows: verify NSIS installer registers `.md` in `HKEY_CLASSES_ROOT`; add app icon to association
3. Linux: create `feathermd.desktop`:
   ```ini
   [Desktop Entry]
   MimeType=text/markdown;text/x-markdown;
   Exec=feathermd %f
   ```
   Add `postInstall` script: `update-mime-database /usr/share/mime`
4. Test: build release, install, double-click a `.md` file — app opens with file loaded
5. File watcher: use `tauri-plugin-fs-watch`; if file changes on disk while open and is unmodified in editor, auto-reload; if modified in editor, prompt

**Deliverables:** Double-click opens file; installer registers association on both platforms

---

### PHASE 4 — Themes
**Goal:** 10 themes, zero-JS switching, OS auto-detection.

#### Session 4.1 — Theme CSS Files
**Inputs:** Phase 3 complete  
**Tasks:**
1. Create all 10 theme files in `styles/themes/` — each defines:
   ```css
   [data-theme="snow"] {
     --bg: #ffffff;
     --bg-secondary: #f6f8fa;
     --bg-editor: #ffffff;
     --text: #1a1a1a;
     --text-muted: #6e7781;
     --border: #d0d7de;
     --accent: #0969da;
     --code-bg: #f6f8fa;
     --heading: #1a1a1a;
     --link: #0969da;
     --cm-keyword: #cf222e;
     --cm-string: #0a3069;
     --cm-comment: #6e7781;
     --cm-heading: #0550ae;
   }
   ```
2. Define all 10 themes with appropriate values (see §3.5)
3. `styles/base.css` — all layout colors use `var(--bg)`, `var(--text)` etc.
4. `styles/editor.css` — all CodeMirror colors use `var(--cm-*)` vars
5. `styles/preview.css` — preview typography uses `var(--text)`, `var(--heading)`, etc.

**Deliverables:** All 10 theme files written; no hardcoded colors outside theme files

---

#### Session 4.2 — Theme Switcher
**Inputs:** Session 4.1 complete  
**Tasks:**
1. `src/themes.js`:
   - `const THEMES = ['snow','solarized-light','github-light','sepia','gruvbox-light','onyx','solarized-dark','github-dark','monokai','gruvbox-dark']`
   - `applyTheme(name)`: `document.documentElement.setAttribute('data-theme', name)` + save to config
   - `detectOSTheme()`: `window.matchMedia('(prefers-color-scheme: dark)').matches ? 'onyx' : 'snow'`
   - `initThemes()`: read config → if no saved theme, use `detectOSTheme()`
   - Listen for `matchMedia` change → switch theme if user hasn't manually picked one
2. Toolbar theme dropdown: segmented into "Light" / "Dark" groups; current theme highlighted
3. Verify: switch theme → instant repaint, no FOUC, < 16ms

**Deliverables:** All 10 themes switchable; persisted across app restarts; OS auto-detection works

---

### PHASE 5 — Header Menu Bar, Status Bar & Dialogs
**Goal:** Modular menu drop-downs, shortcuts overlay, customized status bar indicators, and file guard modals.

#### Session 5.1 — Header Menu bar Controls
**Inputs:** Phase 4 complete
**Tasks:**
1. `src/ui/toolbar.js` — `initToolbar(handlers)`:
   - Handle drop-down hovering & clicking behavior for File, View, and Style menus.
   - Bind Style controls: font size range slider (12-20px), font family, tab size.
   - Bind View controls: sync scroll toggle, line numbers, word wrap.
   - Bind File controls: New File, Open, Save, Save As, Recent Files, Print.
2. Synchronize config loads: write configuration to local disk JSON and active environment css properties instantly.

**Deliverables:** Menu bar fully interactive; dynamic theme, font and configuration selectors working.

---

#### Session 5.2 — Status Bar & Modal Dialogs
**Inputs:** Session 5.1 complete
**Tasks:**
1. Status bar live data:
   - File path (truncated if long, full path shown in title hover)
   - Word count: computed in real-time from CodeMirror document length
   - Line : Column (event-driven from CodeMirror cursor index updates)
   - Encoding & CRLF/LF indicators.
2. Dialog overlays:
   - Unsaved changes guard: customized CSS modal prompt overlay featuring options to Save, Discard, or Cancel when closing dirty files.
   - Keyboard shortcut list modal triggered via `Ctrl+?`.

**Deliverables:** Live status bar updates; custom confirmation overlays protect file buffer states.

---

#### Session 5.3 — Modular Polish & Refactoring
**Inputs:** Session 5.2 complete
**Tasks:**
1. Clean up unused helper layers and separate platform modules (`window.js` window controller frame integration).
2. Wire up Vite hot-module-reloading resistant storage state fields attached safely to the global browser `window` scope.
3. Optimize theme switches and ensure robust fallback paths for running in native web browser sandbox modes.

**Deliverables:** Codebase is clean, highly modularized, and fully responsive across both OS native shell and standard browser environments.

---

### PHASE 6 — Performance Hardening & Release
**Goal:** Hit all performance budgets; build clean installers for both platforms.

#### Session 6.1 — Performance Audit
**Inputs:** Phase 5 complete  
**Tasks:**
1. Run `vite build --report` — verify:
   - Total gzip JS < 450KB
   - No chunk > 200KB (except CodeMirror — acceptable, it's the core)
2. Profile cold start: `time feathermd test.md` — must be < 100ms to first paint in release build
3. Profile memory: open a 10,000-word `.md` file → check Task Manager / `htop` → must be < 60MB RSS
4. Audit scroll handler: `performance.mark` around sync callback — must be < 1ms
5. Audit preview render: `console.time('render')` around `marked.parse` + `innerHTML` — must be < 50ms for 10k words
6. Check: no `setInterval` or `setTimeout` loops running when user is idle
7. Fix any budget violations before proceeding

**Deliverables:** All performance budgets met; audit report in `PERF.md`

---

#### Session 6.2 — Cross-Platform Build & Installer Testing
**Inputs:** Session 6.1 complete  
**Tasks:**
1. Windows build (run on Windows or via GitHub Actions Windows runner):
   - `npm run tauri build`
   - Install NSIS `.exe` on clean Windows 10 VM
   - Verify: `.md` association registered; double-click opens file; app appears in Programs list; uninstall works
2. Linux build:
   - Build `.deb` on Ubuntu 22.04
   - `sudo dpkg -i feathermd_1.0.0_amd64.deb`
   - Verify: `xdg-mime query default text/markdown` returns `feathermd.desktop`; double-click in Nautilus works
   - Build `.AppImage`; test on Debian 12 (different distro)
3. Verify installer sizes: `.exe` < 10MB, `.deb` < 8MB, `.AppImage` < 12MB
4. Write `README.md` with install instructions, screenshot, and keyboard shortcut table

**Deliverables:** Signed, tested installers for all three targets; README complete

---

## 8. What Is Explicitly Out of Scope (v1)

| Feature | Reason excluded |
|---|---|
| Vim Mode | Omitted in favor of simplified, lightweight editor core features. |
| Settings Panel | Removed dedicated settings dialog side-panel; preferences are directly configured from the menu-bar interfaces. |
| Cloud sync | Adds complexity, network overhead, privacy concerns |
| Collaborative editing | Out of scope — single-user tool |
| Plugin system | Increases surface area; defeats lightweight goal |
| PDF export | Adds heavy dependency (puppeteer/wkhtmltopdf) |
| macOS build | Requires code signing + notarization overhead |
| Embedded browser (links) | OS browser handles this; no need for in-app WebView navigation |
| AI writing assist | Network calls, latency, privacy — antithetical to core goals |
| Tabs / multiple files | Adds UI complexity; use multiple windows (Tauri supports this) |
| Spell check | OS WebView spell-check works natively; no library needed |

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
    "/home/user/notes/README.md",
    "/home/user/projects/TODO.md"
  ],
  "windowWidth": 1200,
  "windowHeight": 800,
  "windowMaximized": false,
  "splitRatio": 0.5
}
```

---

## 10. Success Criteria (Definition of Done)

- [ ] Double-click `.md` file on Windows 10 → app opens with file in < 100ms
- [ ] Double-click `.md` file on Ubuntu 22.04 → same
- [ ] Type in editor → preview updates in < 200ms
- [ ] Scroll either pane → other pane follows (ratio-accurate)
- [ ] All 10 themes switch instantly (< 16ms, no flash)
- [ ] `Ctrl+S` saves; unsaved state shown in title bar
- [ ] Installer < 10MB on both platforms
- [ ] RAM < 60MB with a 10,000-word file open
- [ ] CPU < 1% when idle (excluding periodic lightweight Rust watcher checks)
- [ ] Works offline, no network calls, no telemetry

---

*End of PRD — Feather MD v1.4.1*
