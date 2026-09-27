/**
 * Byte-level utilities for Crow.
 *
 * All cryptographic data flows through these helpers so that
 * encoding mismatches are confined to a single file.
 */

// ── Hex ─────────────────────────────────────────────────────────

/** Convert a byte array to a lowercase hex string. */
export function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

/** Convert a hex string (with or without `0x` prefix) to a byte array. */
export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) {
    throw new Error('hexToBytes: odd-length hex string');
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// ── Base64 (standard) ───────────────────────────────────────────

/** Encode a byte array as standard Base64 (with `+` and `/`). */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Decode a standard Base64 string to a byte array. */
export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ── Base64url ───────────────────────────────────────────────────

/** Encode a byte array as Base64url (no padding, URL-safe). */
export function bytesToBase64url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Decode a Base64url string to a byte array. */
export function base64urlToBytes(b64url: string): Uint8Array {
  // Restore standard Base64 padding / characters.
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4;
  if (pad === 2) b64 += '==';
  else if (pad === 3) b64 += '=';
  return base64ToBytes(b64);
}

// ── Concatenation / comparison ──────────────────────────────────

/** Concatenate multiple byte arrays into a single `Uint8Array`. */
export function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
}

/**
 * Constant-time byte comparison.
 *
 * Always compares the full length regardless of where the first
 * difference occurs, to avoid timing side-channels.
 */
export function areEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

/**
 * Overwrite a byte array with zeros.
 *
 * Use this to clear sensitive material (keys, plaintext) from memory
 * as soon as it is no longer needed.
 */
export function zeroMemory(bytes: Uint8Array): void {
  bytes.fill(0);
}

// ── Random ──────────────────────────────────────────────────────

/** Generate `nBytes` cryptographically random bytes and return as hex. */
export function randomHex(nBytes: number): string {
  const bytes = new Uint8Array(nBytes);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}
