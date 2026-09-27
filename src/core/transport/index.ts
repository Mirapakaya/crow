/**
 * Crow Transport Layer — barrel export.
 * Provides relay connectivity, scoring, health, and WebRTC P2P.
 */

// Core types
export type { RelayState, RelayEvent, RelayConfig, RelayInfo } from './types';

// Relay socket
export { RelaySocket } from './relaySocket';

// Relay scoring
export { RelayScore } from './relayScore';

// Relay health
export { getRelayHealth } from './relayHealth';

// Relay pool
export { RelayPool } from './relayPool';
export type { PoolEventCallback } from './relayPool';

// Default relays
export { DEFAULT_RELAYS } from './defaultRelays';

// URL utilities
export { normalizeRelayUrl, validateRelayUrl, isRelayUrl } from './relayUrl';

// Sync protocol
export { NegentropySync } from './negentropy';

// WebRTC direct messaging
export { DirectConnectionManager } from './webrtc/directManager';
export type { DirectManagerConfig } from './webrtc/directManager';
export { DirectSession } from './webrtc/directSession';
