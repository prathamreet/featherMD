# Feather MD Release Logs

## Feather MD v1.10.0
This update introducing a streamlined, silent background application update experience and enhanced safety guards during app relaunch.

### Summary:
- Quiet Updates: The application now checks for, downloads, and prepares updates silently in the background, removing the top banner pop-ups.
- Status Indicators: You can track the update status directly in the bottom-right corner of the window. The version number will change to "Updating..." during download, and "Restart App!" when ready.
- Smart Relaunch: Clicking "Restart App!" will restart the application to apply the update. If you have unsaved documents open, you will be prompted to save your work before the restart proceeds.
- Exit Safeguard: If you attempt to quit the application while an update is actively downloading in the background, the app will warn you to prevent the download from being aborted.

### Details:
- State Machine Integration: Implemented a new updater state module (src/platform/updater.js) utilizing three states: idle (opens repository homepage), updating (disables interactions, changes styles), and ready (invokes relaunch after file guard check).
- Graceful Failure Fallbacks: Implemented error boundaries during update check and download phases. If downloading fails, the version element silently reverts back to the original version and link behavior.
- Clean Event Listener Replacement: Employed cloneNode(true) and replaceWith on the version element to swap click handlers from default URL opening to update relaunch sequence.
- Centralized Exit Guard: Extended requestQuit() in src/platform/window.js (a unified entry point for close-to-tray, tray-quit, and keyboard shortcuts) to run a synchronous status check isUpdateInProgress() and prompt utilizing @tauri-apps/plugin-dialog if true.
- Style Optimization: Cleaned up unused banner-related rules in src/styles/base.css and added .update-in-progress (deactivated events, opacity) and .update-ready (accent color, font weight) classes.

---

## Feather MD v1.9.2
This is a minor UI quality-of-life update that resolves usability issues in split-pane mode.

### Summary:
- Slimmed down the visible drag bar between the editor and preview screens.
- Fixed a layout bug where the invisible grab region of the separator would overlap the editor scrollbar, preventing clicks and scroll interactions near the right edge of the editor.

### Details:
- Modified base.css#L585-L621 to adjust #divider dimensions from width: 9px / margin: 0 -4px to width: 3px / margin: 0 -1px.
- Offset the #divider::before active line position (left: 1px default, left: 0.5px dragging) for centered alignment.
- Relocated the #divider::after interactive area to left: 0px and right: -9px to clear the editor's scroll footprint.

---

## Feather MD v1.9.1
This is a minor update focusing on UI/UX modernization, space-based indentation, and interface cleanups.

### Summary:
- Space-based Indentation: Pressing Tab now inserts spaces instead of literal tab characters to preserve formatting across text editors.
- Segmented Tab Sizes: Quick-select indentation from 1 to 6 spaces using a new horizontal button bar under the Style menu.
- Editor Monospace Toggle: Easily switch the editor font stack between monospace and reading fonts via Style -> Font.
- Clutter-Free Layout: Removed the header logo and relocated the clickable app version badge to the status bar footer.
- Unified Dialogs: Refined padding, margins, and button positioning on the shortcuts, recent files, and unsaved changes dialogs.

### Details:
- CodeMirror Keymap: Replaced standard indentWithTab with a custom Tab handler supporting selection indenting and space padding.
- Config Schema: Added editorMonospace default state and expanded standard tabSize validation limits to integers [1, 6].
- Dynamic Styling: Wired the monospace menu toggle inside src/ui/toolbar.js to dynamically re-evaluate the --font-editor custom property.
- DOM Refactoring: Deleted visible modal headers and added hidden close buttons for testing/accessibility. Simplified the unsaved changes dialog under a single body block.
- Egress & version-bump: Re-routed the backend analytics ping to #status-version and updated the version-bump.js regex to target anchor patterns.
- PRD & Tests: Updated ID assertions in tests/html.test.js and aligned specification assets in PRD.md and README.md to v1.9.1.

---

## Feather MD v1.9.0
This is a minor release focusing on native OS integration, major memory reduction, and print pipeline reliability.

