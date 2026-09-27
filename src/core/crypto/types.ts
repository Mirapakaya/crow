/**
 * Core cryptographic type definitions for Crow messenger.
 *
 * These types are used across all crypto modules to ensure
 * consistent wire formats and in-memory representations.
 */

/** A raw key pair for curve operations (secp256k1 / X25519). */
export interface CryptoKeyPair {
  /** Compressed or raw public key bytes. */
  publicKey: Uint8Array;
  /** Private key bytes. */
  privateKey: Uint8Array;
}

/** A sealed (encrypted) message envelope. */
export interface SealedMessage {
  /** Ciphertext produced by AEAD encryption. */
  ciphertext: Uint8Array;
  /** Unique nonce / IV used for this seal. */
  nonce: Uint8Array;
  /** Sender's ephemeral or identity public key (when sealed-sender). */
  senderPubKey?: Uint8Array;
}

/** Prekey bundle published by a user for X3DH-like key agreement. */
export interface PrekeyBundle {
  /** Long-term identity public key. */
  identityKey: Uint8Array;
  /** Medium-term signed prekey public key. */
  signedPrekey: Uint8Array;
  /** Signature of `signedPrekey` by `identityKey`. */
  prekeySignature: Uint8Array;
  /** Optional pool of one-time prekey public keys. */
  oneTimePrekeys?: Uint8Array[];
}

/** Key material distributed when a group's shared key changes. */
export interface GroupKeyUpdate {
  /** New group key encrypted for each member. */
  envelopes: SealedMessage[];
  /** Sequence number of this key update. */
  epoch: number;
}

/** Generic encrypted envelope with optional authenticated header. */
export interface EncryptedEnvelope {
  /** AEAD ciphertext. */
  ciphertext: Uint8Array;
  /** Nonce / IV for the AEAD cipher. */
  nonce: Uint8Array;
  /** Authentication tag (when the AEAD scheme detaches it). */
  authTag?: Uint8Array;
  /** Cleartext header included in AAD. */
  header?: Uint8Array;
}
