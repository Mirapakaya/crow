/**
 * Safety number computation for Crow messenger.
 *
 * Computes a human-readable 60-digit grouped safety number
 * (similar to Signal's verification number) from two public keys.
 * The fingerprint is SHA-256 truncated to 30 bytes, then each
 * byte group is encoded as 5-digit decimal groups.
 */

import { sha256 } from "@noble/hashes/sha256";

/**
 * Compute the raw 32-byte safety number fingerprint.
 *
 * The hash input is the sorted concatenation of the two public keys,
 * ensuring the result is order-independent:
 *   SHA-256(min(pub1, pub2) ‖ max(pub1, pub2))
 *
 * @param localPubKey  - Local user's public key bytes.
 * @param remotePubKey - Remote user's public key bytes.
 * @returns 32-byte SHA-256 hash.
 */
export function computeSafetyNumberFingerprint(
  localPubKey: Uint8Array,
  remotePubKey: Uint8Array,
): Uint8Array {
  // Sort keys so the fingerprint is the same regardless of who computes it.
  const [first, second] = compareBytes(localPubKey, remotePubKey) <= 0
    ? [localPubKey, remotePubKey]
    : [remotePubKey, localPubKey];

  const combined = new Uint8Array(first.length + second.length);
  combined.set(first, 0);
  combined.set(second, first.length);

  return sha256(combined);
}

/**
 * Compute a 60-digit grouped safety number for verification.
 *
 * Takes the first 30 bytes of the SHA-256 fingerprint and encodes
 * each byte as a 3-digit decimal number, then groups into 12
 * five-digit groups separated by spaces:
 *
 *   "01234 56789 01234 56789 01234 56789 01234 56789 01234 56789 01234 56789"
 *
 * @param localPubKey  - Local user's public key bytes.
 * @param remotePubKey - Remote user's public key bytes.
 * @returns 60-digit safety number string (5-digit groups, space-separated).
 */
export function computeSafetyNumber(
  localPubKey: Uint8Array,
  remotePubKey: Uint8Array,
): string {
  const fingerprint = computeSafetyNumberFingerprint(localPubKey, remotePubKey);

  // Use first 30 bytes; each byte → 3 digits → 90 digits total.
  // Then group as 12 × 5-digit groups (60 digits) + 6 × 5-digit groups.
  // Signal-style: take 30 bytes → 60 hex chars → chunk into 5-digit groups.
  // We'll use the more standard approach: encode 30 bytes as 60 decimal digits
  // by treating each pair of bytes as a 5-digit number (65536 max → 5 digits).
  const digits: string[] = [];

  for (let i = 0; i < 30; i += 2) {
    // Each pair of bytes → value 0..65535 → zero-padded 5-digit string
    const hi = fingerprint[i] ?? 0;
    const lo = fingerprint[i + 1] ?? 0;
    const value = (hi << 8) | lo;
    digits.push(value.toString().padStart(5, "0"));
  }

  // Group as "XXXXX XXXXX XXXXX XXXXX XXXXX XXXXX XXXXX XXXXX XXXXX XXXXX XXXXX XXXXX"
  return digits.join(" ");
}

// ── Internal ────────────────────────────────────────────────────────

/** Lexicographic comparison of two byte arrays. Returns <0, 0, or >0. */
function compareBytes(a: Uint8Array, b: Uint8Array): number {
  const minLen = Math.min(a.length, b.length);
  for (let i = 0; i < minLen; i++) {
    if (a[i]! < b[i]!) return -1;
    if (a[i]! > b[i]!) return 1;
  }
  return a.length - b.length;
}
