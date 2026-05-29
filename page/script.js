/* ==========================================================================
   FEATHER MD LANDING PAGE — MAIN COORDINATOR SCRIPT (VANILLA JS MODULE)
   ========================================================================== */

import { compileMarkdown } from './modules/compiler.js';
import { applyTheme, detectOSPreference } from './modules/theme.js';
import { initDropdownMenus } from './modules/menu.js';
import { initAmbientGlowParallax, initBenchmarkReveal } from './modules/effects.js';
import {
  initWorkspaceResizer,
  initSynchronizedScrolling,
  initCursorTracker,
  initFontSizeAdjustment
} from './modules/editor.js';

document.addEventListener('DOMContentLoaded', () => {
  
  // 1. Initial State & Configuration Template
  const INITIAL_DOC = `# Feather MD — Pure Performance Markdown

Welcome to the live interactive demo of **Feather MD**. This editor is running entirely in your browser using high-performance, vanilla JavaScript to simulate the native experience.

Try typing here! The preview on the right will update in real-time.

## The Cold Start Rule
Feather MD is built for writers who value speed and efficiency. We believe your tools should never make you wait.

- Cold start: **< 100ms** from double-click to ready
- Installer size: **< 10MB** (Tauri 2 + Rust)
- Runtime memory: **< 60MB RAM** even with a 10,000-word file
- CPU usage: **< 1%** at idle

## Choose Your Aesthetic
Feather MD comes with 10 custom-designed, high-contrast themes. Go to **Style > Theme** in the toolbar above, or click the theme cards in the landing page below to watch the entire interface repaint instantly in \`< 16ms\`.

| Theme Name | Tone | Aesthetic |
| :--- | :--- | :--- |
| snow | Light | Clean, pure white |
| sepia | Light | Warm beige, easy on eyes |
| onyx | Dark | Pitch black, high contrast |
| solarized | Mixed | Classic warm developer palette |
| gruvbox | Mixed | Retro analog vibes |

## Developer Integration
Run it from your terminal or double-click any markdown file. The installer automatically registers system-wide file associations:

\`\`\`bash
# Open any file instantly
feathermd .\\release-notes.md

# Open in background
feathermd -b draft.md
\`\`\`

> "Design is not just what it looks like and feels like. Design is how it works."
— Steve Jobs

Give it a spin. Type some markdown, drag the center divider to resize, adjust the font size, or check out the features below.`;

  const state = {
    currentTheme: 'onyx',
    syncScrollActive: true,
    wordWrapActive: true,
    lineNumbersActive: true
  };

  // DOM Node Collections
  const htmlEl = document.documentElement;
  const ambientGlow = document.getElementById('ambient-glow');
  const demoEditor = document.getElementById('demo-editor');
  const demoPreview = document.getElementById('demo-preview');
  const demoEditorPane = document.getElementById('demo-editor-pane');
  const demoPreviewPane = document.getElementById('demo-preview-pane');
  const lineNumbersCol = document.getElementById('line-numbers-col');
  const demoDivider = document.getElementById('demo-divider');
  const demoWorkspace = document.getElementById('editor-workspace');
  
  // Status Bar Elements
  const statusWords = document.getElementById('status-words');
  const statusCursor = document.getElementById('status-cursor');
  
  // Font Size Slider
  const sliderFontSize = document.getElementById('slider-font-size');
  const lblFontSize = document.getElementById('lbl-font-size');

  // Toggle buttons
  const btnToggleSync = document.getElementById('btn-toggle-sync');
  const btnToggleLines = document.getElementById('btn-toggle-lines');
  const btnToggleWrap = document.getElementById('btn-toggle-wrap');
  const btnFontMono = document.getElementById('btn-font-mono');

  // Action buttons
  const btnDemoNew = document.getElementById('btn-demo-new');
  const btnDemoReset = document.getElementById('btn-demo-reset');
  const btnDemoPrint = document.getElementById('btn-demo-print');

  // Theme components
  const themeButtons = document.querySelectorAll('.theme-select-btn');
  const themeShowcaseCards = document.querySelectorAll('.theme-card');
  const menuButtons = document.querySelectorAll('.editor-menu-btn');
  const menuPanels = document.querySelectorAll('.editor-menu-panel');

  // 2. Render & Sync GFM compilation
  function updatePreview() {
    const md = demoEditor.value;
    
    // Live Word Counter
    const wordCount = md.trim() === '' ? 0 : md.trim().split(/\s+/).length;
    statusWords.textContent = `${wordCount} word${wordCount === 1 ? '' : 's'}`;
    
    // Compile GFM text and inject HTML
    demoPreview.innerHTML = compileMarkdown(md);
    
    // Refresh Line Numbers Column
    if (state.lineNumbersActive) {
      const lineCount = md.split('\n').length;
      let lineHtml = '';
      for (let i = 1; i <= lineCount; i++) {
        lineHtml += `<div>${i}</div>`;
      }
      lineNumbersCol.innerHTML = lineHtml;
    }
  }

  // 3. Module Bootstrapping & Initializations
  initWorkspaceResizer(demoDivider, demoWorkspace, demoEditorPane, demoPreviewPane);
  const triggerScroll = initSynchronizedScrolling(demoEditor, demoPreviewPane, lineNumbersCol, state);
  const triggerCursor = initCursorTracker(demoEditor, statusCursor);
  initFontSizeAdjustment(sliderFontSize, lblFontSize, demoEditor, demoPreview, lineNumbersCol);
  initDropdownMenus(menuButtons, menuPanels);
  initAmbientGlowParallax(ambientGlow);


  // 4. Bind Toggle Actions
  btnToggleSync.addEventListener('click', () => {
    state.syncScrollActive = !state.syncScrollActive;
    btnToggleSync.classList.toggle('checked', state.syncScrollActive);
    btnToggleSync.querySelector('.check-icon').textContent = state.syncScrollActive ? '✓' : '';
    if (state.syncScrollActive) triggerScroll('editor');
  });

  btnToggleLines.addEventListener('click', () => {
    state.lineNumbersActive = !state.lineNumbersActive;
    btnToggleLines.classList.toggle('checked', state.lineNumbersActive);
    btnToggleLines.querySelector('.check-icon').textContent = state.lineNumbersActive ? '✓' : '';
    lineNumbersCol.style.display = state.lineNumbersActive ? 'block' : 'none';
    updatePreview();
  });

  btnToggleWrap.addEventListener('click', () => {
    state.wordWrapActive = !state.wordWrapActive;
    btnToggleWrap.classList.toggle('checked', state.wordWrapActive);
    btnToggleWrap.querySelector('.check-icon').textContent = state.wordWrapActive ? '✓' : '';
    demoEditor.setAttribute('wrap', state.wordWrapActive ? 'soft' : 'off');
  });

  // Style Submenus Bindings
  const btnFontSans = document.getElementById('btn-font-sans');
  const btnTab2 = document.getElementById('btn-tab-2');
  const btnTab4 = document.getElementById('btn-tab-4');

  if (btnFontMono && btnFontSans) {
    btnFontMono.addEventListener('click', () => {
      btnFontMono.classList.add('checked');
      btnFontMono.querySelector('.check-icon').textContent = '✓';
      btnFontSans.classList.remove('checked');
      btnFontSans.querySelector('.check-icon').textContent = '';
      
      demoEditor.style.fontFamily = "'JetBrains Mono', monospace";
      demoPreview.style.fontFamily = "'Inter', sans-serif";
    });

    btnFontSans.addEventListener('click', () => {
      btnFontSans.classList.add('checked');
      btnFontSans.querySelector('.check-icon').textContent = '✓';
      btnFontMono.classList.remove('checked');
      btnFontMono.querySelector('.check-icon').textContent = '';
      
      demoEditor.style.fontFamily = "monospace";
      demoPreview.style.fontFamily = "monospace";
    });
  }

  if (btnTab2 && btnTab4) {
    btnTab2.addEventListener('click', () => {
      btnTab2.classList.add('checked');
      btnTab2.querySelector('.check-icon').textContent = '✓';
      btnTab4.classList.remove('checked');
      btnTab4.querySelector('.check-icon').textContent = '';
      
      demoEditor.style.tabSize = '2';
    });

    btnTab4.addEventListener('click', () => {
      btnTab4.classList.add('checked');
      btnTab4.querySelector('.check-icon').textContent = '✓';
      btnTab2.classList.remove('checked');
      btnTab2.querySelector('.check-icon').textContent = '';
      
      demoEditor.style.tabSize = '4';
    });
  }

  // 5. Bind Document actions (With Simulated Native Modals)
  const modalShortcuts = document.getElementById('shortcuts-modal');
  const modalUnsaved = document.getElementById('unsaved-dialog');
  const modalAbout = document.getElementById('about-dialog');
  
  const btnCloseShortcuts = document.getElementById('btn-close-shortcuts');
  const btnCloseAbout = document.getElementById('btn-close-about');
  
  const btnHelpShortcuts = document.getElementById('btn-demo-shortcuts');
  const btnHelpAbout = document.getElementById('btn-demo-about');

  // Trigger modal overlays
  if (btnHelpShortcuts) {
    btnHelpShortcuts.addEventListener('click', () => {
      modalShortcuts.removeAttribute('hidden');
    });
  }
  if (btnHelpAbout) {
    btnHelpAbout.addEventListener('click', () => {
      modalAbout.removeAttribute('hidden');
    });
  }
  if (btnCloseShortcuts) {
    btnCloseShortcuts.addEventListener('click', () => {
      modalShortcuts.setAttribute('hidden', '');
    });
  }
  if (btnCloseAbout) {
    btnCloseAbout.addEventListener('click', () => {
      modalAbout.setAttribute('hidden', '');
    });
  }

  // Dismiss modal overlays on click outside
  [modalShortcuts, modalAbout, modalUnsaved].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.setAttribute('hidden', '');
      });
    }
  });

  // Global Hotkey (Ctrl + / or Ctrl + ?) to toggle Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && (e.key === '?' || e.key === '/')) {
      e.preventDefault();
      const isHidden = modalShortcuts.hasAttribute('hidden');
      if (isHidden) {
        modalShortcuts.removeAttribute('hidden');
      } else {
        modalShortcuts.setAttribute('hidden', '');
      }
    }
  });

  // Safe Document Actions with Unsaved warning prompts
  btnDemoNew.addEventListener('click', () => {
    const isModified = demoEditor.value.trim() !== '' && demoEditor.value !== INITIAL_DOC;
    if (isModified) {
      modalUnsaved.removeAttribute('hidden');
      
      const onSave = () => {
        modalUnsaved.setAttribute('hidden', '');
        demoEditor.value = '';
        updatePreview();
        triggerCursor();
        demoEditor.focus();
        cleanup();
      };
      const onDiscard = () => {
        modalUnsaved.setAttribute('hidden', '');
        demoEditor.value = '';
        updatePreview();
        triggerCursor();
        demoEditor.focus();
        cleanup();
      };
      const onCancel = () => {
        modalUnsaved.setAttribute('hidden', '');
        cleanup();
      };
      const cleanup = () => {
        document.getElementById('unsaved-btn-save').removeEventListener('click', onSave);
        document.getElementById('unsaved-btn-discard').removeEventListener('click', onDiscard);
        document.getElementById('unsaved-btn-cancel').removeEventListener('click', onCancel);
      };
      
      document.getElementById('unsaved-btn-save').addEventListener('click', onSave);
      document.getElementById('unsaved-btn-discard').addEventListener('click', onDiscard);
      document.getElementById('unsaved-btn-cancel').addEventListener('click', onCancel);
    } else {
      demoEditor.value = '';
      updatePreview();
      triggerCursor();
      demoEditor.focus();
    }
  });

  btnDemoReset.addEventListener('click', () => {
    const isModified = demoEditor.value.trim() !== '' && demoEditor.value !== INITIAL_DOC;
    if (isModified) {
      modalUnsaved.removeAttribute('hidden');
      
      const onSave = () => {
        modalUnsaved.setAttribute('hidden', '');
        demoEditor.value = INITIAL_DOC;
        updatePreview();
        triggerCursor();
        cleanup();
      };
      const onDiscard = () => {
        modalUnsaved.setAttribute('hidden', '');
        demoEditor.value = INITIAL_DOC;
        updatePreview();
        triggerCursor();
        cleanup();
      };
      const onCancel = () => {
        modalUnsaved.setAttribute('hidden', '');
        cleanup();
      };
      const cleanup = () => {
        document.getElementById('unsaved-btn-save').removeEventListener('click', onSave);
        document.getElementById('unsaved-btn-discard').removeEventListener('click', onDiscard);
        document.getElementById('unsaved-btn-cancel').removeEventListener('click', onCancel);
      };
      
      document.getElementById('unsaved-btn-save').addEventListener('click', onSave);
      document.getElementById('unsaved-btn-discard').addEventListener('click', onDiscard);
      document.getElementById('unsaved-btn-cancel').addEventListener('click', onCancel);
    } else {
      demoEditor.value = INITIAL_DOC;
      updatePreview();
      triggerCursor();
    }
  });

  btnDemoPrint.addEventListener('click', () => {
    window.print();
  });



  // 6. Bind Custom Theme Engine Switching
  function handleThemeChange(themeName) {
    applyTheme(themeName, htmlEl, themeButtons, themeShowcaseCards);
    state.currentTheme = themeName;
  }

  themeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.getAttribute('data-theme');
      handleThemeChange(theme);
    });
  });

  themeShowcaseCards.forEach(card => {
    card.addEventListener('click', () => {
      const theme = card.getAttribute('data-target-theme');
      handleThemeChange(theme);
      
      // Smooth viewport locking back to mock editor to display repaint instantly
      document.getElementById('editor-section').scrollIntoView({ behavior: 'smooth' });
    });
  });

  // 7. Kickstart App Load Frame
  demoEditor.value = INITIAL_DOC;
  const initialTheme = detectOSPreference(htmlEl, themeButtons, themeShowcaseCards);
  state.currentTheme = initialTheme;
  updatePreview();
  triggerCursor();
  
  // Bind direct textarea typing compiler updates
  demoEditor.addEventListener('input', () => {
    updatePreview();
  });
});
