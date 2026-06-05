// ========================================
// Feather MD - Editor Module (CodeMirror 6)
// ========================================

import { EditorView, lineNumbers, highlightActiveLine, highlightActiveLineGutter, keymap, drawSelection, dropCursor, rectangularSelection, crosshairCursor } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { syntaxHighlighting, indentOnInput, bracketMatching, foldGutter, foldKeymap, indentUnit } from '@codemirror/language';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { closeBrackets, closeBracketsKeymap, autocompletion } from '@codemirror/autocomplete';
import { classHighlighter } from '@lezer/highlight';

// Compartments for dynamic reconfiguration
const lineNumbersCompartment = new Compartment();
const lineWrappingCompartment = new Compartment();
const tabSizeCompartment = new Compartment();

let editorView = null;
let onChangeCallback = null;
let onCursorActivityCallback = null;
let debounceTimer = null;

let isProgrammaticSetting = false;

/**
 * Initialize the CodeMirror 6 editor
 * @param {HTMLElement} domEl - Container element
 * @param {Function} onChange - Callback fired with doc string after 150ms debounce
 * @param {Function} [onCursorActivity] - Callback fired on selection/cursor changes (event-driven, no polling)
 * @returns {Object} Editor API
 */
export function initEditor(domEl, onChange, onCursorActivity) {
  onChangeCallback = onChange;
  onCursorActivityCallback = onCursorActivity || null;

  // Single updateListener handles both doc changes (debounced) and selection
  // changes (event-driven cursor-position updates).
  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      const isProgrammatic = isProgrammaticSetting;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (onChangeCallback) {
          onChangeCallback(update.state.doc.toString(), isProgrammatic);
        }
      }, 150);
    }
    if (update.selectionSet && onCursorActivityCallback) {
      onCursorActivityCallback();
    }
  });

  const state = EditorState.create({
    doc: '',
    extensions: [
      lineNumbersCompartment.of(lineNumbers()),
      lineWrappingCompartment.of(EditorView.lineWrapping),
      tabSizeCompartment.of([EditorState.tabSize.of(4), indentUnit.of('    ')]),
      history(),
      foldGutter(),
      drawSelection(),
      dropCursor(),
      indentOnInput(),
      syntaxHighlighting(classHighlighter, { fallback: true }),
      bracketMatching(),
      closeBrackets(),
      autocompletion(),
      rectangularSelection(),
      crosshairCursor(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      highlightSelectionMatches(),
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        indentWithTab,
      ]),
      updateListener,
      EditorView.theme({
        '&': { height: '100%' },
        '.cm-scroller': { overflow: 'auto' },
      }),
    ],
  });

  editorView = new EditorView({
    state,
    parent: domEl,
  });

  return {
    getValue: () => editorView.state.doc.toString(),
    setValue,
    getScrollRatio,
    setScrollRatio,
    getCursorPosition,
    setLineNumbers,
    setLineWrapping,
    setTabSize,
    focus: () => editorView.focus(),
    getScrollDOM: () => editorView.scrollDOM,
    requestMeasure: () => { if (editorView) editorView.requestMeasure(); },
  };
}

/**
 * Set the editor content (replaces all)
 */
function setValue(text) {
  if (!editorView) return;
  isProgrammaticSetting = true;
  const transaction = editorView.state.update({
    changes: {
      from: 0,
      to: editorView.state.doc.length,
      insert: text,
    },
  });
  editorView.dispatch(transaction);
  isProgrammaticSetting = false;
}

/**
 * Get scroll ratio: scrollTop / (scrollHeight - clientHeight)
 */
function getScrollRatio() {
  if (!editorView) return 0;
  const dom = editorView.scrollDOM;
  const max = dom.scrollHeight - dom.clientHeight;
  return max > 0 ? dom.scrollTop / max : 0;
}

/**
 * Set scroll ratio
 */
function setScrollRatio(ratio) {
  if (!editorView) return;
  const dom = editorView.scrollDOM;
  const max = dom.scrollHeight - dom.clientHeight;
  dom.scrollTop = ratio * max;
}

/**
 * Get cursor line and column
 */
function getCursorPosition() {
  if (!editorView) return { line: 1, col: 1 };
  const pos = editorView.state.selection.main.head;
  const line = editorView.state.doc.lineAt(pos);
  return { line: line.number, col: pos - line.from + 1 };
}

/**
 * Toggle line numbers
 */
function setLineNumbers(show) {
  if (!editorView) return;
  editorView.dispatch({
    effects: lineNumbersCompartment.reconfigure(show ? lineNumbers() : []),
  });
}

/**
 * Toggle line wrapping
 */
function setLineWrapping(wrap) {
  if (!editorView) return;
  editorView.dispatch({
    effects: lineWrappingCompartment.reconfigure(wrap ? EditorView.lineWrapping : []),
  });
}

/**
 * Set tab size
 */
function setTabSize(size) {
  if (!editorView) return;
  editorView.dispatch({
    effects: tabSizeCompartment.reconfigure([
      EditorState.tabSize.of(size),
      indentUnit.of(' '.repeat(size)),
    ]),
  });
}
