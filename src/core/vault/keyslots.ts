import { scrypt } from '@noble/hashes/scrypt';
import { gcm } from '@noble/ciphers/aes';
import type { VaultDB, KeySlotRecord } from './db';

const NONCE_LEN = 12;

/** Known plaintext encrypted by the master key to verify a successful unlock. */
const VERIFY_CONSTANT = new TextEncoder().encode('crow-vault-verify-v1');

/** Default scrypt parameters (N=131072, r=8, p=1, dkLen=32). */
const DEFAULT_SCRYPT_PARAMS: KeySlotRecord['params'] = {
  N: 2 ** 17,
  r: 8,
  p: 1,
  dkLen: 32,
};

// ────────────────────────────────────────────────────────────────────────────
// Internal primitives
// ────────────────────────────────────────────────────────────────────────────

/**
 * AES-256-GCM wrap: encrypts `plaintext` with `wrappingKey`.
 * Output layout: 12-byte nonce ‖ ciphertext (includes 16-byte GCM tag).
 */
function wrapKey(plaintext: Uint8Array, wrappingKey: Uint8Array): Uint8Array {
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_LEN));
  const ciphertext = gcm(wrappingKey, nonce).encrypt(plaintext);
  const out = new Uint8Array(NONCE_LEN + ciphertext.length);
  out.set(nonce, 0);
  out.set(ciphertext, NONCE_LEN);
  return out;
}

/**
 * AES-256-GCM unwrap: decrypts `wrapped` (nonce ‖ ciphertext) with `wrappingKey`.
 * @throws On GCM authentication failure (wrong key or corrupted data).
 */
function unwrapKey(wrapped: Uint8Array, wrappingKey: Uint8Array): Uint8Array {
  const nonce = wrapped.slice(0, NONCE_LEN);
  const ciphertext = wrapped.slice(NONCE_LEN);
  return gcm(wrappingKey, nonce).decrypt(ciphertext);
}

/**
 * Compute an unlock verifier for the master key.
 * Encrypts a known constant with AES-256-GCM; successful decryption proves key correctness.
 */
function computeVerifier(masterKey: Uint8Array): {
  verifier: Uint8Array;
  verifierNonce: Uint8Array;
} {
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_LEN));
  const verifier = gcm(masterKey, nonce).encrypt(VERIFY_CONSTANT);
  return { verifier, verifierNonce: nonce };
}

/**
 * Verify a candidate master key against the stored verifier.
 * Returns `true` when GCM authentication succeeds **and** the decrypted
 * plaintext matches the expected constant (constant-time compare).
 */
function verifyMasterKey(
  masterKey: Uint8Array,
  verifier: Uint8Array,
  verifierNonce: Uint8Array,
): boolean {
  try {
    const decrypted = gcm(masterKey, verifierNonce).decrypt(verifier);
    if (decrypted.length !== VERIFY_CONSTANT.length) return false;
    // Constant-time comparison
    let diff = 0;
    for (let i = 0; i < decrypted.length; i++) {
      diff |= decrypted[i] ^ VERIFY_CONSTANT[i];
    }
    return diff === 0;
  } catch {
    // GCM auth failure — wrong key
    return false;
  }
}

/**
 * Derive a 256-bit wrapping key from a user credential using scrypt.
 */
function deriveFromCredential(
  credential: string,
  salt: Uint8Array,
  params: { N: number; r: number; p: number; dkLen: number },
): Uint8Array {
  return scrypt(new TextEncoder().encode(credential), salt, {
    N: params.N,
    r: params.r,
    p: params.p,
    dkLen: params.dkLen,
  });
}

// ────────────────────────────────────────────────────────────────────────────
// KeySlotManager — public API
// ────────────────────────────────────────────────────────────────────────────

/**
 * LUKS-style keyslot manager for the Crow vault.
 *
 * Each keyslot stores a scrypt-derived wrapping key that encrypts the same
 * master key. Up to 8 slots (indices 0–7) allow multiple unlock methods
 * (passphrase, PIN, biometric, recovery) to protect the same master key.
 */
