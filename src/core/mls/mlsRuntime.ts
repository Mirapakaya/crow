/**
 * MLS protocol runtime for Crow.
 *
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  ARCHITECTURE STUB — Interface layer only                       ║
 * ║                                                                  ║
 * ║  All cryptographic operations throw MLS_NOT_IMPLEMENTED.         ║
 * ║  The actual MLS implementation will be backed by a library       ║
 * ║  such as `ts-mls` or a WASM build of the MLS reference          ║
 * ║  implementation (RFC 9420).                                      ║
 * ║                                                                  ║
 * ║  This file defines the *complete* interface that consumers       ║
 * ║  depend on, so higher-level modules can be built and tested      ║
 * ║  against this contract before the crypto layer is integrated.    ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import type { MLSGroupState, MLSMember, MLSKeyPackage } from './types';

/** Error tag thrown by every unimplemented MLS operation. */
export const MLS_NOT_IMPLEMENTED = 'MLS_NOT_IMPLEMENTED';

/**
 * Abstract interface for the MLS protocol.
 *
 * Every method is documented with its semantic contract so that
 * a concrete implementation can be swapped in with minimal changes
 * to callers.
 */
export class MLSRuntime {
  // ── Group creation ────────────────────────────────────────────

  /**
   * Create a new MLS group with the creator as the sole member.
   *
   * @param creatorPubKey  Nostr public key of the group creator.
   * @param creatorDeviceId  Device identifier for the creator.
   * @returns The initial group state (epoch 0).
   * @throws MLS_NOT_IMPLEMENTED until a concrete backend is wired in.
   */
  async createGroup(_creatorPubKey: string, _creatorDeviceId: string): Promise<MLSGroupState> {
    throw new Error(MLS_NOT_IMPLEMENTED);
  }

  // ── Membership operations ─────────────────────────────────────

  /**
   * Add a member to an existing group.
   *
   * The caller must supply the new member's key package (obtained
   * out-of-band, e.g. from a Nostr event).
   *
   * @returns The updated group state **and** a Welcome message that
   *          must be delivered to the new member so they can join.
   */
  async addMember(
    _groupId: string,
    _member: MLSMember,
    _keyPackage: MLSKeyPackage,
  ): Promise<{ groupState: MLSGroupState; welcome: Uint8Array }> {
    throw new Error(MLS_NOT_IMPLEMENTED);
  }

  /**
   * Remove a member from the group.
   *
   * Only an admin (or the member themselves) may initiate removal.
   *
   * @returns The updated group state and a Commit that must be
   *          broadcast to all remaining members.
   */
  async removeMember(
    _groupId: string,
    _memberPubKey: string,
  ): Promise<{ groupState: MLSGroupState; commit: Uint8Array }> {
    throw new Error(MLS_NOT_IMPLEMENTED);
  }

  // ── Key material ──────────────────────────────────────────────

  /**
   * Perform a self-update: generate fresh leaf key material for
   * the calling client within the group.
   *
   * This should be done periodically for forward secrecy.
   *
   * @returns Updated group state and the Commit to broadcast.
   */
  async updateKeyMaterial(
    _groupId: string,
  ): Promise<{ groupState: MLSGroupState; commit: Uint8Array }> {
    throw new Error(MLS_NOT_IMPLEMENTED);
  }

  // ── Processing inbound messages ───────────────────────────────

  /**
   * Process a Welcome message received from a group admin.
   *
   * Allows this client to join the group and derive the shared
   * group key material.
   *
   * @returns The group state as seen by the new joiner.
   */
  async processWelcome(_welcome: Uint8Array): Promise<MLSGroupState> {
    throw new Error(MLS_NOT_IMPLEMENTED);
  }

  /**
   * Process a Commit message broadcast by another member.
   *
   * Commits advance the group epoch and may add/remove members
   * or update key material.
   *
   * @returns The updated group state after applying the commit.
   */
  async processCommit(_commit: Uint8Array): Promise<MLSGroupState> {
    throw new Error(MLS_NOT_IMPLEMENTED);
  }

  // ── Encryption / Decryption ───────────────────────────────────

  /**
   * Encrypt a plaintext message for the group using the current
   * epoch's shared key.
   *
   * @returns MLS ciphertext (MLSCiphertext).
   */
  async encrypt(_groupId: string, _plaintext: Uint8Array): Promise<Uint8Array> {
    throw new Error(MLS_NOT_IMPLEMENTED);
  }

  /**
   * Decrypt an MLS ciphertext received from a group member.
   *
   * @param senderLeafIndex  Leaf index of the sender in the MLS tree.
   * @returns The plaintext content.
   */
  async decrypt(
    _groupId: string,
    _ciphertext: Uint8Array,
    _senderLeafIndex: number,
  ): Promise<Uint8Array> {
    throw new Error(MLS_NOT_IMPLEMENTED);
  }

  // ── Key packages ──────────────────────────────────────────────

  /**
   * Retrieve key packages previously published by a given public key.
   *
   * In a full implementation these would be fetched from Nostr events.
   */
  async getKeyPackages(_pubKey: string): Promise<MLSKeyPackage[]> {
    throw new Error(MLS_NOT_IMPLEMENTED);
  }

  /**
   * Generate and sign a fresh key package for this client.
   *
   * The key package should be published (e.g. as a Nostr event)
   * so other clients can add us to groups.
   */
  async generateKeyPackage(): Promise<MLSKeyPackage> {
    throw new Error(MLS_NOT_IMPLEMENTED);
  }
}
