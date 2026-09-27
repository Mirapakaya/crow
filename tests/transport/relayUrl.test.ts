import { describe, it, expect } from 'vitest';
import { normalizeRelayUrl, validateRelayUrl, isRelayUrl } from '@transport/relayUrl';

describe('relayUrl', () => {
  describe('normalizeRelayUrl', () => {
    it('upgrades ws:// to wss://', () => {
      expect(normalizeRelayUrl('ws://relay.example.com')).toBe('wss://relay.example.com');
    });

    it('adds wss:// scheme to bare hostnames', () => {
      expect(normalizeRelayUrl('relay.example.com')).toBe('wss://relay.example.com');
    });

    it('preserves wss:// scheme', () => {
      expect(normalizeRelayUrl('wss://relay.damus.io')).toBe('wss://relay.damus.io');
    });

    it('trims whitespace', () => {
      expect(normalizeRelayUrl('  wss://relay.example.com  ')).toBe('wss://relay.example.com');
    });

    it('trims trailing slashes', () => {
      expect(normalizeRelayUrl('wss://relay.example.com/')).toBe('wss://relay.example.com');
    });

    it('lowercases the hostname', () => {
      expect(normalizeRelayUrl('wss://RELAY.EXAMPLE.COM')).toBe('wss://relay.example.com');
    });

    it('preserves path after hostname', () => {
      expect(normalizeRelayUrl('wss://relay.example.com/v2')).toBe('wss://relay.example.com/v2');
    });
  });

  describe('validateRelayUrl', () => {
    it('accepts valid wss:// URLs', () => {
      expect(validateRelayUrl('wss://relay.damus.io')).toBe(true);
    });

    it('accepts valid ws:// URLs (normalizes to wss://)', () => {
      expect(validateRelayUrl('ws://relay.example.com')).toBe(true);
    });

    it('rejects http:// URLs', () => {
      expect(validateRelayUrl('http://example.com')).toBe(false);
    });

    it('rejects invalid hostnames (no dot, not localhost)', () => {
      expect(validateRelayUrl('wss://notvalid')).toBe(false);
    });

    it('accepts localhost', () => {
      expect(validateRelayUrl('wss://localhost')).toBe(true);
    });
  });

  describe('isRelayUrl', () => {
    it('returns true for wss:// URLs', () => {
      expect(isRelayUrl('wss://relay.example.com')).toBe(true);
    });

    it('returns true for ws:// URLs', () => {
      expect(isRelayUrl('ws://relay.example.com')).toBe(true);
    });

    it('returns false for http:// URLs', () => {
      expect(isRelayUrl('http://example.com')).toBe(false);
    });

    it('returns false for non-strings', () => {
      expect(isRelayUrl(42 as unknown as string)).toBe(false);
    });
  });
});
