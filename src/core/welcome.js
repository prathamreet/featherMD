export const WELCOME_TEXT = `>*This is just a scratch pad - clear it (ctrl + n) and start writing.*

>*Press F11 for fullscreen preview.*


## Page breaks

Drop a \`<pb>\` tag anywhere to force a clean page boundary when printing or exporting to PDF. Toggle the marker's visibility with \`Alt + P\` for distraction-free reading.

<pb>

## Keyboard shortcuts

| Shortcut | Action |
| :--- | :--- |
| \`Ctrl + O\` / \`Ctrl + R\` | Open / Recent files |
| \`Ctrl + S\` / \`Ctrl + Shift + S\` | Save / Save As |
| \`Alt + Z\` · \`Alt + X\` · \`Alt + C\` | Word wrap · Sync scroll · Line numbers |
| \`F11\` | Fullscreen preview (\`Esc\` exits) |
| \`Ctrl + P\` | Print / export to PDF |
| \`Alt + T\` then ↑ / ↓ | Cycle theme (5 light, 5 dark) |
| \`Alt + F\` then ↑ / ↓ | Cycle font |
| \`Alt + D\` then ↑ / ↓ | Cycle tab size |
| \`Ctrl\` + scroll | Zoom text in / out |
| \`Ctrl + ?\` | Every shortcut |

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

## Good to know

- Edit the open file in another program and Feather MD reloads it for you - it asks first if you have unsaved changes.
- Everything stays local. No accounts, no telemetry, no background services.`;
