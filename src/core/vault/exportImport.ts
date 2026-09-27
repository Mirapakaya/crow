import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha256';
import { hkdf } from '@noble/hashes/hkdf';
import type { Vault } from './vault';
import type { KeySlotRecord, EncryptedRecord } from './db';

const BACKUP_VERSION = 1;

/** Wire format for vault backup. */
interface BackupData {
  version: number;
  timestamp: number;
  keyslots: Array<Record<string, unknown>>;
  records: Array<Record<string, unknown>>;
  hmac: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ────────────────────────────────────────────────────────────────────────────

/** Derive the backup HMAC key from the master key via HKDF-SHA256. */
function backupHmacKey(masterKey: Uint8Array): Uint8Array {
  return hkdf(
    sha256,
    masterKey,
    new TextEncoder().encode('crow-backup'),
    new TextEncoder().encode('hmac-key'),
    32,
  );
}

/**
 * Deterministic JSON serialization for HMAC computation.
 * Keys are sorted and binary fields have already been converted to number
 * arrays during export, so standard JSON.stringify is sufficient.
 */
function computeBackupHmac(
  data: Omit<BackupData, 'hmac'>,
  key: Uint8Array,
): string {
  const canonical = JSON.stringify({
    version: data.version,
    timestamp: data.timestamp,
    keyslots: data.keyslots,
    records: data.records,
  });
  const mac = hmac(sha256, key, new TextEncoder().encode(canonical));
  return Array.from(mac)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Convert a Uint8Array field to a plain number array for JSON. */
function u8ToArray(u8: Uint8Array): number[] {
  return Array.from(u8);
}

/** Convert a plain number array back to Uint8Array. */
function arrayToU8(arr: number[] | unknown): Uint8Array {
  if (arr instanceof Uint8Array) return arr;
  if (Array.isArray(arr)) return new Uint8Array(arr as number[]);
  throw new Error('Expected array or Uint8Array');
}

/** Serialize a KeySlotRecord for JSON storage (binary → number[]). */
function serializeSlot(s: KeySlotRecord): Record<string, unknown> {
  return {
    ...s,
    salt: u8ToArray(s.salt),
    wrappedKey: u8ToArray(s.wrappedKey),
    verifier: u8ToArray(s.verifier),
    verifierNonce: u8ToArray(s.verifierNonce),
  };
}

/** Deserialize a JSON keyslot object back to a KeySlotRecord. */
function deserializeSlot(s: Record<string, unknown>): KeySlotRecord {
  return {
    ...(s as Omit<KeySlotRecord, 'salt' | 'wrappedKey' | 'verifier' | 'verifierNonce'>),
    salt: arrayToU8(s.salt),
    wrappedKey: arrayToU8(s.wrappedKey),
    verifier: arrayToU8(s.verifier),
    verifierNonce: arrayToU8(s.verifierNonce),
  };
}

/** Serialize an EncryptedRecord for JSON storage. */
function serializeRecord(r: EncryptedRecord): Record<string, unknown> {
  return {
    ...r,
    ciphertext: u8ToArray(r.ciphertext),
    nonce: u8ToArray(r.nonce),
  };
}

/** Deserialize a JSON record object back to an EncryptedRecord. */
function deserializeRecord(r: Record<string, unknown>): EncryptedRecord {
  return {
    ...(r as Omit<EncryptedRecord, 'ciphertext' | 'nonce'>),
    ciphertext: arrayToU8(r.ciphertext),
    nonce: arrayToU8(r.nonce),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────────────

/**
 * Export the entire vault as an encrypted backup blob.
 *
 * The backup is a JSON document containing all keyslots and records.  Data is
 * already encrypted at rest; the backup adds an **HMAC-SHA256** integrity
 * check derived from the master key to detect tampering or corruption.
 *
 * @param vault  The singleton vault (must be unlocked).
 * @returns UTF-8 encoded JSON backup as `Uint8Array`.
 * @throws If the vault is locked.
 */
export async function exportVault(vault: Vault): Promise<Uint8Array> {
  if (!vault.isUnlocked()) throw new Error('Vault must be unlocked to export');

  const masterKey = vault.getMasterKey();
  const keyslots = await vault.db.keyslots.toArray();
  const records = await vault.db.records.toArray();

  const serializedSlots = keyslots.map(serializeSlot);
  const serializedRecords = records.map(serializeRecord);

  const payload: Omit<BackupData, 'hmac'> = {
    version: BACKUP_VERSION,
    timestamp: Date.now(),
    keyslots: serializedSlots,
    records: serializedRecords,
  };

  const hmacKey = backupHmacKey(masterKey);
  const hmacValue = computeBackupHmac(payload, hmacKey);

  const backup: BackupData = { ...payload, hmac: hmacValue };
  return new TextEncoder().encode(JSON.stringify(backup));
}

/**
 * Restore vault contents from an encrypted backup blob.
 *
 * The vault **must** be in the `locked` state.  After parsing and integrity
 * verification, the keyslots and records from the backup replace any existing
 * data, and the vault is left in the **unlocked** state.
 *
 * @param vault       The singleton vault (must be locked).
 * @param data        Backup blob produced by {@link exportVault}.
 * @param credential  Credential matching one of the backup's keyslots.
 * @throws If the vault is not locked, the backup is corrupt, or the
 *         credential / HMAC check fails.
 */
export async function importVault(
  vault: Vault,
  data: Uint8Array,
  credential: string,
): Promise<void> {
  if (vault.state !== 'locked') throw new Error('Vault must be locked to import');

  let parsed: BackupData;
  try {
    parsed = JSON.parse(new TextDecoder().decode(data));
  } catch {
    throw new Error('Invalid backup format');
  }

  if (parsed.version !== BACKUP_VERSION) {
    throw new Error(`Unsupported backup version: ${parsed.version}`);
  }

  // ── 1. Deserialize keyslots and write them to the DB ─────────────────

  const keyslots = parsed.keyslots.map(deserializeSlot);

  await vault.db.keyslots.clear();
  await vault.db.records.clear();

  for (const slot of keyslots) {
    await vault.db.keyslots.add(slot);
  }

  // ── 2. Unlock with the imported keyslots ─────────────────────────────

  await vault.unlock(credential);

  // ── 3. Verify backup HMAC ────────────────────────────────────────────

  const masterKey = vault.getMasterKey();
  const hmacKey = backupHmacKey(masterKey);
  const expectedHmac = computeBackupHmac(
    {
      version: parsed.version,
      timestamp: parsed.timestamp,
      keyslots: parsed.keyslots,
      records: parsed.records,
    },
    hmacKey,
  );

  if (expectedHmac !== parsed.hmac) {
    vault.lock();
    // Roll back: remove imported keyslots
    await vault.db.keyslots.clear();
    throw new Error('Backup integrity check failed — HMAC mismatch');
  }

  // ── 4. Import records ────────────────────────────────────────────────

  const records = parsed.records.map(deserializeRecord);
  for (const record of records) {
    await vault.db.records.put(record);
  }
}
