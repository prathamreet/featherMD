/* ==========================================================================
   FEATHER MD LANDING PAGE — EDITOR WORKSPACE MODULE
   ========================================================================== */

/**
 * Initializes resizer divider dragging mechanics with strict bounds constraints.
 */
export function initWorkspaceResizer(demoDivider, demoWorkspace, demoEditorPane, demoPreviewPane) {
  let isResizing = false;

  demoDivider.addEventListener('mousedown', (e) => {
    isResizing = true;
    demoDivider.classList.add('active');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    
    const containerRect = demoWorkspace.getBoundingClientRect();
    const relativeX = e.clientX - containerRect.left;
    let percentage = (relativeX / containerRect.width) * 100;
    
    // Bounds constraints (PRD: minimum 20%, maximum 80%)
    if (percentage < 20) percentage = 20;
    if (percentage > 80) percentage = 80;
    
    demoEditorPane.style.width = `${percentage}%`;
    demoPreviewPane.style.width = `${100 - percentage}%`;
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      demoDivider.classList.remove('active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });

  // Double-click resets back to 50/50 split
  demoDivider.addEventListener('dblclick', () => {
    demoEditorPane.style.width = '50%';
    demoPreviewPane.style.width = '50%';
  });

  // Touch support for mobile layouts
  demoDivider.addEventListener('touchstart', () => {
    isResizing = true;
  });

  document.addEventListener('touchmove', (e) => {
    if (!isResizing) return;
    const touch = e.touches[0];
    const containerRect = demoWorkspace.getBoundingClientRect();
    const relativeX = touch.clientX - containerRect.left;
    let percentage = (relativeX / containerRect.width) * 100;
    if (percentage < 20) percentage = 20;
    if (percentage > 80) percentage = 80;
    demoEditorPane.style.width = `${percentage}%`;
    demoPreviewPane.style.width = `${100 - percentage}%`;
  });

  document.addEventListener('touchend', () => {
    isResizing = false;
  });
}

/**
 * Attaches synchronized scroll locks between the text editor and preview containers.
 */
export function initSynchronizedScrolling(demoEditor, demoPreviewPane, lineNumbersCol, state) {
  let scrollSource = null;

  function handleScroll(source) {
    if (!state.syncScrollActive) return;
    if (scrollSource && scrollSource !== source) return;
    
    scrollSource = source;

    if (source === 'editor') {
      const scrollRatio = demoEditor.scrollTop / (demoEditor.scrollHeight - demoEditor.clientHeight);
      demoPreviewPane.scrollTop = scrollRatio * (demoPreviewPane.scrollHeight - demoPreviewPane.clientHeight);
      lineNumbersCol.scrollTop = demoEditor.scrollTop;
    } else {
      const scrollRatio = demoPreviewPane.scrollTop / (demoPreviewPane.scrollHeight - demoPreviewPane.clientHeight);
      demoEditor.scrollTop = scrollRatio * (demoEditor.scrollHeight - demoEditor.clientHeight);
      lineNumbersCol.scrollTop = demoEditor.scrollTop;
    }

    clearTimeout(window.scrollTimer);
    window.scrollTimer = setTimeout(() => {
      scrollSource = null;
    }, 100);
  }

  demoEditor.addEventListener('scroll', () => handleScroll('editor'), { passive: true });
  demoPreviewPane.addEventListener('scroll', () => handleScroll('preview'), { passive: true });

  return handleScroll;
}

/**
 * Tracks and prints line/column cursor status indexes.
 */
export function initCursorTracker(demoEditor, statusCursor) {
  function updateCursorStatus() {
    const cursorIdx = demoEditor.selectionStart;
    const preCursor = demoEditor.value.substring(0, cursorIdx);
    const lines = preCursor.split('\n');
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;
    statusCursor.textContent = `Ln ${line}, Col ${col}`;
  }

  demoEditor.addEventListener('keyup', updateCursorStatus);
  demoEditor.addEventListener('click', updateCursorStatus);
  demoEditor.addEventListener('focus', updateCursorStatus);

  return updateCursorStatus;
}

/**
 * Handles font size range changes and line height resizing adjustments.
 */
export function initFontSizeAdjustment(sliderFontSize, lblFontSize, demoEditor, demoPreview, lineNumbersCol) {
  sliderFontSize.addEventListener('input', () => {
    const size = sliderFontSize.value;
    lblFontSize.textContent = `${size}px`;
    demoEditor.style.fontSize = `${size}px`;
    demoPreview.style.fontSize = `${size}px`;
    lineNumbersCol.style.fontSize = `${size}px`;
    
    // Recalculate heights for scroll sync line sizes
    const divs = lineNumbersCol.querySelectorAll('div');
    const height = size * 1.714;
    divs.forEach(d => {
      d.style.lineHeight = `${height}px`;
    });
  });
}
