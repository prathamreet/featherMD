import { describe, bench } from 'vitest';
import { initPreview } from '../src/preview.js';
import { initThemes, applyTheme } from '../src/themes.js';
import { vi } from 'vitest';

// Mock window.matchMedia at the global level
vi.stubGlobal('matchMedia', vi.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
})));

// Generate a large 5,000-line Markdown document for realistic stress testing
const generateLargeMarkdown = () => {
  let md = '# Feather MD Performance Benchmark Document\n\n';
  for (let i = 0; i < 500; i++) {
    md += `## Section ${i}\n`;
    md += `This is a paragraph under section ${i} containing **bold**, *italic*, and \`inline code\`.  \n`;
    md += `- Task list item ${i}\n`;
    md += `- [x] Completed task ${i}\n`;
    md += `\n\`\`\`javascript\nfunction benchmark${i}() {\n  console.log("Feather MD performance test: " + ${i});\n}\n\`\`\`\n\n`;
  }
  return md;
};

const largeMarkdown = generateLargeMarkdown();

describe('Feather MD — Performance Benchmarks', () => {
  // ---- 1. Markdown Parsing & Sanitization Benchmark ----
  describe('Markdown Renderer Latency', () => {
    const parentEl = document.createElement('div');
    const previewEl = document.createElement('div');
    parentEl.appendChild(previewEl);

    // Mock parent scroll bounds
    Object.defineProperty(parentEl, 'scrollHeight', { value: 100000, writable: true });
    Object.defineProperty(parentEl, 'clientHeight', { value: 800, writable: true });

    const api = initPreview(previewEl);

    bench('Render 5,000 lines of complex Markdown (real-time editor latency)', () => {
      api.renderMarkdown(largeMarkdown);
    });

    bench('Render small standard Markdown document (keystroke latency)', () => {
      api.renderMarkdown('# Header\nSome regular **text** on keypress.');
    });
  });

  // ---- 2. Word Count Extraction Benchmark ----
  describe('Word Count Engine Speed', () => {
    // Word count calculation logic used on keypress
    const countWords = (text) => {
      return text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
    };

    bench('Calculate word count on massive 5,000-line document', () => {
      countWords(largeMarkdown);
    });
  });

  // ---- 3. Theme Customization Switching Benchmark ----
  describe('Theme Engine CSS Application', () => {
    // Mock theme dropdown DOM elements to prevent querySelectorAll crashes
    document.body.innerHTML = `
      <div id="theme-menu">
        <button class="dropdown-item" data-theme="snow">Snow</button>
        <button class="dropdown-item" data-theme="onyx">Onyx</button>
        <button class="dropdown-item" data-theme="gruvbox-dark">Gruvbox Dark</button>
      </div>
    `;

    initThemes(null);

    bench('Switch themes (snow <-> onyx)', () => {
      applyTheme('onyx');
      applyTheme('snow');
    });
  });
});
