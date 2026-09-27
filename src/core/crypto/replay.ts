/**
 * Replay protection for Crow messenger.
 *
 * Tracks seen (messageId, nonce) pairs to prevent replay attacks.
 * Uses a SHA-256 hash of the pair as the cache key and supports
 * time-based pruning to bound memory usage.
 */

import { sha256 } from '@noble/hashes/sha256';

/** Maximum age (ms) for entries before they are eligible for pruning. */
export const MAX_REPLAY_CACHE_AGE = 86_400_000; // 24 hours

/** Internal entry tracking when a hash was first seen. */
interface CacheEntry {
  hash: string;
  seenAt: number;
}

/**
 * ReplayGuard tracks previously-seen (messageId, nonce) pairs
 * and rejects duplicates.
 */
export class ReplayGuard {
  /** Set of SHA-256 hex hashes for fast O(1) lookup. */
  private seen: Set<string>;

  /** Ordered list of entries for time-based pruning. */
  private entries: CacheEntry[];

  constructor() {
    this.seen = new Set();
    this.entries = [];
  }

  /**
   * Check whether a (messageId, nonce) pair has already been seen.
   *
   * @param messageId - Unique message identifier.
   * @param nonce     - Message nonce bytes.
   * @returns `true` if the pair is new (not a replay), `false` if already seen.
   */
  check(messageId: string, nonce: Uint8Array): boolean {
    const hash = this.computeHash(messageId, nonce);
    return !this.seen.has(hash);
  }

  /**
   * Record a (messageId, nonce) pair as seen.
   *
   * Call this after `check()` returns `true` to permanently
   * record the pair (until pruning removes it).
   *
   * @param messageId - Unique message identifier.
   * @param nonce     - Message nonce bytes.
   */
  add(messageId: string, nonce: Uint8Array): void {
    const hash = this.computeHash(messageId, nonce);
    if (!this.seen.has(hash)) {
      this.seen.add(hash);
      this.entries.push({ hash, seenAt: Date.now() });
    }
  }

  /**
   * Remove entries older than `maxAge` milliseconds.
   *
   * @param maxAge - Age threshold in ms (defaults to `MAX_REPLAY_CACHE_AGE`).
   */
  prune(maxAge: number = MAX_REPLAY_CACHE_AGE): void {
    const cutoff = Date.now() - maxAge;
    while (this.entries.length > 0 && this.entries[0]!.seenAt < cutoff) {
      const entry = this.entries.shift()!;
      this.seen.delete(entry.hash);
    }
  }

  // ── Internal ──────────────────────────────────────────────────

  /** Compute the SHA-256 hash of `messageId ‖ nonce` as a hex string. */
  private computeHash(messageId: string, nonce: Uint8Array): string {
    const msgBytes = new TextEncoder().encode(messageId);
    const data = new Uint8Array(msgBytes.length + nonce.length);
    data.set(msgBytes, 0);
    data.set(nonce, msgBytes.length);
    const hash = sha256(data);
    return bytesToHex(hash);
  }
}

// ── Utility ─────────────────────────────────────────────────────────

/** Convert a Uint8Array to a lowercase hex string. */
function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i]!.toString(16).padStart(2, '0');
  }
  return hex;
}
