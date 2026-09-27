import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha256';
import { gcm } from '@noble/ciphers/aes';
import type { Vault } from './vault';
import type { EncryptedRecord } from './db';

const NONCE_LEN = 12;
const RECORD_VERSION = 1;

// ────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Compute a blind index: HMAC-SHA256 over the plaintext id using the table
 * key.  Produces a searchable, privacy-preserving identifier that reveals
 * nothing about the original id without the table key.
 */
function blindIndex(id: string, tableKey: Uint8Array): string {
  const mac = hmac(sha256, tableKey, new TextEncoder().encode(id));
  return Array.from(mac)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * AES-256-GCM encrypt with a random 12-byte nonce.
 */
function encrypt(
  plaintext: Uint8Array,
  tableKey: Uint8Array,
): { ciphertext: Uint8Array; nonce: Uint8Array } {
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_LEN));
  const ciphertext = gcm(tableKey, nonce).encrypt(plaintext);
  return { ciphertext, nonce };
}

/**
 * AES-256-GCM decrypt.
 * @throws On authentication failure (wrong key / corrupted data).
 */
function decrypt(
  ciphertext: Uint8Array,
  nonce: Uint8Array,
  tableKey: Uint8Array,
): Uint8Array {
  return gcm(tableKey, nonce).decrypt(ciphertext);
}

// ────────────────────────────────────────────────────────────────────────────
// VaultRepo
// ────────────────────────────────────────────────────────────────────────────

/**
 * Typed encrypted repository over the vault's IndexedDB storage.
 *
 * Provides generic CRUD operations with automatic encryption, blind indexing,
 * and per-table key separation.  All records are stored encrypted at rest;
 * only the blind-index id and table name are visible to the storage layer.
 *
 * @typeParam T  Domain type for records in this table.
 */
export class VaultRepo<T> {
  private _tableKeyCache: Uint8Array | null = null;

  /**
   * @param vault       Singleton vault instance
   * @param table       Logical table name (used for HKDF info & DB index)
   * @param deserialize Decode a `Uint8Array` → `T`
   * @param serialize   Encode `T` → `Uint8Array`
   */
  constructor(
    private vault: Vault,
    private table: string,
    private deserialize: (u8: Uint8Array) => T,
    private serialize: (t: T) => Uint8Array,
  ) {}

  // ── Private helpers ────────────────────────────────────────────────────

  /** Derive (or return cached) table key. */
  private getTableKey(): Uint8Array {
    if (!this._tableKeyCache) {
      this._tableKeyCache = this.vault.deriveTableKey(this.table);
    }
    return this._tableKeyCache;
  }

  /**
   * Get a record row by its blind index, scoped to this table.
   */
  private async getByIndex(idx: string): Promise<EncryptedRecord | undefined> {
    return this.vault.db.records
      .where('[table+id]')
      .equals([this.table, idx])
      .first();
  }

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * Retrieve a record by its plaintext id.
   *
   * @returns The deserialized value, or `undefined` if not found.
   * @throws If the vault is locked.
   */
  async get(id: string): Promise<T | undefined> {
    const tableKey = this.getTableKey();
    const idx = blindIndex(id, tableKey);
    const record = await this.getByIndex(idx);
    if (!record) return undefined;
    const plaintext = decrypt(record.ciphertext, record.nonce, tableKey);
    return this.deserialize(plaintext);
  }

  /**
   * Create or replace a record.
   *
   * The value is serialized, encrypted with the table key, blind-indexed,
   * and stored.  An existing record with the same `id` is overwritten.
   *
   * @throws If the vault is locked.
   */
  async put(id: string, value: T): Promise<void> {
    const tableKey = this.getTableKey();
    const idx = blindIndex(id, tableKey);
    const serialized = this.serialize(value);
    const { ciphertext, nonce } = encrypt(serialized, tableKey);

    const record: EncryptedRecord = {
      id: idx,
      table: this.table,
      ciphertext,
      nonce,
      version: RECORD_VERSION,
      updatedAt: Date.now(),
    };
    await this.vault.db.records.put(record);
  }

  /**
   * Delete a record by its plaintext id.
   *
   * No-op if the record does not exist.
   *
   * @throws If the vault is locked.
   */
  async delete(id: string): Promise<void> {
    const tableKey = this.getTableKey();
    const idx = blindIndex(id, tableKey);
    await this.vault.db.records
      .where('[table+id]')
      .equals([this.table, idx])
      .delete();
  }

  /**
   * Decrypt and return **all** records in this table.
   *
   * @throws If the vault is locked or any record fails to decrypt.
   */
  async list(): Promise<T[]> {
    const tableKey = this.getTableKey();
    const records = await this.vault.db.records
      .where('table')
      .equals(this.table)
      .toArray();
    return records.map((r) => {
      const plaintext = decrypt(r.ciphertext, r.nonce, tableKey);
      return this.deserialize(plaintext);
    });
  }

  /**
   * Decrypt all records and filter with a predicate.
   *
   * @throws If the vault is locked or any record fails to decrypt.
   */
  async query(predicate: (t: T) => boolean): Promise<T[]> {
    const all = await this.list();
    return all.filter(predicate);
  }

  /**
   * Count the number of encrypted records in this table.
   */
  async count(): Promise<number> {
    return this.vault.db.records
      .where('table')
      .equals(this.table)
      .count();
  }

  /**
   * Invalidate the cached table key.
   *
   * Call after a lock → unlock cycle so the next operation re-derives the
   * table key from the (possibly new) master key.
   */
  clearCache(): void {
    this._tableKeyCache = null;
  }
}
