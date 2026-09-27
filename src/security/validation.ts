/**
 * Input validation and sanitization for Crow.
 * Prevents XSS, injection, and malformed data.
 */

/** Validate a Nostr public key (hex, 32 bytes = 64 chars) */
export function isValidPubKey(key: string): boolean {
  return /^[0-9a-f]{64}$/.test(key);
}

/** Validate a Nostr event ID (hex, 32 bytes = 64 chars) */
export function isValidEventId(id: string): boolean {
  return /^[0-9a-f]{64}$/.test(id);
}

/** Validate a relay URL (must be wss://) */
export function isValidRelayUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'wss:' && parsed.hostname.length > 0;
  } catch {
    return false;
  }
}

/** Sanitize HTML — strip all tags, return plain text */
export function sanitizeHtml(input: string): string {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

/** Validate a display name (1-100 chars, no control chars) */
export function isValidDisplayName(name: string): boolean {
  if (name.length < 1 || name.length > 100) return false;
  // eslint-disable-next-line no-control-regex
  return !/[\x00-\x1f\x7f]/.test(name);
}

/** Validate a passphrase (min 8 chars) */
export function isValidPassphrase(passphrase: string): boolean {
  return passphrase.length >= 8;
}

/** Validate a PIN (4-6 digits) */
export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

/** Validate a mnemonic phrase (12 or 24 BIP-39 words) */
export function isValidMnemonicFormat(mnemonic: string): boolean {
  const words = mnemonic.trim().split(/\s+/);
  return words.length === 12 || words.length === 24;
}

/** Check if a URL is safe (no javascript:, data: with script, etc.) */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'javascript:') return false;
    if (parsed.protocol === 'data:' && /script/i.test(url)) return false;
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Validate an attachment MIME type against allowed list */
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'audio/ogg',
  'audio/opus',
  'audio/mp4',
  'audio/mpeg',
  'audio/webm',
  'application/pdf',
  'application/zip',
  'text/plain',
  'application/octet-stream',
]);

export function isAllowedMimeType(mime: string): boolean {
  return ALLOWED_MIME_TYPES.has(mime) || mime.startsWith('image/') || mime.startsWith('audio/');
}

/** Maximum attachment size (50 MB) */
export const MAX_ATTACHMENT_SIZE = 50 * 1024 * 1024;

/** Validate attachment size */
export function isAllowedAttachmentSize(size: number): boolean {
  return size > 0 && size <= MAX_ATTACHMENT_SIZE;
}

/** Validate a file name (no path traversal, no null bytes) */
export function isValidFileName(name: string): boolean {
  if (name.length === 0 || name.length > 255) return false;
  if (name.includes('\0')) return false;
  if (name.includes('..')) return false;
  if (/^[./\\]/.test(name)) return false;
  return true;
}

/** Rate limiter for outgoing messages */
export class RateLimiter {
  private timestamps: number[] = [];
  constructor(
    private maxCount: number,
    private windowMs: number,
  ) {}

  check(): boolean {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);
    if (this.timestamps.length >= this.maxCount) return false;
    this.timestamps.push(now);
    return true;
  }

  reset(): void {
    this.timestamps = [];
  }
}