export class KeySlotManager {
  /**
   * Add a new keyslot to the vault.
   *
   * Derives a wrapping key from `credential` via scrypt, wraps `masterKey`
   * with AES-256-GCM, and stores the slot record.
   *
   * @param db        VaultDB instance
   * @param method    Unlock method this slot represents
   * @param credential  User-supplied secret (passphrase, PIN, etc.)
   * @param masterKey   32-byte master key to wrap
   * @throws If all 8 keyslots are occupied
   */
  static async addSlot(
    db: VaultDB,
    method: KeySlotRecord['method'],
    credential: string,
    masterKey: Uint8Array,
  ): Promise<void> {
    const existing = await db.keyslots.toArray();
    const usedIds = new Set(existing.map((s) => s.id));
    let slotId = -1;
    for (let i = 0; i <= 7; i++) {
      if (!usedIds.has(i)) {
        slotId = i;
        break;
      }
    }
    if (slotId === -1) throw new Error('All keyslots (0–7) are in use');

    const salt = crypto.getRandomValues(new Uint8Array(32));
    const params = { ...DEFAULT_SCRYPT_PARAMS };
    const wrappingKey = deriveFromCredential(credential, salt, params);
    const wrappedKey = wrapKey(masterKey, wrappingKey);
    const { verifier, verifierNonce } = computeVerifier(masterKey);

    await db.keyslots.add({
      id: slotId,
      salt,
      params,
      wrappedKey,
      verifier,
      verifierNonce,
      method,
      createdAt: Date.now(),
    });
  }

  /**
   * Attempt to unlock a keyslot and recover the master key.
   *
   * Derives a wrapping key from `credential`, unwraps the stored master key
   * with AES-256-GCM, and verifies correctness via the verifier.
   *
   * @returns The 32-byte master key on success.
   * @throws If the keyslot doesn't exist or the credential is wrong.
   */
  static async unlockSlot(db: VaultDB, slotId: number, credential: string): Promise<Uint8Array> {
    const slot = await db.keyslots.get(slotId);
    if (!slot) throw new Error(`Keyslot ${slotId} not found`);

    const wrappingKey = deriveFromCredential(credential, slot.salt, slot.params);

    let masterKey: Uint8Array;
    try {
      masterKey = unwrapKey(slot.wrappedKey, wrappingKey);
    } catch {
      throw new Error('Invalid credential');
    }

    if (!verifyMasterKey(masterKey, slot.verifier, slot.verifierNonce)) {
      throw new Error('Invalid credential');
    }

    return masterKey;
  }

  /**
   * Remove a keyslot from the vault.
   *
   * @throws If the keyslot doesn't exist or is the last remaining slot.
   */
  static async removeSlot(db: VaultDB, slotId: number): Promise<void> {
    const slot = await db.keyslots.get(slotId);
    if (!slot) throw new Error(`Keyslot ${slotId} not found`);
    const remaining = await db.keyslots.count();
    if (remaining <= 1) throw new Error('Cannot remove the last keyslot');
    await db.keyslots.delete(slotId);
  }

  /**
   * List all keyslots in the vault.
   */
  static async listSlots(db: VaultDB): Promise<KeySlotRecord[]> {
    return db.keyslots.toArray();
  }

  /**
   * Change the credential protecting an existing keyslot.
   *
   * Verifies `oldCredential` first, then re-wraps the master key with a
   * new scrypt-derived key from `newCredential`. The slot index is preserved.
   *
   * @throws If the keyslot doesn't exist or `oldCredential` is wrong.
   */
  static async changeSlotCredential(
    db: VaultDB,
    slotId: number,
    oldCredential: string,
    newCredential: string,
  ): Promise<void> {
    const slot = await db.keyslots.get(slotId);
    if (!slot) throw new Error(`Keyslot ${slotId} not found`);

    // Verify old credential and recover master key
    const masterKey = await KeySlotManager.unlockSlot(db, slotId, oldCredential);

    // Re-derive with new credential
    const newSalt = crypto.getRandomValues(new Uint8Array(32));
    const newParams = { ...DEFAULT_SCRYPT_PARAMS };
    const newWrappingKey = deriveFromCredential(newCredential, newSalt, newParams);
    const newWrappedKey = wrapKey(masterKey, newWrappingKey);
    const { verifier: newVerifier, verifierNonce: newVerifierNonce } = computeVerifier(masterKey);

    await db.keyslots.update(slotId, {
      salt: newSalt,
      params: newParams,
      wrappedKey: newWrappedKey,
      verifier: newVerifier,
      verifierNonce: newVerifierNonce,
    });
  }
}
