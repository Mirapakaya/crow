/**
 * Gift-wrap / sealed-sender encryption for Crow messenger.
 *
 * Encrypts a message to a recipient using an ephemeral ECDH key
 * so the sender's identity is hidden from network observers.
 * The sender's identity public key is embedded inside the encrypted
 * payload so the recipient can authenticate the sender.
 *
 * Uses XChaCha20-Poly1305 from @noble/ciphers for AEAD and
 * secp256k1 from @noble/curves for ECDH.
 */

import { secp256k1 } from "@noble/curves/secp256k1";
import { xchacha20poly1305 } from "@noble/ciphers/chacha";
import { sha256 } from "@noble/hashes/sha256";
import type { SealedMessage } from "./types";
import { randomBytes } from "./kdf";

/**
 * Encrypt and gift-wrap a message for a recipient.
 *
 * 1. Generate an ephemeral secp256k1 key pair.
 * 2. ECDH between ephemeral private key and recipient public key → shared secret.
 * 3. Derive a 32-byte key from the shared secret via SHA-256.
 * 4. AEAD-encrypt the payload (senderPubKey ‖ plaintext) with XChaCha20-Poly1305.
 * 5. Return the sealed message with the ephemeral public key attached.
 *
 * @param plaintext       - Cleartext bytes to encrypt.
 * @param recipientPubKey - Recipient's secp256k1 compressed public key (33 bytes).
 * @param senderPrivKey   - Sender's secp256k1 private key (32 bytes).
 * @returns Sealed message with `senderPubKey` set to the ephemeral public key.
 */
export function giftWrap(
  plaintext: Uint8Array,
  recipientPubKey: Uint8Array,
  senderPrivKey: Uint8Array,
): SealedMessage {
  // 1. Ephemeral key pair
  const ephemPrivKey = randomBytes(32);
  const ephemPubKey = secp256k1.getPublicKey(ephemPrivKey, true);

  // 2. ECDH shared secret (x-coordinate only)
  const sharedFull = secp256k1.getSharedSecret(ephemPrivKey, recipientPubKey);
  const sharedX = sharedFull.slice(1, 33);

  // 3. Derive AEAD key via SHA-256
  const key = sha256(sharedX);

  // 4. Assemble inner payload: sender identity pubkey ‖ plaintext
  const senderPubKey = secp256k1.getPublicKey(senderPrivKey, true);
  const inner = new Uint8Array(senderPubKey.length + plaintext.length);
  inner.set(senderPubKey, 0);
  inner.set(plaintext, senderPubKey.length);

  // 5. Encrypt with XChaCha20-Poly1305
  const nonce = randomBytes(24);
  const aead = xchacha20poly1305(key, nonce);
  const ciphertext = aead.encrypt(inner);

  return {
    ciphertext,
    nonce,
    senderPubKey: ephemPubKey,
  };
}

/**
 * Unwrap and decrypt a gift-wrapped message.
 *
 * 1. ECDH between recipient private key and ephemeral sender public key.
 * 2. Derive the same AEAD key.
 * 3. Decrypt the inner payload with XChaCha20-Poly1305.
 * 4. Split the inner payload into sender identity pubkey and plaintext.
 *
 * @param sealed          - Sealed message from `giftWrap`.
 * @param recipientPrivKey - Recipient's secp256k1 private key (32 bytes).
 * @returns Object containing the plaintext and the authenticated sender public key.
 * @throws Error if decryption fails (tampered or wrong key).
 */
export function unGiftWrap(
  sealed: SealedMessage,
  recipientPrivKey: Uint8Array,
): { plaintext: Uint8Array; senderPubKey: Uint8Array } {
  if (!sealed.senderPubKey) {
    throw new Error("giftwrap: missing ephemeral senderPubKey in sealed message");
  }

  // 1. ECDH shared secret
  const sharedFull = secp256k1.getSharedSecret(recipientPrivKey, sealed.senderPubKey);
  const sharedX = sharedFull.slice(1, 33);

  // 2. Derive AEAD key
  const key = sha256(sharedX);

  // 3. Decrypt
  const aead = xchacha20poly1305(key, sealed.nonce);
  const inner: Uint8Array = aead.decrypt(sealed.ciphertext);

  // 4. Split: first 33 bytes are the compressed sender identity pubkey
  const senderPubKey = inner.slice(0, 33);
  const plaintext = inner.slice(33);

  return { plaintext, senderPubKey };
}
