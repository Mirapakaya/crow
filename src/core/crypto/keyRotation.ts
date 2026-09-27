/**
 * Key rotation utilities for Crow messenger.
 *
 * Provides functions to rotate a signing key and produce a
 * BIP-340 Schnorr signature that attests the new key is a
 * legitimate successor of the old one.
 *
 * Uses secp256k1 Schnorr signatures from @noble/curves.
 */

import { secp256k1, schnorr } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { randomBytes } from './kdf';

/**
 * Rotate a signing key by generating a new key pair and signing
 * the transition with the old key.
 *
 * The transition message is:
 *   SHA-256("crow-key-rotation" ‖ oldPubKey ‖ newPubKey)
 *
 * @param currentPrivKey - The current (old) 32-byte private key.
 * @returns New private key, new public key, and a Schnorr signature
 *          over the transition message signed by the old key.
 */
export function rotateSigningKey(currentPrivKey: Uint8Array): {
  newPrivKey: Uint8Array;
  newPubKey: Uint8Array;
  transitionSignature: Uint8Array;
} {
  // Generate fresh key pair
  const newPrivKey = randomBytes(32);
  // Ensure it's a valid secp256k1 scalar (mod n)
  const newPrivKeyAdjusted = adjustPrivateKey(newPrivKey);
  const newPubKey = secp256k1.getPublicKey(newPrivKeyAdjusted, true);

  // Old public key
  const oldPubKey = secp256k1.getPublicKey(currentPrivKey, true);

  // Build transition message
  const msg = buildTransitionMessage(oldPubKey, newPubKey);

  // Sign with old key using BIP-340 Schnorr
  const transitionSignature = schnorr.sign(msg, currentPrivKey);

  return {
    newPrivKey: newPrivKeyAdjusted,
    newPubKey,
    transitionSignature,
  };
}

/**
 * Verify a key transition signature.
 *
 * Confirms that the owner of `oldPubKey` authorised the transition
 * to `newPubKey` by verifying the Schnorr signature.
 *
 * @param oldPubKey   - Old compressed public key (33 bytes).
 * @param newPubKey   - New compressed public key (33 bytes).
 * @param signature   - Schnorr signature over the transition message (64 bytes).
 * @returns `true` if the signature is valid.
 */
export function verifyKeyTransition(
  oldPubKey: Uint8Array,
  newPubKey: Uint8Array,
  signature: Uint8Array,
): boolean {
  const msg = buildTransitionMessage(oldPubKey, newPubKey);

  // BIP-340 Schnorr verification — the public key must be the x-only (32-byte) form.
  const oldXOnly = compressToXOnly(oldPubKey);

  try {
    return schnorr.verify(signature, msg, oldXOnly);
  } catch {
    return false;
  }
}

// ── Internal helpers ────────────────────────────────────────────────

/** Build the domain-separated transition message hash. */
function buildTransitionMessage(oldPubKey: Uint8Array, newPubKey: Uint8Array): Uint8Array {
  const prefix = new TextEncoder().encode('crow-key-rotation');
  const data = new Uint8Array(prefix.length + oldPubKey.length + newPubKey.length);
  data.set(prefix, 0);
  data.set(oldPubKey, prefix.length);
  data.set(newPubKey, prefix.length + oldPubKey.length);
  return sha256(data);
}

/** Extract the 32-byte x-only public key from a 33-byte compressed key. */
function compressToXOnly(compressed: Uint8Array): Uint8Array {
  if (compressed.length === 32) return compressed;
  if (compressed.length === 33) return compressed.slice(1);
  throw new Error(`keyRotation: unexpected pubkey length ${compressed.length}`);
}

/** Adjust a raw 32-byte private key to be a valid secp256k1 scalar. */
function adjustPrivateKey(key: Uint8Array): Uint8Array {
  const n = secp256k1.CURVE.n;
  const view = new DataView(key.buffer, key.byteOffset, 32);
  // Reduce mod n if needed; ensure non-zero.
  let k =
    view.getBigUint64(0, false) * 2n ** 192n +
    view.getBigUint64(8, false) * 2n ** 128n +
    view.getBigUint64(16, false) * 2n ** 64n +
    view.getBigUint64(24, false);
  k = (k % n) + 1n; // ensure 1 ≤ k < n
  // Write back as 32-byte big-endian
  const result = new Uint8Array(32);
  for (let i = 31; i >= 0; i--) {
    result[i] = Number(k & 0xffn);
    k >>= 8n;
  }
  return result;
}
