import { describe, it, expect } from 'vitest';
import {
  computeSafetyNumber,
  computeSafetyNumberFingerprint,
} from '@crypto/safetyNumber';

describe('safetyNumber', () => {
  const pubKeyA = crypto.getRandomValues(new Uint8Array(32));
  const pubKeyB = crypto.getRandomValues(new Uint8Array(32));

  it('computeSafetyNumber returns 15 five-digit groups (from 30 bytes)', () => {
    const sn = computeSafetyNumber(pubKeyA, pubKeyB);

    // 30 bytes / 2 bytes per group = 15 groups of 5 digits
    const groups = sn.split(' ');
    expect(groups).toHaveLength(15);

    for (const group of groups) {
      expect(group).toHaveLength(5);
      // Each group is a 5-digit decimal number (0–65535)
      expect(group).toMatch(/^\d{5}$/);
    }
  });

  it('same keys always produce same safety number', () => {
    const sn1 = computeSafetyNumber(pubKeyA, pubKeyB);
    const sn2 = computeSafetyNumber(pubKeyA, pubKeyB);
    expect(sn1).toBe(sn2);
  });

  it('key order does not matter (symmetric)', () => {
    const sn1 = computeSafetyNumber(pubKeyA, pubKeyB);
    const sn2 = computeSafetyNumber(pubKeyB, pubKeyA);
    expect(sn1).toBe(sn2);
  });

  it('computeSafetyNumberFingerprint returns 32 bytes', () => {
    const fp = computeSafetyNumberFingerprint(pubKeyA, pubKeyB);
    expect(fp).toHaveLength(32);
  });

  it('fingerprint is symmetric', () => {
    const fp1 = computeSafetyNumberFingerprint(pubKeyA, pubKeyB);
    const fp2 = computeSafetyNumberFingerprint(pubKeyB, pubKeyA);

    expect(fp1).toEqual(fp2);
  });

  it('different keys produce different safety numbers', () => {
    const pubKeyC = crypto.getRandomValues(new Uint8Array(32));
    const sn1 = computeSafetyNumber(pubKeyA, pubKeyB);
    const sn2 = computeSafetyNumber(pubKeyA, pubKeyC);
    expect(sn1).not.toBe(sn2);
  });

  it('identical keys produce a valid safety number', () => {
    const sn = computeSafetyNumber(pubKeyA, pubKeyA);
    const groups = sn.split(' ');
    expect(groups).toHaveLength(15);
    for (const group of groups) {
      expect(group).toMatch(/^\d{5}$/);
    }
  });
});
