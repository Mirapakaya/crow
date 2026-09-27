/**
 * ZWF: Zerion Wire Format adapted for Crow's browser environment.
 *
 * Provides fixed-size, authenticated framing for WebRTC data channels.
 * Every frame is exactly 4096 bytes on the wire, making real messages
 * indistinguishable from cover traffic to a network observer.
 *
 * Adapted from Zerion's ZWF protocol:
 *   - Frame structure: header + ratchet header + body (3 AEAD segments)
 *   - Per-message post-quantum key rotation (ML-KEM-768)
 *   - Stream identifiers for replay protection
 *   - Cover frames for traffic shaping
 *
 * Differences from Zerion's ZWF:
 *   - Uses XChaCha20-Poly1305 (Crow's vault cipher) instead of XSalsa20-Poly1305
 *   - Runs over WebRTC data channels instead of Tor socket streams
 *   - Simplified Mode 3-Full header (no wire-only X25519 DH ratchet)
 */

import { xchacha20poly1305 } from '@noble/ciphers/chacha.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { hkdf } from '@noble/hashes/hkdf.js'
import { hmac } from '@noble/hashes/hmac.js'
import { concatBytes, utf8ToBytes, wipe } from '@/core/util/bytes'
import {
  type KemKeyPair,
  kemKeyGen,
  kemEncapsulate,
  kemDecapsulate,
  PQ,
} from '@/core/crypto/postQuantum'

// ─── Constants ──────────────────────────────────────────────────────────────

/** Fixed frame size on the wire. Same as Zerion. */
export const FRAME_LENGTH = 4096

/** AEAD tag length (Poly1305). */
const TAG_LEN = 16

/** Stream tag length. */
const STREAM_TAG_LEN = 16

/** Nonce length for XChaCha20-Poly1305. */
const NONCE_LEN = 24

/** Maximum payload in a single frame (after headers + tags). */
const FRAME_HEADER_WIRE = 4 + TAG_LEN // 20 bytes
const KEM_HEADER_PLAIN = PQ.KEM_PK + PQ.KEM_CT + 16 // 2288 bytes
const KEM_HEADER_WIRE = KEM_HEADER_PLAIN + TAG_LEN // 2304 bytes
const OVERHEAD = FRAME_HEADER_WIRE + KEM_HEADER_WIRE + TAG_LEN // 2340 bytes
const MAX_PAYLOAD_PER_FRAME = FRAME_LENGTH - OVERHEAD // 1756 bytes

/** ML-KEM key rotation interval (same as Zerion). */
const KEM_ROTATION_INTERVAL = 16

/** How many recent decapsulation keypairs to retain. */
const KEM_SK_RETENTION = 32

/** Domain separators. */
const DOMAIN = {
  streamTag: 'crow/zwf/stream-tag/v1',
  streamChain: 'crow/zwf/stream-chain/v1',
  chainAdvance: 'crow/zwf/chain-advance/v1',
  classicalMsgKey: 'crow/zwf/classical-msg-key/v1',
  hybridBodyKey: 'crow/zwf/hybrid-body-key/v1',
  cover: 'crow/zwf/cover/v1',
} as const

// ─── Stream setup ──────────────────────────────────────────────────────────

export interface StreamParams {
  /** The root key shared between the two peers. */
  rootKey: Uint8Array
  /** Who initiated this stream. */
  isInitiator: boolean
}

/**
 * Derive the initial chain key for a stream.
 *
 * Both sides feed the same inputs and reach the same chain key.
 * The streamId and streamHeaderNonce ensure uniqueness per stream.
 */
export function deriveStreamChainKey(
  rootKey: Uint8Array,
  streamId: Uint8Array,
  headerNonce: Uint8Array,
): Uint8Array {
  return hkdf(
    sha256,
    rootKey,
    concatBytes(streamId, headerNonce),
    utf8ToBytes(DOMAIN.streamChain),
    32,
  )
}

/**
 * Compute the stream tag for peer identification.
 *
 * The tag lets the receiving side identify which contact this stream
 * belongs to, without revealing anything to a relay or observer.
 */
export function computeStreamTag(
  tagKey: Uint8Array,
  streamId: Uint8Array,
): Uint8Array {
  return hmac(sha256, tagKey, concatBytes(utf8ToBytes(DOMAIN.streamTag), streamId)).subarray(0, STREAM_TAG_LEN)
}

