/**
 * Human-readable relative time for cache / "Updated …" labels.
 * @param {string|Date} iso
 * @returns {string}
 */
export function formatRelativeTime(iso) {
  if (!iso) return '';
  const d = typeof iso === 'string' || iso instanceof Date ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return '';

  const now = Date.now();
  const t = d.getTime();
  const diffSec = Math.round((now - t) / 1000);
  if (diffSec < 45) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hr ago`;
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)} days ago`;

  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined, hour: 'numeric', minute: '2-digit' });
}
