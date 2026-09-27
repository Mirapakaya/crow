/**
 * Time utilities for Crow.
 *
 * All internal timestamps are **Unix milliseconds** unless a
 * function name explicitly says otherwise (`nowSec`, `clampToUnixSeconds`).
 */

/** Current time in Unix milliseconds. */
export function nowMs(): number {
  return Date.now();
}

/** Current time in Unix seconds (truncated). */
export function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Format a Unix-ms timestamp as an ISO 8601 string.
 *
 * @example formatTimestamp(1695800000000) // → "2023-09-27T06:13:20.000Z"
 */
export function formatTimestamp(ms: number): string {
  return new Date(ms).toISOString();
}

/**
 * Check whether a Unix-ms timestamp is in the past.
 *
 * Useful for checking expiry on key packages, tokens, etc.
 */
export function isExpired(timestamp: number): boolean {
  return timestamp < Date.now();
}

/**
 * Return a human-readable "time ago" string for a Unix-ms timestamp.
 *
 * @example timeAgo(Date.now() - 180_000) // → "3 minutes ago"
 */
export function timeAgo(ms: number): string {
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 0) return 'just now';

  const intervals: [number, string][] = [
    [365 * 24 * 3600, 'year'],
    [30 * 24 * 3600, 'month'],
    [7 * 24 * 3600, 'week'],
    [24 * 3600, 'day'],
    [3600, 'hour'],
    [60, 'minute'],
    [1, 'second'],
  ];

  for (const [secs, label] of intervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) {
      return `${count} ${label}${count > 1 ? 's' : ''} ago`;
    }
  }

  return 'just now';
}

/**
 * Ensure a value is a Unix **seconds** timestamp.
 *
 * If the value looks like milliseconds (> 10¹²), divide by 1000
 * and truncate.  Otherwise return as-is.
 *
 * This guards against accidentally mixing ms and s in APIs
 * that expect seconds (e.g. Nostr `created_at`).
 */
export function clampToUnixSeconds(ms: number): number {
  // 10^12 ≈ year 2001 in milliseconds; anything larger is almost certainly ms.
  if (ms > 1e12) {
    return Math.floor(ms / 1000);
  }
  return Math.floor(ms);
}
