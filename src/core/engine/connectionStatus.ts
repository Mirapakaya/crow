import type { RelayInfo } from '../transport';
import { getRelayHealth } from '../transport';

/**
 * Derived connection status for the application UI.
 * Computed from the aggregate health of all relays in the pool.
 */
export type ConnectionStatus = 'offline' | 'connecting' | 'connected' | 'degraded';

/**
 * Derive the overall connection status from the state of all relays.
 *
 * - **connected**: At least one relay is healthy.
 * - **degraded**: No healthy relays, but at least one degraded.
 * - **connecting**: Any relay is in the 'connecting' state (and none are healthy/degraded yet).
 * - **offline**: All relays are unhealthy or dead, none connecting.
 */
export function deriveConnectionStatus(relays: RelayInfo[]): ConnectionStatus {
  if (relays.length === 0) return 'offline';

  let hasConnecting = false;
  let hasHealthy = false;
  let hasDegraded = false;

  for (const info of relays) {
    const health = getRelayHealth(info);

    if (health === 'healthy') {
      hasHealthy = true;
    } else if (health === 'degraded') {
      hasDegraded = true;
    }

    if (info.state === 'connecting' || info.state === 'reconnecting') {
      hasConnecting = true;
    }
  }

  if (hasHealthy) return 'connected';
  if (hasDegraded) return 'degraded';
  if (hasConnecting) return 'connecting';
  return 'offline';
}