// ─── Chain key advancement ──────────────────────────────────────────────────

/**
 * Advance the chain key by one step.
 *
 * Produces the next chain key and a classical message key.
 * This is a one-way function: knowing a message key does not
 * reveal earlier or later chain keys.
 */
export function advanceChain(chainKey: Uint8Array): {
  nextChainKey: Uint8Array
  messageKey: Uint8Array
} {
  const output = hkdf(
    sha256,
    chainKey,
    undefined,
    utf8ToBytes(DOMAIN.chainAdvance),
    64,
  )
  return {
    nextChainKey: output.subarray(0, 32),
    messageKey: output.subarray(32),
  }
}

// ─── Frame encryption ──────────────────────────────────────────────────────

export interface EncryptedFrame {
  /** The 4096-byte encrypted frame. */
  frame: Uint8Array
  /** The ML-KEM public key advertised in this frame (if any). */
  ourKemPk: Uint8Array | null
}

export interface DecryptedFrame {
  /** The decrypted payload. */
  payload: Uint8Array
  /** Whether this is a cover frame (no real payload). */
  isCover: boolean
  /** Frame number in the stream. */
  frameNumber: number
}

/**
 * Frame header plaintext (4 bytes):
 *   - totalPayloadLength (uint16, high bit = final-frame flag)
 *   - paddingLength (uint16)
 */
function encodeFrameHeader(payloadLen: number, paddingLen: number, isFinal: boolean): Uint8Array {
  const header = new Uint8Array(4)
  const dv = new DataView(header.buffer)
  const lenField = (isFinal ? 0x8000 : 0) | (payloadLen & 0x7fff)
  dv.setUint16(0, lenField, false)
  dv.setUint16(2, paddingLen, false)
  return header
}

function decodeFrameHeader(header: Uint8Array): { payloadLen: number; paddingLen: number; isFinal: boolean } {
  const dv = new DataView(header.buffer, header.byteOffset, header.byteLength)
  const raw = dv.getUint16(0, false)
  return {
    isFinal: (raw & 0x8000) !== 0,
    payloadLen: raw & 0x7fff,
    paddingLen: dv.getUint16(2, false),
  }
}

/**
 * Build a frame nonce from stream ID, frame number, and segment index.
 *
 * Structurally derived — never sent on the wire.
 */
function frameNonce(streamId: Uint8Array, frameNumber: number, segment: number, originator: boolean): Uint8Array {
  const nonce = new Uint8Array(NONCE_LEN)
  nonce.set(streamId.subarray(0, 8), 0)
  const dv = new DataView(nonce.buffer, nonce.byteOffset, nonce.byteLength)
  dv.setBigUint64(0, BigInt(0), true) // streamId bytes
  dv.setBigUint64(8, BigInt(frameNumber), true)
  nonce[16] = 0x80 // domain marker
  nonce[17] = segment
  nonce[18] = originator ? 1 : 0
  return nonce
}

/**
 * Derive the hybrid body key by mixing the post-quantum shared secret
 * into the classical message key.
 */
export function deriveHybridBodyKey(
  classicalMessageKey: Uint8Array,
  pqSharedSecret: Uint8Array,
): Uint8Array {
  return hkdf(
    sha256,
    concatBytes(classicalMessageKey, pqSharedSecret),
    undefined,
    utf8ToBytes(DOMAIN.hybridBodyKey),
    32,
  )
}

// ─── ZWF Stream encrypter ──────────────────────────────────────────────────

export class ZwfStreamEncrypter {
  #chainKey: Uint8Array
  #streamId: Uint8Array
  #frameNumber = 0
  #kemKeyPair: KemKeyPair
  #sendsSinceRotation = 0

  constructor(chainKey: Uint8Array, streamId: Uint8Array) {
    this.#chainKey = chainKey
    this.#streamId = streamId
    this.#kemKeyPair = kemKeyGen()
  }

