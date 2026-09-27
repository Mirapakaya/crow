/**
 * Core types for the Crow MLS (Messaging Layer Security) module.
 *
 * MLS provides forward-secret group encryption. These types describe
 * the group state, membership, and key-package structures that the
 * MLS runtime operates on.
 */

/** Snapshot of an MLS group's state at a given epoch. */
export interface MLSGroupState {
  /** Unique group identifier (opaque byte string, hex-encoded). */
  groupId: string;
  /** Current epoch number; incremented on every commit. */
  epoch: number;
  /** Current members of the group. */
  members: MLSMember[];
  /** Public keys of members with admin privileges. */
  adminPubKeys: string[];
  /** MLS cipher suite identifier (e.g. 0x0001 = X25519 + AES-128-GCM). */
  cipherSuite: number;
  /** Unix-ms timestamp when the group was created. */
  createdAt: number;
  /** Unix-ms timestamp of the last state change. */
  updatedAt: number;
}

/** A member of an MLS group. */
export interface MLSMember {
  /** Member's Nostr public key (hex). */
  pubKey: string;
  /** Device identifier within the member's identity. */
  deviceId: string;
  /** Unix-ms timestamp when the member joined. */
  joinedAt: number;
  /** Leaf index in the MLS tree (assigned by the protocol). */
  leafIndex: number;
}

/**
 * A Key Package is a self-signed credential that a client publishes
 * so that others can add it to a group without an interactive handshake.
 */
export interface MLSKeyPackage {
  /** Owner's public key (hex). */
  pubKey: string;
  /** Device that generated this key package. */
  deviceId: string;
  /** Cipher suites this key package supports. */
  cipherSuites: number[];
  /** Validity window for this key package. */
  lifetime: { notBefore: number; notAfter: number };
}
