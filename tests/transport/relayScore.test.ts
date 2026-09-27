import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RelayScore } from '@transport/relayScore';

describe('RelayScore', () => {
  let scorer: RelayScore;

  beforeEach(() => {
    scorer = new RelayScore();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('success increases score', () => {
    scorer.update('wss://relay1.example', 'success');
    const score = scorer.getScore('wss://relay1.example');
    // Baseline 50 + 2 for success = 52
    expect(score).toBe(52);
  });

  it('timeout decreases score', () => {
    scorer.update('wss://relay1.example', 'timeout');
    const score = scorer.getScore('wss://relay1.example');
    // Baseline 50 - 5 for timeout = 45
    expect(score).toBe(45);
  });

  it('error decreases score more than timeout', () => {
    scorer.update('wss://relay1.example', 'error');
    const score = scorer.getScore('wss://relay1.example');
    // Baseline 50 - 10 for error = 40
    expect(score).toBe(40);
  });

  it('top relays sorted correctly', () => {
    scorer.update('wss://good.example', 'success');
    scorer.update('wss://good.example', 'success');
    scorer.update('wss://good.example', 'success');

    scorer.update('wss://ok.example', 'success');

    scorer.update('wss://bad.example', 'error');
    scorer.update('wss://bad.example', 'error');

    const top = scorer.getTopRelays(3);

    // Good should be first, ok second, bad last
    expect(top[0]).toBe('wss://good.example');
    expect(top).toContain('wss://ok.example');
    expect(top).toContain('wss://bad.example');
  });

  it('score decays toward 50', () => {
    // Build up a high score
    for (let i = 0; i < 25; i++) {
      scorer.update('wss://relay1.example', 'success');
    }
    const highScore = scorer.getScore('wss://relay1.example');
    expect(highScore).toBe(100); // capped at 100

    // Advance 1 half-life (1 hour)
    vi.advanceTimersByTime(3_600_000);

    const decayedScore = scorer.getScore('wss://relay1.example');
    // After 1 half-life, score should be 50 + (100-50)*0.5 = 75
    expect(decayedScore).toBeCloseTo(75, 0);
  });

  it('score decays from below baseline toward 50', () => {
    // Drive score down
    for (let i = 0; i < 10; i++) {
      scorer.update('wss://relay1.example', 'error');
    }
    const lowScore = scorer.getScore('wss://relay1.example');
    expect(lowScore).toBe(0); // floored at 0

    // Advance 1 half-life
    vi.advanceTimersByTime(3_600_000);

    const decayedScore = scorer.getScore('wss://relay1.example');
    // After 1 half-life, score should be 50 + (0-50)*0.5 = 25
    expect(decayedScore).toBeCloseTo(25, 0);
  });

  it('unknown relay returns baseline 50', () => {
    expect(scorer.getScore('wss://unknown.example')).toBe(50);
  });

  it('score is capped at 100', () => {
    for (let i = 0; i < 50; i++) {
      scorer.update('wss://relay1.example', 'success');
    }
    expect(scorer.getScore('wss://relay1.example')).toBe(100);
  });

  it('score is floored at 0', () => {
    for (let i = 0; i < 50; i++) {
      scorer.update('wss://relay1.example', 'error');
    }
    expect(scorer.getScore('wss://relay1.example')).toBe(0);
  });

  it('getTopRelays returns up to count entries', () => {
    scorer.update('wss://a.example', 'success');
    scorer.update('wss://b.example', 'success');

    const top = scorer.getTopRelays(5);
    expect(top.length).toBeLessThanOrEqual(5);
  });
});
