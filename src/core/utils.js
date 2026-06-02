// ========================================
// Feather MD — Shared Utilities
// ========================================

const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * HTML escaper for injecting untrusted strings into innerHTML attributes/text.
 * Pure string replacement — no DOM allocation, no GC churn on rapid calls.
 */
export function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch]);
}
