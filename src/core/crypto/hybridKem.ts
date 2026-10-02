import { x25519 } from '@noble/curves/ed25519.js'
import { ml_kem768 } from '@noble/post-quantum/ml-kem.js'
import { expand, extract } from '@noble/hashes/hkdf.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToB64, b64ToBytes, concatBytes, randomBytes, utf8ToBytes, wipe } from '../util/bytes'

/**
 * X25519 + ML-KEM-768 hybrid key exchange (X-Wing-style).
 *
 * The initiator generates an X25519 keypair and an ML-KEM-768 keypair and
 * advertises the concatenated public key. The responder generates an X25519
 * keypair, performs an X25519 DH with the initiator's X25519 public key, and
 * encapsulates an ML-KEM-768 shared secret under the initiator's ML-KEM-768
 * public key. The response is the responder's X25519 public key concatenated
 * with the ML-KEM-768 ciphertext.
 *
 * Both sides derive the final shared secret with HKDF-SHA256 over the DH
 * result, the KEM shared secret, and a transcript of the public values. The
 * resulting 32-byte secret is suitable as seed material for an MLS group.
 */

/** Info string for HKDF. */
const HYBRID_INFO = utf8ToBytes('crow-hybrid-pq-v1')

/** X25519 public key length, fixed by RFC 7748. */
const X25519_LEN = 32

/** ML-KEM-768 public key length (FIPS 203 Table 3). */
export const ML_KEM_PUBLIC_KEY_LEN = 1184

/** ML-KEM-768 secret key length. */
export const ML_KEM_SECRET_KEY_LEN = 2400

/** ML-KEM-768 ciphertext length. */
export const ML_KEM_CIPHER_LEN = 1088

/** Combined hybrid public key length. */
export const HYBRID_PUBLIC_KEY_LEN = X25519_LEN + ML_KEM_PUBLIC_KEY_LEN // 1216

/** Combined hybrid secret key length. */
export const HYBRID_SECRET_KEY_LEN = X25519_LEN + ML_KEM_SECRET_KEY_LEN

/** Combined hybrid ciphertext length. */
export const HYBRID_CIPHER_LEN = X25519_LEN + ML_KEM_CIPHER_LEN // 1120

export interface HybridKeyPair {
  /** X25519 private key (32 bytes) + ML-KEM-768 secret key. */
  secretKey: Uint8Array
  /** X25519 public key (32 bytes) + ML-KEM-768 public key. */
  publicKey: Uint8Array
}

export interface HybridEncapsulation {
  cipherText: Uint8Array
  sharedSecret: Uint8Array
}

/** Generate a fresh ephemeral keypair for the hybrid handshake. */
export function generateHybridKeyPair(): HybridKeyPair {
  const xPriv = randomBytes(X25519_LEN)
  const xPub = x25519.getPublicKey(xPriv)
  const { secretKey: mPriv, publicKey: mPub } = ml_kem768.keygen()
  if (mPub.length !== ML_KEM_PUBLIC_KEY_LEN || mPriv.length !== ML_KEM_SECRET_KEY_LEN) {
    throw new Error('unexpected ML-KEM-768 key length')
  }
  return { secretKey: concatBytes(xPriv, mPriv), publicKey: concatBytes(xPub, mPub) }
}

function x25519Of(publicKey: Uint8Array): Uint8Array {
  return publicKey.subarray(0, X25519_LEN)
}

function mlkemPubOf(publicKey: Uint8Array): Uint8Array {
  return publicKey.subarray(X25519_LEN)
}

function x25519PrivOf(secretKey: Uint8Array): Uint8Array {
  return secretKey.subarray(0, X25519_LEN)
}

function mlkemPrivOf(secretKey: Uint8Array): Uint8Array {
  return secretKey.subarray(X25519_LEN)
}

function hybridSharedSecret(dh: Uint8Array, kem: Uint8Array, transcript: Uint8Array): Uint8Array {
  const ikm = concatBytes(dh, kem, transcript)
  return expand(sha256, extract(sha256, ikm, new Uint8Array(0)), HYBRID_INFO, 32)
}

/**
 * Encapsulate a shared secret to an initiator's hybrid public key.
 * The returned ciphertext is what the responder sends back in the accept frame.
 */
export function encapsulateHybrid(publicKey: Uint8Array): HybridEncapsulation {
  if (!isValidHybridPublicKey(publicKey)) throw new Error('invalid hybrid public key length')
  const yPriv = randomBytes(X25519_LEN)
  const yPub = x25519.getPublicKey(yPriv)
  const xPub = x25519Of(publicKey)
  const dh = x25519.getSharedSecret(yPriv, xPub)
  const { cipherText, sharedSecret: kemShared } = ml_kem768.encapsulate(mlkemPubOf(publicKey))
  if (cipherText.length !== ML_KEM_CIPHER_LEN) throw new Error('unexpected ML-KEM cipher length')
  const out = concatBytes(yPub, cipherText)
  const ss = hybridSharedSecret(dh, kemShared, out)
  wipe(dh, kemShared)
  return { cipherText: out, sharedSecret: ss }
}

/**
 * Recover the shared secret from the ciphertext using the initiator's secret key.
 */
export function decapsulateHybrid(cipherText: Uint8Array, secretKey: Uint8Array): Uint8Array {
  if (!isValidHybridCipherText(cipherText)) throw new Error('invalid hybrid ciphertext length')
  if (secretKey.length !== HYBRID_SECRET_KEY_LEN) throw new Error('invalid hybrid secret key length')
  const yPub = cipherText.subarray(0, X25519_LEN)
  const ct = cipherText.subarray(X25519_LEN)
  const dh = x25519.getSharedSecret(x25519PrivOf(secretKey), yPub)
  const kemShared = ml_kem768.decapsulate(ct, mlkemPrivOf(secretKey))
  const ss = hybridSharedSecret(dh, kemShared, cipherText)
  wipe(dh, kemShared)
  return ss
}

/** Derive a 32-byte MLS group seed from the hybrid shared secret. */
export function deriveMlsSeed(sharedSecret: Uint8Array): Uint8Array {
  if (sharedSecret.length !== 32) throw new Error('shared secret must be 32 bytes')
  return sharedSecret
}

/** Encode a public key or ciphertext for a control frame. */
export function encodeHybridBytes(bytes: Uint8Array): string {
  return bytesToB64(bytes)
}

/** Decode a public key or ciphertext from a control frame. */
export function decodeHybridBytes(b64: string): Uint8Array {
  return b64ToBytes(b64)
}

/** Best-effort zeroization of hybrid key material. */
export function wipeHybridKeys(...keys: (Uint8Array | undefined)[]): void {
  for (const key of keys) wipe(key)
}

/** Validate that a decoded byte string has the expected hybrid public key length. */
export function isValidHybridPublicKey(bytes: Uint8Array): boolean {
  return bytes.length === HYBRID_PUBLIC_KEY_LEN
}

export function isValidHybridCipherText(bytes: Uint8Array): boolean {
  return bytes.length === HYBRID_CIPHER_LEN
}

export { concatBytes }
