/**
 * Core types for the Crow transport layer.
 * All events follow the Nostr event format for protocol compatibility.
 */

/** Possible states of a relay WebSocket connection. */
export type RelayState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

/** A Nostr-format event as received from or published to a relay. */
export interface RelayEvent {
  kind: number;
  pubkey: string;
  content: string;
  tags: string[][];
  id: string;
  created_at: number;
  sig: string;
}

/** Configuration for a single relay endpoint. */
export interface RelayConfig {
  url: string;
  enabled: boolean;
  label?: string;
}

/** Runtime health and performance info for a relay connection. */
export interface RelayInfo {
  url: string;
  state: RelayState;
  score: number;
  latency: number;
  lastConnected: number;
  errorCount: number;
}
