/**
 * Core types for the Crow Calls module.
 *
 * These types describe the lifecycle and metadata of peer-to-peer
 * voice/video calls built on WebRTC.
 */

/** Possible states a call can be in during its lifecycle. */
export type CallState =
  | 'idle'
  | 'ringing'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'ended'
  | 'missed';

/** Whether the call carries voice only or voice + video. */
export type CallKind = 'voice' | 'video';

/** Persistent record of a call, suitable for history / UI display. */
export interface CallRecord {
  /** Unique call identifier (UUID). */
  id: string;
  /** Conversation this call belongs to. */
  conversationId: string;
  /** Voice or video. */
  kind: CallKind;
  /** Current lifecycle state. */
  state: CallState;
  /** Whether the call was placed by us or received from the peer. */
  direction: 'incoming' | 'outgoing';
  /** Unix-ms timestamp when the call was initiated. */
  startedAt: number;
  /** Unix-ms timestamp when the call ended (undefined while active). */
  endedAt?: number;
  /** Nostr public key of the remote peer. */
  peerPubKey: string;
}
