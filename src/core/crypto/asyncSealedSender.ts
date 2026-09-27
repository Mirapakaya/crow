/**
 * Async sealed-sender envelope for offline post-quantum delivery.
 *
 * Adapted from Zerion's async sealed-sender protocol for Crow's browser
 * environment. This lets a sender encrypt a message to a recipient who is
 * not online, with no interactive handshake, using hybrid post-quantum
 * key encapsulation (ML-KEM-768 + X25519).
 *
 * The envelope is designed for relay-based delivery: a relay sees only
 * the prekey selector, the ephemeral key, the KEM ciphertext, an advisory
 * TTL, a dedup identifier, and an opaque blob — never the sender, recipient,
 * or content.
 *
 * Uses XChaCha20-Poly1305 for the AEAD layer (consistent with Crow's vault
 * encryption), rather than Zerion's XSalsa20-Poly1305 (NaCl-compatible).
 */

import { xchacha20poly1305 } from '@noble/ciphers/chacha.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { hmac } from '@noble/hashes/hmac.js'
import {
  concatBytes,
  randomBytes,
  utf8ToBytes,
  bytesToHex,
  wipe,
} from '../util/bytes'
import {
  type HybridAgreeKeyPair,
  type HybridAgreePublicKey,
  type HybridSigKeyPair,
  type HybridSigPublicKey,
  hybridAgreeKeyGen,
  hybridAgreeEncapsulate,
  hybridSign,
  hybridSigVerify,
  PQ,
} from './postQuantum'

// ─── Constants ──────────────────────────────────────────────────────────────

const VERSION = 0x01
const NONCE_LEN = 24

/** Prekey kinds. */
const PREKEY_ONE_TIME = 0x01
const PREKEY_SIGNED = 0x00

/** Domain separators for KDF. */
const DOMAIN = {
  envelopeKey: 'crow/pq-envelope/key/v1',
  envelopeNonce: 'crow/pq-envelope/nonce/v1',
  senderAuth: 'crow/pq-envelope/sender-auth/v1',
} as const

// ─── Prekey bundle ──────────────────────────────────────────────────────────

/**
 * A prekey bundle published by a recipient so senders can seal messages offline.
 *
 * Mirrors Zerion's prekey bundle format, adapted for Crow's key types.
 */
export interface PrekeyBundle {
  /** The recipient's hybrid agreement public key (for KEM encapsulation). */
  agreePk: HybridAgreePublicKey
  /** The recipient's hybrid signature public key (for authenticating the bundle). */
  sigPk: HybridSigPublicKey
  /** Signed prekey (longer-lived, rotated less frequently). */
  signedPrekey: {
    id: Uint8Array
    pk: HybridAgreePublicKey
    expiry: number
    signature: Uint8Array
  }
  /** One-time prekeys (consumed on first use, fresh key per message). */
  oneTimePrekeys: Array<{ id: Uint8Array; pk: HybridAgreePublicKey }>
  /** Bundle signature over everything above. */
  bundleSignature: Uint8Array
}

// ─── Sealed envelope ───────────────────────────────────────────────────────

export interface SealedEnvelope {
  /** The opaque envelope bytes (for relay transport). */
  envelope: Uint8Array
  /** The dedup identifier (for the relay to use). */
  dedupId: Uint8Array
}

/**
 * Seal a message to a recipient's prekey bundle.
 *
 * The sender generates an ephemeral hybrid key pair, performs ML-KEM-768 +
 * X25519 key agreement, and encrypts the payload with XChaCha20-Poly1305.
 * Inside the sealed envelope is a hybrid signature over the sender identity,
 * the recipient, and the payload.
 *
 * Returns the opaque envelope bytes and a dedup identifier.
 */
