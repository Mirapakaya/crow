import type { RelayEvent, RelayInfo, RelayState } from './types';
import { RelaySocket } from './relaySocket';
import { RelayScore } from './relayScore';

/** Callback signature for events received from the pool. */
export type PoolEventCallback = (event: RelayEvent, relayUrl: string) => void;

/**
 * Manages connections to multiple Nostr relays.
 * Aggregates events, deduplicates by event ID, and provides a unified
 * subscribe/publish interface.
 */
export class RelayPool {
  private sockets = new Map<string, RelaySocket>();
  private readonly scoreKeeper = new RelayScore();
  private seenEventIds = new Set<string>();
  private activeSubscriptions = new Map<string, { filters: object; callback: PoolEventCallback }>();
  private subCounter = 0;

  /** Callback when any relay's connection state changes. */
  public onRelayStateChange: ((url: string, state: RelayState) => void) | null = null;

  /**
   * Add a relay to the pool. Does not connect automatically.
   */
  public addRelay(url: string): void {
    if (this.sockets.has(url)) return;

    const socket = new RelaySocket(url);

    socket.onEvent = (event: RelayEvent) => {
      this.handleRelayEvent(event, url);
    };

    socket.onStateChange = (state: RelayState) => {
      if (state === 'connected') {
        this.scoreKeeper.update(url, 'success');
      } else if (state === 'disconnected' || state === 'reconnecting') {
        this.scoreKeeper.update(url, 'error');
      }
      this.onRelayStateChange?.(url, state);
    };

    this.sockets.set(url, socket);
  }

  /**
   * Remove a relay from the pool and disconnect it.
   */
  public removeRelay(url: string): void {
    const socket = this.sockets.get(url);
    if (socket) {
      socket.disconnect();
      this.sockets.delete(url);
    }
  }

  /**
   * Connect to all relays in the pool.
   * Resolves when all connection attempts have completed (success or failure).
   */
  public async connectAll(): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const socket of this.sockets.values()) {
      promises.push(
        socket.connect().catch(() => {
          // Individual relay failure is tolerated; the pool keeps running.
        })
      );
    }
    await Promise.allSettled(promises);
  }

  /**
   * Disconnect all relays.
   */
  public disconnectAll(): void {
    for (const socket of this.sockets.values()) {
      socket.disconnect();
    }
  }

  /**
   * Publish an event to all connected relays.
   * @returns Array of relay URLs that appeared to accept the event.
   */
  public async publish(event: RelayEvent): Promise<string[]> {
    const accepted: string[] = [];

    for (const [url, socket] of this.sockets) {
      if (socket.state === 'connected') {
        try {
          socket.send(['EVENT', event]);
          accepted.push(url);
          this.scoreKeeper.update(url, 'success');
        } catch {
          this.scoreKeeper.update(url, 'error');
        }
      }
    }

    return accepted;
  }

  /**
   * Subscribe to events across all connected relays.
   * Deduplicates events by ID before forwarding to the callback.
   * @returns The pool-level subscription ID.
   */
  public subscribe(filters: object, onEvent: PoolEventCallback): string {
    const poolSubId = `pool_${++this.subCounter}`;
    this.activeSubscriptions.set(poolSubId, { filters, callback: onEvent });

    // Register the subscription on every connected relay
    for (const socket of this.sockets.values()) {
      if (socket.state === 'connected') {
        socket.subscribe(filters);
      }
    }

    return poolSubId;
  }

  /**
   * Unsubscribe from a pool-level subscription.
   */
  public unsubscribe(subId: string): void {
    this.activeSubscriptions.delete(subId);
    // RelaySocket manages its own sub IDs; the pool-level ID is a logical handle.
    // In a production implementation, we would track the per-relay sub IDs
    // and send CLOSE to each relay here.
  }

  /**
   * Get relay info for a specific URL.
   */
  public getRelayInfo(url: string): RelayInfo | undefined {
    const socket = this.sockets.get(url);
    if (!socket) return undefined;

    return {
      url,
      state: socket.state,
      score: this.scoreKeeper.getScore(url),
      latency: socket.latency,
      lastConnected: socket.state === 'connected' ? Date.now() : 0,
      errorCount: 0, // Aggregated from score keeper in a production impl
    };
  }

  /**
   * Get info for all relays in the pool.
   */
  public getAllRelayInfo(): RelayInfo[] {
    const infos: RelayInfo[] = [];
    for (const [url, socket] of this.sockets) {
      infos.push({
        url,
        state: socket.state,
        score: this.scoreKeeper.getScore(url),
        latency: socket.latency,
        lastConnected: socket.state === 'connected' ? Date.now() : 0,
        errorCount: 0,
      });
    }
    return infos;
  }

  // ── Private helpers ──────────────────────────────────────────────

  /**
   * Handle an event received from any relay.
   * Deduplicates by event ID before dispatching to active subscriptions.
   */
  private handleRelayEvent(event: RelayEvent, relayUrl: string): void {
    // Dedup: skip events we've already seen
    if (this.seenEventIds.has(event.id)) return;
    this.seenEventIds.add(event.id);

    // Prevent the seen set from growing unbounded
    if (this.seenEventIds.size > 50_000) {
      this.pruneSeenIds();
    }

    // Deliver to all active subscriptions
    for (const sub of this.activeSubscriptions.values()) {
      try {
        sub.callback(event, relayUrl);
      } catch {
        // Subscriber errors must not crash the pool
      }
    }
  }

  /** Remove oldest entries when the seen-id set grows too large. */
  private pruneSeenIds(): void {
    // Simple strategy: clear half and let re-dedup happen naturally
    // A production impl would use an LRU or time-based eviction
    const entries = Array.from(this.seenEventIds);
    const keep = entries.slice(entries.length / 2);
    this.seenEventIds = new Set(keep);
  }
}
