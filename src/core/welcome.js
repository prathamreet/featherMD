export const WELCOME_TEXT = `>*This is just a scratch pad - clear it with \`Ctrl + N\` and start writing.*

>*Press \`F11\` for fullscreen preview.*

>*Press \`Ctrl + .\` to view every shortcut.*


## Page breaks

Drop a \`<pb>\` tag anywhere to force a clean page boundary when printing or exporting to PDF. The dashed line is only visible on screen - it disappears in the printed output.

<pb>

## Math & diagrams

Type inline math like $E = mc^2$ inside a paragraph, or display larger equations on their own lines:

$$
i\\hbar \\frac{\\partial}{\\partial t} \\Psi(\\mathbf{r}, t) = \\left[ -\\frac{\\hbar^2}{2m} \\nabla^2 + V(\\mathbf{r}, t) \\right] \\Psi(\\mathbf{r}, t)
$$

You can also draw diagrams using Mermaid:

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

Or represent Git branches visually:

\`\`\`mermaid
gitGraph
  commit id: "init"
  commit id: "editor"
  branch feat/mermaid
  checkout feat/mermaid
  commit id: "katex"
  commit id: "mermaid"
  commit id: "theme parity"
  checkout main
  merge feat/mermaid
  commit id: "1.8.0"
\`\`\`

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
| Telemetry | none |

## Tuned for keyboard

Ten themes, three fonts, two tab sizes - every preference is one chord away. No menu hunting, no settings panel, no mouse.

The leader chords work like this: tap \`Alt + T\` (or \`F\`, or \`D\`), then \`↑\` / \`↓\` to cycle. Pause for a second and the chord ends - your arrow keys go back to being arrow keys.

## Stays local

Everything lives on your machine. No accounts, no cloud sync, no telemetry, no background services. The only outbound request is the signed update check on startup, and you decide when to install it.

Edit the file in another program and Feather MD reloads it for you - it asks first if there are unsaved changes.`;