### Summary:
- System Tray Support: On Windows, closing the window now keeps Feather MD running in the background. This ensures you do not lose background tasks.
- Lower Memory Footprint: By loading heavy math/diagram libraries on-demand, disabling unused GPU browser processes, and trimming memory pages when minimized, the app baseline RAM is significantly reduced.
- Reliable PDF Exports: Closing the app immediately after printing will no longer result in broken, 0-byte PDF files. The application now prompts you and waits for the PDF compilation to complete.
- Open Files in Existing Window: Launching another file while the app is already open will now open it directly inside the running window instead of launching a duplicate process.
- Live Updater Progress: The auto-updater window now displays a live downloading percentage showing the real progress of the download.
- Flexible Recent Files list: You can now remove individual items from your recent files list or clear the entire history.

### Details:
- System Tray Orchestration: Built native support in lib.rs using Tauri TrayIconBuilder and wired live menu updates, window hide/show behaviors, and context actions. Synchronized state checking in window.js via isTrayActive so the frontend fails safe to standard exit on platforms without tray support.
- Working Set Trimming: Implemented COM interface query in Rust to access ICoreWebView2_19::SetMemoryUsageTargetLevel and set the target level to low when hiding the window.
- Resource Reductions: Excluded GPU rendering and auxiliary browser features (such as msWebOOUI, msPdfOOUI, and msSmartScreenProtection) from tauri.conf.json. Configured opt-level "s", Link-Time Optimization (LTO), single-codegen-unit builds, and aborted panics in release profiles inside Cargo.toml.
- On-Demand Math and Diagram Rendering: Extracted math and diagram examples from welcome.js and split them into a separate template loaded only on user request, avoiding cold-start import overhead.
- Compiling PDF Overlay: Integrated a custom print-status checking loop inside main.js using the window.__FEATHER_PRINTING__ flag. Intercepted close requests to display a #print-overlay spinner in index.html, delaying the window teardown until compile time completes.
- Asset Protocol Relocation: Configured local image path rewriting in preview.js to route absolute, relative, and file:// paths through Tauri's convertFileSrc helper.
- Single-Instance Locks: Enforced a single application instance check via tauri-plugin-single-instance. Wired launch arguments to be captured and sent to the active window via the open-file-from-args event.
- Editor Transaction Identification: Replaced global boolean flags with compartment-level transaction annotations using CodeMirror 6 to distinguish programmatic content updates from user edits inside editor.js.
- Test Alignment: Updated Vitest test files html.test.js, performance.bench.js, and toolbar.test.js to support the new menu entries, correct font classes, and execute authentic regex stripping benchmarks.

---

## Feather MD v1.8.0
This is a minor feature update adding advanced document extensions (math rendering and interactive diagrams) alongside user interface polishing and keyboard layout adjustments.

### Summary:
- Math Support: You can now write inline math (using $E = mc^2$) and block math (using $$...$$) directly in your markdown documents, which render smoothly in the preview pane.
- Mermaid Diagrams: Fenced code blocks tagged with mermaid or mmd (e.g., Gantt charts, flowcharts, Git graphs) will now automatically render as rich, interactive diagrams.
- Improved Printing: Printed outputs and PDF exports will now always use the clean, highly-readable "snow" (light) theme, ensuring diagrams and text remain perfectly legible regardless of your active editor theme.
- Tuned Keyboard Controls: The leader-key system (used for Alt + T/F/D cycling) now disarms much faster (in 800 milliseconds instead of 2 seconds) once you finish cycling, meaning arrow keys return to normal text navigation almost immediately.
- Reorganized Shortcuts Dialog: The shortcuts dialog is now grouped by category (File, View, Style, Editor, App), supports Escape key dismissal, and can be toggled using the Ctrl + . shortcut.
- Updated Scratchpad: The welcome text has been refreshed with direct examples of KaTeX equations, Mermaid diagrams, and updated instructions.

