import { describe, it, expect } from 'vitest';
import {
  sealRecord,
  unsealRecord,
  deriveVaultKey,
  generateSalt,
} from '@crypto/vaultCrypto';

/** Compare two Uint8Arrays byte-by-byte. */
function arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/** Create a Uint8Array without hitting jsdom's 65536-byte limit. */
function makeBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n);
  // Fill in chunks to avoid jsdom QuotaExceededError
  const chunkSize = 65536;
  for (let offset = 0; offset < n; offset += chunkSize) {
    const end = Math.min(offset + chunkSize, n);
    const slice = crypto.getRandomValues(new Uint8Array(end - offset));
    buf.set(slice, offset);
  }
  return buf;
}

describe('vaultCrypto', () => {
  it('sealRecord → unsealRecord roundtrip', () => {
    const key = crypto.getRandomValues(new Uint8Array(32));
    const plaintext = new TextEncoder().encode('vault secret data');

    const { ciphertext, nonce } = sealRecord(plaintext, key);
    const recovered = unsealRecord(ciphertext, nonce, key);

    expect(arraysEqual(recovered, plaintext)).toBe(true);
  });

  it('wrong key fails to unseal', () => {
    const correctKey = crypto.getRandomValues(new Uint8Array(32));
    const wrongKey = crypto.getRandomValues(new Uint8Array(32));
    const plaintext = new TextEncoder().encode('protected data');

    const { ciphertext, nonce } = sealRecord(plaintext, correctKey);
    expect(() => unsealRecord(ciphertext, nonce, wrongKey)).toThrow();
  });

  it('nonce is unique per seal', () => {
    const key = crypto.getRandomValues(new Uint8Array(32));
    const plaintext = new TextEncoder().encode('same data');

    const seal1 = sealRecord(plaintext, key);
    const seal2 = sealRecord(plaintext, key);

    // Nonces should differ
    expect(arraysEqual(seal1.nonce, seal2.nonce)).toBe(false);
    // Ciphertexts should differ (different nonce)
    expect(arraysEqual(seal1.ciphertext, seal2.ciphertext)).toBe(false);

    // Both should still decrypt correctly
    expect(arraysEqual(unsealRecord(seal1.ciphertext, seal1.nonce, key), plaintext)).toBe(true);
    expect(arraysEqual(unsealRecord(seal2.ciphertext, seal2.nonce, key), plaintext)).toBe(true);
  });

  it('nonce is 24 bytes', () => {
    const key = crypto.getRandomValues(new Uint8Array(32));
    const plaintext = new TextEncoder().encode('test');

    const { nonce } = sealRecord(plaintext, key);
    expect(nonce).toHaveLength(24);
  });

  it('deriveVaultKey with scrypt produces consistent results', async () => {
    const passphrase = 'correct-horse-battery-staple';
    const salt = crypto.getRandomValues(new Uint8Array(32));

    const key1 = await deriveVaultKey(passphrase, salt);
    const key2 = await deriveVaultKey(passphrase, salt);

    expect(key1).toHaveLength(32);
    expect(key2).toHaveLength(32);
    expect(arraysEqual(key1, key2)).toBe(true);
  });

  it('deriveVaultKey produces different keys for different passphrases', async () => {
    const salt = crypto.getRandomValues(new Uint8Array(32));

    const key1 = await deriveVaultKey('passphrase-one', salt);
    const key2 = await deriveVaultKey('passphrase-two', salt);

    expect(arraysEqual(key1, key2)).toBe(false);
  });

  it('deriveVaultKey produces different keys for different salts', async () => {
    const salt1 = crypto.getRandomValues(new Uint8Array(32));
    const salt2 = crypto.getRandomValues(new Uint8Array(32));

    const key1 = await deriveVaultKey('same-passphrase', salt1);
    const key2 = await deriveVaultKey('same-passphrase', salt2);

    expect(arraysEqual(key1, key2)).toBe(false);
  });

  it('generateSalt produces 32 bytes', () => {
    const salt = generateSalt();
    expect(salt).toHaveLength(32);

    // Should be random each time
    const salt2 = generateSalt();
    expect(arraysEqual(salt, salt2)).toBe(false);
  });

  it('sealRecord handles empty plaintext', () => {
    const key = crypto.getRandomValues(new Uint8Array(32));
    const plaintext = new Uint8Array(0);

    const { ciphertext, nonce } = sealRecord(plaintext, key);
    const recovered = unsealRecord(ciphertext, nonce, key);
    expect(arraysEqual(recovered, plaintext)).toBe(true);
  });

  it('sealRecord handles larger plaintext', () => {
    const key = crypto.getRandomValues(new Uint8Array(32));
    // 10KB — safe for jsdom's crypto.getRandomValues
    const plaintext = makeBytes(10_000);

    const { ciphertext, nonce } = sealRecord(plaintext, key);
    const recovered = unsealRecord(ciphertext, nonce, key);
    expect(arraysEqual(recovered, plaintext)).toBe(true);
  });
});
