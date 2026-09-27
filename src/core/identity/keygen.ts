import { secp256k1 } from '@noble/curves/secp256k1';
import { sha512 } from '@noble/hashes/sha512';

/**
 * Raw key pair for @noble/curves (not Web Crypto CryptoKeyPair).
 * - `privateKey`: 32-byte scalar
 * - `publicKey`:  33-byte compressed point
 */
export interface NobleKeyPair {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
}

/**
 * Generate a long-term identity key pair on secp256k1.
 *
 * @returns Compressed public key (33 bytes) and private key (32 bytes).
 */
export function generateIdentityKeyPair(): NobleKeyPair {
  const privateKey = secp256k1.utils.randomPrivateKey();
  const publicKey = secp256k1.getPublicKey(privateKey, true);
  return { privateKey, publicKey };
}

/**
 * Generate a medium-term prekey pair on secp256k1.
 *
 * Prekeys are exchanged for session establishment and rotated periodically,
 * unlike identity keys which are long-lived.
 *
 * @returns Compressed public key (33 bytes) and private key (32 bytes).
 */
export function generatePrekeyPair(): NobleKeyPair {
  const privateKey = secp256k1.utils.randomPrivateKey();
  const publicKey = secp256k1.getPublicKey(privateKey, true);
  return { privateKey, publicKey };
}

/**
 * Generate a signed prekey: a prekey whose public key is signed by the
 * identity key to prove authenticity.
 *
 * The signature covers the **compressed** prekey public key (33 bytes),
 * hashed with SHA-512 to produce a 64-byte message for ECDSA.
 *
 * @param identityPrivKey  32-byte identity private key.
 * @returns The prekey pair and a 64-byte DER-encoded signature.
 */
export function generateSignedPrekey(identityPrivKey: Uint8Array): {
  keyPair: NobleKeyPair;
  signature: Uint8Array;
} {
  const keyPair = generatePrekeyPair();
  // Sign the prekey public key (hash first for domain separation)
  const msg = sha512(keyPair.publicKey);
  const sig = secp256k1.sign(msg, identityPrivKey);
  return {
    keyPair,
    signature: sig.toDERRawBytes(),
  };
}

/**
 * Verify a signed prekey's signature against an identity public key.
 *
 * @param identityPubKey  33-byte compressed identity public key.
 * @param prekeyPubKey    33-byte compressed prekey public key.
 * @param signature       64-byte DER-encoded signature.
 * @returns `true` if the signature is valid.
 */
export function verifySignedPrekey(
  identityPubKey: Uint8Array,
  prekeyPubKey: Uint8Array,
  signature: Uint8Array,
): boolean {
  const msg = sha512(prekeyPubKey);
  return secp256k1.verify(signature, msg, identityPubKey);
}

/**
 * Generate a batch of one-time prekeys (OTPKs).
 *
 * OTPKs are single-use keys consumed during the X3DH key agreement
 * protocol.  Clients should maintain a pool and replenish when low.
 *
 * @param count  Number of prekeys to generate.
 * @returns Array of key pairs.
 */
export function generateOneTimePrekeys(count: number): NobleKeyPair[] {
  const keys: NobleKeyPair[] = [];
  for (let i = 0; i < count; i++) {
    keys.push(generatePrekeyPair());
  }
  return keys;
}