  /**
   * Encrypt a payload into a fixed-size frame.
   *
   * If the payload is null, a cover frame is emitted (indistinguishable
   * from a real frame on the wire).
   */
  encrypt(payload: Uint8Array | null, peerKemPk: Uint8Array | null): EncryptedFrame {
    const realPayload = payload ?? new Uint8Array(0)

    // Advance chain
    const { nextChainKey, messageKey } = advanceChain(this.#chainKey)
    this.#chainKey = nextChainKey

    // Segment 0: frame header
    const paddingLen = MAX_PAYLOAD_PER_FRAME - realPayload.length
    const header = encodeFrameHeader(realPayload.length, paddingLen, false)
    const headerNonce = frameNonce(this.#streamId, this.#frameNumber, 0, true)
    const headerCipher = xchacha20poly1305(messageKey, headerNonce)
    const encryptedHeader = headerCipher.encrypt(header) // 4 + 16 = 20 bytes

    // Segment 1: KEM header (Mode 3-Full)
    const kemHeader = this.#buildKemHeader(peerKemPk)
    const kemNonce = frameNonce(this.#streamId, this.#frameNumber, 1, true)
    const kemCipher = xchacha20poly1305(messageKey, kemNonce)
    const encryptedKemHeader = kemCipher.encrypt(kemHeader)

    // Segment 2: body — plaintext is always MAX_PAYLOAD_PER_FRAME bytes
    const bodyPlaintext = concatBytes(realPayload, new Uint8Array(MAX_PAYLOAD_PER_FRAME - realPayload.length))
    const bodyKey = peerKemPk
      ? deriveHybridBodyKey(messageKey, this.#pqSharedSecretForPeer(peerKemPk))
      : messageKey
    const bodyNonce = frameNonce(this.#streamId, this.#frameNumber, 2, true)
    const bodyCipher = xchacha20poly1305(bodyKey, bodyNonce)
    const encryptedBody = bodyCipher.encrypt(bodyPlaintext)

    // Assemble frame: header(20) + kemHeader(2304) + body(1756 + 16 = 1772)
    const frame = concatBytes(encryptedHeader, encryptedKemHeader, encryptedBody)

    // Rotate KEM key if needed
    this.#sendsSinceRotation++
    if (this.#sendsSinceRotation >= KEM_ROTATION_INTERVAL) {
      wipe(this.#kemKeyPair.secretKey)
      this.#kemKeyPair = kemKeyGen()
      this.#sendsSinceRotation = 0
    }

    this.#frameNumber++
    wipe(messageKey)

    return { frame, ourKemPk: this.#kemKeyPair.publicKey }
  }

  /** Our current ML-KEM encapsulation key (for the peer to encapsulate to). */
  get ourKemPublicKey(): Uint8Array {
    return this.#kemKeyPair.publicKey
  }

  #buildKemHeader(peerKemPk: Uint8Array | null): Uint8Array {
    // Simplified Mode 3-Full header:
    //   ourKemPk(1184) | kemCt(1088 or zero-sentinel) | kemPkId(16)
    const ourPk = this.#kemKeyPair.publicKey
    const pkId = hmac(sha256, new Uint8Array(0), ourPk).subarray(0, 16)

    if (peerKemPk) {
      const { ciphertext, sharedSecret } = kemEncapsulate(peerKemPk)
      // Store PQ secret for body key derivation (per-message)
      this.#lastPqSharedSecret = sharedSecret
      return concatBytes(ourPk, ciphertext, pkId)
    }

    // Zero-sentinel (first frame, before peer key is known)
    this.#lastPqSharedSecret = null
    return concatBytes(ourPk, new Uint8Array(PQ.KEM_CT), pkId)
  }

  #lastPqSharedSecret: Uint8Array | null = null

  #pqSharedSecretForPeer(peerKemPk: Uint8Array): Uint8Array {
    if (this.#lastPqSharedSecret) return this.#lastPqSharedSecret
    const { sharedSecret } = kemEncapsulate(peerKemPk)
    this.#lastPqSharedSecret = sharedSecret
    return sharedSecret
  }
}

// ─── ZWF Stream decrypter ──────────────────────────────────────────────────

export class ZwfStreamDecrypter {
  #chainKey: Uint8Array
  #streamId: Uint8Array
  #frameNumber = 0
  #kemSkCache: Array<{ id: Uint8Array; keyPair: KemKeyPair }> = []
  #pqConfirmed = false

  constructor(chainKey: Uint8Array, streamId: Uint8Array, initialKemSk: KemKeyPair) {
    this.#chainKey = chainKey
    this.#streamId = streamId
    this.#addKemSk(initialKemSk)
  }

  /**
   * Decrypt a fixed-size frame.
   *
   * Returns the decrypted payload, or marks it as cover.
   * Throws on any authentication failure (fail-closed).
   */
  decrypt(frame: Uint8Array): DecryptedFrame {
    if (frame.length !== FRAME_LENGTH) throw new Error('frame must be exactly 4096 bytes')

    // Advance chain
    const { nextChainKey, messageKey } = advanceChain(this.#chainKey)
    this.#chainKey = nextChainKey

    // Segment 0: frame header (20 bytes = 4 plaintext + 16 tag)
    const headerNonce = frameNonce(this.#streamId, this.#frameNumber, 0, false)
    const headerCipher = xchacha20poly1305(messageKey, headerNonce)
    const decryptedHeader = headerCipher.decrypt(frame.subarray(0, 20))
    const { payloadLen, paddingLen } = decodeFrameHeader(decryptedHeader)

    // Segment 1: KEM header
    const kemHeaderOffset = 20
    const kemNonce = frameNonce(this.#streamId, this.#frameNumber, 1, false)
    const kemCipher = xchacha20poly1305(messageKey, kemNonce)
    // KEM header size: ourPk(1184) + ct(1088) + pkId(16) = 2288 plaintext + 16 tag = 2304
    const KEM_HEADER_SIZE = PQ.KEM_PK + PQ.KEM_CT + 16 + TAG_LEN
    const decryptedKemHeader = kemCipher.decrypt(frame.subarray(kemHeaderOffset, kemHeaderOffset + KEM_HEADER_SIZE))

    // Parse KEM header (peer's KEM pk starts at byte 0, but is not yet consumed)
    const kemCt = decryptedKemHeader.subarray(PQ.KEM_PK, PQ.KEM_PK + PQ.KEM_CT)
    const pkId = decryptedKemHeader.subarray(PQ.KEM_PK + PQ.KEM_CT, PQ.KEM_PK + PQ.KEM_CT + 16)

    // Decapsulate
    let pqSharedSecret: Uint8Array | null = null
    const isSentinel = kemCt.every((b) => b === 0)

    if (!isSentinel) {
      const kemSk = this.#findKemSk(pkId)
      if (kemSk) {
        pqSharedSecret = kemDecapsulate(kemSk.secretKey, kemCt)
        this.#pqConfirmed = true
      }
    } else if (this.#pqConfirmed) {
      // Reject zero-sentinel after PQ has been confirmed (Zerion claim 2b)
      wipe(messageKey)
      throw new Error('zero KEM ciphertext after PQ confirmation is rejected')
    }

    // Segment 2: body
    const bodyOffset = kemHeaderOffset + KEM_HEADER_SIZE
    const bodyKey = pqSharedSecret
      ? deriveHybridBodyKey(messageKey, pqSharedSecret)
      : messageKey
    const bodyNonce = frameNonce(this.#streamId, this.#frameNumber, 2, false)
    const bodyCipher = xchacha20poly1305(bodyKey, bodyNonce)
    const decryptedBody = bodyCipher.decrypt(frame.subarray(bodyOffset))

    // Verify padding is zero
    const padding = decryptedBody.subarray(payloadLen, payloadLen + paddingLen)
    if (padding.some((b) => b !== 0)) {
      wipe(messageKey)
      throw new Error('non-zero padding detected')
    }

    const num = this.#frameNumber
    this.#frameNumber++
    wipe(messageKey)
    if (pqSharedSecret) wipe(pqSharedSecret)

    const isCover = payloadLen === 0

    return {
      payload: isCover ? new Uint8Array(0) : decryptedBody.subarray(0, payloadLen),
      isCover,
      frameNumber: num,
    }
  }

  /** Add a new KEM decapsulation keypair (when the peer rotates). */
  addKemKeyPair(kp: KemKeyPair): void {
    this.#addKemSk(kp)
  }

  #addKemSk(kp: KemKeyPair): void {
    const id = hmac(sha256, new Uint8Array(0), kp.publicKey).subarray(0, 16)
    this.#kemSkCache.push({ id, keyPair: kp })
    // Evict oldest beyond retention limit
    while (this.#kemSkCache.length > KEM_SK_RETENTION) {
      const evicted = this.#kemSkCache.shift()
      if (evicted) wipe(evicted.keyPair.secretKey)
    }
  }

  #findKemSk(id: Uint8Array): KemKeyPair | null {
    const entry = this.#kemSkCache.find((e) => id.every((b, i) => b === e.id[i]))
    return entry?.keyPair ?? null
  }
}
