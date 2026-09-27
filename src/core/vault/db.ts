import Dexie, { type Table } from 'dexie';

export interface EncryptedRecord {
  /** HMAC-SHA256 of plaintext key for blind indexing */
  id: string;
  /** Logical table name (messages, contacts, etc.) */
  table: string;
  /** AES-256-GCM encrypted payload */
  ciphertext: Uint8Array;
  /** 12-byte GCM nonce */
  nonce: Uint8Array;
  /** Schema version for forward compatibility */
  version: number;
  /** Unix timestamp (ms) of last write */
  updatedAt: number;
}

export interface KeySlotRecord {
  /** Keyslot index (0–7, LUKS-style) */
  id: number;
  /** 32-byte random salt for credential derivation */
  salt: Uint8Array;
  /** Scrypt parameters used to derive the wrapping key */
  params: { N: number; r: number; p: number; dkLen: number };
  /** nonce (12 bytes) ‖ AES-256-GCM ciphertext of the master key */
  wrappedKey: Uint8Array;
  /** AES-256-GCM encryption of a known constant (proves correct unlock) */
  verifier: Uint8Array;
  /** 12-byte nonce for the verifier */
  verifierNonce: Uint8Array;
  /** Unlock method this slot protects */
  method: 'passphrase' | 'pin' | 'biometric' | 'recovery';
  /** Unix timestamp (ms) when the slot was created */
  createdAt: number;
}

export interface MetaRecord {
  key: string;
  value: string | number | boolean | null;
}

/**
 * Dexie database for the Crow encrypted vault.
 *
 * - `records`: stores encrypted data rows, indexed by blind-index id and table
 * - `keyslots`: up to 8 LUKS-style keyslots for master-key protection
 * - `meta`: key-value store for vault metadata
 */
export class VaultDB extends Dexie {
  records!: Table<EncryptedRecord>;
  keyslots!: Table<KeySlotRecord>;
  meta!: Table<MetaRecord>;

  constructor() {
    super('crow-vault');
    this.version(1).stores({
      records: 'id, [table+id], table, updatedAt',
      keyslots: 'id',
      meta: 'key',
    });
  }
}
