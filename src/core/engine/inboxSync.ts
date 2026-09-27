import type { RelayEvent, RelayPool } from '../transport';

/** Local storage key for the last sync timestamp. */
const SYNC_TIMESTAMP_KEY = 'crow:inbox:lastSync';

/**
 * Manages incremental synchronization of the user's inbox
 * across relay connections. Deduplicates events and tracks
 * the high-water mark timestamp for future syncs.
 */
export class InboxSync {
  private lastSyncTimestamp = 0;
  private seenEventIds = new Set<string>();

  constructor() {
    // Restore persisted timestamp if available
    this.loadTimestamp();
  }

  /**
   * Fetch and process events since the last sync timestamp.
   * Deduplicates by event ID and updates the high-water mark.
   *
   * @param relayPool - The relay pool to subscribe on.
   * @param since - Unix timestamp to fetch events from. Defaults to the last sync timestamp.
   */
  public async sync(relayPool: RelayPool, since?: number): Promise<void> {
    const syncSince = since ?? this.lastSyncTimestamp;

    await new Promise<void>((resolve) => {
      const subId = relayPool.subscribe(
        { since: syncSince, limit: 500 },
        (event: RelayEvent, _relayUrl: string) => {
          // Deduplicate
          if (this.seenEventIds.has(event.id)) return;
          this.seenEventIds.add(event.id);

          // Track the highest timestamp seen
          if (event.created_at > this.lastSyncTimestamp) {
            this.lastSyncTimestamp = event.created_at;
          }
        },
      );

      // Wait a reasonable time for events to stream in, then close the subscription.
      // In a production implementation this would wait for EOSE from all relays.
      setTimeout(() => {
        relayPool.unsubscribe(subId);
        this.persistTimestamp();
        resolve();
      }, 10_000);
    });
  }

  /**
   * Get the timestamp of the last successful sync.
   */
  public getLastSyncTimestamp(): number {
    return this.lastSyncTimestamp;
  }

  /**
   * Manually set the last sync timestamp (e.g., after importing history).
   */
  public setLastSyncTimestamp(ts: number): void {
    this.lastSyncTimestamp = ts;
    this.persistTimestamp();
  }

  // ── Private helpers ──────────────────────────────────────────────

  private loadTimestamp(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(SYNC_TIMESTAMP_KEY);
        if (stored) {
          this.lastSyncTimestamp = parseInt(stored, 10) || 0;
        }
      }
    } catch {
      // localStorage may not be available (e.g., Node.js environment)
    }
  }

  private persistTimestamp(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SYNC_TIMESTAMP_KEY, String(this.lastSyncTimestamp));
      }
    } catch {
      // Silently ignore storage errors
    }
  }
}
