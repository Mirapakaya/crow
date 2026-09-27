import type { RelayInfo } from './types';

/** Maximum consecutive errors before a relay is considered dead. */
const DEAD_CONSECUTIVE_ERRORS = 5;

/**
 * Derive a health verdict from relay runtime information.
 *
 * - **healthy**: score > 70, latency < 2000 ms, currently connected
 * - **degraded**: score > 40, or latency ≥ 2000 ms
 * - **unhealthy**: score > 10
 * - **dead**: score ≤ 10, or more than 5 consecutive errors
 */
export function getRelayHealth(info: RelayInfo): 'healthy' | 'degraded' | 'unhealthy' | 'dead' {
  // Dead: too many consecutive errors or extremely low score
  if (info.errorCount > DEAD_CONSECUTIVE_ERRORS || info.score <= 10) {
    return 'dead';
  }

  // Healthy: must be connected with good score and low latency
  if (info.state === 'connected' && info.score > 70 && info.latency < 2000) {
    return 'healthy';
  }

  // Degraded: score still acceptable but latency or connection is problematic
  if (info.score > 40 || info.latency >= 2000) {
    return 'degraded';
  }

  // Unhealthy: score between 10 and 40 with tolerable latency
  return 'unhealthy';
}
