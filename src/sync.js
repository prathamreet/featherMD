// ========================================
// Feather MD — Synchronized Scrolling
// ========================================

let editorAPI = null;
let previewAPI = null;
let activeSource = null;
let syncEnabled = true;
let syncing = false;

/**
 * Initialize scroll synchronization between editor and preview
 * @param {Object} editor - Editor API with getScrollRatio/setScrollRatio/getScrollDOM
 * @param {Object} preview - Preview API with getScrollRatio/setScrollRatio/getScrollDOM
 */
export function initScrollSync(editor, preview) {
  editorAPI = editor;
  previewAPI = preview;

  const editorScrollEl = editor.getScrollDOM();
  const previewScrollEl = preview.getScrollDOM();

  // Track which pane the user is interacting with
  editorScrollEl.addEventListener('mouseenter', () => {
    activeSource = 'editor';
  });

  previewScrollEl.addEventListener('mouseenter', () => {
    activeSource = 'preview';
  });

  // Editor scroll → drive preview
  editorScrollEl.addEventListener(
    'scroll',
    () => {
      if (!syncEnabled || syncing || activeSource !== 'editor') return;
      syncing = true;
      const ratio = editor.getScrollRatio();
      preview.setScrollRatio(ratio);
      requestAnimationFrame(() => {
        syncing = false;
      });
    },
    { passive: true }
  );

  // Preview scroll → drive editor
  previewScrollEl.addEventListener(
    'scroll',
    () => {
      if (!syncEnabled || syncing || activeSource !== 'preview') return;
      syncing = true;
      const ratio = preview.getScrollRatio();
      editor.setScrollRatio(ratio);
      requestAnimationFrame(() => {
        syncing = false;
      });
    },
    { passive: true }
  );
}

/**
 * Enable or disable sync scrolling
 */
export function setSyncEnabled(enabled) {
  syncEnabled = enabled;
}

/**
 * Get current sync state
 */
export function isSyncEnabled() {
  return syncEnabled;
}
