/**
 * Fake relay for integration tests.
 *
 * Provides an in-memory event store with subscribe/publish semantics,
 * simulating a Nostr relay without actual WebSocket connections.
 */

import type { RelayEvent } from '@transport/types';

/** Stored event with its source relay. */
interface StoredEvent {
  event: RelayEvent;
  relayUrl: string;
}

/** Subscription filter (simplified). */
export interface Filter {
  kinds?: number[];
  authors?: string[];
  since?: number;
  until?: number;
  limit?: number;
}

/** Callback invoked when a matching event is published. */
export type FakeRelayCallback = (event: RelayEvent, relayUrl: string) => void;

/**
 * In-memory fake relay for integration tests.
 */
export class FakeRelay {
  private events: StoredEvent[] = [];
  private subscriptions = new Map<string, { filter: Filter; callback: FakeRelayCallback }>();
  private subCounter = 0;
  private relayUrl: string;

  constructor(relayUrl: string = 'wss://fake.relay.test') {
    this.relayUrl = relayUrl;
  }

  /** Get the relay URL. */
  get url(): string {
    return this.relayUrl;
  }

  /**
   * Publish an event to the relay.
   * Stores the event and delivers it to all matching subscriptions.
   */
  publish(event: RelayEvent): void {
    this.events.push({ event, relayUrl: this.relayUrl });
    this.deliverToSubscriptions(event);
  }

  /**
   * Subscribe to events matching a filter.
   * Immediately delivers any already-stored matching events.
   *
   * @returns Subscription ID.
   */
  subscribe(filter: Filter, callback: FakeRelayCallback): string {
    const subId = `fake_sub_${++this.subCounter}`;
    this.subscriptions.set(subId, { filter, callback });

    // Deliver stored events that match
    const matching = this.queryStored(filter);
    for (const stored of matching) {
      try {
        callback(stored.event, stored.relayUrl);
      } catch {
        // Subscriber errors shouldn't crash the relay
      }
    }

    return subId;
  }

  /**
   * Unsubscribe from the relay.
   */
  unsubscribe(subId: string): void {
    this.subscriptions.delete(subId);
  }

  /**
   * Get all stored events.
   */
  getAllEvents(): RelayEvent[] {
    return this.events.map((s) => s.event);
  }

  /**
   * Count stored events.
   */
  count(): number {
    return this.events.length;
  }

  /**
   * Clear all stored events and subscriptions.
   */
  reset(): void {
    this.events = [];
    this.subscriptions.clear();
    this.subCounter = 0;
  }

  /**
   * Simulate relay responses for a given event ID.
   * Returns true if the event was accepted.
   */
  simulateOk(eventId: string): boolean {
    return this.events.some((s) => s.event.id === eventId);
  }

  // ── Private helpers ──────────────────────────────────────────────

  /** Deliver a new event to matching subscriptions. */
  private deliverToSubscriptions(event: RelayEvent): void {
    for (const [, sub] of this.subscriptions) {
      if (this.matchesFilter(event, sub.filter)) {
        try {
          sub.callback(event, this.relayUrl);
        } catch {
          // ignore
        }
      }
    }
  }

  /** Query stored events matching a filter. */
  private queryStored(filter: Filter): StoredEvent[] {
    let results = this.events.filter((s) => this.matchesFilter(s.event, filter));

    // Apply time-based sorting (newest first)
    results.sort((a, b) => b.event.created_at - a.event.created_at);

    // Apply limit
    if (filter.limit && filter.limit > 0) {
      results = results.slice(0, filter.limit);
    }

    return results;
  }

  /** Check if an event matches a filter. */
  private matchesFilter(event: RelayEvent, filter: Filter): boolean {
    if (filter.kinds && !filter.kinds.includes(event.kind)) return false;
    if (filter.authors && !filter.authors.includes(event.pubkey)) return false;
    if (filter.since && event.created_at < filter.since) return false;
    if (filter.until && event.created_at > filter.until) return false;
    return true;
  }
}

/**
 * Create a fake relay event for testing.
 */
export function createFakeEvent(overrides: Partial<RelayEvent> = {}): RelayEvent {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const id = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return {
    id,
    pubkey: '00'.repeat(32),
    created_at: Math.floor(Date.now() / 1000),
    kind: 1,
    content: 'test event',
    tags: [],
    sig: '00'.repeat(64),
    ...overrides,
  };
}
