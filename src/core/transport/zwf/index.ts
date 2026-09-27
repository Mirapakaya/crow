/**
 * ZWF module: Zerion Wire Format for Crow's WebRTC data channels.
 *
 * Provides fixed-size authenticated framing with per-message
 * post-quantum protection and constant-rate traffic shaping.
 *
 * See framing.ts for the wire format and encryption.
 * See pacing.ts for the send scheduler and cover traffic.
 */

export { FRAME_LENGTH, ZwfStreamEncrypter, ZwfStreamDecrypter } from './framing'
export type { EncryptedFrame, DecryptedFrame, StreamParams } from './framing'

export { PacedSender } from './pacing'
export type { PacingConfig, QueuedRecord } from './pacing'
