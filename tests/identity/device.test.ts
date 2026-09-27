import { describe, it, expect } from 'vitest';
import {
  generateDeviceId,
  getDeviceName,
  createDeviceRecord,
  fingerprintDevice,
} from '@identity/device';
import { generateIdentityKeyPair } from '@identity/keygen';

describe('device', () => {
  it('generateDeviceId produces a 16-char hex string', () => {
    const id = generateDeviceId();
    expect(id).toHaveLength(16);
    expect(/^[0-9a-f]{16}$/.test(id)).toBe(true);
  });

  it('generateDeviceId produces unique ids', () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateDeviceId()));
    expect(ids.size).toBe(20);
  });

  it('getDeviceName returns a non-empty string', () => {
    const name = getDeviceName();
    expect(name.length).toBeGreaterThan(0);
  });

  it('createDeviceRecord produces a valid record', () => {
    const keyPair = generateIdentityKeyPair();
    const record = createDeviceRecord(keyPair);

    expect(record.id).toHaveLength(16);
    expect(record.name.length).toBeGreaterThan(0);
    expect(record.publicKey).toHaveLength(33); // compressed pubkey
    expect(record.createdAt).toBeGreaterThan(0);
    expect(record.lastActiveAt).toBeGreaterThan(0);
    expect(record.verified).toBe(false);
  });

  it('fingerprintDevice produces a formatted fingerprint', () => {
    const keyPair = generateIdentityKeyPair();
    const record = createDeviceRecord(keyPair);
    const fp = fingerprintDevice(record);

    // Format: "xxxx · xxxx"
    expect(fp).toMatch(/^[0-9a-f]{4} · [0-9a-f]{4}$/);
  });

  it('different devices have different fingerprints', () => {
    const kp1 = generateIdentityKeyPair();
    const kp2 = generateIdentityKeyPair();
    const r1 = createDeviceRecord(kp1);
    const r2 = createDeviceRecord(kp2);

    expect(fingerprintDevice(r1)).not.toBe(fingerprintDevice(r2));
  });
});
