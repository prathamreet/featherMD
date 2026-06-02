2 days ago
@github-actions github-actions
 v1.4.1
 24e77d5
Feather MD v1.4.1 Latest
Internal release synchronization. No new features, no behavior changes.
This release is purely a developer-experience correction and an auto-update pipeline synchronization. The app looks and behaves exactly like v1.4.0. If you are already on v1.4.0 and everything works fine, you do not need this release. Auto-update will sync this version.

What changed under the hood
Version Sync Automation: Added scripts to version-bump.js to automatically sync the brand icon's hover version tooltip with package.json on all future releases.
Header Brand Tooltip: Restored the brand icon hover tooltip to match the active release version instead of the legacy fallback.
Auto-Commit Tracking: Included the src/styles/base.css stylesheet in the automated npm version lifecycle hooks to ensure all bundle versions are kept in perfect alignment.
Full Changelog: v1.4.0...v1.4.1

Assets
8
Feather.MD_1.4.1_amd64.AppImage
sha256:b0e887d77691644a46e59ef789ffc4dfb227f9a9f28e1ccac53729688c494c62
81.4 MB
2 days ago
Feather.MD_1.4.1_amd64.AppImage.sig
sha256:9c606eafa400c374f13dee8d0b5cfefe97350c11c44efb9209846816d3430dc2
424 Bytes
2 days ago
Feather.MD_1.4.1_amd64.deb
sha256:6ca5c3d717a79841b78fa6531a2b21e85e429953cc59509c4c29821904ade3a4
7.8 MB
2 days ago
Feather.MD_1.4.1_x64-setup.exe
sha256:f94a23f8edcbd34b8da27e5f54563a10c07195872ecc488cd7f363d082625adf
5 MB
2 days ago
Feather.MD_1.4.1_x64-setup.exe.sig
sha256:a05b162da95f7a5c35c1ed976d5346429483df14e5df0d09a248c1bb351ff77e
420 Bytes
2 days ago
latest.json
sha256:8382db2138ffb355c71fc3f53bc4dcbc7301b9ff3fbd5300b51c783dc91f29ee
1.3 KB
2 days ago
Source code
(zip)
2 days ago
Source code
(tar.gz)
2 days ago
Feather MD v1.4.0
2 days ago
@github-actions github-actions
 v1.4.0
 a6f9dc2
Feather MD v1.4.0
Premium Combined Header, Hover-Intent Menus, and Advanced Printing
This minor release delivers a complete user experience overhaul and core optimization:

Unified Header Bar
Combined the legacy title-bar and toolbar into a singular, 40px Unified Header Bar.
Mathematically centered the active document title horizontally with transparent pointer events.
Purged the heavyweight settings panel side-drawer, consolidating controls into lightweight dropdowns.
Hover Dropdown Menus
Enabled mouse hover-activation for all dropdown panels.
Integrated a 180ms hover-intent delay to prevent accidental menu dismissal.
Added a diagonal pointer bridge to eliminate cursor drift cutoffs.
Grouped Theme (locked to :root to preserve text contrast), Font, and Tab Size options under nested Style submenus.
Added a custom brand icon featuring a version-check v1.4.0 hover tooltip.
Core & Platform Upgrades
Completely removed legacy Vim Mode configurations and packages.
Added windowMaximized state persistence to save and restore window dimensions on startup.
Fully refactored all 204 unit tests to achieve 100% test coverage for the new header structure.
Advanced Printing Engine
Bypassed browser native headers and footers (hostnames, local times, page URLs) using page margin bypasses.
Solved 100vh viewport-clipping issues to support infinite multi-page document prints.
Recent Files Bugfix
Fixed a file-saving bug so newly saved files register and update the File -> Recent Files list immediately.
Full Changelog: v1.3.5...v1.4.0

Assets
8
Feather MD v1.3.5
3 days ago
@github-actions github-actions
 v1.3.5
 6e84fc9
Feather MD v1.3.5
Internal refactor. No new features, no fixes, no behavior changes.
This release is purely a codebase reorganization and an auto-update pipeline verification. The app looks, feels, and runs identically to v1.3.4. If you are on v1.3.4 and everything works fine, you do not need this release. Auto-update will pick it up on next launch.

What changed under the hood
src/ regrouped into editor/, preview/, ui/, core/, and platform/ subfolders.
main.js split from 915 lines into a 314-line orchestrator plus nine focused modules.
tests/ mirrors the new src/ layout. 221/221 specs still pass.
README rewritten with detailed architecture, performance budget, and comparison table.
Issue and PR templates refreshed.
Full changelog: v1.3.4...v1.3.5

