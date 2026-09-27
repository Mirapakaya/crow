/**
 * Call orchestration layer for Crow.
 *
 * `CallManager` is the top-level entry point for the UI layer.
 * It owns the {@link CallSignaller}, creates / tracks {@link CallSession}
 * instances, and maintains call history.
 */

import type { CallKind, CallRecord, CallState } from './types';
import { getIceServers } from './iceServers';
import { CallSignaller } from './callSignalling';
import { CallSession } from './callSession';
import type { RelayPool } from '../transport/relayPool';

/** Internal wrapper that pairs a session with its metadata. */
interface ManagedCall {
  session: CallSession;
  record: CallRecord;
}

/**
 * Singleton that orchestrates the full lifecycle of voice and video calls.
 *
 * The UI should call {@link startCall} / {@link answerCall} /
 * {@link rejectCall} / {@link endCall} and read {@link getActiveCall}
 * and {@link getCallHistory} for display.
 */
export class CallManager {
  private signaller: CallSignaller;
  private active: ManagedCall | null = null;
  private history: CallRecord[] = [];

  constructor(relayPool: RelayPool, ownPubKey: string) {
    this.signaller = new CallSignaller(relayPool, ownPubKey);
    this.wireSignaller();
  }

  // ── Lifecycle ─────────────────────────────────────────────────

  /** Start listening for incoming call signals. */
  start(): void {
    this.signaller.start();
  }

  /** Stop listening for incoming call signals. */
  stop(): void {
    this.signaller.stop();
  }

  // ── Outbound calls ────────────────────────────────────────────

  /**
   * Place a call to a peer.
   *
   * Creates a {@link CallSession}, generates a WebRTC offer, and
   * sends it over the signalling channel.
   *
   * @returns The newly created session.
   */
  async startCall(
    conversationId: string,
    peerPubKey: string,
    kind: CallKind,
  ): Promise<CallSession> {
    if (this.active) {
      throw new Error('A call is already active — end it first');
    }

    const session = new CallSession(peerPubKey, kind, getIceServers());
    const offer = await session.createOffer();

    const record: CallRecord = {
      id: crypto.randomUUID(),
      conversationId,
      kind,
      state: 'connecting',
      direction: 'outgoing',
      startedAt: Date.now(),
      peerPubKey,
    };

    this.active = { session, record };
    this.trackSessionState(session);

    await this.signaller.sendOffer(peerPubKey, offer);
    return session;
  }

  // ── Inbound calls ─────────────────────────────────────────────

  /**
   * Create a session for an incoming call (ringing state).
   *
   * The UI should then call {@link answerCall} or {@link rejectCall}.
   */
  handleIncomingCall(from: string, offer: RTCSessionDescriptionInit, kind: CallKind): CallSession {
    if (this.active) {
      // Auto-reject if already on a call.
      this.signaller.sendHangup(from).catch(() => {});
      throw new Error('Already on a call');
    }

    const session = new CallSession(from, kind, getIceServers());
    // We do NOT call handleOffer yet — that happens on answer.

    const record: CallRecord = {
      id: crypto.randomUUID(),
      conversationId: '', // Populated by UI / conversation layer
      kind,
      state: 'ringing',
      direction: 'incoming',
      startedAt: Date.now(),
      peerPubKey: from,
    };

    this.active = { session, record };

    // Stash the offer so we can process it when the user answers.
    (session as any)._pendingOffer = offer;

    return session;
  }

  /**
   * Accept an incoming call.
   *
   * Processes the stashed offer, sends the answer, and wires up
   * ICE candidate forwarding.
   */
  async answerCall(callId: string): Promise<void> {
    if (!this.active || this.active.record.id !== callId) {
      throw new Error('No such incoming call');
    }

    const { session, record } = this.active;
    const offer = (session as any)._pendingOffer as RTCSessionDescriptionInit;
    delete (session as any)._pendingOffer;

    const answer = await session.handleOffer(offer);
    record.state = 'connecting';
    await this.signaller.sendAnswer(record.peerPubKey, answer);
    this.trackSessionState(session);
  }

  /**
   * Reject an incoming call (sends hangup to the caller).
   */
  rejectCall(callId: string): void {
    if (!this.active || this.active.record.id !== callId) return;
    const peerPubKey = this.active.record.peerPubKey;
    this.active.record.state = 'missed';
    this.archiveActive();
    this.signaller.sendHangup(peerPubKey).catch(() => {});
  }

  // ── Ending calls ──────────────────────────────────────────────

  /**
   * End the active call and notify the peer.
   */
  endCall(callId: string): void {
    if (!this.active || this.active.record.id !== callId) return;
    const peerPubKey = this.active.record.peerPubKey;
    this.active.session.hangup();
    this.archiveActive();
    this.signaller.sendHangup(peerPubKey).catch(() => {});
  }

  // ── Queries ───────────────────────────────────────────────────

  /** Return the currently active call session, if any. */
  getActiveCall(): CallSession | null {
    return this.active?.session ?? null;
  }

  /** Return the call history (most recent first). */
  getCallHistory(): CallRecord[] {
    return [...this.history];
  }

  // ── Private ───────────────────────────────────────────────────

  private wireSignaller(): void {
    this.signaller.onOffer = (from, offer) => {
      // Determine kind from offer SDP (has video or not).
      const kind: CallKind = offer.sdp?.includes('m=video') ? 'video' : 'voice';
      try {
        this.handleIncomingCall(from, offer, kind);
        // The UI should be listening to getActiveCall() or a callback
        // to present the ringing UI.
      } catch {
        // Already on a call — already auto-rejected.
      }
    };

    this.signaller.onAnswer = (from, answer) => {
      if (this.active && this.active.record.peerPubKey === from) {
        this.active.session.handleAnswer(answer).catch(() => {
          this.endCall(this.active!.record.id);
        });
      }
    };

    this.signaller.onIceCandidate = (from, candidate) => {
      if (this.active && this.active.record.peerPubKey === from) {
        this.active.session.addIceCandidate(candidate).catch(() => {});
      }
    };

    this.signaller.onHangup = (from) => {
      if (this.active && this.active.record.peerPubKey === from) {
        this.active.session.hangup();
        this.archiveActive();
      }
    };
  }

  /**
   * Forward ICE candidates generated by the active session.
   */
  private trackSessionState(session: CallSession): void {
    const pc = (session as any).pc as RTCPeerConnection | null;
    if (pc && this.active) {
      pc.addEventListener('icecandidate', (evt: RTCPeerConnectionIceEvent) => {
        if (evt.candidate && this.active) {
          this.signaller
            .sendIceCandidate(this.active.record.peerPubKey, evt.candidate.toJSON())
            .catch(() => {});
        }
      });
    }

    // Mirror state changes into the record.
    session.onStateChange = (state: CallState) => {
      if (this.active) {
        this.active.record.state = state;
        if (state === 'ended' || state === 'missed') {
          this.archiveActive();
        }
      }
    };
  }

  /**
   * Move the active call into the history list.
   */
  private archiveActive(): void {
    if (!this.active) return;
    this.active.record.endedAt = Date.now();
    this.history.unshift(this.active.record);
    this.active = null;
  }
}
