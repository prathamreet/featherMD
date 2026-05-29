/* ==========================================================================
   FEATHER MD LANDING PAGE — GFM COMPILER MODULE
   ========================================================================== */

/**
 * Escapes HTML and parses inline markdown syntax (bold, italic, code, links).
 */
export function parseInline(text) {
  if (!text) return '';
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bold + Italic: ***text***
  escaped = escaped.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  // Bold: **text**
  escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Italic: *text*
  escaped = escaped.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // Inline code: `code`
  escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Markdown Links: [label](url)
  escaped = escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  return escaped;
}

/**
 * Compiles a markdown table block into clean semantic HTML.
 */
export function compileTable(rows) {
  if (rows.length === 0) return '';
  let html = '<table>';
  let hasBody = false;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i].trim();
    if (!row || row.replace(/\|/g, '').trim() === '') continue;
    
    // Separator row check
    if (row.includes('---')) continue;

    const cols = row.split('|')
      .map(c => c.trim())
      .filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);

    if (i === 0 || (i === 1 && rows[0].includes('---'))) {
      html += '<thead><tr>';
      cols.forEach(c => {
        html += `<th>${parseInline(c)}</th>`;
      });
      html += '</tr></thead>';
    } else {
      if (!hasBody) {
        html += '<tbody>';
        hasBody = true;
      }
      html += '<tr>';
      cols.forEach(c => {
        html += `<td>${parseInline(c)}</td>`;
      });
      html += '</tr>';
    }
  }
  
  if (hasBody) html += '</tbody>';
  html += '</table>';
  return html;
}

/**
 * Parses full Markdown blocks into standard browser-safe HTML.
 */
export function compileMarkdown(md) {
  const lines = md.split('\n');
  const html = [];
  
  let inList = false;
  let inPre = false;
  let preCode = [];
  let preLang = '';
  let inTable = false;
  let tableRows = [];
  let inQuote = false;
  let quoteLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code Block parsing
    if (line.trim().startsWith('```')) {
      if (inPre) {
        html.push(`<pre><code class="language-${preLang || 'text'}">${preCode.join('\n')}</code></pre>`);
        inPre = false;
        preCode = [];
        preLang = '';
      } else {
        if (inList) { html.push('</ul>'); inList = false; }
        if (inTable) { html.push(compileTable(tableRows)); inTable = false; tableRows = []; }
        if (inQuote) { html.push(`<blockquote>${parseInline(quoteLines.join('<br>'))}</blockquote>`); inQuote = false; quoteLines = []; }
        
        inPre = true;
        preLang = line.replace('```', '').trim();
      }
      continue;
    }

    if (inPre) {
      preCode.push(line);
      continue;
    }

    // Table parsing
    const isTableRow = line.startsWith('|');
    if (isTableRow) {
      if (inList) { html.push('</ul>'); inList = false; }
      if (inQuote) { html.push(`<blockquote>${parseInline(quoteLines.join('<br>'))}</blockquote>`); inQuote = false; quoteLines = []; }
      
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      tableRows.push(line);
      continue;
    } else if (inTable) {
      html.push(compileTable(tableRows));
      inTable = false;
      tableRows = [];
    }

    // Blockquotes
    if (line.trim().startsWith('>')) {
      if (inList) { html.push('</ul>'); inList = false; }
      if (inTable) { html.push(compileTable(tableRows)); inTable = false; tableRows = []; }
      
      if (!inQuote) {
        inQuote = true;
        quoteLines = [];
      }
      quoteLines.push(line.replace(/^>\s?/, ''));
      continue;
    } else if (inQuote) {
      html.push(`<blockquote>${parseInline(quoteLines.join('<br>'))}</blockquote>`);
      inQuote = false;
      quoteLines = [];
    }

    // Lists & Task lists
    const isUnordered = line.trim().startsWith('- ') || line.trim().startsWith('* ');
    if (isUnordered) {
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      let content = line.trim().replace(/^([-\*]\s+)/, '');
      if (content.startsWith('[ ]')) {
        html.push(`<li><input type="checkbox" disabled style="margin-right:8px; vertical-align: middle;">${parseInline(content.substring(3).trim())}</li>`);
      } else if (content.startsWith('[x]') || content.startsWith('[X]')) {
        html.push(`<li><input type="checkbox" checked disabled style="margin-right:8px; vertical-align: middle;">${parseInline(content.substring(3).trim())}</li>`);
      } else {
        html.push(`<li>${parseInline(content)}</li>`);
      }
      continue;
    } else if (inList) {
      html.push('</ul>');
      inList = false;
    }

    // Horizontal lines
    if (line.trim() === '---' || line.trim() === '***') {
      html.push('<hr>');
      continue;
    }

    // Headings
    if (line.startsWith('# ')) {
      html.push(`<h1>${parseInline(line.substring(2))}</h1>`);
    } else if (line.startsWith('## ')) {
      html.push(`<h2>${parseInline(line.substring(3))}</h2>`);
    } else if (line.startsWith('### ')) {
      html.push(`<h3>${parseInline(line.substring(4))}</h3>`);
    } else if (line.startsWith('#### ')) {
      html.push(`<h4>${parseInline(line.substring(5))}</h4>`);
    }
    
    // Paragraph lines or Empty lines
    else {
      if (line.trim() === '') {
        // Empty space spacer
      } else {
        html.push(`<p>${parseInline(line)}</p>`);
      }
    }
  }

  // Flush remaining buffers
  if (inPre) html.push(`<pre><code class="language-${preLang || 'text'}">${preCode.join('\n')}</code></pre>`);
  if (inList) html.push('</ul>');
  if (inTable) html.push(compileTable(tableRows));
  if (inQuote) html.push(`<blockquote>${parseInline(quoteLines.join('<br>'))}</blockquote>`);

  return html.join('\n');
}
