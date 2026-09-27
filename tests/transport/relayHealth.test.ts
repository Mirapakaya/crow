import { describe, it, expect } from 'vitest';
import { getRelayHealth } from '@transport/relayHealth';
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

describe('relayHealth', () => {
  it('returns "healthy" for a connected relay with good score and low latency', () => {
    expect(getRelayHealth(makeRelay())).toBe('healthy');
  });

  it('returns "dead" for score <= 10', () => {
    expect(getRelayHealth(makeRelay({ score: 5 }))).toBe('dead');
  });

  it('returns "dead" for more than 5 consecutive errors', () => {
    expect(getRelayHealth(makeRelay({ errorCount: 6, score: 50 }))).toBe('dead');
  });

  it('returns "degraded" for high latency', () => {
    expect(getRelayHealth(makeRelay({ latency: 3000, score: 50 }))).toBe('degraded');
  });

  it('returns "degraded" for disconnected relay with score > 40', () => {
    expect(getRelayHealth(makeRelay({ state: 'disconnected', score: 50 }))).toBe('degraded');
  });

  it('returns "unhealthy" for low score with tolerable latency', () => {
    expect(getRelayHealth(makeRelay({ score: 20, state: 'disconnected', latency: 500 }))).toBe(
      'unhealthy',
    );
  });

  it('returns "degraded" for connected relay with borderline score', () => {
    expect(getRelayHealth(makeRelay({ score: 45 }))).toBe('degraded');
  });

  it('boundary: score exactly 10 is dead', () => {
    expect(getRelayHealth(makeRelay({ score: 10 }))).toBe('dead');
  });

  it('boundary: score 11 is not dead', () => {
    const health = getRelayHealth(makeRelay({ score: 11, state: 'disconnected', latency: 500 }));
    expect(health).not.toBe('dead');
  });

  it('boundary: exactly 5 consecutive errors is NOT dead', () => {
    const health = getRelayHealth(makeRelay({ errorCount: 5, score: 50 }));
    expect(health).not.toBe('dead');
  });
});
