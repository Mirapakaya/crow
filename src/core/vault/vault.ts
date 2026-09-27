import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';
import { VaultDB } from './db';
import { KeySlotManager } from './keyslots';

/** Vault lifecycle states. */
export type VaultState = 'locked' | 'unlocking' | 'unlocked';

/**
 * Crow encrypted vault — orchestrates lock/unlock lifecycle and per-table
 * key derivation.
 *
 * Use the module-level {@link vault} singleton; do **not** construct
 * additional instances.
 */
export class Vault {
  private _state: VaultState = 'locked';
  private _masterKey: Uint8Array | null = null;
  private _db: VaultDB;

  constructor() {
    this._db = new VaultDB();
  }

  // ── Accessors ──────────────────────────────────────────────────────────

  /** Current vault lifecycle state. */
  get state(): VaultState {
    return this._state;
  }

  /** The underlying Dexie / IndexedDB database handle. */
  get db(): VaultDB {
    return this._db;
  }

  /** `true` when the vault is unlocked and the master key is resident in memory. */
  isUnlocked(): boolean {
    return this._state === 'unlocked' && this._masterKey !== null;
  }

  /**
   * Return the master key.
   * @throws If the vault is locked.
   */
  getMasterKey(): Uint8Array {
    if (!this._masterKey) throw new Error('Vault is locked');
    return this._masterKey;
  }

  // ── Key derivation ─────────────────────────────────────────────────────

  /**
   * Derive a 256-bit per-table subkey from the master key using HKDF-SHA256.
   *
   * Each logical table (`messages`, `contacts`, …) gets its own key so that
   * compromise of one table key does not affect others.
   *
   * @param table  Logical table name used as HKDF info.
   * @returns 32-byte derived key.
   * @throws If the vault is locked.
   */
  deriveTableKey(table: string): Uint8Array {
    const mk = this.getMasterKey();
    return hkdf(
      sha256,
      mk,
      new TextEncoder().encode('crow-vault-table-keys'),
      new TextEncoder().encode(table),
      32,
    );
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────

  /**
   * First-time vault setup.
   *
   * Generates a random 32-byte master key, creates the initial keyslot, and
   * transitions to the **unlocked** state.
   *
   * @param credential  User-supplied secret for the initial keyslot.
   * @param method      Unlock method label (defaults to `'passphrase'`).
   * @throws If the vault is not in the `locked` state or already initialized.
   */
  async initialize(
    credential: string,
    method: 'passphrase' | 'pin' | 'biometric' | 'recovery' = 'passphrase',
  ): Promise<void> {
    if (this._state !== 'locked') throw new Error('Vault must be locked to initialize');

    const slots = await KeySlotManager.listSlots(this._db);
    if (slots.length > 0) throw new Error('Vault already initialized');

    this._state = 'unlocking';
    try {
      const masterKey = crypto.getRandomValues(new Uint8Array(32));
      await KeySlotManager.addSlot(this._db, method, credential, masterKey);
      this._masterKey = masterKey;
      this._state = 'unlocked';
    } catch (e) {
      this._state = 'locked';
      throw e;
    }
  }

  /**
   * Check whether a vault exists (i.e., at least one keyslot is present).
   */
  async hasVault(): Promise<boolean> {
    const count = await this._db.keyslots.count();
    return count > 0;
  }

  /**
   * Unlock the vault with a credential.
   *
   * If `method` is provided, only keyslots of that type are tried;
   * otherwise every keyslot is attempted.
   *
   * @throws If no keyslots exist, none match the method, or the credential is wrong.
   */
  async unlock(credential: string, method?: string): Promise<void> {
    if (this._state !== 'locked') throw new Error('Vault is not locked');

    this._state = 'unlocking';
    try {
      const slots = await KeySlotManager.listSlots(this._db);
      if (slots.length === 0) throw new Error('No keyslots found — vault not initialized');

      const candidates = method ? slots.filter((s) => s.method === method) : slots;

      if (candidates.length === 0) throw new Error(`No keyslot with method "${method}"`);

      let masterKey: Uint8Array | null = null;
      for (const slot of candidates) {
        try {
          masterKey = await KeySlotManager.unlockSlot(this._db, slot.id, credential);
          break;
        } catch {
          // Wrong slot — try the next one
        }
      }

      if (!masterKey) throw new Error('Invalid credential');

      this._masterKey = masterKey;
      this._state = 'unlocked';
    } catch (e) {
      this._state = 'locked';
      throw e;
    }
  }

  /**
   * Lock the vault: securely zero the master key in memory and set state to
   * `locked`.
   */
  lock(): void {
    if (this._masterKey) {
      this._masterKey.fill(0);
      this._masterKey = null;
    }
    this._state = 'locked';
  }
}

/** Singleton vault instance — use this throughout the application. */
export const vault = new Vault();
