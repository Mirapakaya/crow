/**
 * Individual WebRTC call session for Crow.
 *
 * Each `CallSession` wraps a single `RTCPeerConnection` and the
 * associated local / remote media streams.  It exposes methods for
 * the offer/answer dance, ICE candidate exchange, media controls,
 * and clean teardown.
 */

import type { CallKind, CallState } from './types';

/** Factory used to obtain user media; injectable for testing. */
export interface MediaDeviceAccess {
  getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream>;
  getDisplayMedia?: () => Promise<MediaStream>;
}

/** Browser defaults (production). */
const BROWSER_MEDIA: MediaDeviceAccess = {
  getUserMedia: (c) => navigator.mediaDevices.getUserMedia(c),
  getDisplayMedia: () => navigator.mediaDevices.getDisplayMedia(),
};

/**
 * Represents a single peer-to-peer call session.
 *
 * Callers should create an instance, wire up the `onRemoteStream` /
 * `onStateChange` callbacks, then drive the session through the
 * WebRTC offer/answer flow.
 */
export class CallSession {
  // ── Public state ──────────────────────────────────────────────
  /** Current lifecycle state. */
  state: CallState = 'idle';
  /** Local audio/video stream (before the peer connection sends it). */
  localStream: MediaStream | null = null;
  /** Remote audio/video stream received from the peer. */
  remoteStream: MediaStream | null = null;
  /** Whether the local audio track is muted. */
  isMuted = false;
  /** Whether the local video track is disabled. */
  isCameraOff = false;

  // ── Callbacks ────────────────────────────────────────────────
  /** Fired when the remote peer's media stream arrives. */
  onRemoteStream: ((stream: MediaStream) => void) | null = null;
  /** Fired whenever the call state changes. */
  onStateChange: ((state: CallState) => void) | null = null;

  // ── Private ──────────────────────────────────────────────────
  private pc: RTCPeerConnection | null = null;
  private kind: CallKind;
  private iceServers: RTCIceServer[];
  private media: MediaDeviceAccess;
  private screenStream: MediaStream | null = null;
  private videoSender: RTCRtpSender | null = null;
  private facingMode: 'user' | 'environment' = 'user';

  constructor(
    peerPubKey: string,
    kind: CallKind,
    iceServers: RTCIceServer[],
    media: MediaDeviceAccess = BROWSER_MEDIA,
  ) {
    void peerPubKey; // Stored for future use (session identification)
    this.kind = kind;
    this.iceServers = iceServers;
    this.media = media;
  }

  // ── WebRTC Offer / Answer ────────────────────────────────────

