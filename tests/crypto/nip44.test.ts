import { describe, it, expect } from 'vitest';
import { secp256k1 } from '@noble/curves/secp256k1';
import {
  getSharedSecret,
  getConversationKey,
  encrypt,
  decrypt,
} from '@crypto/nip44';

/** Generate a random secp256k1 key pair for tests. */
function randomKeyPair() {
  const priv = secp256k1.utils.randomPrivateKey();
  const pub = secp256k1.getPublicKey(priv, true);
  return { privateKey: priv, publicKey: pub };
}

describe('NIP-44 encryption', () => {
  it('derives a shared secret from two key pairs', () => {
    const alice = randomKeyPair();
    const bob = randomKeyPair();

    const shared1 = getSharedSecret(alice.privateKey, bob.publicKey);
    const shared2 = getSharedSecret(bob.privateKey, alice.publicKey);

    // Both parties derive the same shared secret
    expect(shared1).toHaveLength(32);
    expect(shared2).toHaveLength(32);
    expect(shared1).toEqual(shared2);
  });

  it('derives a conversation key from a shared secret', () => {
    const alice = randomKeyPair();
    const bob = randomKeyPair();
    const shared = getSharedSecret(alice.privateKey, bob.publicKey);

    const convKey = getConversationKey(shared);
    expect(convKey).toHaveLength(32);

    // Same shared secret → same conversation key
    const convKey2 = getConversationKey(shared);
    expect(convKey2).toEqual(convKey);
  });

  it('different key pairs produce different shared secrets', () => {
    const alice = randomKeyPair();
    const bob = randomKeyPair();
    const eve = randomKeyPair();

    const sharedAB = getSharedSecret(alice.privateKey, bob.publicKey);
    const sharedAE = getSharedSecret(alice.privateKey, eve.publicKey);

    expect(sharedAB).not.toEqual(sharedAE);
  });

  it('encrypt → decrypt roundtrip works', () => {
    const alice = randomKeyPair();
    const bob = randomKeyPair();
    const shared = getSharedSecret(alice.privateKey, bob.publicKey);
    const convKey = getConversationKey(shared);

    const plaintext = 'Hello, Crow!';
    const sealed = encrypt(plaintext, convKey);
    const decrypted = decrypt(sealed, convKey);

    expect(decrypted).toBe(plaintext);
  });

  it('different conversation keys cannot decrypt', () => {
    const alice = randomKeyPair();
    const bob = randomKeyPair();
    const eve = randomKeyPair();

    const sharedAB = getSharedSecret(alice.privateKey, bob.publicKey);
    const convKeyAB = getConversationKey(sharedAB);

    const sharedAE = getSharedSecret(alice.privateKey, eve.publicKey);
    const convKeyAE = getConversationKey(sharedAE);

    const sealed = encrypt('secret message', convKeyAB);

    expect(() => decrypt(sealed, convKeyAE)).toThrow();
  });

  it('invalid ciphertext throws on decrypt', () => {
    const alice = randomKeyPair();
    const bob = randomKeyPair();
    const shared = getSharedSecret(alice.privateKey, bob.publicKey);
    const convKey = getConversationKey(shared);

    // Invalid base64
    expect(() => decrypt('not-valid-base64!!!', convKey)).toThrow();
  });

  it('produces different ciphertext for same plaintext (random nonce)', () => {
    const alice = randomKeyPair();
    const bob = randomKeyPair();
    const shared = getSharedSecret(alice.privateKey, bob.publicKey);
    const convKey = getConversationKey(shared);

    const sealed1 = encrypt('same text', convKey);
    const sealed2 = encrypt('same text', convKey);

    // Random nonces mean different ciphertext each time
    expect(sealed1).not.toBe(sealed2);

    // Both decrypt to the same plaintext
    expect(decrypt(sealed1, convKey)).toBe('same text');
    expect(decrypt(sealed2, convKey)).toBe('same text');
  });

  it('handles empty string', () => {
    const alice = randomKeyPair();
    const bob = randomKeyPair();
    const shared = getSharedSecret(alice.privateKey, bob.publicKey);
    const convKey = getConversationKey(shared);

    const sealed = encrypt('', convKey);
    expect(decrypt(sealed, convKey)).toBe('');
  });

  it('handles long plaintext', () => {
    const alice = randomKeyPair();
    const bob = randomKeyPair();
    const shared = getSharedSecret(alice.privateKey, bob.publicKey);
    const convKey = getConversationKey(shared);

    const longText = 'x'.repeat(10000);
    const sealed = encrypt(longText, convKey);
    expect(decrypt(sealed, convKey)).toBe(longText);
  });
});
