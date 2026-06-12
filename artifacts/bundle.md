# Feather MD — Bundle & Performance Analysis

A measured breakdown of what ships in Feather MD, what actually loads at startup, and where the real size/smoothness wins are. Unlike the previous draft, the frontend numbers here are **measured from the real `dist/` build** (not estimated).

---

## Methodology (so the numbers are trustworthy)

- **Frontend figures are measured** from the committed `dist/` build (`dist/assets/`), with gzip computed per file (`zlib.gzipSync`). This is exactly what `npm run report` does, and what WebView2 actually parses at runtime.
- **Installer / `.exe` figures are estimated.** A precise number needs an actual `tauri build` (NSIS bundle), which wasn't run here. The download size quoted in the README (~6 MB) is the **NSIS installer** (LZMA-compressed), not the raw on-disk binary.
- Last `dist/` build measured: **2026-06-11**. Re-run `npm run build` + `npm run report` after major dependency changes to refresh these.

> Why "measured frontend, estimated binary"? The webview assets are a real, inspectable artifact. The compiled Rust binary + NSIS bundle are produced by the release toolchain and vary by target/profile — guessing a precise byte count would be dishonest.

---

## 1. The single most important fact: no bundled browser

Feather MD is **Tauri**, not Electron. On Windows it renders through the OS-provided **WebView2 (Edge)** runtime — it does **not** ship a ~150 MB Chromium. This is the entire reason a full markdown editor with live preview, math, and diagrams fits in single-digit megabytes. Every number below should be read against that baseline: the app is already ~20–30× smaller than the Electron equivalent before any optimization.

---

## 2. Frontend bundle — MEASURED (`dist/assets`)

| Category | Raw | Gzip | Notes |
| :--- | ---: | ---: | :--- |
| **All JavaScript** | 5,849 KB | **1,904 KB** | Across **557 chunks** — almost all lazy (see §3) |
| **All CSS** | 88 KB | **29 KB** | Single combined stylesheet (incl. `katex.min.css`) |
| **Fonts** (woff2/woff/ttf) | 1,886 KB | — | 119 files; fetched on demand, not parsed upfront |
| **index.html** | 36 KB | — | Inline boot markup |

The 1,904 KB gzip JS total is **misleading on its own** — it's the sum of every lazy chunk. What matters is what loads at startup, which is far smaller.

### Largest JS chunks (raw / gzip)

| Chunk | Raw | Gzip | Loaded… |
| :--- | ---: | ---: | :--- |
| `main-*.js` | 788 KB | **262 KB** | **Upfront** — CodeMirror 6 + marked + DOMPurify + hljs core + app |
| `wardley-*.js` | 602 KB | 145 KB | Lazy — only for Mermaid **Wardley map** diagrams |
| `mermaid.core-*.js` | 583 KB | 137 KB | Lazy — first time any diagram is rendered |
| `cytoscape.esm-*.js` | 433 KB | 139 KB | Lazy — Mermaid architecture/graph diagrams |
| `katex-*.js` | 255 KB | 76 KB | Lazy — first time math is rendered |
| `architectureDiagram-*.js` | 146 KB | 41 KB | Lazy — Mermaid architecture diagrams |
| `mathematica-*.js` | 121 KB | 35 KB | Lazy — highlight.js language (one of ~190) |
| `sequenceDiagram-*.js` | 115 KB | 31 KB | Lazy — Mermaid sequence diagrams |

---

## 3. What actually loads at startup (the number that matters)

**Cold-start JS ≈ 262 KB gzip** (the `main` chunk) + 29 KB CSS + 36 KB HTML. That's it.

Everything heavy is behind a dynamic `import()` and only loads when the open document needs it:

