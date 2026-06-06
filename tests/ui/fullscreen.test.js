// ========================================
// Feather MD -- Fullscreen Preview Mode Tests
// ========================================
// Covers: enter/exit toggling, body class, active-state tracking, and the
// auto-fading exit hint. The Tauri window call is a no-op outside Tauri
// (isTauri() === false in jsdom), so these run purely on the DOM.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  toggleFullscreen,
  enterFullscreen,
  exitFullscreen,
  isFullscreenActive,
} from '../../src/ui/fullscreen.js';

beforeEach(async () => {
  vi.useFakeTimers();
  // Reset to a known non-fullscreen state between tests.
  await exitFullscreen();
  document.body.className = '';
  const hint = document.getElementById('fullscreen-hint');
  if (hint) hint.remove();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Fullscreen -- Enter / Exit', () => {
  it('should start inactive', () => {
    expect(isFullscreenActive()).toBe(false);
  });

  it('should add the fullscreen-preview class on enter', async () => {
    await enterFullscreen();
    expect(document.body.classList.contains('fullscreen-preview')).toBe(true);
    expect(isFullscreenActive()).toBe(true);
  });

  it('should remove the fullscreen-preview class on exit', async () => {
    await enterFullscreen();
    await exitFullscreen();
    expect(document.body.classList.contains('fullscreen-preview')).toBe(false);
    expect(isFullscreenActive()).toBe(false);
  });

  it('should toggle on then off', async () => {
    await toggleFullscreen();
    expect(isFullscreenActive()).toBe(true);
    await toggleFullscreen();
    expect(isFullscreenActive()).toBe(false);
  });

  it('should be idempotent when entering twice', async () => {
    await enterFullscreen();
    await enterFullscreen();
    expect(isFullscreenActive()).toBe(true);
    await exitFullscreen();
    expect(isFullscreenActive()).toBe(false);
  });
});

describe('Fullscreen -- Exit Hint', () => {
  it('should show a hint element on enter', async () => {
    await enterFullscreen();
    const hint = document.getElementById('fullscreen-hint');
    expect(hint).toBeTruthy();
    expect(hint.classList.contains('show')).toBe(true);
    expect(hint.textContent).toContain('exit fullscreen');
  });

  it('should auto-hide the hint after the timeout', async () => {
    await enterFullscreen();
    vi.advanceTimersByTime(2600);
    const hint = document.getElementById('fullscreen-hint');
    expect(hint.classList.contains('show')).toBe(false);
  });

  it('should hide the hint immediately on exit', async () => {
    await enterFullscreen();
    await exitFullscreen();
    const hint = document.getElementById('fullscreen-hint');
    expect(hint.classList.contains('show')).toBe(false);
  });
});