### Technical Details:
- Dynamic Imports & Code-Splitting: Dynamic dynamic-imports are used to lazy-load the heavy katex and mermaid libraries only when the parser detects math delimiters or diagram code blocks. Highlighting modules are also fetched via Vite's import.meta.glob on-demand to keep initial startup memory under 30 MB.
- Marked Extensions: Custom tokenizers parse blockMath and inlineMath before syntax highlighting or general markdown generation, parking raw TeX inside custom data-tex attributes so that it survives DOMPurify HTML sanitization.
- LRU Caching: Bounded LRU caches (mathCache size 256, mermaidCache size 64) store rendered SVG/HTML output. This ensures active typing in the editor pane does not trigger redundant compilation passes for unmodified blocks.
- Theme Parity for SVG Diagrams: Mermaid initializes dynamically with the correct light or dark variant. Theme shifts trigger refreshForThemeChange(), which re-renders SVG nodes in-place without restarting the entire markdown compiler. Height pinning prevents layout layout-shifts and viewport scrolling jumps during async re-renders.
- Print Override: Intercepts window.print() to switch the top-level HTML data-theme attribute to snow and awaits Mermaid theme refresh before letting the browser print the layout. Restores the user's active theme in an afterprint listener.
- Keyboard Chord Tuning: Modified armLeader inside src/core/keyboard.js to accept a custom timeout duration, updating the post-cycle re-arm to use LEADER_CYCLE_REARM_MS (800 ms) while leaving the initial chord window at LEADER_WINDOW_MS (2000 ms).
- Test Coverage: Added tests/preview/math-mermaid.test.js written in Vitest to run tokenization checks, false-positive currency guards, invalid math error boundaries, and integration sanitization checks under jsdom.

---

## Feather MD v1.7.0
This is a minor update focusing on keyboard efficiency, distraction-free editing, and user settings accessibility.

### Summary:
- Distraction-Free Fullscreen Preview: Press F11 to hide the editor, status bar, and toolbar, displaying only your rendered document in fullscreen. Press Esc or F11 to return.
- Quick Style Cycling: Tap Alt + T (themes), Alt + F (fonts), or Alt + D (tab sizes) followed by ↑/↓ arrow keys to quickly customize the editor interface without using the mouse.
- Recent Files Dialog: Access your recently opened documents in a clean, scrollable window using Ctrl + R.
- Keyboard Controls: Quit the app with Ctrl + Q and reload/refresh the app cleanly with Ctrl + Shift + R.
- Remapped Shortcuts: Adjustments made to word wrap, sync scroll (Alt + X), and line numbers (Alt + C) to prevent keyboard conflicts.

