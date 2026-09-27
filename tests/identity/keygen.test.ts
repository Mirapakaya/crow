import { describe, it, expect } from 'vitest';
import { secp256k1 } from '@noble/curves/secp256k1';
import {
  generateIdentityKeyPair,
  generateSignedPrekey,
  verifySignedPrekey,
  generateOneTimePrekeys,
} from '@identity/keygen';

describe('keygen', () => {
  it('generateIdentityKeyPair returns valid key pair', () => {
    const kp = generateIdentityKeyPair();

    expect(kp.privateKey).toHaveLength(32);
    expect(kp.publicKey).toHaveLength(33); // compressed

    // The public key should be derivable from the private key
    const derivedPub = secp256k1.getPublicKey(kp.privateKey, true);

    expect(Array.from(kp.publicKey)).toEqual(Array.from(derivedPub));
  });

  it('different key pairs are unique', () => {
    const kp1 = generateIdentityKeyPair();
    const kp2 = generateIdentityKeyPair();

    expect(kp1.privateKey).not.toEqual(kp2.privateKey);
    expect(kp1.publicKey).not.toEqual(kp2.publicKey);
  });

  it('generateSignedPrekey signature verifies', () => {
    const identity = generateIdentityKeyPair();
    const { keyPair, signature } = generateSignedPrekey(identity.privateKey);

    expect(keyPair.publicKey).toHaveLength(33);
    // DER-encoded signature is variable length (typically 70-72 bytes)
    expect(signature.length).toBeGreaterThanOrEqual(64);
    expect(signature.length).toBeLessThanOrEqual(72);

    const isValid = verifySignedPrekey(
      identity.publicKey,
      keyPair.publicKey,
      signature,
    );
    expect(isValid).toBe(true);
  });

  it('invalid signature fails verification', () => {
    const identity = generateIdentityKeyPair();
    const { keyPair } = generateSignedPrekey(identity.privateKey);

    // Tamper with the signature
    const fakeSig = new Uint8Array(70);
    crypto.getRandomValues(fakeSig);

    const isValid = verifySignedPrekey(
      identity.publicKey,
      keyPair.publicKey,
      fakeSig,
    );
    expect(isValid).toBe(false);
  });

  it('wrong identity key fails verification', () => {
    const identity1 = generateIdentityKeyPair();
    const identity2 = generateIdentityKeyPair();
    const { keyPair, signature } = generateSignedPrekey(identity1.privateKey);

    // Signature was made by identity1; identity2's key should not verify it
    const isValid = verifySignedPrekey(
      identity2.publicKey,
      keyPair.publicKey,
      signature,
    );
    expect(isValid).toBe(false);
  });

  it('generateOneTimePrekeys produces correct count', () => {
    const keys = generateOneTimePrekeys(10);
    expect(keys).toHaveLength(10);

    for (const kp of keys) {
      expect(kp.privateKey).toHaveLength(32);
      expect(kp.publicKey).toHaveLength(33);
    }
  });

  it('one-time prekeys are unique', () => {
    const keys = generateOneTimePrekeys(20);
    const pubKeys = keys.map((k) => Array.from(k.publicKey).join(','));

    const uniquePubKeys = new Set(pubKeys);
    expect(uniquePubKeys.size).toBe(20);
  });

  it('generateOneTimePrekeys with zero count returns empty', () => {
    const keys = generateOneTimePrekeys(0);
    expect(keys).toHaveLength(0);
  });
});
