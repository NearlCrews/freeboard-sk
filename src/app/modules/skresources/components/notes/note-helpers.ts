/**
 * Shared helpers for the notes UI (list shell, list card, detail panel,
 * related-notes dialog). Centralising them keeps colours, time formatting,
 * and snippet stripping consistent across every notes surface.
 */

const GROUP_PALETTE = [
  '#b66428',
  '#5b7b8b',
  '#8b5e5e',
  '#5e8b6e',
  '#8e7948',
  '#6e5b8b',
  '#8b6e48',
  '#487b8b'
];

const DEFAULT_GROUP_COLOR = 'var(--notes-text-muted)';

export const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Stable colour per group name using a small hash so the same group keeps
 * the same hue across the list, detail, and dialog views.
 */
export function groupColor(name: string | undefined): string {
  if (!name) {
    return DEFAULT_GROUP_COLOR;
  }
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return (
    GROUP_PALETTE[Math.abs(hash) % GROUP_PALETTE.length] ?? DEFAULT_GROUP_COLOR
  );
}

/** Relative time formatter; returns '' if the timestamp is unparseable. */
export function timeAgo(timestamp: string | number | undefined): string {
  if (!timestamp) {
    return '';
  }
  const t = typeof timestamp === 'string' ? Date.parse(timestamp) : timestamp;
  if (isNaN(t)) {
    return '';
  }
  const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return min === 1 ? '1 min ago' : `${min} mins ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr === 1 ? '1 hour ago' : `${hr} hours ago`;
  const day = Math.floor(hr / 24);
  if (day === 1) return 'yesterday';
  if (day < 7) return `${day} days ago`;
  if (day < 30) {
    const w = Math.floor(day / 7);
    return w === 1 ? '1 week ago' : `${w} weeks ago`;
  }
  if (day < 365) {
    const m = Math.floor(day / 30);
    return m === 1 ? '1 month ago' : `${m} months ago`;
  }
  const y = Math.floor(day / 365);
  return y === 1 ? '1 year ago' : `${y} years ago`;
}
