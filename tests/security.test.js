// ========================================
// Feather MD -- Security Regression Tests
// ========================================
// Validates that security audit fixes (SEC-01, SEC-02, SEC-03, PERF-01)
// remain in place and no regressions are introduced.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const LIB_RS_PATH = resolve(__dirname, '../src-tauri/src/lib.rs');
const TAURI_CONF_PATH = resolve(__dirname, '../src-tauri/tauri.conf.json');
const MAIN_JS_PATH = resolve(__dirname, '../src/main.js');
const EDITOR_JS_PATH = resolve(__dirname, '../src/editor/editor.js');
const UPDATER_JS_PATH = resolve(__dirname, '../src/platform/updater.js');
const FILE_IO_JS_PATH = resolve(__dirname, '../src/core/file-io.js');

// -- SEC-01 / SEC-02: No unsandboxed file commands --

describe('Security -- SEC-01/SEC-02: No Arbitrary File Access Commands', () => {
  let libRs;

  beforeAll(() => {
    libRs = readFileSync(LIB_RS_PATH, 'utf-8');
  });

  it('should NOT contain a read_file Tauri command', () => {
    // The read_file command was dead code that bypassed Tauri's scoped fs plugin
    expect(libRs).not.toMatch(/fn\s+read_file\s*\(/);
  });

  it('should NOT contain a write_file Tauri command', () => {
    // The write_file command was dead code that bypassed Tauri's scoped fs plugin
    expect(libRs).not.toMatch(/fn\s+write_file\s*\(/);
  });

  it('should NOT register read_file or write_file in invoke_handler', () => {
    expect(libRs).not.toContain('read_file');
    expect(libRs).not.toContain('write_file');
  });

  it('should still register get_initial_file in invoke_handler', () => {
    expect(libRs).toContain('get_initial_file');
  });
});

// -- SEC-03: No global Tauri API exposure --

describe('Security -- SEC-03: No Global Tauri API Exposure', () => {
  let tauriConf;

  beforeAll(() => {
    tauriConf = readFileSync(TAURI_CONF_PATH, 'utf-8');
  });

  it('should have withGlobalTauri set to false', () => {
    const conf = JSON.parse(tauriConf);
    expect(conf.app.withGlobalTauri).toBe(false);
  });

  it('should NOT reference window.__TAURI__ in main.js', () => {
    const mainJs = readFileSync(MAIN_JS_PATH, 'utf-8');
    expect(mainJs).not.toContain('window.__TAURI__');
  });

  it('should NOT reference window.__TAURI_INTERNALS__ in main.js', () => {
    const mainJs = readFileSync(MAIN_JS_PATH, 'utf-8');
    expect(mainJs).not.toContain('window.__TAURI_INTERNALS__');
  });

  it('should NOT reference __TAURI_INTERNALS__ in updater.js', () => {
    const updaterJs = readFileSync(UPDATER_JS_PATH, 'utf-8');
    expect(updaterJs).not.toContain('__TAURI_INTERNALS__');
  });
});

// -- PERF-01: No setInterval polling --

describe('Security -- PERF-01: No setInterval Polling Loops', () => {
  it('should NOT contain setInterval in main.js', () => {
    const mainJs = readFileSync(MAIN_JS_PATH, 'utf-8');
    // Allow the string in comments but not as an actual function call
    const lines = mainJs.split('\n').filter(l => !l.trim().startsWith('//'));
    const nonCommentCode = lines.join('\n');
    expect(nonCommentCode).not.toMatch(/setInterval\s*\(/);
  });

  it('should NOT contain setInterval in editor.js', () => {
    const editorJs = readFileSync(EDITOR_JS_PATH, 'utf-8');
    const lines = editorJs.split('\n').filter(l => !l.trim().startsWith('//'));
    const nonCommentCode = lines.join('\n');
    expect(nonCommentCode).not.toMatch(/setInterval\s*\(/);
  });

  it('should use event-driven cursor updates via onCursorActivity callback', () => {
    const editorJs = readFileSync(EDITOR_JS_PATH, 'utf-8');
    expect(editorJs).toContain('onCursorActivityCallback');
    expect(editorJs).toContain('selectionSet');
  });
});

// -- CODE-01: DRY unsaved changes guard --

describe('Security -- CODE-01: Consolidated Unsaved Changes Guard', () => {
  it('should have a single confirmDiscardChanges function', () => {
    const fileIo = readFileSync(FILE_IO_JS_PATH, 'utf-8');
    const matches = fileIo.match(/function\s+confirmDiscardChanges/g);
    expect(matches).toBeTruthy();
    expect(matches.length).toBe(1);
  });

  it('should use confirmDiscardChanges in openFile', () => {
    const fileIo = readFileSync(FILE_IO_JS_PATH, 'utf-8');
    const openFileFn = fileIo.substring(fileIo.indexOf('async function openFile'));
    expect(openFileFn).toContain('confirmDiscardChanges');
  });

  it('should use confirmDiscardChanges in newFile', () => {
    const fileIo = readFileSync(FILE_IO_JS_PATH, 'utf-8');
    const newFileFn = fileIo.substring(fileIo.indexOf('async function newFile'));
    expect(newFileFn).toContain('confirmDiscardChanges');
  });
});
