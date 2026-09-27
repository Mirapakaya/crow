/**
 * Post-quantum cryptographic primitives for Crow.
 *
 * Integrates Zerion's post-quantum technology (ML-KEM-768, ML-DSA-65) into
 * Crow's existing @noble crypto stack. Provides hybrid key agreement and
 * hybrid signatures that combine classical and post-quantum primitives, so
 * an attacker must break both families to succeed.
 *
 * Architecture follows Zerion's Mode 3-Full design:
 *   - Hybrid key agreement: X25519 + ML-KEM-768 → shared secret
 *   - Hybrid signatures: Ed25519 + ML-DSA-65 → signature
 *   - Per-message post-quantum protection, not just at handshake
 *
 * All primitives are pure TypeScript (no WASM), preserving Crow's strict CSP.
 */

import { ml_kem768 } from '@noble/post-quantum/ml-kem.js'
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js'
import { x25519 } from '@noble/curves/ed25519.js'
import { ed25519 } from '@noble/curves/ed25519.js'
import { sha512 } from '@noble/hashes/sha2.js'
import { hkdf } from '@noble/hashes/hkdf.js'
import { concatBytes, randomBytes, wipe, utf8ToBytes } from '../util/bytes'

// ─── Key sizes ──────────────────────────────────────────────────────────────

export const PQ = {
  /** ML-KEM-768 encapsulation key size. */
  KEM_PK: 1184,
  /** ML-KEM-768 decapsulation key size. */
  KEM_SK: 2400,
  /** ML-KEM-768 ciphertext size. */
  KEM_CT: 1088,
  /** ML-KEM-768 shared secret size. */
  KEM_SS: 32,
  /** ML-DSA-65 public key size. */
  DSA_PK: 1952,
  /** ML-DSA-65 secret key size. */
  DSA_SK: 4032,
  /** ML-DSA-65 signature size. */
  DSA_SIG: 3309,
  /** X25519 public key size. */
  X25519_PK: 32,
  /** Ed25519 public key size. */
  ED25519_PK: 32,
  /** Ed25519 signature size. */
  ED25519_SIG: 64,
  /** Hybrid agreement public key: X25519(32) + ML-KEM(1184). */
  HYBRID_AGREE_PK: 32 + 1184,
  /** Hybrid signature public key: Ed25519(32) + ML-DSA(1952). */
  HYBRID_SIG_PK: 32 + 1952,
  /** Hybrid signature: Ed25519(64) + ML-DSA(3309). */
  HYBRID_SIG: 64 + 3309,
} as const

// ─── ML-KEM-768 key encapsulation ───────────────────────────────────────────

export interface KemKeyPair {
  publicKey: Uint8Array
  secretKey: Uint8Array
}

export interface KemEncapsulation {
  ciphertext: Uint8Array
  sharedSecret: Uint8Array
}

/** Generate an ML-KEM-768 key pair. */
export function kemKeyGen(): KemKeyPair {
  return ml_kem768.keygen()
}

/** Encapsulate to an ML-KEM-768 public key, producing a ciphertext and shared secret. */
export function kemEncapsulate(publicKey: Uint8Array): KemEncapsulation {
  const { cipherText, sharedSecret } = ml_kem768.encapsulate(publicKey)
  return { ciphertext: cipherText, sharedSecret }
}

/** Decapsulate an ML-KEM-768 ciphertext using a secret key, producing the shared secret. */
export function kemDecapsulate(secretKey: Uint8Array, ciphertext: Uint8Array): Uint8Array {
  return ml_kem768.decapsulate(ciphertext, secretKey)
}

// ─── ML-DSA-65 signatures ──────────────────────────────────────────────────

export interface DsaKeyPair {
  publicKey: Uint8Array
  secretKey: Uint8Array
}

/** Generate an ML-DSA-65 key pair. */
export function dsaKeyGen(): DsaKeyPair {
  return ml_dsa65.keygen()
}

/** Sign a message with ML-DSA-65. */
export function dsaSign(secretKey: Uint8Array, message: Uint8Array): Uint8Array {
  return ml_dsa65.sign(message, secretKey)
}

/** Verify an ML-DSA-65 signature. */
export function dsaVerify(publicKey: Uint8Array, message: Uint8Array, signature: Uint8Array): boolean {
  return ml_dsa65.verify(signature, message, publicKey)
}

// ─── Hybrid key agreement (X25519 + ML-KEM-768) ───────────────────────────

export interface HybridAgreeKeyPair {
  /** X25519 secret key (32 bytes). */
  classicalSk: Uint8Array
  /** X25519 public key (32 bytes). */
  classicalPk: Uint8Array
  /** ML-KEM-768 secret key (2400 bytes). */
  pqSk: Uint8Array
  /** ML-KEM-768 public key (1184 bytes). */
  pqPk: Uint8Array
}

export interface HybridAgreePublicKey {
  classicalPk: Uint8Array
  pqPk: Uint8Array
}

/** Generate a hybrid key-agreement key pair (X25519 + ML-KEM-768). */
export function hybridAgreeKeyGen(): HybridAgreeKeyPair {
  const classicalSk = randomBytes(32)
  const classicalPk = x25519.getPublicKey(classicalSk)
  const kem = kemKeyGen()
  return { classicalSk, classicalPk, pqSk: kem.secretKey, pqPk: kem.publicKey }
}

/**
 * Perform hybrid key agreement: X25519 ECDH + ML-KEM-768 encapsulation.
 *
 * Both shared secrets are mixed through HKDF-SHA-512 with domain separation,
 * so an attacker must break both X25519 and ML-KEM-768 to derive the result.
 */