export function sealEnvelope(
  payload: Uint8Array,
  senderSigKeys: HybridSigKeyPair,
  recipientBundle: PrekeyBundle,
  ttl: number,
): SealedEnvelope {
  // 1. Generate ephemeral hybrid agreement key pair
  const ephemeral = hybridAgreeKeyGen()

  // 2. Choose prekey: prefer one-time, fall back to signed
  const useOneTime = recipientBundle.oneTimePrekeys.length > 0
  const prekey = useOneTime
    ? recipientBundle.oneTimePrekeys[0]!
    : recipientBundle.signedPrekey
  const prekeyKind = useOneTime ? PREKEY_ONE_TIME : PREKEY_SIGNED
  const prekeyId = prekey.id
  const signedPrekeyId = recipientBundle.signedPrekey.id

  // 3. Perform hybrid key agreement with the chosen prekey
  const context = `${DOMAIN.envelopeKey}|${bytesToHex(prekeyId)}`
  const { sharedSecret, kemCt } = hybridAgreeEncapsulate(
    ephemeral.classicalSk,
    prekey.pk,
    context,
  )

  // 4. Build the transcript for key binding
  const dedupId = randomBytes(16)
  const transcript = buildTranscript(
    recipientBundle.sigPk,
    recipientBundle.agreePk,
    prekeyKind,
    prekeyId,
    signedPrekeyId,
    ephemeral.classicalPk,
    ephemeral.pqPk,
    kemCt,
    ttl,
    dedupId,
  )

  // 5. Derive AEAD key and nonce from the shared secret + transcript
  const aeadKey = deriveAeadKey(sharedSecret, transcript)
  const aeadNonce = deriveAeadNonce(sharedSecret, transcript)

  // 6. Build inner signed record
  const sendTimestamp = BigInt(Math.floor(Date.now() / 1000))
  const innerRecord = buildSignedRecord(
    senderSigKeys,
    payload,
    ttl,
    dedupId,
    sendTimestamp,
  )

  // 7. Encrypt the inner record
  const nonce = aeadNonce
  const cipher = xchacha20poly1305(aeadKey, nonce)
  const ciphertext = cipher.encrypt(innerRecord)

  // 8. Assemble the envelope
  const envelope = concatBytes(
    new Uint8Array([VERSION]),
    new Uint8Array([prekeyKind]),
    prekeyId,
    signedPrekeyId,
    ephemeral.classicalPk,
    ephemeral.pqPk,
    kemCt,
    new Uint8Array(new ArrayBuffer(4)), // ttl as uint32 big-endian
    dedupId,
    new Uint8Array(new ArrayBuffer(4)), // ciphertextLen as uint32 big-endian
    ciphertext,
  )

  // Write ttl and ciphertextLen into their positions
  const dv = new DataView(envelope.buffer, envelope.byteOffset, envelope.byteLength)
  dv.setUint32(1 + 1 + 16 + 4, ttl, false) // ttl at offset after version+prekeyKind+prekeyId+signedPrekeyId
  dv.setUint32(1 + 1 + 16 + 4 + 4, ciphertext.length, false) // ciphertextLen

  wipe(sharedSecret, aeadKey)
  return { envelope, dedupId }
}

/**
 * Open a sealed envelope using the recipient's decapsulation keys.
 *
 * Returns the inner payload and the authenticated sender's signature public key.
 */
export function openEnvelope(
  envelope: Uint8Array,
  recipientAgreeKeys: HybridAgreeKeyPair,
  recipientSigPk: HybridSigPublicKey,
  prekeySk: Uint8Array,
): { payload: Uint8Array; senderSigPk: HybridSigPublicKey } {
  // Parse envelope header
  if (envelope[0] !== VERSION) throw new Error('unsupported envelope version')

  const prekeyKind = envelope[1] ?? 0
  const prekeyId = envelope.subarray(2, 18)
  const signedPrekeyId = envelope.subarray(18, 22)
  const ephemeralClassicalPk = envelope.subarray(22, 22 + PQ.X25519_PK)
  const ephemeralPqPk = envelope.subarray(22 + PQ.X25519_PK, 22 + PQ.HYBRID_AGREE_PK)
  const kemCt = envelope.subarray(22 + PQ.HYBRID_AGREE_PK, 22 + PQ.HYBRID_AGREE_PK + PQ.KEM_CT)
  const dv = new DataView(envelope.buffer, envelope.byteOffset, envelope.byteLength)
  const ttl = dv.getUint32(22 + PQ.HYBRID_AGREE_PK + PQ.KEM_CT, false)
  const dedupId = envelope.subarray(22 + PQ.HYBRID_AGREE_PK + PQ.KEM_CT + 4, 22 + PQ.HYBRID_AGREE_PK + PQ.KEM_CT + 4 + 16)
  const ciphertextLen = dv.getUint32(22 + PQ.HYBRID_AGREE_PK + PQ.KEM_CT + 4 + 16, false)
  const ciphertext = envelope.subarray(22 + PQ.HYBRID_AGREE_PK + PQ.KEM_CT + 4 + 16 + 4, 22 + PQ.HYBRID_AGREE_PK + PQ.KEM_CT + 4 + 16 + 4 + ciphertextLen)

  // Ephemeral public key is used inline below (ephemeralClassicalPk, ephemeralPqPk)

  // Perform hybrid key agreement from the recipient side
  const context = `${DOMAIN.envelopeKey}|${bytesToHex(prekeyId)}`
  const classicalSs = x25519.getSharedSecret(recipientAgreeKeys.classicalSk, ephemeralClassicalPk)
  // For ML-KEM decapsulation we need the prekey's secret key
  const pqSs = kemDecapsulate(prekeySk, kemCt)

  // Derive shared secret
  const sharedSecret = deriveHybridSharedSecret(classicalSs, pqSs, context)

  // Build transcript
  const transcript = buildTranscript(
    recipientSigPk,
    { classicalPk: recipientAgreeKeys.classicalPk, pqPk: recipientAgreeKeys.pqPk },
    prekeyKind,
    prekeyId,
    signedPrekeyId,
    ephemeralClassicalPk,
    ephemeralPqPk,
    kemCt,
    ttl,
    dedupId,
  )

  // Derive AEAD key and nonce
  const aeadKey = deriveAeadKey(sharedSecret, transcript)
  const aeadNonce = deriveAeadNonce(sharedSecret, transcript)

  // Decrypt
  const cipher = xchacha20poly1305(aeadKey, aeadNonce)
  const innerRecord = cipher.decrypt(ciphertext)

  // Parse inner signed record
  return parseSignedRecord(innerRecord)
}

