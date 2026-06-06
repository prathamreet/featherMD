export const WELCOME_TEXT = `# Welcome to Feather MD

A fast, native dual-pane editor: you write on the left, the live preview renders on the right with scroll sync. You already know Markdown — here is what is specific to this app.

## Page breaks

Drop a \`<pb>\` tag anywhere to force a clean page boundary when printing or exporting to PDF. Toggle the marker's visibility with \`Alt + P\` for distraction-free reading.

<pb>

## Syntax highlighting

Fenced code blocks are highlighted on demand — hundreds of languages, each loaded only the first time you use it, so startup stays instant.

\`\`\`js
function render(markdown) {
  return preview(markdown); // updates as you type
}
\`\`\`

## Make it yours

Cycle settings without touching the mouse: tap a leader key, then \`↑\` / \`↓\`.

| Shortcut | Action |
| :--- | :--- |
| \`Alt + T\` then ↑ / ↓ | Cycle theme (5 light, 5 dark) |
| \`Alt + F\` then ↑ / ↓ | Cycle font |
| \`Alt + D\` then ↑ / ↓ | Cycle tab size |
| \`Ctrl\` + scroll | Zoom text in / out |

## Get around

| Shortcut | Action |
| :--- | :--- |
| \`Ctrl + O\` / \`Ctrl + R\` | Open / Recent files |
| \`Ctrl + S\` / \`Ctrl + Shift + S\` | Save / Save As |
| \`Alt + Z\` · \`Alt + X\` · \`Alt + C\` | Word wrap · Sync scroll · Line numbers |
| \`F11\` | Fullscreen preview (\`Esc\` exits) |
| \`Ctrl + P\` | Print / export to PDF |
| \`Ctrl + ?\` | Every shortcut |

## Good to know

- Edit the open file in another program and Feather MD reloads it for you — it asks first if you have unsaved changes.
- Everything stays local. No accounts, no telemetry, no background services.

---

*This is just a scratch pad — clear it and start writing.*
`;
