import { describe, it, expect } from 'vitest';
import {
  generateMnemonic,
  mnemonicToSeed,
  validateMnemonic,
  seedToMnemonic,
} from '@identity/mnemonic';

describe('mnemonic', () => {
  it('generates a 12-word mnemonic by default', () => {
    const words = generateMnemonic();
    const wordList = words.split(' ');
    expect(wordList).toHaveLength(12);
  });

  it('generates a 24-word mnemonic when requested', () => {
    const words = generateMnemonic(24);
    const wordList = words.split(' ');
    expect(wordList).toHaveLength(24);
  });

  it('throws for invalid word count', () => {
    // @ts-expect-error intentionally wrong
    expect(() => generateMnemonic(15)).toThrow();
  });

  it('produces different mnemonics on each call', () => {
    const m1 = generateMnemonic();
    const m2 = generateMnemonic();
    expect(m1).not.toBe(m2);
  });

  it('validates a correct 12-word mnemonic', () => {
    const mnemonic = generateMnemonic(12);
    expect(validateMnemonic(mnemonic)).toBe(true);
  });

  it('rejects an invalid mnemonic', () => {
    expect(validateMnemonic('invalid words here')).toBe(false);
  });

  it('rejects mnemonic with wrong word count', () => {
    const mnemonic = generateMnemonic(12);
    const short = mnemonic.split(' ').slice(0, 11).join(' ');
    expect(validateMnemonic(short)).toBe(false);
  });

  it('mnemonicToSeed produces a 64-byte seed', () => {
    const mnemonic = generateMnemonic();
    const seed = mnemonicToSeed(mnemonic);
    expect(seed).toHaveLength(64);
  });

  it('mnemonicToSeed with passphrase produces a different seed', () => {
    const mnemonic = generateMnemonic();
    const seed1 = mnemonicToSeed(mnemonic);
    const seed2 = mnemonicToSeed(mnemonic, 'my-passphrase');
    expect(seed1).not.toEqual(seed2);
  });

  it('seedToMnemonic rejects invalid entropy length', () => {
    expect(() => seedToMnemonic(new Uint8Array(8))).toThrow();
    expect(() => seedToMnemonic(new Uint8Array(20))).toThrow();
  });

  it('seedToMnemonic roundtrips with 16 bytes of entropy', () => {
    const entropy = crypto.getRandomValues(new Uint8Array(16));
    const mnemonic = seedToMnemonic(entropy);
    expect(validateMnemonic(mnemonic)).toBe(true);
  });

  it('seedToMnemonic roundtrips with 32 bytes of entropy', () => {
    const entropy = crypto.getRandomValues(new Uint8Array(32));
    const mnemonic = seedToMnemonic(entropy);
    expect(mnemonic.split(' ')).toHaveLength(24);
    expect(validateMnemonic(mnemonic)).toBe(true);
  });
});
