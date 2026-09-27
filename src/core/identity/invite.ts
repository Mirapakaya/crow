/**
 * Secure invite codec for Crow.
 *
 * Invites encode a peer's identity key (and optional relay hint) into a
 * compact, base64url string that can be shared out-of-band (QR code, URL,
 * etc.).  The payload includes a timestamp to enforce expiry.
 */

/** Payload carried by a Crow invite. */
export interface InvitePayload {
  /** 33-byte compressed secp256k1 identity public key. */
  identityKey: Uint8Array;
  /** Optional relay server hostname for connection bootstrapping. */
  relayHint?: string;
  /** Unix timestamp (ms) when the invite was created. */
  timestamp: number;
}

/** Invite expiry: 7 days in milliseconds. */
export const INVITE_EXPIRY = 7 * 86_400_000;

// ────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Encode a `Uint8Array` as base64url (RFC 4648 §5) without padding.
 */
function base64urlEncode(data: Uint8Array): string {
  let binary = '';
  for (const byte of data) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decode a base64url string (without padding) to `Uint8Array`.
 */
function base64urlDecode(encoded: string): Uint8Array {
  // Restore padding
  let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const pad = (4 - (base64.length % 4)) % 4;
  base64 += '='.repeat(pad);

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ────────────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────────────

/**
 * Encode an invite payload as a compact base64url string.
 *
 * Wire format (binary, little-endian where applicable):
 * ```
 * [1 byte: flags]
 *   bit 0 = has relay hint
 * [33 bytes: identityKey (compressed)]
 * [if hasRelay: 1 byte relayLen + relayLen bytes: relayHint (UTF-8)]
 * [8 bytes: timestamp (big-endian uint64)]
 * ```
 *
 * @returns Base64url-encoded string (no padding).
 */
export function encodeInvite(payload: InvitePayload): string {
  const hasRelay = payload.relayHint != null;
  const flags = hasRelay ? 1 : 0;

  const relayBytes = hasRelay
    ? new TextEncoder().encode(payload.relayHint!)
    : new Uint8Array(0);

  // Validate relay length fits in 1 byte
  if (relayBytes.length > 255) {
    throw new Error('Relay hint too long (max 255 UTF-8 bytes)');
  }

  const buf = new Uint8Array(
    1 +                           // flags
    33 +                          // identityKey
    (hasRelay ? 1 + relayBytes.length : 0) + // relay
    8,                            // timestamp
  );

  let offset = 0;

  // Flags
  buf[offset] = flags;
  offset += 1;

  // Identity key
  buf.set(payload.identityKey, offset);
  offset += 33;

  // Relay hint
  if (hasRelay) {
    buf[offset] = relayBytes.length;
    offset += 1;
    buf.set(relayBytes, offset);
    offset += relayBytes.length;
  }

  // Timestamp (big-endian uint64)
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  view.setBigUint64(offset, BigInt(payload.timestamp), false); // big-endian
  offset += 8;

  return base64urlEncode(buf.slice(0, offset));
}

/**
 * Decode and validate a base64url-encoded invite string.
 *
 * @param encoded  Base64url string produced by {@link encodeInvite}.
 * @returns The decoded invite payload.
 * @throws If the encoding is invalid or the invite has expired.
 */
export function decodeInvite(encoded: string): InvitePayload {
  const buf = base64urlDecode(encoded);
  let offset = 0;

  // Flags
  if (offset >= buf.length) throw new Error('Invalid invite: too short');
  const flags = buf[offset];
  offset += 1;
  const hasRelay = (flags & 1) === 1;

  // Identity key
  if (offset + 33 > buf.length) throw new Error('Invalid invite: truncated identity key');
  const identityKey = buf.slice(offset, offset + 33);
  offset += 33;

  // Relay hint
  let relayHint: string | undefined;
  if (hasRelay) {
    if (offset >= buf.length) throw new Error('Invalid invite: missing relay length');
    const relayLen = buf[offset];
    offset += 1;
    if (offset + relayLen > buf.length) throw new Error('Invalid invite: truncated relay hint');
    relayHint = new TextDecoder().decode(buf.slice(offset, offset + relayLen));
    offset += relayLen;
  }

  // Timestamp
  if (offset + 8 > buf.length) throw new Error('Invalid invite: truncated timestamp');
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const timestamp = Number(view.getBigUint64(offset, false)); // big-endian
  offset += 8;

  // Expiry check
  const now = Date.now();
  if (now - timestamp > INVITE_EXPIRY) {
    throw new Error('Invite has expired');
  }
  // Also reject invites with timestamps in the far future (clock skew > 1 hour)
  if (timestamp > now + 3_600_000) {
    throw new Error('Invite timestamp is in the future');
  }

  return { identityKey, relayHint, timestamp };
}
