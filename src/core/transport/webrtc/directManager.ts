import { DirectSession } from './directSession';

/** Default ICE servers for NAT traversal. */
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

/**
 * Configuration for the WebRTC direct connection manager.
 */
export interface DirectManagerConfig {
  /** ICE servers to use for NAT traversal. */
  iceServers?: RTCIceServer[];
}

/**
 * Manages WebRTC peer-to-peer connections for direct messaging.
 * Handles offer/answer/ICE negotiation and lifecycle.
 */
export class DirectConnectionManager {
  private connections = new Map<string, RTCPeerConnection>();
  private sessions = new Map<string, DirectSession>();
  private readonly iceServers: RTCIceServer[];
  private readonly pendingCandidates = new Map<string, RTCIceCandidateInit[]>();

  /** Callback when a peer's connection state changes. */
  public onConnectionStateChange: ((pubKey: string, state: RTCPeerConnectionState) => void) | null = null;

  constructor(config?: DirectManagerConfig) {
    this.iceServers = config?.iceServers ?? DEFAULT_ICE_SERVERS;
  }

  /**
   * Create a WebRTC offer for a direct connection to a peer.
   * The resulting SDP must be sent to the peer via a relay signaling channel.
   */
  public async createOffer(targetPubKey: string): Promise<RTCSessionDescriptionInit> {
    const pc = this.createPeerConnection(targetPubKey);

    // Create a data channel to trigger ICE gathering
    const dataChannel = pc.createDataChannel('crow-direct', {
      ordered: true,
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const session = new DirectSession(pc, targetPubKey);
    session.dataChannel = dataChannel;
    this.sessions.set(targetPubKey, session);

    return offer;
  }

  /**
   * Handle a WebRTC answer received from a peer.
   * Completes the offer/answer exchange.
   */
  public async handleAnswer(targetPubKey: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.connections.get(targetPubKey);
    if (!pc) {
      throw new Error(`No pending connection for peer: ${targetPubKey.slice(0, 12)}…`);
    }
    await pc.setRemoteDescription(new RTCSessionDescription(answer));

    // Flush any buffered ICE candidates
    const buffered = this.pendingCandidates.get(targetPubKey);
    if (buffered) {
      for (const candidate of buffered) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      this.pendingCandidates.delete(targetPubKey);
    }
  }

  /**
   * Handle an ICE candidate received from a peer via the signaling channel.
   */
  public async handleIceCandidate(targetPubKey: string, candidate: RTCIceCandidateInit): Promise<void> {
    const pc = this.connections.get(targetPubKey);
    if (!pc || !pc.remoteDescription) {
      // Buffer until the remote description is set
      let buffer = this.pendingCandidates.get(targetPubKey);
      if (!buffer) {
        buffer = [];
        this.pendingCandidates.set(targetPubKey, buffer);
      }
      buffer.push(candidate);
      return;
    }
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  /**
   * Close and clean up a direct connection to a peer.
   */
  public closeConnection(targetPubKey: string): void {
    const session = this.sessions.get(targetPubKey);
    if (session) {
      session.close();
      this.sessions.delete(targetPubKey);
    }
    const pc = this.connections.get(targetPubKey);
    if (pc) {
      pc.close();
      this.connections.delete(targetPubKey);
    }
    this.pendingCandidates.delete(targetPubKey);
  }

  /**
   * Get the active direct session for a peer, if any.
   */
  public getSession(targetPubKey: string): DirectSession | undefined {
    return this.sessions.get(targetPubKey);
  }

  // ── Private helpers ──────────────────────────────────────────────

  private createPeerConnection(peerPubKey: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({
      iceServers: this.iceServers,
    });

    this.connections.set(peerPubKey, pc);

    pc.onconnectionstatechange = () => {
      this.onConnectionStateChange?.(peerPubKey, pc.connectionState);

      // Auto-cleanup failed/closed connections
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.sessions.delete(peerPubKey);
      }
    };

    pc.ondatachannel = (event) => {
      // Remote peer created the data channel
      const session = this.sessions.get(peerPubKey);
      if (session) {
        session.dataChannel = event.channel;
      } else {
        const newSession = new DirectSession(pc, peerPubKey);
        newSession.dataChannel = event.channel;
        this.sessions.set(peerPubKey, newSession);
      }
    };

    return pc;
  }
}