- **KaTeX** (76 KB gz + fonts) → loads on the first `$math$`.
- **Mermaid** (core 137 KB + per-diagram-type chunks + Cytoscape) → loads on the first ```` ```mermaid ````.
- **highlight.js languages** (557 chunks total) → each language loads the first time a code fence uses it.

This is implemented correctly via two real Vite idioms in `src/preview/preview.js`:

```js
// Per-language code-splitting — Vite emits one chunk per hljs language file:
const HLJS_LANG_MODULES = import.meta.glob(
  '../../node_modules/highlight.js/es/languages/*.js', { eager: false }
);
// Single-flight lazy loaders for the heavy engines:
let katexPromise; function loadKatex() { katexPromise ??= import('katex'); ... }
let mermaidPromise; function loadMermaid() { mermaidPromise ??= import('mermaid'); ... }
```

**Verdict:** lazy-loading is genuine and excellent. A plain-prose document never pays for KaTeX, Mermaid, Cytoscape, or any syntax language.

---

## 4. Already optimized ✅ (don't "fix" these)

| Optimization | Evidence |
| :--- | :--- |
| **No bundled browser** | Tauri + system WebView2 (§1) |
| **Lazy KaTeX / Mermaid / hljs langs** | `import.meta.glob({eager:false})` + dynamic `import()` (§3) |
| **Content-keyed LRU caches** | `mathCache` (256) / `mermaidCache` (64) in `preview.js` — unchanged blocks never re-render; bounded so a long session can't leak |
| **Stale-render guards** | Monotonic `renderSeq` / `themeRefreshSeq` tokens abort superseded async renders |
| **Font weights already trimmed** | `base.css` imports only `inter/{400,500,600}` and `jetbrains-mono/{400,500}` — **not** the whole `@fontsource` package |
| **esbuild minify + modern target** | `vite.config.js`: `minify:'esbuild'`, `target:['es2021','chrome100']` |
| **CSS under budget** | 29 KB gzip (project target < 30 KB) |

> ⚠️ **Correction to the previous report:** its "Step 4 — Font Optimization" told you to change `import '@fontsource/inter'` to specific weights. The code **already does this** — that step is obsolete. The real font opportunity is different (see §5.2).

---

## 5. Real opportunities 🔧 (ranked by value)

### 5.1 Size-optimized Rust release profile — installed binary
**Status: ✅ applied.** `src-tauri/Cargo.toml` now carries:
```toml
[profile.release]
opt-level = "s"     # optimize for size ("z" = even smaller, slightly slower)
lto = true          # link-time optimization: strips cross-crate dead code
codegen-units = 1   # better optimization (slower compile)
strip = true        # drop debug symbols / metadata
panic = "abort"     # remove unwinding tables
```
Previously the build used Cargo's *default* release profile (`opt-level=3`, no LTO, no strip), so the binary carried debug symbols and un-LTO'd dead code. **Expected:** ~1–2 MB off the installed binary, no runtime behavior change. Release compiles are now slower (the `codegen-units=1`/`lto` tradeoff); CI's `cargo check` is unaffected. Confirm the exact saving with a real `tauri build`.

### 5.2 Drop redundant font *formats* — ~900 KB of dead weight
The 1,886 KB of fonts ship each face in **multiple formats**: KaTeX includes `woff2` **+ `woff` + `ttf`**; Inter/JetBrains include `woff` **+ `woff2`**. WebView2 (and every modern engine) loads **woff2** and never touches the `woff`/`ttf` fallbacks — they're embedded but never used.
- **Action:** keep `woff2` only. For KaTeX, this is the bulk of the win (its `ttf`/`woff` are the largest font files measured). Approaches: a Vite asset filter, a postinstall prune, or KaTeX's font-subsetting.
- **Expected:** roughly **half** the font bytes (~0.9 MB) out of the shipped binary; zero visual change.

### 5.3 Prune Mermaid diagram types you don't ship — up to ~1 MB embedded
`wardley` (602 KB) and `cytoscape` (433 KB) are among the biggest chunks, pulled in only for Wardley maps and graph/architecture diagrams. They're lazy at runtime (good) but still **embedded in the installer** (shipped to every user). If those diagram types aren't a product requirement, excluding them (Mermaid's modular registration / a custom build) removes them from the download entirely.

### 5.4 Incremental preview rendering — smoothness on large docs
`renderMarkdown()` does `previewEl.innerHTML = clean` — a full destroy-and-rebuild of the preview DOM on every (debounced) keystroke. On a large document this is the main typing-stutter source.
- **Action:** diff with `morphdom`/`nanomorph` (~10 KB) so only changed nodes update. (KaTeX/Mermaid are already cached, so this mainly helps prose/table/code-heavy docs.)

### 5.5 English-only subsetting — minor
Inter ships `latin` **and** `latin-ext` subsets (measured: the `latin-ext` woff2 files are ~35 KB each). If non-Latin coverage isn't needed, dropping `latin-ext` trims a bit more.

---

## 6. Performance bottlenecks (typing smoothness)

Real, but read them alongside the mitigations already in place (§4). Typing is debounced 150 ms in `editor.js`; the cost below is per *render*, not per keystroke.

| Bottleneck | Location | Impact | Detail |
| :--- | :--- | :--- | :--- |
| **Full-document re-parse** | `preview.js → renderMarkdown` | High (large docs) | `marked.parse` → `DOMPurify.sanitize` → `innerHTML` run synchronously over the **entire** document each render. Math/diagrams are cached, but prose/tables/code are reprocessed wholesale. |
| **Full preview DOM rebuild** | `preview.js → innerHTML = clean` | High (large docs) | The whole preview subtree is discarded and recreated, even for a one-character edit. Fix: DOM diffing (§5.4). |
| **Synchronous syntax highlighting** | `preview.js → codeBlocks.forEach` | Medium | Already-loaded languages call `hljs.highlightElement` synchronously and are **not** cached, so a doc with many code blocks re-highlights all of them every render. |
| **DOMPurify deep scan** | `preview.js` | Medium | Sanitization walks every node each render. Safe and necessary — but it scales with document size. |
| **No main-thread yielding** | `preview.js` | Low–Medium | Heavy renders aren't chunked / `requestIdleCallback`-deferred, so a big paint can occupy one frame. |

> Note: a separate per-keystroke perf cliff (full-document word/char stats recomputed on every cursor move) was already fixed — stats now recompute only on edits. The items above are about the **preview render** path, which is independent.

---

## 7. Bottom line

- **Startup is already excellent:** ~262 KB gzip of JS upfront, no bundled browser, genuine lazy-loading of every heavy engine. Don't touch this.
- **Biggest *size* wins are in the shipped binary, not the runtime:** the Rust release profile (§5.1) is now **applied** (~1–2 MB). The remaining free wins are redundant font formats (§5.2, ~0.9 MB) and unused Mermaid diagram types (§5.3, up to ~1 MB) — both zero-runtime-cost but worth a build to verify first.
- **Biggest *smoothness* win** is incremental preview rendering (§5.4) for large documents.
- **For an exact installer/binary figure**, run `tauri build` and measure the NSIS output, or `npm run report` for precise gzip frontend numbers.
