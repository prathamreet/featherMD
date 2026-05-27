# Feather MD

> [!IMPORTANT]
> **Attention existing users (v1.2.7 and older):** We have introduced native **Over-the-Air Auto-Updates** in version `1.3.0`. To enable automatic updates moving forward, please download and install the latest release manually one last time. [Download v1.3.1 Here](https://github.com/prathamreet/featherMD/releases/latest)

A native-feeling, zero-bloat dual-pane Markdown editor for Windows and Linux. Built with Tauri 2, CodeMirror 6, and Marked.js. No Electron, no Node.js runtime, and no background services.

---

## Performance Budget & Design Constraints

Feather MD is engineered strictly around performance budgets to guarantee a lightweight, instantaneous editing experience.

* **Cold Start Time:** Under 100ms from double-click to fully loaded content.
* **Installer Size:** Under 10MB (typically ~3.5MB binary size).
* **Runtime RAM:** Under 60MB when handling a 10,000-word file (under 30MB at idle with empty file).
* **Keystroke-to-Preview Latency:** Under 200ms (150ms debounce + <50ms render).
* **CPU Idle:** Under 1% (no polling loops or active timers run without user activity).
* **Data Privacy:** Zero telemetry, zero external network calls.

---

## Tech Stack

| Layer | Component | Description / Advantage |
| --- | --- | --- |
| **Shell & Native** | Tauri 2 (Rust) | Bypasses Chromium by leveraging the OS WebView. |
| **WebView Runtime** | WebView2 (Win) / WebKitGTK (Linux) | Native OS system libraries with zero setup overhead. |
| **Auto-Updater** | Tauri Updater & Process Plugins | Secure Over-The-Air updates with Ed25519 signatures. |
| **Editor Pane** | CodeMirror 6 | Tree-shaken bundle (~300KB) providing precise line-based scroll control. |
| **Markdown Engine** | Marked.js 9 + DOMPurify | Fast synchronous Markdown parser with built-in XSS sanitization. |
| **Bundler** | Vite 6 | Generates a single, highly optimized ~400KB production asset. |
| **Themes** | CSS Custom Properties | Fast, zero-JS style transitions using standard document attributes. |

---

## Core Features

### File Handling & System Integration
* **Over-the-Air Auto-Updater:** Pure native update check on startup with cryptographically signed installers and seamless in-app relaunch.
* **Command Line Launch:** Execute `feathermd <path>` to open files instantly.
* **OS File Associations:** Automatic integration with `.md` and `.markdown` files.
* **Smart Guard Dialog:** Reliable local Save / Don't Save / Cancel flows upon close, new, or open operations on modified files.
* **Offline First:** Complete local operations with zero cloud or background synchronization.

### Editor & Layout
* **CodeMirror 6 Core:** Full Markdown syntax styling, auto-close brackets/quotes, and clean line numbers.
* **Keyboard Navigation:** Native commands alongside an optional lazy-loaded Vim input mode (~40KB payload).
* **Vibrant Layout Split:** 50/50 split resizable divider (20% to 80% boundaries) with double-click reset to center.
* **Passive Synchronized Scrolling:** Scroll ratio calculation matches view positions instantly, driven by passive event listeners.
* **Custom UI Frame:** Borderless window layout using HTML title bar controls and inline SVG sprites.

### Styling & Theming
* **Color Schemes:** 10 curated CSS themes (5 light, 5 dark) tailored for readability.
* **System Schemes:** Automatic detection matching `prefers-color-scheme`.
* **Instant Transitions:** Style variables change instantaneously without layout recalculation.


---

## Key Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl + N` | Create a new file |
| `Ctrl + O` | Open an existing file |
| `Ctrl + S` | Save current file |
| `Ctrl + Shift + S` | Save file as new target |
| `Ctrl + L` | Toggle line numbers |
| `Alt + Z` | Toggle word wrap |
| `Alt + S` | Toggle scroll synchronization |
| `Ctrl + ,` | Toggle inline settings panel |

---

## Setup & Local Development

### Requirements
* **Node.js:** v18 or later
* **Rust Toolchain:** Stable release channel
* **System Dependencies:**
  * **Windows:** WebView2 runtime (pre-installed on Windows 10/11)
  * **Linux:** `libwebkit2gtk-4.1-dev`, `build-essential`, `curl`, `wget`, `file`, `libssl-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`

### Running the Application

```bash
# Install dependencies
npm install

# Start the dev server & hot-reloading Tauri shell
npm run tauri dev
```

### Building the Production Executable

To compile optimized release builds, run the appropriate target commands:

```bash
# Build the production executable and installer
npm run tauri build
```

The resulting binaries will be located under:
* **Windows:** `src-tauri/target/release/bundle/nsis/Feather MD_<version>_x64-setup.exe`
* **Linux:** `src-tauri/target/release/bundle/deb/` or `src-tauri/target/release/bundle/appimage/`
