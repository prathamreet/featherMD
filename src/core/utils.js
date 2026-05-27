// ========================================
// Feather MD — Shared Utilities
// ========================================

/**
 * Minimal HTML escaper — safe for injecting into innerHTML attributes/text nodes.
 * Uses the browser's own serializer so it is always correct.
 */
export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
