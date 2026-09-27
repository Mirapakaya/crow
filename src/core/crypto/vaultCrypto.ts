/**
 * Vault record encryption for Crow messenger.
 *
 * Provides symmetric encryption of vault records using
 * XChaCha20-Poly1305 (via @noble/ciphers) and key
 * derivation from passphrases using scrypt (via @noble/hashes).
 */

import { xchacha20poly1305 } from "@noble/ciphers/chacha";
import { scrypt } from "@noble/hashes/scrypt";
import { randomBytes } from "./kdf";

/** scrypt parameters used for vault key derivation. */
const VAULT_SCRYPT_PARAMS = {
  N: 2 ** 17, // 131072
  r: 8,
  p: 1,
  dkLen: 32,
};

/**
 * Seal (encrypt) a vault record using XChaCha20-Poly1305.
 *
 * @param plaintext - Cleartext bytes to encrypt.
 * @param key       - 32-byte symmetric key.
 * @returns Object with ciphertext and the unique nonce used.
 */
export function sealRecord(
  plaintext: Uint8Array,
  key: Uint8Array,
): { ciphertext: Uint8Array; nonce: Uint8Array } {
  const nonce = randomBytes(24);
  const aead = xchacha20poly1305(key, nonce);
  const ciphertext = aead.encrypt(plaintext);
  return { ciphertext, nonce };
}

/**
 * Unseal (decrypt) a vault record using XChaCha20-Poly1305.
 *
 * @param ciphertext - Encrypted bytes.
 * @param nonce      - Nonce that was used during sealing.
 * @param key        - 32-byte symmetric key.
 * @returns Decrypted plaintext bytes.
 * @throws Error if authentication tag verification fails.
 */
export function unsealRecord(
  ciphertext: Uint8Array,
  nonce: Uint8Array,
  key: Uint8Array,
): Uint8Array {
  const aead = xchacha20poly1305(key, nonce);
  return aead.decrypt(ciphertext);
}

/**
 * Derive a vault encryption key from a passphrase using scrypt.
 *
 * Uses N=2^17, r=8, p=1 as specified for vault records.
 *
 * @param passphrase - Human-readable passphrase.
 * @param salt       - Random salt (use `generateSalt()` to create one).
 * @returns 32-byte derived key.
 */
export async function deriveVaultKey(
  passphrase: string,
  salt: Uint8Array,
): Promise<Uint8Array> {
  // Yield to event loop because scrypt is CPU-heavy.
  return new Promise<Uint8Array>((resolve) => {
    setTimeout(() => {
      resolve(
        scrypt(passphrase, salt, {
          N: VAULT_SCRYPT_PARAMS.N,
          r: VAULT_SCRYPT_PARAMS.r,
          p: VAULT_SCRYPT_PARAMS.p,
          dkLen: VAULT_SCRYPT_PARAMS.dkLen,
        }),
      );
    }, 0);
  });
}

/**
 * Generate a 32-byte random salt for vault key derivation.
 *
 * @returns 32 random bytes from `crypto.getRandomValues`.
 */
export function generateSalt(): Uint8Array {
  return randomBytes(32);
}
