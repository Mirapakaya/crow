/**
 * Key-derivation functions for Crow messenger.
 *
 * Uses scrypt (via @noble/hashes/scrypt) and HKDF-SHA256
 * (via @noble/hashes/hkdf). No custom KDFs.
 */

import { scrypt } from "@noble/hashes/scrypt";
import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha256";

/** Parameters for scrypt key derivation. */
export interface ScryptParams {
  /** CPU/memory cost factor (must be a power of 2). */
  N: number;
  /** Block size factor. */
  r: number;
  /** Parallelism factor. */
  p: number;
  /** Derived key length in bytes. */
  dkLen: number;
}

/** Default scrypt parameters for passphrases (moderate security). */
export const DEFAULT_SCRYPT_PARAMS: ScryptParams = {
  N: 2 ** 17, // 131072
  r: 8,
  p: 1,
  dkLen: 32,
};

/** Stricter scrypt parameters for short PINs (higher cost). */
const PIN_SCRYPT_PARAMS: ScryptParams = {
  N: 2 ** 20, // 1048576
  r: 8,
  p: 2,
  dkLen: 32,
};

/**
 * Derive a key from a passphrase using scrypt.
 *
 * @param passphrase - Human-readable passphrase.
 * @param salt       - Random salt (≥16 bytes recommended).
 * @param params     - Optional scrypt parameters (defaults to `DEFAULT_SCRYPT_PARAMS`).
 * @returns 32-byte derived key.
 */
export async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  params?: ScryptParams,
): Promise<Uint8Array> {
  const p = params ?? DEFAULT_SCRYPT_PARAMS;
  // scrypt is synchronous in @noble/hashes but may be CPU-heavy;
  // yielding to the event loop keeps the UI responsive.
  return new Promise<Uint8Array>((resolve) => {
    setTimeout(() => {
      resolve(scrypt(passphrase, salt, { N: p.N, r: p.r, p: p.p, dkLen: p.dkLen }));
    }, 0);
  });
}

/**
 * Derive a sub-key from a master key using HKDF-SHA256.
 *
 * @param masterKey - Input keying material.
 * @param context   - Domain-separation context string (e.g. "crow-vault" or "crow-blob").
 * @param subkeyId  - Numeric subkey identifier.
 * @param length    - Output length in bytes (default 32).
 * @returns Derived sub-key bytes.
 */
export function deriveSubKey(
  masterKey: Uint8Array,
  context: string,
  subkeyId: number,
  length: number = 32,
): Uint8Array {
  // Encode subkeyId as a 4-byte big-endian suffix in the info buffer.
  const info = new TextEncoder().encode(context);
  const idBytes = new Uint8Array(4);
  new DataView(idBytes.buffer).setUint32(0, subkeyId, false);
  const fullInfo = new Uint8Array(info.length + 4);
  fullInfo.set(info, 0);
  fullInfo.set(idBytes, info.length);

  const prk = hkdf(sha256, masterKey, new Uint8Array(0), fullInfo, length);
  return new Uint8Array(prk);
}

/**
 * Stretch a short PIN into a full-strength key using scrypt with
 * higher parameters. Use this instead of `deriveKey` when the
 * input is known to be low-entropy (4–6 digit PIN).
 *
 * @param pin  - Numeric PIN string.
 * @param salt - Random salt (≥16 bytes).
 * @returns 32-byte derived key.
 */
export async function stretchPin(
  pin: string,
  salt: Uint8Array,
): Promise<Uint8Array> {
  return deriveKey(pin, salt, PIN_SCRYPT_PARAMS);
}

/**
 * Generate `n` cryptographically random bytes using `crypto.getRandomValues`.
 *
 * @param n - Number of bytes to generate.
 * @returns Random byte array of length `n`.
 */
export function randomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  return buf;
}