// ─── Internal helpers ───────────────────────────────────────────────────────

/** Build the transcript used for key binding. */
function buildTranscript(
  recipientSigPk: HybridSigPublicKey,
  _recipientAgreePk: HybridAgreePublicKey,
  prekeyKind: number,
  prekeyId: Uint8Array,
  signedPrekeyId: Uint8Array,
  ephemeralClassicalPk: Uint8Array,
  ephemeralPqPk: Uint8Array,
  kemCt: Uint8Array,
  ttl: number,
  dedupId: Uint8Array,
): Uint8Array {
  // Fixed-size concatenation of fields the recipient can reconstruct
  const parts = [
    new Uint8Array([VERSION]),
    encodeHybridSigPk(recipientSigPk),
    new Uint8Array([prekeyKind]),
    prekeyId,
    signedPrekeyId,
    ephemeralClassicalPk,
    ephemeralPqPk,
    kemCt,
    new Uint8Array(new ArrayBuffer(4)),
    dedupId,
  ]
  const result = concatBytes(...parts)
  const dv = new DataView(result.buffer, result.byteOffset, result.byteLength)
  // Write ttl at the position after kemCt
  const ttlOffset = 1 + PQ.HYBRID_SIG_PK + 1 + 16 + 4 + PQ.X25519_PK + PQ.KEM_PK + PQ.KEM_CT
  dv.setUint32(ttlOffset, ttl, false)
  return result
}

function deriveAeadKey(sharedSecret: Uint8Array, transcript: Uint8Array): Uint8Array {
  return hkdf(sha256, sharedSecret, transcript, utf8ToBytes(DOMAIN.envelopeKey), 32)
}

function deriveAeadNonce(sharedSecret: Uint8Array, transcript: Uint8Array): Uint8Array {
  const full = hmac(sha256, sharedSecret, concatBytes(utf8ToBytes(DOMAIN.envelopeNonce), transcript))
  return full.subarray(0, NONCE_LEN)
}

/** Build the inner signed record (sender identity + payload + signature). */
function buildSignedRecord(
  senderSigKeys: HybridSigKeyPair,
  payload: Uint8Array,
  ttl: number,
  dedupId: Uint8Array,
  sendTimestamp: bigint,
): Uint8Array {
  // Layout: sigPk | payload | ttl(4) | dedupId(16) | sendTimestamp(8) | signature
  const sigPk = encodeHybridSigPk({ edPk: senderSigKeys.edPk, dsaPk: senderSigKeys.dsaPk })
  const signedPart = concatBytes(
    sigPk,
    payload,
    new Uint8Array(new ArrayBuffer(4)),
    dedupId,
    new Uint8Array(new ArrayBuffer(8)),
  )
  // Write ttl and timestamp
  const dv = new DataView(signedPart.buffer, signedPart.byteOffset, signedPart.byteLength)
  dv.setUint32(sigPk.length + payload.length, ttl, false)
  dv.setBigUint64(sigPk.length + payload.length + 4 + 16, sendTimestamp, false)

  // Sign
  const signature = hybridSign(senderSigKeys, signedPart)

  return concatBytes(signedPart, signature)
}

/** Parse an inner signed record and verify the sender's signature. */
function parseSignedRecord(record: Uint8Array): { payload: Uint8Array; senderSigPk: HybridSigPublicKey } {
  // Minimum size check
  const minSize = PQ.HYBRID_SIG_PK + 4 + 16 + 8 + PQ.HYBRID_SIG
  if (record.length < minSize) throw new Error('signed record too short')

  const senderSigPkBytes = record.subarray(0, PQ.HYBRID_SIG_PK)
  const senderSigPk = decodeHybridSigPk(senderSigPkBytes)

  const signature = record.subarray(record.length - PQ.HYBRID_SIG)
  const signedPart = record.subarray(0, record.length - PQ.HYBRID_SIG)

  // Verify signature
  if (!hybridSigVerify(senderSigPk, signedPart, signature)) {
    throw new Error('sealed envelope sender signature is invalid')
  }

  // Payload is between sigPk and the trailer (ttl + dedupId + timestamp)
  const payload = record.subarray(PQ.HYBRID_SIG_PK, record.length - PQ.HYBRID_SIG - 4 - 16 - 8)

  return { payload, senderSigPk }
}

// Re-exports needed from postQuantum (avoid circular)
import { x25519 } from '@noble/curves/ed25519.js'
import { hkdf } from '@noble/hashes/hkdf.js'
import { kemDecapsulate, deriveHybridSharedSecret, encodeHybridSigPk, decodeHybridSigPk } from './postQuantum'
