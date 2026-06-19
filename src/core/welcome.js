// Default scratch-pad shown on a cold start. Deliberately contains NO math
// (`$$`) or Mermaid fences: rendering those would eager-load KaTeX and Mermaid
// (the heaviest chunks) into the WebView2 renderer heap on every launch,
// inflating the idle baseline from ~30 MB to ~60 MB. The syntax is shown as
// inline code (which never triggers rendering); the live examples load on
// demand via the "Load examples" link (see EXAMPLES_TEXT + main.js).
export const WELCOME_TEXT = `>*This is just a scratch pad - clear it with \`Ctrl + N\` and start writing.*

>*Press \`F11\` for fullscreen preview.*

>*Press \`Ctrl + .\` to view every shortcut.*


## Page breaks

Drop a \`<pb>\` tag anywhere to force a clean page boundary when printing or exporting to PDF. The dashed line is only visible on screen - it disappears in the printed output.

<pb>

## Math & diagrams

Feather MD renders LaTeX math (KaTeX) and Mermaid diagram - but only loads those engines when a document actually uses them, so a plain note like this one stays light on the memory.

Type inline math like \`$E = mc^2$\`, block math between \`$$ ... $$\`, or open a \`mermaid\` code fence for flowcharts, gantt charts, and git graphs.

**[Load math & diagram examples](#examples)** to see them rendered live.

## Syntax highlighting

Fenced code blocks are highlighted on demand - hundreds of languages, each loaded only the first time you use it, so startup stays instant.

\`\`\`js
function render(markdown) {
  return preview(markdown); // updates as you type
}
\`\`\`

## Tasks, tables, the usual

Standard GitHub Flavored Markdown is all here - checkboxes, tables, strikethrough, footnotes:

- [x] Math via KaTeX
- [x] Diagrams via Mermaid
- [ ] Try it on your own notes

| What | Cost |
| :--- | ---: |
| Installer | ~6 MB |
| Cold start | < 100 ms |
| RAM (idle) | < 30 MB |
| Telemetry | anonymous |

## Tuned for keyboard

Ten themes, ten reader fonts, two tab sizes - every preference is one chord away. No menu hunting, no settings panel, no mouse.

The leader chords work like this: tap \`Alt + T\` (or \`F\`, or \`D\`), then \`↑\` / \`↓\` to cycle. Pause for a second and the chord ends - your arrow keys go back to being arrow keys.

## Stays local

Everything lives on your machine. No accounts, no cloud sync, no background services. Two anonymous requests go out on startup: a signed update check (you choose when to install) and a basic usage ping - app version, OS, language, and screen size - so we know which platforms to support.

Edit the file in another program and Feather MD reloads it for you - it asks first if there are unsaved changes.`;

// Loaded on demand when the user clicks the "Load examples" link in the welcome
// document. Kept out of WELCOME_TEXT so KaTeX/Mermaid only load when explicitly
// requested (see main.js).
export const EXAMPLES_TEXT = `# Math & diagram examples

Inline math like $E = mc^2$ sits inside a paragraph. Display equations get their own centered line:

$$
i\\hbar \\frac{\\partial}{\\partial t} \\Psi(\\mathbf{r}, t) = \\left[ -\\frac{\\hbar^2}{2m} \\nabla^2 + V(\\mathbf{r}, t) \\right] \\Psi(\\mathbf{r}, t)
$$

Mermaid diagrams render from \`mermaid\` code fences:

\`\`\`mermaid
gantt
  title FeatherMD release plan
  dateFormat YYYY-MM-DD
  section Core
  KaTeX integration        :done,    k1, 2026-06-01, 3d
  Mermaid integration      :active,  m1, 2026-06-04, 4d
  section Polish
  Theme parity for diagrams: p1, after m1, 2d
  Test sweep               : p2, after p1, 2d
  Release notes            : p3, after p2, 1d
\`\`\`

Or visualize Git history:

\`\`\`mermaid
gitGraph
  commit id: "init"
  commit id: "editor"
  branch feat/mermaid
  checkout feat/mermaid
  commit id: "katex"
  commit id: "mermaid"
  checkout main
  merge feat/mermaid
  commit id: "1.8.0"
\`\`\`

Press \`Ctrl + N\` for a blank scratch pad, or open your own file with \`Ctrl + O\`.`;
