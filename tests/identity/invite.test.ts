import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { encodeInvite, decodeInvite, INVITE_EXPIRY } from '@identity/invite';

describe('invite codec', () => {
  const identityKey = crypto.getRandomValues(new Uint8Array(33));

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('encodeInvite → decodeInvite roundtrip', () => {
    const payload = {
      identityKey,
      timestamp: Date.now(),
    };

    const encoded = encodeInvite(payload);
    const decoded = decodeInvite(encoded);

    expect(decoded.identityKey).toEqual(identityKey);
    expect(decoded.timestamp).toBe(payload.timestamp);
    expect(decoded.relayHint).toBeUndefined();
  });

  it('roundtrip with relay hint', () => {
    const payload = {
      identityKey,
      relayHint: 'relay.crow.example',
      timestamp: Date.now(),
    };

    const encoded = encodeInvite(payload);
    const decoded = decodeInvite(encoded);

    expect(decoded.identityKey).toEqual(identityKey);
    expect(decoded.relayHint).toBe('relay.crow.example');
    expect(decoded.timestamp).toBe(payload.timestamp);
  });

  it('expired invite fails validation', () => {
    const now = Date.now();
    const payload = {
      identityKey,
      timestamp: now - INVITE_EXPIRY - 1, // just past expiry
    };

    const encoded = encodeInvite(payload);
    expect(() => decodeInvite(encoded)).toThrow(/expired/);
  });

  it('invite at the edge of expiry still valid', () => {
    const now = Date.now();
    const payload = {
      identityKey,
      timestamp: now - INVITE_EXPIRY + 1000, // just inside expiry
    };

    const encoded = encodeInvite(payload);
    const decoded = decodeInvite(encoded);
    expect(decoded.identityKey).toEqual(identityKey);
  });

  it('future timestamp (clock skew > 1h) fails', () => {
    const now = Date.now();
    const payload = {
      identityKey,
      timestamp: now + 3_600_001, // > 1 hour in the future
    };

    const encoded = encodeInvite(payload);
    expect(() => decodeInvite(encoded)).toThrow(/future/);
  });

  it('invalid base64 fails', () => {
    expect(() => decodeInvite('not-valid-base64!!!')).toThrow();
  });

  it('too-short input fails', () => {
    // Encode just a few bytes as base64url
    const short = new Uint8Array(5);
    const b64 = btoa(String.fromCharCode(...short))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    expect(() => decodeInvite(b64)).toThrow(/too short|truncated/);
  });

  it('INVITE_EXPIRY is 7 days', () => {
    expect(INVITE_EXPIRY).toBe(7 * 86_400_000);
  });
});