### Technical Details:
- Capture-Phase Leader Sequence: Integrated a capture-phase keydown event listener in keyboard.js to intercept up/down arrow inputs after Alt-chords. This manages a 2-second timeout window to prevent standard CodeMirror inputs during configuration cycling.
- Tauri Window Optimization: Modified window.js to utilize Tauri's isMaximized, maximize, and unmaximize APIs. This avoids OS-level borderless fullscreen layout glitches in Windows where the WebView lag leaves unpainted areas.
- DOM & CSS Refactoring: Repositioned the split container to fixed viewport coordinates (inset: 0) and applied theme-based background paint during fullscreen mode. Replaced submenu elements in index.html and base.css with a modal layout (#recent-files-modal and #recent-files-list).
- Safety reload: Implemented a reload utility that prompts the user through confirmDiscardChanges() in file-io.js to protect modifications before refreshing.
- Test Suite Enhancements: Added comprehensive vitest suites: fullscreen.test.js validating JSDOM classes and hint timeouts; themes.test.js validating cyclical array traversals; and updated toolbar element assertions in toolbar.test.js and html.test.js.

---

## Feather MD v1.6.1
Internal maintenance and security alignment update.

Minor internal configuration and connection profiles updated.
No new features, interface modifications, or behavioral changes from v1.6.0.

---

## Feather MD v1.6.0

### New Features:
- Page Breaks Support (<pb>): You can now structure your PDF export layouts by inserting <pb> page break tags.
- Page Break Visibility Toggle: Toggle the visibility of the visual dashed line for <pb> markers in the preview pane via the View > Show Page Breaks menu or using the new shortcut Alt + P.
- Rich Document Statistics: The status bar now displays individual counts for Words, Characters, and Paragraphs instead of just words.
- Accurate Statistics Counting: Markdown formatting characters (such as links, code block fences, tables, checklists) are now stripped out of raw text before counting for higher statistical accuracy.
- Selection Stats: Highlight any text in the editor to immediately see the selected word, character, and paragraph count in the status bar.
- Distraction-Free Printing: Headings are prevented from being orphaned at the bottom of pages, and tables, code blocks, or blockquotes will avoid page splits when printing or exporting to PDF.

### Improvements & Usability:
- Window Dragging: The application window can now be dragged by clicking and dragging the main title bar, with button and menu interactions protected from accidental drag events.

### Bug Fixes & Chores:
- Resolved a linter error related to an unused catch variable.
- Fixed backtick rendering and escaped tags within the Welcome document.
- Updated UI unit tests to align with status bar elements and view items.

---

## Feather MD v1.5.1
FeatherMD v1.5.1 introduces UI interaction refinements, typography zoom synchronization, editor-preview syntax highlighting alignment, and development build optimizations.

### User Interface and Experience Upgrades:
- Clean Brand Vector Logo: Replaced the distorted top-left feather icon with a clean, minimalist SVG path.
- Interactive Hover Logo: Removed button-like hover highlights (scale, backgrounds, borders). Implemented a smooth CSS cross-fade transition that replaces the logo with the version number inline on hover.
- Tauri Desktop Opener Integration: Configured the top-left icon to open the GitHub repository (https://github.com/prathamreet/featherMD) using Tauri's opener plugin in desktop mode with browser fallback.
- Line Numbers Zoom Sync: Linked CodeMirror's layout remeasurement to Ctrl + Scroll zoom events, badge reset clicks, and toolbar styling selections, resolving a bug where line numbers went out of alignment when zooming.

### Editor and Syntax Refactoring:
- Highlight.js Theme Alignment: Harmonized CodeMirror tokens (headings, keywords, strings, names, comments) styling variables to match Highlight.js preview layouts.
- Preview Inline Snippets: Styled inline code snippets in the preview pane to align with CodeMirror editors.
- Zero-Flash Lazy Language Loader: Refactored language styling checks to run synchronously when language modules are cached, resolving a brief unstyled text flash on preview changes.
- Preview Diff Classes: Added background styling for Git addition (.hljs-addition) and deletion (.hljs-deletion) inside code blocks.

### Build and Tooling Upgrades:
- Vite HMR Optimization: Added the Rust compile target folder to Vite's file watcher ignore list to eliminate recursive hot-reloading loops during development.
- Workspace Clean Scripts: Added new rm-dist, rm-target, and rm-nm script utilities in package.json for cleaner dev environment resets.
- Version Bump Automation: Updated scripts/version-bump.js and npm version git-add hooks to dynamically synchronize the version string inside index.html on new releases.

---

## Feather MD v1.5.0
FeatherMD v1.5.0 introduces interaction design modernizations, native desktop capability improvements, and backend resource optimizations.

### Performance and Engine Refactoring:
- Event-Driven File Watcher: Replaced the async Tokio-based file watcher with the event-driven notify crate, reducing idle background CPU usage to 0%.
- Write Echo Suppression: Implemented a frontend isSaving flag to prevent redundant triple-IPC loops during file writes.
- HTML Escaping Optimization: Refactored the preview renderer to use regex-based HTML escaping, eliminating intermediate DOM allocations.
- CodeMirror Consolidation: Merged redundant EditorView.updateListener registrations and removed unnecessary requestAnimationFrame wrappers in change handlers.
- Theme Consolidated Stylesheet: Combined all ten distinct theme configuration files into CSS custom properties inside a single base.css file.

### User Interface and Experience Upgrades:
- Integrated Zoom Interaction:
  - Removed the legacy header font-size slider.
  - Implemented global Ctrl + Scroll zooming (from 8px to 36px font range).
  - Scaled CodeMirror line numbers gutter size to 0.85em to keep gutter size in sync with text zoom.
  - Added a standalone zoom percentage badge in the header that displays a "Reset" indicator on hover and resets the zoom level to 100% on click.
- Custom Unsaved Changes Modal: Replaced native browser dialogs with a custom confirmation modal supporting Esc to cancel, single-key shortcuts (S, N, C), keyboard hints, and capture-phase event listeners.
- Dropdown Menu Persistence: Modified Font, Theme, and Tab menus to stay open on clicks for faster selection, closing on mouse leave after a 180ms grace delay.
- Native Titlebar and Bounds: Added rectangular window controls and configured the window to launch hidden, revealing it only after window bounds are loaded and applied to prevent startup flicker.

### Bug Fixes:
- Startup Visibility: Added missing allow-show, allow-hide, and allow-set-focus capabilities permissions to resolve a launch bug where the window would flash and close.
- Window Controls Initialization: Moved titlebar button bindings to Phase 2 of the bootstrap pipeline after Tauri is initialized, resolving an issue where the minimize, maximize, and close buttons were inert.

### Documentation:
- PRD Update: Updated the Product Requirement Document to reflect the new modular architecture, revised performance budgets, and auto-updater configurations.
- README Cleanup: Updated the architecture map and purged obsolete local screenshot assets.

---

## Feather MD v1.4.1
Internal release synchronization. No new features, no behavior changes.
This release is purely a developer-experience correction and an auto-update pipeline synchronization. The app looks and behaves exactly like v1.4.0. If you are already on v1.4.0 and everything works fine, you do not need this release. Auto-update will sync this version.

### What changed under the hood:
- Version Sync Automation: Added scripts to version-bump.js to automatically sync the brand icon's hover version tooltip with package.json on all future releases.
- Header Brand Tooltip: Restored the brand icon hover tooltip to match the active release version instead of the legacy fallback.
- Auto-Commit Tracking: Included the src/styles/base.css stylesheet in the automated npm version lifecycle hooks to ensure all bundle versions are kept in perfect alignment.
- Full Changelog: v1.4.0...v1.4.1

---

## Feather MD v1.4.0
Premium Combined Header, Hover-Intent Menus, and Advanced Printing
This minor release delivers a complete user experience overhaul and core optimization:

### Unified Header Bar:
- Combined the legacy title-bar and toolbar into a singular, 40px Unified Header Bar.
- Mathematically centered the active document title horizontally with transparent pointer events.
- Purged the heavyweight settings panel side-drawer, consolidating controls into lightweight dropdowns.

### Hover Dropdown Menus:
- Enabled mouse hover-activation for all dropdown panels.
- Integrated a 180ms hover-intent delay to prevent accidental menu dismissal.
- Added a diagonal pointer bridge to eliminate cursor drift cutoffs.
- Grouped Theme (locked to :root to preserve text contrast), Font, and Tab Size options under nested Style submenus.
- Added a custom brand icon featuring a version-check v1.4.0 hover tooltip.

### Core & Platform Upgrades:
- Completely removed legacy Vim Mode configurations and packages.
- Added windowMaximized state persistence to save and restore window dimensions on startup.
- Fully refactored all 204 unit tests to achieve 100% test coverage for the new header structure.

### Advanced Printing Engine:
- Bypassed browser native headers and footers (hostnames, local times, page URLs) using page margin bypasses.
- Solved 100vh viewport-clipping issues to support infinite multi-page document prints.

### Recent Files Bugfix:
- Fixed a file-saving bug so newly saved files register and update the File -> Recent Files list immediately.
- Full Changelog: v1.3.5...v1.4.0

---

## Feather MD v1.3.5
Internal refactor. No new features, no fixes, no behavior changes.
This release is purely a codebase reorganization and an auto-update pipeline verification. The app looks, feels, and runs identically to v1.3.4. If you are on v1.3.4 and everything works fine, you do not need this release. Auto-update will pick it up on next launch.

### What changed under the hood:
- src/ regrouped into editor/, preview/, ui/, core/, and platform/ subfolders.
- main.js split from 915 lines into a 314-line orchestrator plus nine focused modules.
- tests/ mirrors the new src/ layout. 221/221 specs still pass.
- README rewritten with detailed architecture, performance budget, and comparison table.
- Issue and PR templates refreshed.
- Full changelog: v1.3.4...v1.3.5

---

## Feather MD v1.3.4
Feather MD v1.3.4 delivers critical bug fixes, editor usability enhancements, native platform improvements, and a major bundle size optimization.

### Key Enhancements:
- Optimized Preview Bundle: Switched markdown code-block syntax coloring to lazy load components dynamically as needed. This significantly reduces the initial bundle footprint and compilation size.
- Tab Key Space Insertion: Configured CodeMirror state to ensure pressing the Tab key inserts physical spaces matching your tab-size preference rather than just changing the display width.
- Startup Preferences Restoration: Seamlessly restores your customized configuration (line numbers, word wrapping, Vim mode, scroll-sync, and editor split ratio) on application startup.
- External Link Browser Routing: HTTP/HTTPS external links now open directly in your host operating system's default browser instead of navigating inside the webview window.
- Smart File-Watcher: Silently reloads unmodified active files when changed on disk by external programs, prompting you only when the editor buffer has unsaved changes.
- Window Boundary Persistence: Restores your custom window size on launch, utilizing debounced event tracking to persist adjustments.

### Bug Fixes:
- Resolved a toolbar binding issue that caused the settings panel to instantly close when clicking the settings button.
- Fixed an initialization race condition where file-opened IPC listeners were registered before DOM content finished mounting.
- Cleaned up unbundled font family fallbacks from the settings dropdown.
- Refactored native Tauri capability permissions, removing unused dialog handles.

---

## Feather MD v1.3.3
Bug Fixes and Boilerplate Cleanup

- Suspended the file watcher temporarily during save events to eliminate false "File Modified Externally" reload prompts.
- Replaced the application-specific welcome boilerplate with a generic Markdown writing sandbox.

---

## Feather MD v1.3.2
Feather MD version 1.3.2 introduces critical performance optimizations, core compilation bug fixes, and a comprehensive cleanup of dead code.

### Performance Optimizations:
- Implemented Frame-Throttled Rendering using requestAnimationFrame. Typing within the editor is now completely lag-free, while the preview pane updates in lockstep with the monitor's paint refresh cycles.

### Bug Fixes:
- Resolved a compilation failure in the asynchronous file watcher thread by adding the tokio dependency to Cargo.toml and standardizing sleep durations.

### Cleanups and Refactorings:
- Purged the unused active_path managed state field and related lock mutations from the FileWatcher Rust struct.
- Eliminated five unused helper function exports (isSettingsOpen, isSyncEnabled, getCurrentTheme, getThemes, and getView) from the frontend modules.

---

## Feather MD v1.3.1
This is a visual test release to verify and demonstrate the functionality of the newly integrated Over-the-Air (OTA) automatic updater system.

### What's Changed:
- Startup Welcome Boilerplate: Updated the default startup markdown document to explicitly celebrate the successful delivery of the v1.3.1 release.
- Auto-Updater Validation: Verified signature handshakes and OTA patch distribution pipelines.

### Installation:
- Existing v1.3.0 users will receive this update automatically inside the application!
- New users can download the standard installers listed below.

---

## Feather MD v1.3.0
This release introduces native, cryptographically secure Over-The-Air (OTA) automatic updates alongside under-the-hood optimization tweaks.

### What's New:
- Automatic Software Updates: The app will now silently check for new versions on startup. When a new release is published, a sleek, minimalist slide-in banner will notify you.
- One-Click Installation: Download, verify signatures, install, and relaunch seamlessly with a single click.
- Cryptographic Signatures: All release packages are signed with Ed25519 signatures, ensuring your updates are verified and authentic.
- Code Quality & Cleanliness: Underwent extensive performance benchmarking.

### Installation:
- Windows: Download and run Feather.MD_1.3.0_x64-setup.exe below.
- Linux: Download the .deb or portable .AppImage packages.

---

## Feather MD v1.2.7
Release Notes

- Streamlined and optimized the CI/CD build pipeline.
- Focused release targets exclusively on Windows (.exe) and Linux (.deb) platforms.
- Configured Windows installer setup options to improve the default installation flow.
- General workflow and build stability improvements.

---

## Feather MD v1.0.1

### Bug Fixes & Stability:
- Fixed Unsaved Changes Guard: Resolved a critical bug in Tauri's native dialog message handler where state changes were ignored, causing all prompt actions (Save, Don't Save, Cancel) to discard changes or freeze.
- Custom Prompts: Replaced native message boxes with a custom visual Promise-based overlay for robust handling of unsaved modifications on New File, Open File, and App Close events.
- Save Dialog Fix: Restored standard native file picker behavior when prompting to save changes on new or unnamed files.

### Enhancements:
- Complete Performance Readme: Redesigned project documentation aligning strictly to Feather MD performance budgets (under 100ms cold start, under 10MB installer, under 60MB RAM footprint).
- Improved Focus States: Keyboard focus is automatically mapped to default action buttons when confirmation dialogs appear.