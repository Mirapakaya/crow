/**
 * Simplified sync protocol stub for Crow.
 *
 * Uses a bloom-filter-based approach to determine which event IDs
 * each side is missing. This is NOT a full NIP-77 negentropy
 * implementation — it is a placeholder that can be replaced by a
 * conformant implementation when available.
 */

/** Number of bits in the bloom filter. */
const BLOOM_BITS = 2048;

/** Number of hash functions applied to each element. */
const BLOOM_HASHES = 3;

/** Seed values for simple hash functions. */
const HASH_SEEDS = [0x9e3779b9, 0x85ebca6b, 0xc2b2ae35];

/**
 * Simplified sync protocol for determining missing event IDs
 * between two peers using a bloom filter.
 */
export class NegentropySync {
  /**
   * Create a sync request message containing a bloom filter
   * of the local event IDs.
   *
   * @param localIds - Set of event IDs the local peer possesses.
   * @param since - Unix timestamp; only include IDs created after this time.
   * @returns A serialized sync message (bloom filter bytes).
   */
  public createSyncMessage(localIds: string[], since: number): Uint8Array {
    // In a real implementation, `since` would filter events by created_at.
    // Here we include all IDs for simplicity.
    void since; // reserved for future filtering

    const filter = new Uint8Array(Math.ceil(BLOOM_BITS / 8));

    for (const id of localIds) {
      const positions = this.hashToPositions(id);
      for (const pos of positions) {
        const byteIdx = Math.floor(pos / 8);
        const bitIdx = pos % 8;
        filter[byteIdx] |= (1 << bitIdx);
      }
    }

    return filter;
  }

  /**
   * Handle a received sync message and determine which IDs
   * the remote peer is missing and which both sides share.
   *
   * @param message - The bloom filter bytes from the remote peer.
   * @param localIds - Set of event IDs the local peer possesses.
   * @returns `missing` — IDs the remote peer likely doesn't have;
   *          `have` — IDs both peers likely share.
   */
  public handleSyncMessage(
    message: Uint8Array,
    localIds: string[],
  ): { missing: string[]; have: string[] } {
    const missing: string[] = [];
    const have: string[] = [];

    for (const id of localIds) {
      const positions = this.hashToPositions(id);
      let allPresent = true;

      for (const pos of positions) {
        const byteIdx = Math.floor(pos / 8);
        const bitIdx = pos % 8;

        if (byteIdx >= message.length || !(message[byteIdx] & (1 << bitIdx))) {
          allPresent = false;
          break;
        }
      }

      if (allPresent) {
        have.push(id);
      } else {
        missing.push(id);
      }
    }

    return { missing, have };
  }

  // ── Private helpers ──────────────────────────────────────────────

  /** Map an event ID to BLOOM_HASHES positions in the bloom filter. */
  private hashToPositions(id: string): number[] {
    const positions: number[] = [];

    for (let i = 0; i < BLOOM_HASHES; i++) {
      let hash = HASH_SEEDS[i];
      for (let j = 0; j < id.length; j++) {
        hash = Math.imul(hash ^ id.charCodeAt(j), 0x5bd1e995);
        hash ^= hash >>> 15;
      }
      positions.push(Math.abs(hash) % BLOOM_BITS);
    }

    return positions;
  }
}
