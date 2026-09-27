/**
 * ICE / STUN / TURN server configuration for Crow WebRTC calls.
 *
 * Provides default public STUN servers and a hook for overriding
 * them with TURN servers when available.
 */

/** Default public STUN servers used when no custom configuration is provided. */
export const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

/** Custom ICE servers that, once set, override the defaults. */
let customIceServers: RTCIceServer[] | null = null;

/**
 * Return the ICE servers that will be used for new peer connections.
 *
 * If {@link setIceServers} has been called, those servers are returned;
 * otherwise the built-in public STUN servers are used.
 */
export function getIceServers(): RTCIceServer[] {
  return customIceServers ?? DEFAULT_ICE_SERVERS;
}

/**
 * Override the default ICE server list (e.g. to add TURN relays).
 *
 * Pass `null` to revert to the defaults.
 */
export function setIceServers(servers: RTCIceServer[] | null): void {
  customIceServers = servers;
}

/**
 * Perform a basic ICE connectivity check by creating a short-lived
 * RTCPeerConnection and verifying that at least one ICE candidate
 * is gathered within a timeout window.
 *
 * @returns `true` if ICE gathering succeeds, `false` otherwise.
 */
export async function testIceConnectivity(): Promise<boolean> {
  try {
    const pc = new RTCPeerConnection({ iceServers: getIceServers() });
    const gathered = new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {
        resolve(false);
        pc.close();
      }, 5_000);

      pc.addEventListener('icecandidate', (evt) => {
        if (evt.candidate) {
          clearTimeout(timeout);
          resolve(true);
          pc.close();
        }
      });

      // An empty data channel triggers ICE gathering.
      pc.createDataChannel('connectivity-test');
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .catch(() => {
          clearTimeout(timeout);
          resolve(false);
          pc.close();
        });
    });

    return await gathered;
  } catch {
    return false;
  }
}
