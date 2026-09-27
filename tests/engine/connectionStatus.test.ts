import { describe, it, expect } from 'vitest';
import { deriveConnectionStatus } from '@engine/connectionStatus';
import type { RelayInfo } from '@transport/types';

function makeRelay(overrides: Partial<RelayInfo> = {}): RelayInfo {
  return {
    url: 'wss://relay.example.com',
    state: 'connected',
    score: 75,
    latency: 100,
    lastConnected: Date.now(),
    errorCount: 0,
    ...overrides,
  };
}

describe('connectionStatus', () => {
  it('returns "offline" for empty relay list', () => {
    expect(deriveConnectionStatus([])).toBe('offline');
  });

  it('returns "connected" when at least one relay is healthy', () => {
    const relays = [makeRelay(), makeRelay({ state: 'disconnected', score: 20 })];
    expect(deriveConnectionStatus(relays)).toBe('connected');
  });

  it('returns "degraded" when no healthy relays but at least one degraded', () => {
    const relays = [makeRelay({ score: 50, latency: 3000, state: 'disconnected' })];
    expect(deriveConnectionStatus(relays)).toBe('degraded');
  });

  it('returns "connecting" when relays are connecting and none healthy/degraded', () => {
    const relays = [makeRelay({ state: 'connecting', score: 20, latency: 500 })];
    expect(deriveConnectionStatus(relays)).toBe('connecting');
  });

  it('returns "offline" when all relays are dead/unhealthy', () => {
    const relays = [makeRelay({ state: 'disconnected', score: 5, errorCount: 10 })];
    expect(deriveConnectionStatus(relays)).toBe('offline');
  });

  it('prefers "connected" over "degraded"', () => {
    const relays = [
      makeRelay({ score: 80, latency: 50, state: 'connected' }),
      makeRelay({ score: 50, latency: 3000, state: 'disconnected' }),
    ];
    expect(deriveConnectionStatus(relays)).toBe('connected');
  });

  it('recognizes "reconnecting" state as connecting', () => {
    const relays = [makeRelay({ state: 'reconnecting', score: 30, latency: 800 })];
    expect(deriveConnectionStatus(relays)).toBe('connecting');
  });
});
