import { describe, it, expect } from 'vitest';
import { rotateSigningKey, verifyKeyTransition } from '@crypto/keyRotation';
import { secp256k1 } from '@noble/curves/secp256k1';

describe('keyRotation', () => {
  const oldPrivKey = secp256k1.utils.randomPrivateKey();

  it('produces a valid new key pair and transition signature', () => {
    const result = rotateSigningKey(oldPrivKey);

    expect(result.newPrivKey).toHaveLength(32);
    expect(result.newPubKey).toHaveLength(33); // compressed
    expect(result.transitionSignature).toHaveLength(64); // Schnorr sig
  });

  it('the new public key matches the new private key', () => {
    const result = rotateSigningKey(oldPrivKey);
    const expectedPubKey = secp256k1.getPublicKey(result.newPrivKey, true);
    expect(result.newPubKey).toEqual(expectedPubKey);
  });

  it('verifyKeyTransition returns true for a valid rotation', () => {
    const oldPubKey = secp256k1.getPublicKey(oldPrivKey, true);
    const result = rotateSigningKey(oldPrivKey);

    expect(verifyKeyTransition(oldPubKey, result.newPubKey, result.transitionSignature)).toBe(true);
  });

  it('verifyKeyTransition returns false for a tampered new public key', () => {
    const oldPubKey = secp256k1.getPublicKey(oldPrivKey, true);
    const result = rotateSigningKey(oldPrivKey);

    // Tamper with the new public key
    const tampered = new Uint8Array(result.newPubKey);
    tampered[0] ^= 0x01;

    expect(verifyKeyTransition(oldPubKey, tampered, result.transitionSignature)).toBe(false);
  });

  it('verifyKeyTransition returns false for a wrong signature', () => {
    const oldPubKey = secp256k1.getPublicKey(oldPrivKey, true);
    const result = rotateSigningKey(oldPrivKey);

    // Use a wrong signature
    const wrongSig = new Uint8Array(64).fill(0xff);

    expect(verifyKeyTransition(oldPubKey, result.newPubKey, wrongSig)).toBe(false);
  });

  it('produces different keys on each call', () => {
    const r1 = rotateSigningKey(oldPrivKey);
    const r2 = rotateSigningKey(oldPrivKey);

    expect(r1.newPrivKey).not.toEqual(r2.newPrivKey);
    expect(r1.newPubKey).not.toEqual(r2.newPubKey);
  });
});
