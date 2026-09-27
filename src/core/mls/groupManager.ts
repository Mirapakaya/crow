/**
 * MLS Group lifecycle management for Crow.
 *
 * `GroupManager` sits above {@link MLSRuntime} and handles the
 * application-level concerns of creating groups, managing membership,
 * promoting / demoting admins, and persisting group state.
 *
 * It depends on {@link MLSRuntime} for cryptographic operations and
 * on a `VaultRepo`-like persistence layer for durable storage.
 */

import type { MLSGroupState, MLSMember } from './types';
import { MLSRuntime } from './mlsRuntime';

/** Minimal persistence interface that GroupManager requires. */
export interface GroupStore {
  get(id: string): MLSGroupState | undefined;
  put(id: string, state: MLSGroupState): void;
  delete(id: string): void;
  list(): MLSGroupState[];
}

/** In-memory fallback store (used when no persistence layer is provided). */
class MemoryGroupStore implements GroupStore {
  private map = new Map<string, MLSGroupState>();
  get(id: string) {
    return this.map.get(id);
  }
  put(id: string, s: MLSGroupState) {
    this.map.set(id, s);
  }
  delete(id: string) {
    this.map.delete(id);
  }
  list() {
    return Array.from(this.map.values());
  }
}

/**
 * High-level manager for MLS group lifecycle.
 *
 * Translates user-facing operations (create, add member, promote
 * admin, leave, …) into MLS runtime calls and persists the
 * resulting group state.
 */
export class GroupManager {
  private runtime: MLSRuntime;
  private store: GroupStore;
  private ownPubKey: string;
  private ownDeviceId: string;

  constructor(ownPubKey: string, ownDeviceId: string, runtime?: MLSRuntime, store?: GroupStore) {
    this.ownPubKey = ownPubKey;
    this.ownDeviceId = ownDeviceId;
    this.runtime = runtime ?? new MLSRuntime();
    this.store = store ?? new MemoryGroupStore();
  }

  // ── Group creation ────────────────────────────────────────────

  /**
   * Create a new MLS group and persist its state.
   *
   * @returns The `groupId` (also used as the conversation ID).
   */
  async createGroup(_displayName: string, creatorPubKey: string): Promise<string> {
    const groupState = await this.runtime.createGroup(creatorPubKey, this.ownDeviceId);
    this.store.put(groupState.groupId, groupState);
    return groupState.groupId;
  }

  // ── Membership ────────────────────────────────────────────────

  /**
   * Add a member to the group.
   *
   * The member's key package is fetched from the MLS runtime
   * (which would typically resolve it from a Nostr event).
   */
  async addMember(groupId: string, memberPubKey: string): Promise<void> {
    this.requireGroup(groupId);
    const keyPackages = await this.runtime.getKeyPackages(memberPubKey);
    if (keyPackages.length === 0) {
      throw new Error(`No key package available for ${memberPubKey}`);
    }
    const kp = keyPackages[0];

    const member: MLSMember = {
      pubKey: memberPubKey,
      deviceId: kp.deviceId,
      joinedAt: Date.now(),
      leafIndex: -1, // Assigned by the MLS layer
    };

    const result = await this.runtime.addMember(groupId, member, kp);
    this.store.put(groupId, result.groupState);

    // In a full implementation, `result.welcome` would be sent
    // to the new member via Nostr.
  }

  /**
   * Remove a member from the group.
   */
  async removeMember(groupId: string, memberPubKey: string): Promise<void> {
    this.requireGroup(groupId);
    const result = await this.runtime.removeMember(groupId, memberPubKey);
    this.store.put(groupId, result.groupState);

    // `result.commit` would be broadcast to remaining members.
  }

  // ── Admin management ──────────────────────────────────────────

  /**
   * Promote a member to admin.
   *
   * Since admin status is tracked at the application layer
   * (not in the MLS protocol itself), this is a simple metadata
   * update on the stored group state.
   */
  async promoteAdmin(groupId: string, memberPubKey: string): Promise<void> {
    const state = this.requireGroup(groupId);
    if (state.adminPubKeys.includes(memberPubKey)) return;

    if (!state.members.some((m) => m.pubKey === memberPubKey)) {
      throw new Error(`${memberPubKey} is not a member of the group`);
    }

    state.adminPubKeys = [...state.adminPubKeys, memberPubKey];
    state.updatedAt = Date.now();
    this.store.put(groupId, state);
  }

  /**
   * Demote an admin back to regular member.
   *
   * A group must always have at least one admin.
   */
  async demoteAdmin(groupId: string, memberPubKey: string): Promise<void> {
    const state = this.requireGroup(groupId);

    if (!state.adminPubKeys.includes(memberPubKey)) return;
    if (state.adminPubKeys.length <= 1) {
      throw new Error('Cannot demote the last admin');
    }

    state.adminPubKeys = state.adminPubKeys.filter((k) => k !== memberPubKey);
    state.updatedAt = Date.now();
    this.store.put(groupId, state);
  }

  // ── Leaving ───────────────────────────────────────────────────

  /**
   * Leave the group.
   *
   * Initiates a self-removal through the MLS runtime and then
   * deletes the local group state.
   */
  async leaveGroup(groupId: string): Promise<void> {
    this.requireGroup(groupId);
    await this.runtime.removeMember(groupId, this.ownPubKey);
    this.store.delete(groupId);
  }

  // ── Key rotation ──────────────────────────────────────────────

  /**
   * Trigger a self-update to rotate this client's leaf key material.
   *
   * Should be called periodically for forward secrecy.
   */
  async updateGroupKeyMaterial(groupId: string): Promise<void> {
    this.requireGroup(groupId);
    const result = await this.runtime.updateKeyMaterial(groupId);
    this.store.put(groupId, result.groupState);
  }

  // ── Queries ───────────────────────────────────────────────────

  /** Return the current state of a group, or `undefined` if unknown. */
  getGroupState(groupId: string): MLSGroupState | undefined {
    return this.store.get(groupId);
  }

  /** Return all groups the client is a member of. */
  listGroups(): MLSGroupState[] {
    return this.store.list();
  }

  // ── Private ───────────────────────────────────────────────────

  private requireGroup(groupId: string): MLSGroupState {
    const state = this.store.get(groupId);
    if (!state) throw new Error(`Unknown group: ${groupId}`);
    return state;
  }
}
