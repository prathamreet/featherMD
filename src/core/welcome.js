export const WELCOME_TEXT = `# Welcome to the Markdown Editor

This editor is a lightweight Markdown writer designed for clean formatting. You can write using standard Markdown syntax, and it will render real-time HTML formatting on the fly.

---

## Getting Started

Use this default sandbox document to experiment with Markdown formatting. Here is a demonstration of the major supported elements:

### 1. Typography & Inline Styles
Format your text dynamically using:
* **Bold text** for emphasis
* *Italicized text* for styling
* ~~Strikethrough~~ to cross out items
* \`Inline code blocks\` for technical variables
* [Hyperlinks](https://en.wikipedia.org/wiki/Markdown) pointing to web addresses

> **Quote blocks** are structured with a vertical margin line to highlight references, warnings, or detailed side notes.

### 2. Page Breaks
You can control page breaks when printing/saving to PDF by inserting the \`<pb>\` tag. This creates a clean page boundary in PDF output. You can toggle the marker visibility in the preview pane using the **View** menu or by pressing \`Alt + P\` for distraction-free reading.

<pb>

### 3. Lists & Checklists
Organize your tasks or outlines:
1. First structured item
   - Bulleted sub-point
   - Secondary sub-point
2. Second structured item

- [x] Completed task item
- [ ] Remaining task item

### 4. Syntax-Highlighted Code
Write block code snippet elements with language syntax mapping:

\`\`\`javascript
// Live preview rendering loop
function renderTemplate() {
  const content = "Hello world!";
  console.log(content);
}
\`\`\`

### 5. Structured Tables
Summarize datasets easily:

| Element Type | Syntax Example | Render Output |
| :--- | :--- | :--- |
| Headers | \`# Header 1\` | Styled Title Heading |
| Accent | \`*Text*\` | Slanted Typography |
| Highlight | \`\`Code\`\` | Monospaced Text |

---

*Press \`Ctrl + ?\` at any time to view all available system keyboard shortcuts.*
`;
