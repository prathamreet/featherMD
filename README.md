<div align="center">

<img src="artifacts/assets/feather-logo.png" alt="Feather MD" width="120" />

# Feather MD

### A native, dual-pane Markdown editor that opens instantly and stays out of your way.

[![CI](https://github.com/prathamreet/featherMD/actions/workflows/ci.yml/badge.svg)](https://github.com/prathamreet/featherMD/actions/workflows/ci.yml)
[![Latest Release](https://img.shields.io/github/v/release/prathamreet/featherMD?color=4c1&label=release)](https://github.com/prathamreet/featherMD/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/prathamreet/featherMD/total?color=blue)](https://github.com/prathamreet/featherMD/releases)
[![Stars](https://img.shields.io/github/stars/prathamreet/featherMD?style=flat&color=yellow)](https://github.com/prathamreet/featherMD/stargazers)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
[![Tauri 2](https://img.shields.io/badge/Tauri-2-24C8DB?logo=tauri&logoColor=white)](https://tauri.app)
[![CodeMirror 6](https://img.shields.io/badge/CodeMirror-6-d30707)](https://codemirror.net)

**[Download](https://github.com/prathamreet/featherMD/releases/latest)** · **[What's new](https://github.com/prathamreet/featherMD/releases)** · **[Landing page](https://prathamreet.github.io/featherMD/)** · **[Report a bug](https://github.com/prathamreet/featherMD/issues/new?template=bug_report.md)** · **[Request a feature](https://github.com/prathamreet/featherMD/issues/new?template=feature_request.md)**

</div>

---

## The pitch in one line

A ~5 MB Windows installer, around 50 MB of RAM, sub-100 ms cold start, and a dual-pane preview that just works. Built on Tauri 2, not Electron.

## Why Feather MD

You probably already have a Markdown workflow, and it probably costs you 300 MB of RAM to read a `README`.

* You opened VS Code with its 200+ MB footprint just to skim a `.md` file.
* You fought the split preview that opens in the wrong place, with scroll sync that takes a documentation deep-dive to enable.
* You bounced between fifteen browser tabs trying to find the document you started 20 minutes ago.
* You wanted a single, focused window for writing. A text surface that opens before you finish reaching for the mouse.

Feather MD is the small, fast thing that lives between those edges.

* **Double-click a `.md` file and it opens.** Real OS file association. No "open in VS Code" workaround.
* **Side-by-side preview with bidirectional scroll sync, out of the box.** Toggle it off with `Alt + S` if you want.
* **A dedicated window, not another browser tab.** No distraction, no lost cursor.
* **~5 MB Windows installer, around 50 MB resident.** Editing text should not cost a gigabyte of memory.
* **Tauri, not Electron.** Uses your OS WebView, ships no browser runtime, signs every update with Ed25519.
* **No telemetry, no background services, no accounts.** It is a text editor.

## Install

### Download

Grab the latest installer for your platform from the [**Releases page**](https://github.com/prathamreet/featherMD/releases/latest):

| Platform | File pattern | Notes |
| --- | --- | --- |
| Windows 10 / 11 | `Feather.MD_*_x64-setup.exe` (NSIS) | Signed Ed25519 auto-update channel |
| Debian / Ubuntu | `Feather.MD_*_amd64.deb` | Uses system GTK / WebKit |
| Any Linux distro | `Feather.MD_*_amd64.AppImage` | Bundles its own GTK + WebKit runtime |

> Already on a pre-`v1.3.0` build? Auto-update was added in `v1.3.0`. Install the latest release once, manually, and the in-app updater takes over from there.

### Build from source

Requirements: Node.js 18+, Rust stable, and the platform's WebView toolchain. On Windows 10 and 11 WebView2 is pre-installed. On Linux you need the GTK / WebKit dev packages listed below.

```bash
git clone https://github.com/prathamreet/featherMD.git
cd featherMD
npm install
npm run tauri dev         # run in development with hot reload
npm run tauri build       # produce a signed release bundle
```

<details>
<summary>Linux system dependencies</summary>

```
libwebkit2gtk-4.1-dev
build-essential
curl
wget
file
libssl-dev
libgtk-3-dev
libayatana-appindicator3-dev
librsvg2-dev
```

</details>

Release bundles land in:

* Windows: `src-tauri/target/release/bundle/nsis/`
* Linux: `src-tauri/target/release/bundle/deb/` and `bundle/appimage/`

## Features

| | |
| --- | --- |
| **Unified Header** | A single 40 px bar combines title, menus, font-size slider, and corner-flush Win11-style window controls. Active document title is absolutely centered with transparent pointer events. |
| **Hover Dropdown Menus** | File / View / Style open on hover with a 180 ms grace timeout and diagonal pointer bridge to prevent accidental dismissals. Theme, Font, and Tab pickers stay open so you can preview multiple options without re-opening. |
| **Native dual-pane** | Editor on the left, live preview on the right. Resizable from 20% to 80%. Double-click the divider to reset to center. |
| **Bidirectional scroll sync** | Scroll either pane, the other follows. Ratio-based, no jitter on long documents. Toggle with `Alt + S`. |
| **CodeMirror 6 editor** | Markdown syntax styling, code folding, bracket and quote auto-pair, active-line highlight, find and replace. |
| **Highlight.js code blocks** | On-demand language loading for fenced blocks. Hundreds of languages, no startup penalty. |
| **10 built-in themes** | Five light, five dark. Switches in under 1 ms via a single `data-theme` attribute. All consolidated into one stylesheet, zero JS overhead. |
| **Advanced Printing Engine** | Bypasses browser native headers/footers (hostnames, local times, page URLs) and viewport-clipping limits to support clean multi-page document prints. |
| **External-change watcher** | Event-driven OS file watcher (`ReadDirectoryChangesW` on Windows, `inotify` on Linux). Silently reloads unmodified files; prompts when your buffer is dirty. 0% idle CPU. |
| **Recent files** | Up to ten, one click to re-open from the File -> Recent Files submenu; updates instantly on new saves. |
| **Custom unsaved-changes modal** | Save / Don't Save / Cancel with single-key shortcuts (`S` / `N` / `C`), Tab nav, and Enter to confirm. |
| **CLI launch** | `feathermd <path>` opens a file directly. Useful from a terminal or a shell hotkey. |
| **OS file associations** | `.md` and `.markdown` open in Feather MD on double-click. |
| **Signed auto-updates** | Ed25519-signed auto-update check on startup with a minimalist slide-in banner and one-click install. |
| **Persistent preferences** | Theme, font family, font size, tab size, line numbers, word wrap, scroll-sync, split ratio, window size, and maximized state are all restored on launch. |
| **No startup flash** | Window stays hidden until persisted size is applied — no wrong-size flicker. |

## Performance budget

Targets are PRD constraints the project ships against and CI enforces.

| Metric | Result | Target |
| --- | --- | --- |
| Installer size (Windows NSIS) | ~5 MB | < 10 MB |
| Cold start | < 100 ms | < 100 ms |
| Idle RAM | ~30 MB | < 30 MB |
| Active RAM (10k-word doc) | ~50 MB | < 60 MB |
| Keystroke render latency | ~155 ms (150 ms debounce + render) | < 200 ms |
| Theme swap | < 1 ms | < 16 ms |
| Background timers at idle | 0 | 0 |
| CSS bundle (gzip) | ~19 KB | < 30 KB |

Run `npm run report` to regenerate these numbers locally.

## How it compares

| | Feather MD | VS Code | Typora | Obsidian |
| --- | --- | --- | --- | --- |
| Installer size | **~5 MB** | ~90 MB | ~85 MB | ~110 MB |
| Active RAM | **~50 MB** | ~300 MB | ~150 MB | ~400 MB |
| Cold start | **< 100 ms** | 1 to 3 s | < 1 s | 1 to 2 s |
| Dual-pane preview | Built in | Extension / split editor | Hybrid only | Plugin |
| Native binary | Yes (Tauri) | No (Electron) | No (Electron) | No (Electron) |
| Telemetry | None | Opt-out | Opt-out | Opt-in |
| Cost | Free, MIT | Free, MIT | Paid | Free, freemium |

Numbers are approximate from public reporting and our own measurements. Different scenarios, different tools. Feather MD is the right pick when you want a fast, focused Markdown surface, not a full IDE or a note vault.

## Who this is for

* You read and edit `.md` files all day and you want the double-click experience to be instant.
* You write blog posts, docs, RFCs, or PRDs in plain Markdown and you want a live preview without opening an IDE.
* You like keyboard-first tools and would rather not deal with bloated UIs.
* You care about what your machine is running. You looked at Task Manager today.
* You want a tool that does one thing well and gets out of the way.

If you are managing thousands of linked notes with backlinks and graphs, you want Obsidian, not this. If you are writing code with Markdown on the side, you already have VS Code. Feather MD is the third option for everything else.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `Ctrl + N` | New file |
| `Ctrl + O` | Open file |
| `Ctrl + S` | Save |
| `Ctrl + Shift + S` | Save as |
| `Ctrl + P` | Print document |
| `Ctrl + F` | Find |
| `Ctrl + H` | Find and replace |
| `Ctrl + L` | Toggle line numbers |
| `Alt + Z` | Toggle word wrap |
| `Alt + S` | Toggle scroll sync |
| `Ctrl + ?` | Show all shortcuts |

Inside the unsaved-changes dialog: `S` save, `N` discard, `C` / `Esc` cancel.

## Architecture

Feather MD is a strictly modular Vite + Tauri app. Each module has one responsibility and no surprise dependencies.

```
featherMD/
├── index.html                       Single HTML entry, custom header, dialogs DOM.
├── package.json                     Frontend dependencies and npm scripts.
├── vite.config.js                   Vite build config (Tauri-aware targets).
├── vitest.config.js                 Test runner config (jsdom environment).
├── eslint.config.js                 Flat ESLint config with HMR-safe writable globals.
│
├── src/                             Frontend source. All ESM, no transpilation.
│   ├── main.js                      App orchestrator. Phase 1 sync mount,
│   │                                Phase 2 async config + window show.
│   │
│   ├── editor/
│   │   └── editor.js                CodeMirror 6 setup. Single updateListener
│   │                                covers docChanged + selectionSet.
│   │
│   ├── preview/
│   │   └── preview.js               marked + DOMPurify pipeline. highlight.js
│   │                                loaded on-demand per language.
│   │
│   ├── ui/
│   │   ├── toolbar.js               Hover-intent menu dropdowns, font-size
│   │   │                            control, recent-files builder.
│   │   ├── themes.js                Theme switching + prefers-color-scheme.
│   │   ├── dialogs.js               Unsaved-changes modal (S/N/C shortcuts)
│   │   │                            and shortcuts help modal.
│   │   ├── status-bar.js            Word count, cursor position, file path,
│   │   │                            line ending.
│   │   └── divider.js               Editor/preview split-pane drag handle.
│   │
│   ├── core/
│   │   ├── config.js                Defaults + Tauri appConfigDir /
│   │   │                            localStorage persistence.
│   │   ├── state.js                 HMR-resistant window state
│   │   │                            (currentFilePath, isDirty, isSaving,
│   │   │                            lineEnding).
│   │   ├── file-io.js               open / save / save-as / new + recent files
│   │   │                            + unsaved guard. Uses isSaving flag for
│   │   │                            watcher-echo suppression.
│   │   ├── keyboard.js              Global keyboard shortcut bindings.
│   │   ├── sync.js                  Bidirectional ratio-based scroll sync.
│   │   ├── welcome.js               Default welcome document.
│   │   └── utils.js                 escapeHtml (regex-based).
│   │
│   ├── platform/
│   │   ├── window.js                Tauri window controls, size persistence,
│   │   │                            deferred show().
│   │   └── updater.js               Ed25519-verified auto-update banner.
│   │
│   └── styles/
│       ├── base.css                 Layout, header, status bar, modals,
│       │                            and all 10 themes consolidated.
│       ├── editor.css               CodeMirror chrome stripping + theme vars.
│       ├── preview.css              Markdown preview typography + code blocks.
│       └── toolbar.css              Header menu dropdowns and submenus.
│
├── src-tauri/                       Rust backend.
│   ├── src/
│   │   ├── main.rs                  Tauri app entry (windows_subsystem guard).
│   │   └── lib.rs                   IPC commands: get_initial_file,
│   │                                watch_file, unwatch_file. Event-driven
│   │                                file watcher via the `notify` crate
│   │                                (no polling timers).
│   ├── capabilities/
│   │   └── default.json             Tauri 2 permission scopes for plugins.
│   ├── icons/                       Platform icons.
│   ├── tauri.conf.json              Window config (visible:false on start),
│   │                                bundle targets, updater endpoint + pubkey.
│   ├── Cargo.toml                   Rust dependencies (tauri, plugins,
│   │                                notify, serde).
│   └── build.rs                     Tauri build script.
│
├── tests/                           Vitest suites mirroring src/ layout.
│   ├── editor/editor.test.js        CodeMirror integration.
│   ├── preview/preview.test.js      Rendering, XSS sanitization, GFM.
│   ├── ui/
│   │   ├── toolbar.test.js          Menu wiring, dropdowns, recent files.
│   │   └── themes.test.js           Theme switching, OS detection.
│   ├── core/sync.test.js            Scroll sync + feedback-loop prevention.
│   ├── html.test.js                 index.html structure, ARIA.
│   ├── security.test.js             XSS, prototype pollution, perm scopes.
│   └── performance.bench.js         Render, word count, theme swap benchmarks.
│
├── scripts/
│   ├── generate-report.js           Full audit: build + lint + tests + bench.
│   └── version-bump.js              Sync version across package.json /
│                                    Cargo.toml / Cargo.lock /
│                                    tauri.conf.json / base.css.
│
├── page/                            GitHub Pages landing page.
├── .github/                         Issue templates, PR templates, CI workflows.
└── artifacts/                       Logo, PRD spec, release logs.
```

| Layer | Choice | Why |
| --- | --- | --- |
| Shell | Tauri 2 (Rust) | Uses the OS WebView. Ships no browser. |
| Web runtime | WebView2 / WebKitGTK | Already on the user's machine. |
| Editor | CodeMirror 6 | Tree-shaken to about 300 KB. |
| Markdown | marked + DOMPurify | Synchronous, sanitized. |
| Code highlight | highlight.js | Lazy-loaded per language. |
| File watcher | `notify` crate | Event-driven OS hooks, 0% idle CPU. |
| Bundler | Vite 6 | Main bundle plus on-demand chunks. |
| Updater | Tauri updater + process plugins | Ed25519-signed, in-place relaunch. |

## Quality checks

```bash
npm test            # Vitest specs
npm run lint        # ESLint
npm run bench       # Render latency, word count, theme swap benchmarks
npm run report      # Full audit: build + tests + bench + bundle sizes
```

CI runs the full audit on every push and every pull request.

## FAQ

**Is there a macOS build?**
Not yet. The codebase is Tauri so a macOS build is a CI job away. It is on the roadmap. If you want to help land it sooner, see the open issue.

**Can I edit files larger than X MB?**
Yes. CodeMirror 6 handles large files efficiently. There is no hard cap. Performance degrades smoothly on truly huge files (50 MB+) the same way any text editor does.

**Does it support tables, footnotes, task lists, math?**
Tables, task lists, fenced code, GFM extensions: yes. Footnotes and math (KaTeX / MathJax) are not enabled by default to keep the bundle small. A toggle is on the roadmap.

**Where are my settings stored?**
On Tauri builds, the OS config directory under `feathermd/config.json`. On Windows that is `%APPDATA%\com.feathermd.app\feathermd\config.json`. On Linux, `~/.config/com.feathermd.app/feathermd/config.json`. A `localStorage` fallback is used in browser dev mode.

**Is the auto-updater safe?**
Releases are signed with Ed25519. The public key is embedded in the binary. The updater verifies the signature before writing anything. See [SECURITY.md](SECURITY.md).

**How does the advanced printing engine work?**
Pressing `Ctrl + P` (or selecting File -> Print) bypasses native browser headers and footers (local times, hostnames, page URLs) using page margin overrides. It also resolves viewport clipping issues, allowing you to print clean, multi-page documents seamlessly.

**Why is there no plugin system?**
A plugin system is a commitment to an API surface for a long time. Feather MD is small enough that a focused feature set is the point. If something is missing, open an issue. Frequent requests turn into core features.

## Roadmap

A short list of what is planned. Not a promise. PRs welcome.

* [ ] macOS bundle (Universal binary)
* [ ] Document outline in the gutter
* [ ] Export to HTML and PDF
* [ ] Optional offline spellcheck (OS-native)
* [ ] Snippets and template library
* [ ] First-class image paste with sidecar storage
* [ ] Footnotes and math rendering toggles
* [ ] More themes (community-contributed)

## Contributing

Bug reports, feature requests, themes, documentation, and code PRs are all welcome.

* Workflow and standards: [CONTRIBUTING.md](CONTRIBUTING.md)
* Community norms: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
* Security disclosures: [SECURITY.md](SECURITY.md)

First-time open-source contributor? Open a small documentation fix to get familiar with the flow.

## Acknowledgments

Feather MD stands on the work of others. Thanks to:

* [Tauri](https://tauri.app) for proving you do not need to ship Chromium.
* [CodeMirror 6](https://codemirror.net) for an editor that respects the bundle budget.
* [marked](https://marked.js.org) and [DOMPurify](https://github.com/cure53/DOMPurify) for fast, safe Markdown.
* [highlight.js](https://highlightjs.org) for syntax highlighting that lazy-loads cleanly.
* [notify](https://docs.rs/notify) for event-driven cross-platform filesystem watching.
* [Vite](https://vitejs.dev) for a build chain that gets out of the way.

## Star history

If Feather MD saved you a few hundred MB of RAM today, a star helps it reach the next person tired of Electron.

[![Star History Chart](https://api.star-history.com/svg?repos=prathamreet/featherMD&type=Date)](https://star-history.com/#prathamreet/featherMD&Date)

## License

[MIT](LICENSE). Use it, fork it, ship it.
