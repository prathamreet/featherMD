// ========================================
// Feather MD -- Editor Module Tests (CodeMirror 6)
// ========================================
// Covers: initialization, setValue/getValue, cursor position,
//         line numbers toggle, line wrapping toggle, tab size,
//         scroll ratio API, onCursorActivity callback

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initEditor } from '../../src/editor/editor.js';

// -- Initialization & API Surface --

describe('Editor -- Initialization', () => {
  let container, api;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    api = initEditor(container, vi.fn());
  });

  afterEach(() => {
    container.remove();
  });

  it('should return an API object with all expected methods', () => {
    expect(api).toBeTruthy();
    expect(typeof api.getValue).toBe('function');
    expect(typeof api.setValue).toBe('function');
    expect(typeof api.getScrollRatio).toBe('function');
    expect(typeof api.setScrollRatio).toBe('function');
    expect(typeof api.getCursorPosition).toBe('function');
    expect(typeof api.setLineNumbers).toBe('function');
    expect(typeof api.setLineWrapping).toBe('function');
    expect(typeof api.setTabSize).toBe('function');
    expect(typeof api.setVimMode).toBe('function');
    expect(typeof api.focus).toBe('function');
    expect(typeof api.getScrollDOM).toBe('function');

  });

  it('should mount a CodeMirror editor inside the container', () => {
    // CodeMirror creates a .cm-editor element
    expect(container.querySelector('.cm-editor')).toBeTruthy();
  });

  it('should start with empty document', () => {
    expect(api.getValue()).toBe('');
  });



  it('should return a valid scrollDOM element', () => {
    const scrollDOM = api.getScrollDOM();
    expect(scrollDOM).toBeTruthy();
    expect(scrollDOM instanceof HTMLElement).toBe(true);
  });
});

// -- Content Management --

describe('Editor -- Content Management (setValue/getValue)', () => {
  let container, api;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    api = initEditor(container, vi.fn());
  });

  afterEach(() => {
    container.remove();
  });

  it('should set content via setValue', () => {
    api.setValue('# Hello World');
    expect(api.getValue()).toBe('# Hello World');
  });

  it('should replace existing content on setValue', () => {
    api.setValue('First content');
    api.setValue('Replaced content');
    expect(api.getValue()).toBe('Replaced content');
  });

  it('should handle empty string setValue', () => {
    api.setValue('Some content');
    api.setValue('');
    expect(api.getValue()).toBe('');
  });

  it('should handle multi-line content', () => {
    const content = '# Title\n\nParagraph one.\n\nParagraph two.';
    api.setValue(content);
    expect(api.getValue()).toBe(content);
  });

  it('should handle special characters', () => {
    const content = 'Special: <>&"\'`${} and unicode: \u00e9\u00e8\u00ea\u00f1\u00fc';
    api.setValue(content);
    expect(api.getValue()).toBe(content);
  });

  it('should handle large content', () => {
    const largeContent = 'Line\n'.repeat(5000);
    api.setValue(largeContent);
    expect(api.getValue()).toBe(largeContent);
  });
});

// -- Cursor Position --

describe('Editor -- Cursor Position', () => {
  let container, api;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    api = initEditor(container, vi.fn());
  });

  afterEach(() => {
    container.remove();
  });

  it('should return line 1, col 1 for empty document', () => {
    const pos = api.getCursorPosition();
    expect(pos.line).toBe(1);
    expect(pos.col).toBe(1);
  });

  it('should return correct position after setting content', () => {
    api.setValue('Hello');
    // After setValue, cursor should be at end or start depending on implementation
    const pos = api.getCursorPosition();
    expect(pos.line).toBeGreaterThanOrEqual(1);
    expect(pos.col).toBeGreaterThanOrEqual(1);
  });
});

// -- Dynamic Reconfiguration --

describe('Editor -- Dynamic Reconfiguration', () => {
  let container, api;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    api = initEditor(container, vi.fn());
  });

  afterEach(() => {
    container.remove();
  });

  it('should toggle line numbers on without error', () => {
    expect(() => api.setLineNumbers(true)).not.toThrow();
  });

  it('should toggle line numbers off without error', () => {
    expect(() => api.setLineNumbers(false)).not.toThrow();
  });

  it('should toggle line wrapping on without error', () => {
    expect(() => api.setLineWrapping(true)).not.toThrow();
  });

  it('should toggle line wrapping off without error', () => {
    expect(() => api.setLineWrapping(false)).not.toThrow();
  });

  it('should change tab size to 2 without error', () => {
    expect(() => api.setTabSize(2)).not.toThrow();
  });

  it('should change tab size to 4 without error', () => {
    expect(() => api.setTabSize(4)).not.toThrow();
  });

  it('should survive rapid reconfiguration', () => {
    expect(() => {
      for (let i = 0; i < 10; i++) {
        api.setLineNumbers(i % 2 === 0);
        api.setLineWrapping(i % 2 === 1);
        api.setTabSize(i % 2 === 0 ? 2 : 4);
      }
    }).not.toThrow();
  });
});

// -- onCursorActivity Callback --

describe('Editor -- onCursorActivity Callback (PERF-01)', () => {
  it('should accept onCursorActivity as third parameter without error', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const spy = vi.fn();
    expect(() => initEditor(container, vi.fn(), spy)).not.toThrow();
    container.remove();
  });

  it('should accept null onCursorActivity without error', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    expect(() => initEditor(container, vi.fn(), null)).not.toThrow();
    container.remove();
  });

  it('should accept no third parameter at all', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    expect(() => initEditor(container, vi.fn())).not.toThrow();
    container.remove();
  });
});

// -- Scroll Ratio API --

describe('Editor -- Scroll Ratio API', () => {
  let container, api;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    api = initEditor(container, vi.fn());
  });

  afterEach(() => {
    container.remove();
  });

  it('should return 0 scroll ratio for empty document', () => {
    expect(api.getScrollRatio()).toBe(0);
  });

  it('should not throw when setting scroll ratio', () => {
    expect(() => api.setScrollRatio(0.5)).not.toThrow();
  });

  it('should not throw when setting scroll ratio to 0', () => {
    expect(() => api.setScrollRatio(0)).not.toThrow();
  });

  it('should not throw when setting scroll ratio to 1', () => {
    expect(() => api.setScrollRatio(1)).not.toThrow();
  });
});
