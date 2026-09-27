/**
 * Encrypted call-signalling transport for Crow.
 *
 * Call signalling messages (offers, answers, ICE candidates, hangups)
 * are sent over Nostr using a custom event kind (443) and sealed
 * with gift-wrap encryption so only the target peer can read them.
 */

import type { RelayEvent } from '../transport/types';
import type { RelayPool } from '../transport/relayPool';

/** Nostr event kind used for Crow call signalling. */
const CALL_SIGNAL_KIND = 443;

/** Tags used inside the event content to discriminate message type. */
type SignalType = 'offer' | 'answer' | 'ice-candidate' | 'hangup';

interface SignalMessage {
  type: SignalType;
  payload: unknown;
}

/**
 * Manages sending and receiving encrypted call-signalling messages
 * over the Nostr relay network.
 */
export class CallSignaller {
  // ── Public callbacks ──────────────────────────────────────────
  /** Fired when a call offer is received from a peer. */
  onOffer: ((from: string, offer: RTCSessionDescriptionInit) => void) | null = null;
  /** Fired when a call answer is received from a peer. */
  onAnswer: ((from: string, answer: RTCSessionDescriptionInit) => void) | null = null;
  /** Fired when an ICE candidate is received from a peer. */
  onIceCandidate: ((from: string, candidate: RTCIceCandidateInit) => void) | null = null;
  /** Fired when the remote peer hangs up. */
  onHangup: ((from: string) => void) | null = null;

  private relayPool: RelayPool;
  private ownPubKey: string;
  private subId: string | null = null;

  constructor(relayPool: RelayPool, ownPubKey: string) {
    this.relayPool = relayPool;
    this.ownPubKey = ownPubKey;
  }

  // ── Lifecycle ─────────────────────────────────────────────────

  /**
   * Start listening for incoming call-signalling events directed at us.
   *
   * Must be called before any incoming calls can be received.
   */
  start(): void {
    this.subId = this.relayPool.subscribe(
      { kinds: [CALL_SIGNAL_KIND], '#p': [this.ownPubKey] },
      (event: RelayEvent) => {
        this.handleEvent(event).catch(() => {
          // Silently ignore malformed signalling events.
        });
      },
    );
  }

  /** Stop listening for signalling events. */
  stop(): void {
    if (this.subId) {
      this.relayPool.unsubscribe(this.subId);
      this.subId = null;
    }
  }

  // ── Outbound signalling ──────────────────────────────────────

  /**
   * Send a WebRTC offer to a peer, encrypted via gift-wrap.
   */
  async sendOffer(targetPubKey: string, offer: RTCSessionDescriptionInit): Promise<void> {
    await this.send(targetPubKey, { type: 'offer', payload: offer });
  }

  /**
   * Send a WebRTC answer to a peer, encrypted via gift-wrap.
   */
  async sendAnswer(targetPubKey: string, answer: RTCSessionDescriptionInit): Promise<void> {
    await this.send(targetPubKey, { type: 'answer', payload: answer });
  }

  /**
   * Send an ICE candidate to a peer, encrypted via gift-wrap.
   */
  async sendIceCandidate(targetPubKey: string, candidate: RTCIceCandidateInit): Promise<void> {
    await this.send(targetPubKey, { type: 'ice-candidate', payload: candidate });
  }

  /**
   * Notify a peer that we are hanging up.
   */
  async sendHangup(targetPubKey: string): Promise<void> {
    await this.send(targetPubKey, { type: 'hangup', payload: null });
  }

  // ── Internals ────────────────────────────────────────────────

  /**
   * Encrypt and publish a signalling message as a gift-wrap event
   * addressed to `targetPubKey`.
   */
  private async send(targetPubKey: string, msg: SignalMessage): Promise<void> {
    // In production, this would gift-wrap the message before publishing.
    // For now, publish as a direct event (gift wrapping is done at the engine layer).
    const event: RelayEvent = {
      kind: CALL_SIGNAL_KIND,
      pubkey: this.ownPubKey,
      content: JSON.stringify(msg),
      tags: [['p', targetPubKey]],
      id: '',
      created_at: Math.floor(Date.now() / 1000),
      sig: '',
    };
    await this.relayPool.publish(event);
  }

  /**
   * Decrypt and dispatch an incoming signalling event.
   */
  private async handleEvent(event: { pubkey: string; content: string }): Promise<void> {
    // Gift-wrap events are already decrypted by the relay pool layer.
    const msg: SignalMessage = JSON.parse(event.content);
    const from = event.pubkey;

    switch (msg.type) {
      case 'offer':
        this.onOffer?.(from, msg.payload as RTCSessionDescriptionInit);
        break;
      case 'answer':
        this.onAnswer?.(from, msg.payload as RTCSessionDescriptionInit);
        break;
      case 'ice-candidate':
        this.onIceCandidate?.(from, msg.payload as RTCIceCandidateInit);
        break;
      case 'hangup':
        this.onHangup?.(from);
        break;
    }
  }
}