  /**
   * Create a peer connection, acquire local media, and generate an offer.
   *
   * @returns The SDP offer to send to the peer via signalling.
   */
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    await this.acquireLocalMedia();
    const pc = this.createPeerConnection();
    this.pc = pc;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.setState('connecting');
    return offer;
  }

  /**
   * Process an incoming offer, acquire local media, and produce an answer.
   *
   * @returns The SDP answer to send back to the caller.
   */
  async handleOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    await this.acquireLocalMedia();
    const pc = this.createPeerConnection();
    this.pc = pc;
    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    this.setState('connecting');
    return answer;
  }

  /**
   * Apply a remote answer to the peer connection.
   */
  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) throw new Error('No peer connection – did you createOffer first?');
    await this.pc.setRemoteDescription(answer);
  }

  /**
   * Add a remote ICE candidate to the peer connection.
   */
  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.pc) throw new Error('No peer connection');
    await this.pc.addIceCandidate(candidate);
  }

  // ── Media controls ───────────────────────────────────────────

  /**
   * Toggle the local audio mute state.
   *
   * @returns The new muted state (`true` = muted).
   */
  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.localStream?.getAudioTracks().forEach((t) => {
      t.enabled = !this.isMuted;
    });
    return this.isMuted;
  }

  /**
   * Toggle the local camera on/off.
   *
   * @returns The new camera state (`true` = camera off).
   */
  toggleCamera(): boolean {
    this.isCameraOff = !this.isCameraOff;
    this.localStream?.getVideoTracks().forEach((t) => {
      t.enabled = !this.isCameraOff;
    });
    return this.isCameraOff;
  }

  /**
   * Switch between front and back camera (mobile).
   *
   * Re-acquires the video track with the opposite facing mode
   * and replaces the sender's track.
   */
  async switchCamera(): Promise<void> {
    this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
    try {
      const newStream = await this.media.getUserMedia({
        video: { facingMode: this.facingMode },
        audio: false,
      });
      const newTrack = newStream.getVideoTracks()[0];
      if (!newTrack) return;

      // Replace the track in the sender if the PC exists.
      if (this.pc && this.videoSender) {
        await this.videoSender.replaceTrack(newTrack);
      }

      // Stop the old video track and add the new one to localStream.
      this.localStream?.getVideoTracks().forEach((t) => t.stop());
      if (this.localStream) {
        Array.from(this.localStream.getVideoTracks()).forEach((t) =>
          this.localStream!.removeTrack(t),
        );
        this.localStream.addTrack(newTrack);
      }
    } catch {
      // Camera switch may fail (e.g. desktop without back camera).
    }
  }

  /**
   * Start sharing the local screen.
   */
  async startScreenShare(): Promise<void> {
    if (!this.media.getDisplayMedia) return;
    this.screenStream = await this.media.getDisplayMedia();
    const track = this.screenStream.getVideoTracks()[0];
    if (!track) return;

    if (this.pc) {
      if (this.videoSender) {
        await this.videoSender.replaceTrack(track);
      } else {
        this.videoSender = this.pc.addTrack(track, this.screenStream);
      }
    }

    // Stop screen share when the user ends it via the browser UI.
    track.addEventListener('ended', () => {
      this.stopScreenShare();
    });
  }

  /**
   * Stop sharing the local screen and revert to the camera track.
   */
  async stopScreenShare(): Promise<void> {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => t.stop());
      this.screenStream = null;
    }

    // Restore the camera video track.
    const camTrack = this.localStream?.getVideoTracks()[0] ?? null;
    if (this.videoSender && camTrack) {
      await this.videoSender.replaceTrack(camTrack);
    }
  }

  // ── Teardown ─────────────────────────────────────────────────

  /**
   * Gracefully end the call: close the peer connection, stop all
   * media tracks, and reset state.
   */
  hangup(): void {
    this.cleanupMedia();
    this.pc?.close();
    this.pc = null;
    this.videoSender = null;
    this.setState('ended');
  }

  // ── Private helpers ──────────────────────────────────────────

  private setState(s: CallState): void {
    this.state = s;
    this.onStateChange?.(s);
  }

  private createPeerConnection(): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });

    // Add local tracks.
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        const sender = pc.addTrack(track, this.localStream!);
        if (track.kind === 'video') {
          this.videoSender = sender;
        }
      });
    }

    // Receive remote tracks.
    pc.addEventListener('track', (evt) => {
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
      }
      evt.streams[0]?.getTracks().forEach((t) => this.remoteStream!.addTrack(t));
      this.onRemoteStream?.(this.remoteStream!);
    });

    // State monitoring.
    pc.addEventListener('connectionstatechange', () => {
      switch (pc.connectionState) {
        case 'connected':
          this.setState('connected');
          break;
        case 'disconnected':
        case 'failed':
          this.setState('reconnecting');
          break;
        case 'closed':
          this.setState('ended');
          break;
      }
    });

    pc.addEventListener('iceconnectionstatechange', () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        this.setState('connected');
      }
    });

    return pc;
  }

  /**
   * Acquire the local microphone (and camera, if video call).
   */
  private async acquireLocalMedia(): Promise<void> {
    const constraints: MediaStreamConstraints = {
      audio: true,
      video: this.kind === 'video',
    };
    this.localStream = await this.media.getUserMedia(constraints);
  }

  /**
   * Stop all tracks in the local and screen streams.
   */
  private cleanupMedia(): void {
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.screenStream?.getTracks().forEach((t) => t.stop());
    this.screenStream = null;
    this.remoteStream?.getTracks().forEach((t) => t.stop());
    this.remoteStream = null;
  }
}
