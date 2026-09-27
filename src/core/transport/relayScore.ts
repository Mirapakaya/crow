/** Default starting score for a relay with no history. */
const BASELINE_SCORE = 50;

/** Maximum score cap. */
const MAX_SCORE = 100;

/** Minimum score floor. */
const MIN_SCORE = 0;

/** Score adjustment deltas. */
const DELTA_SUCCESS = 2;
const DELTA_TIMEOUT = -5;
const DELTA_ERROR = -10;

/** Half-life in milliseconds for score decay toward baseline (1 hour). */
const DECAY_HALF_LIFE_MS = 3_600_000;

interface ScoreEntry {
  score: number;
  lastUpdated: number;
}

/**
 * Tracks per-relay reliability scores with time-based decay toward baseline.
 * Scores range from 0–100, starting at 50.
 */
export class RelayScore {
  private entries = new Map<string, ScoreEntry>();

  /**
   * Record a connection/result outcome for the given relay.
   * @param url - Relay URL.
   * @param result - 'success', 'timeout', or 'error'.
   */
  public update(url: string, result: 'success' | 'timeout' | 'error'): void {
    const entry = this.getOrCreate(url);
    this.applyDecay(entry);

    switch (result) {
      case 'success':
        entry.score += DELTA_SUCCESS;
        break;
      case 'timeout':
        entry.score += DELTA_TIMEOUT;
        break;
      case 'error':
        entry.score += DELTA_ERROR;
        break;
    }

    entry.score = Math.max(MIN_SCORE, Math.min(MAX_SCORE, entry.score));
    entry.lastUpdated = Date.now();
  }

  /**
   * Get the current score for a relay (0–100).
   * Returns the baseline score (50) for unknown relays.
   */
  public getScore(url: string): number {
    const entry = this.entries.get(url);
    if (!entry) return BASELINE_SCORE;
    this.applyDecay(entry);
    return entry.score;
  }

  /**
   * Return the top N relay URLs sorted by score (descending).
   */
  public getTopRelays(count: number): string[] {
    const scored: [string, number][] = [];
    for (const [url, entry] of this.entries) {
      this.applyDecay(entry);
      scored.push([url, entry.score]);
    }
    scored.sort((a, b) => b[1] - a[1]);
    return scored.slice(0, count).map(([url]) => url);
  }

  // ── Private helpers ──────────────────────────────────────────────

  private getOrCreate(url: string): ScoreEntry {
    let entry = this.entries.get(url);
    if (!entry) {
      entry = { score: BASELINE_SCORE, lastUpdated: Date.now() };
      this.entries.set(url, entry);
    }
    return entry;
  }

  /**
   * Exponential decay toward baseline.
   * After one half-life, the score moves halfway from its current value
   * toward the baseline (50).
   */
  private applyDecay(entry: ScoreEntry): void {
    const now = Date.now();
    const elapsed = now - entry.lastUpdated;
    if (elapsed <= 0) return;

    const halfLives = elapsed / DECAY_HALF_LIFE_MS;
    const factor = Math.pow(0.5, halfLives);
    entry.score = BASELINE_SCORE + (entry.score - BASELINE_SCORE) * factor;
    entry.lastUpdated = now;
  }
}