export function hybridAgreeEncapsulate(
  ourSk: Uint8Array,
  theirPk: HybridAgreePublicKey,
  context: string,
): { sharedSecret: Uint8Array; kemCt: Uint8Array } {
  // Classical: X25519 ECDH
  const classicalSs = x25519.getSharedSecret(ourSk, theirPk.classicalPk)

  // Post-quantum: ML-KEM-768 encapsulation
  const { ciphertext: kemCt, sharedSecret: pqSs } = kemEncapsulate(theirPk.pqPk)

  // Combine via HKDF-SHA-512
  const sharedSecret = deriveHybridSharedSecret(classicalSs, pqSs, context)
  wipe(classicalSs)
  return { sharedSecret, kemCt }
}

/**
 * Perform hybrid key agreement: X25519 ECDH + ML-KEM-768 decapsulation.
 *
 * Called by the recipient who holds the decapsulation key.
 */
export function hybridAgreeDecapsulate(
  ourSk: Uint8Array,
  ourKemSk: Uint8Array,
  theirClassicalPk: Uint8Array,
  kemCt: Uint8Array,
  context: string,
): Uint8Array {
  // Classical: X25519 ECDH
  const classicalSs = x25519.getSharedSecret(ourSk, theirClassicalPk)

  // Post-quantum: ML-KEM-768 decapsulation
  const pqSs = kemDecapsulate(ourKemSk, kemCt)

  // Combine via HKDF-SHA-512
  const sharedSecret = deriveHybridSharedSecret(classicalSs, pqSs, context)
  wipe(classicalSs)
  return sharedSecret
}

/**
 * Derive a hybrid shared secret from classical and PQ components.
 *
 * Uses HKDF-SHA-512 in extract-then-expand mode with domain separation.
 * The classical and PQ shared secrets are concatenated as the input keying
 * material, ensuring both contribute to the output.
 */
export function deriveHybridSharedSecret(
  classicalSs: Uint8Array,
  pqSs: Uint8Array,
  context: string,
): Uint8Array {
  const ikm = concatBytes(classicalSs, pqSs)
  const salt = utf8ToBytes('crow/pq-hybrid-agree/v1')
  const info = utf8ToBytes(context)
  return hkdf(sha512, ikm, salt, info, 32)
}

// ─── Hybrid signatures (Ed25519 + ML-DSA-65) ──────────────────────────────

export interface HybridSigKeyPair {
  edSk: Uint8Array
  edPk: Uint8Array
  dsaSk: Uint8Array
  dsaPk: Uint8Array
}

export interface HybridSigPublicKey {
  edPk: Uint8Array
  dsaPk: Uint8Array
}

/** Generate a hybrid signature key pair (Ed25519 + ML-DSA-65). */
export function hybridSigKeyGen(): HybridSigKeyPair {
  const edSk = randomBytes(32)
  const edPk = ed25519.getPublicKey(edSk)
  const dsa = dsaKeyGen()
  return { edSk, edPk, dsaSk: dsa.secretKey, dsaPk: dsa.publicKey }
}

/**
 * Sign with both Ed25519 and ML-DSA-65.
 *
 * Returns the concatenated signature (Ed25519 || ML-DSA-65).
 * Both halves must verify independently.
 */
export function hybridSign(key: HybridSigKeyPair, message: Uint8Array): Uint8Array {
  const edSig = ed25519.sign(message, key.edSk)
  const dsaSig = dsaSign(key.dsaSk, message)
  return concatBytes(edSig, dsaSig)
}

/**
 * Verify a hybrid signature.
 *
 * Both the Ed25519 and ML-DSA-65 halves must verify. If either fails,
 * the entire signature is rejected.
 */
export function hybridSigVerify(pk: HybridSigPublicKey, message: Uint8Array, signature: Uint8Array): boolean {
  if (signature.length !== PQ.HYBRID_SIG) return false
  const edSig = signature.subarray(0, PQ.ED25519_SIG)
  const dsaSig = signature.subarray(PQ.ED25519_SIG)
  try {
    const edOk = ed25519.verify(edSig, message, pk.edPk)
    if (!edOk) return false
    return dsaVerify(pk.dsaPk, message, dsaSig)
  } catch {
    return false
  }
}

// ─── Hybrid public key serialisation ───────────────────────────────────────

/** Serialise a hybrid agreement public key (X25519 || ML-KEM-768). */
export function encodeHybridAgreePk(pk: HybridAgreePublicKey): Uint8Array {
  return concatBytes(pk.classicalPk, pk.pqPk)
}

/** Deserialise a hybrid agreement public key. */
export function decodeHybridAgreePk(bytes: Uint8Array): HybridAgreePublicKey {
  if (bytes.length !== PQ.HYBRID_AGREE_PK) throw new Error(`hybrid agree pk must be ${PQ.HYBRID_AGREE_PK} bytes`)
  return {
    classicalPk: bytes.subarray(0, PQ.X25519_PK),
    pqPk: bytes.subarray(PQ.X25519_PK),
  }
}

/** Serialise a hybrid signature public key (Ed25519 || ML-DSA-65). */
export function encodeHybridSigPk(pk: HybridSigPublicKey): Uint8Array {
  return concatBytes(pk.edPk, pk.dsaPk)
}

/** Deserialise a hybrid signature public key. */
export function decodeHybridSigPk(bytes: Uint8Array): HybridSigPublicKey {
  if (bytes.length !== PQ.HYBRID_SIG_PK) throw new Error(`hybrid sig pk must be ${PQ.HYBRID_SIG_PK} bytes`)
  return {
    edPk: bytes.subarray(0, PQ.ED25519_PK),
    dsaPk: bytes.subarray(PQ.ED25519_PK),
  }
}
