import { describe, it, expect } from 'vitest';
import { giftWrap, unGiftWrap } from '@crypto/giftwrap';
import { secp256k1 } from '@noble/curves/secp256k1';

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

describe('giftwrap', () => {
  const senderPrivKey = secp256k1.utils.randomPrivateKey();
  const recipientPrivKey = secp256k1.utils.randomPrivateKey();
  const recipientPubKey = secp256k1.getPublicKey(recipientPrivKey, true);

  it('roundtrip: encrypt then decrypt recovers plaintext', () => {
    const plaintext = new TextEncoder().encode('Hello, sealed sender!');
    const sealed = giftWrap(plaintext, recipientPubKey, senderPrivKey);
    const result = unGiftWrap(sealed, recipientPrivKey);

    expect(bytesEqual(result.plaintext, plaintext)).toBe(true);
  });

  it('embeds the sender identity public key inside the encrypted payload', () => {
    const senderPubKey = secp256k1.getPublicKey(senderPrivKey, true);
    const plaintext = new TextEncoder().encode('test message');
    const sealed = giftWrap(plaintext, recipientPubKey, senderPrivKey);
    const result = unGiftWrap(sealed, recipientPrivKey);

    expect(bytesEqual(result.senderPubKey, senderPubKey)).toBe(true);
  });

  it('uses an ephemeral key (not the sender identity) as the sealed senderPubKey', () => {
    const senderPubKey = secp256k1.getPublicKey(senderPrivKey, true);
    const plaintext = new TextEncoder().encode('hidden sender');
    const sealed = giftWrap(plaintext, recipientPubKey, senderPrivKey);

    expect(bytesEqual(sealed.senderPubKey!, senderPubKey)).toBe(false);
  });

  it('fails to decrypt with wrong recipient private key', () => {
    const plaintext = new TextEncoder().encode('secret');
    const sealed = giftWrap(plaintext, recipientPubKey, senderPrivKey);

    const wrongPrivKey = secp256k1.utils.randomPrivateKey();
    expect(() => unGiftWrap(sealed, wrongPrivKey)).toThrow();
  });

  it('produces different ciphertexts for the same plaintext (randomized)', () => {
    const plaintext = new TextEncoder().encode('same message');
    const sealed1 = giftWrap(plaintext, recipientPubKey, senderPrivKey);
    const sealed2 = giftWrap(plaintext, recipientPubKey, senderPrivKey);

    expect(bytesEqual(sealed1.ciphertext, sealed2.ciphertext)).toBe(false);
    expect(bytesEqual(sealed1.nonce, sealed2.nonce)).toBe(false);
  });

  it('handles empty plaintext', () => {
    const plaintext = new Uint8Array(0);
    const sealed = giftWrap(plaintext, recipientPubKey, senderPrivKey);
    const result = unGiftWrap(sealed, recipientPrivKey);

    expect(result.plaintext).toHaveLength(0);
  });

  it('handles large plaintext (10KB)', () => {
    const plaintext = new Uint8Array(10 * 1024).fill(0xab);
    const sealed = giftWrap(plaintext, recipientPubKey, senderPrivKey);
    const result = unGiftWrap(sealed, recipientPrivKey);

    expect(bytesEqual(result.plaintext, plaintext)).toBe(true);
  });
});
