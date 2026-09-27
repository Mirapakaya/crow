/**
 * Relay URL normalization and validation utilities.
 * All Crow relay URLs must use the `wss://` scheme.
 */

/**
 * Normalize a relay URL:
 * - Ensure `wss://` scheme (upgrade `ws://` or bare hosts)
 * - Trim trailing slashes
 * - Lowercase the hostname portion
 */
export function normalizeRelayUrl(url: string): string {
  let normalized = url.trim();

  // Add scheme if missing
  if (!normalized.startsWith('wss://') && !normalized.startsWith('ws://')) {
    normalized = `wss://${normalized}`;
  }

  // Upgrade ws:// to wss://
  if (normalized.startsWith('ws://')) {
    normalized = `wss://${normalized.slice(5)}`;
  }

  // Trim trailing slashes
  normalized = normalized.replace(/\/+$/, '');

  // Lowercase the hostname (everything between wss:// and the first / or end)
  const afterScheme = normalized.slice(6); // after "wss://"
  const slashIdx = afterScheme.indexOf('/');
  if (slashIdx === -1) {
    normalized = `wss://${afterScheme.toLowerCase()}`;
  } else {
    const host = afterScheme.slice(0, slashIdx).toLowerCase();
    const rest = afterScheme.slice(slashIdx);
    normalized = `wss://${host}${rest}`;
  }

  return normalized;
}

/**
 * Validate that a URL is a proper relay URL.
 * Must use `wss://` and contain a valid hostname.
 */
export function validateRelayUrl(url: string): boolean {
  try {
    const normalized = normalizeRelayUrl(url);
    const parsed = new URL(normalized);

    if (parsed.protocol !== 'wss:') return false;

    const hostname = parsed.hostname;
    if (!hostname || hostname.length === 0) return false;

    // Basic hostname check: at least one dot or is 'localhost'
    if (hostname !== 'localhost' && !hostname.includes('.')) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Quick check if a string looks like a relay URL.
 * Less strict than `validateRelayUrl` — suitable for UI hints.
 */
export function isRelayUrl(url: string): boolean {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  return trimmed.startsWith('wss://') || trimmed.startsWith('ws://');
}
