import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ReplayGuard, MAX_REPLAY_CACHE_AGE } from '@crypto/replay';

describe('ReplayGuard', () => {
  let guard: ReplayGuard;

  beforeEach(() => {
    guard = new ReplayGuard();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('first check passes', () => {
    const nonce = crypto.getRandomValues(new Uint8Array(24));
    expect(guard.check('msg-1', nonce)).toBe(true);
  });

  it('duplicate check fails after add', () => {
    const nonce = crypto.getRandomValues(new Uint8Array(24));
    guard.add('msg-1', nonce);
    expect(guard.check('msg-1', nonce)).toBe(false);
  });

  it('different nonce for same ID passes', () => {
    const nonce1 = crypto.getRandomValues(new Uint8Array(24));
    const nonce2 = crypto.getRandomValues(new Uint8Array(24));
    guard.add('msg-1', nonce1);

    // Same messageId but different nonce → not a replay
    expect(guard.check('msg-1', nonce2)).toBe(true);
  });

  it('different ID with same nonce passes', () => {
    const nonce = crypto.getRandomValues(new Uint8Array(24));
    guard.add('msg-1', nonce);

    // Different messageId → not a replay
    expect(guard.check('msg-2', nonce)).toBe(true);
  });

  it('prune removes old entries', () => {
    const nonce = crypto.getRandomValues(new Uint8Array(24));
    guard.add('msg-1', nonce);

    // Advance past the max age
    vi.advanceTimersByTime(MAX_REPLAY_CACHE_AGE + 1);

    guard.prune();

    // The old entry should be pruned, so the same pair is accepted again
    expect(guard.check('msg-1', nonce)).toBe(true);
  });

  it('prune preserves recent entries', () => {
    const nonce = crypto.getRandomValues(new Uint8Array(24));
    guard.add('msg-1', nonce);

    // Advance just under the max age
    vi.advanceTimersByTime(MAX_REPLAY_CACHE_AGE - 1000);

    guard.prune();

    // Still within the window → should be detected as replay
    expect(guard.check('msg-1', nonce)).toBe(false);
  });

  it('MAX_REPLAY_CACHE_AGE is 24 hours', () => {
    expect(MAX_REPLAY_CACHE_AGE).toBe(86_400_000);
  });

  it('multiple distinct pairs all tracked', () => {
    const nonces = Array.from({ length: 10 }, () =>
      crypto.getRandomValues(new Uint8Array(24)),
    );

    for (let i = 0; i < 10; i++) {
      guard.add(`msg-${i}`, nonces[i]!);
    }

    // All should be detected as replays
    for (let i = 0; i < 10; i++) {
      expect(guard.check(`msg-${i}`, nonces[i]!)).toBe(false);
    }

    // A new pair should still pass
    const newNonce = crypto.getRandomValues(new Uint8Array(24));
    expect(guard.check('msg-new', newNonce)).toBe(true);
  });
});