Assets
8
Feather MD v1.3.4
4 days ago
@github-actions github-actions
 v1.3.4
 6adf958
Feather MD v1.3.4
Feather MD v1.3.4 delivers critical bug fixes, editor usability enhancements, native platform improvements, and a major bundle size optimization.

Key Enhancements
Optimized Preview Bundle: Switched markdown code-block syntax coloring to lazy load components dynamically as needed. This significantly reduces the initial bundle footprint and compilation size.
Tab Key Space Insertion: Configured CodeMirror state to ensure pressing the Tab key inserts physical spaces matching your tab-size preference rather than just changing the display width.
Startup Preferences Restoration: Seamlessly restores your customized configuration (line numbers, word wrapping, Vim mode, scroll-sync, and editor split ratio) on application startup.
External Link Browser Routing: HTTP/HTTPS external links now open directly in your host operating system's default browser instead of navigating inside the webview window.
Smart File-Watcher: Silently reloads unmodified active files when changed on disk by external programs, prompting you only when the editor buffer has unsaved changes.
Window Boundary Persistence: Restores your custom window size on launch, utilizing debounced event tracking to persist adjustments.
Bug Fixes
Resolved a toolbar binding issue that caused the settings panel to instantly close when clicking the settings button.
Fixed an initialization race condition where file-opened IPC listeners were registered before DOM content finished mounting.
Cleaned up unbundled font family fallbacks from the settings dropdown.
Refactored native Tauri capability permissions, removing unused dialog handles.
Assets
8
Feather MD v1.3.3
4 days ago
@github-actions github-actions
 v1.3.3
 d3ec9ae
Feather MD v1.3.3
Bug Fixes and Boilerplate Cleanup

Suspended the file watcher temporarily during save events to eliminate false "File Modified Externally" reload prompts.
Replaced the application-specific welcome boilerplate with a generic Markdown writing sandbox.
Assets
8
Feather MD v1.3.2
4 days ago
@github-actions github-actions
 v1.3.2
 a6918a0
Feather MD v1.3.2
Feather MD version 1.3.2 introduces critical performance optimizations, core compilation bug fixes, and a comprehensive cleanup of dead code.

Performance Optimizations

Implemented Frame-Throttled Rendering using requestAnimationFrame. Typing within the editor is now completely lag-free, while the preview pane updates in lockstep with the monitor's paint refresh cycles.
Bug Fixes

Resolved a compilation failure in the asynchronous file watcher thread by adding the tokio dependency to Cargo.toml and standardizing sleep durations.
Cleanups and Refactorings

Purged the unused active_path managed state field and related lock mutations from the FileWatcher Rust struct.
Eliminated five unused helper function exports (isSettingsOpen, isSyncEnabled, getCurrentTheme, getThemes, and getView) from the frontend modules.
Assets
8
Feather MD v1.3.1
4 days ago
@github-actions github-actions
 v1.3.1
 39c8088
Feather MD v1.3.1
This is a visual test release to verify and demonstrate the functionality of the newly integrated Over-the-Air (OTA) automatic updater system.

What's Changed
Startup Welcome Boilerplate: Updated the default startup markdown document to explicitly celebrate the successful delivery of the v1.3.1 release.
Auto-Updater Validation: Verified signature handshakes and OTA patch distribution pipelines.
Installation
Existing v1.3.0 users will receive this update automatically inside the application!
New users can download the standard installers listed below.
Assets
8
Feather MD v1.3.0
4 days ago
@github-actions github-actions
 v1.3.0
 83262c9
Feather MD v1.3.0
This release introduces native, cryptographically secure Over-The-Air (OTA) automatic updates alongside under-the-hood optimization tweaks.

What's New
Automatic Software Updates: The app will now silently check for new versions on startup. When a new release is published, a sleek, minimalist slide-in banner will notify you.
One-Click Installation: Download, verify signatures, install, and relaunch seamlessly with a single click.
Cryptographic Signatures: All release packages are signed with Ed25519 signatures, ensuring your updates are verified and authentic.
Code Quality & Cleanliness: Underwent extensive performance benchmarking.
Installation
Windows: Download and run Feather.MD_1.3.0_x64-setup.exe below.
Linux: Download the .deb or portable .AppImage packages.
Assets
8