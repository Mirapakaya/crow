import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isValidPubKey,
  isValidRelayUrl,
  sanitizeHtml,
  isValidPassphrase,
  isValidPin,
  isSafeUrl,
  RateLimiter,
  isValidDisplayName,
  isValidEventId,
  isValidMnemonicFormat,
  isAllowedMimeType,
  isAllowedAttachmentSize,
  MAX_ATTACHMENT_SIZE,
  isValidFileName,
} from '@security/validation';

describe('validation', () => {
  describe('isValidPubKey', () => {
    it('accepts valid 64-char hex string', () => {
      expect(isValidPubKey('a'.repeat(64))).toBe(true);
      expect(isValidPubKey('0123456789abcdef'.repeat(4))).toBe(true);
    });

    it('rejects wrong length', () => {
      expect(isValidPubKey('abc')).toBe(false);
      expect(isValidPubKey('a'.repeat(63))).toBe(false);
      expect(isValidPubKey('a'.repeat(65))).toBe(false);
    });

    it('rejects non-hex characters', () => {
      expect(isValidPubKey('g'.repeat(64))).toBe(false);
      expect(isValidPubKey('A'.repeat(64))).toBe(false); // uppercase rejected
    });

    it('rejects empty string', () => {
      expect(isValidPubKey('')).toBe(false);
    });
  });

  describe('isValidEventId', () => {
    it('accepts valid 64-char hex', () => {
      expect(isValidEventId('abcdef0123456789'.repeat(4))).toBe(true);
    });

    it('rejects invalid', () => {
      expect(isValidEventId('abc')).toBe(false);
      expect(isValidEventId('G'.repeat(64))).toBe(false);
    });
  });

  describe('isValidRelayUrl', () => {
    it('accepts valid wss:// URLs', () => {
      expect(isValidRelayUrl('wss://relay.example.com')).toBe(true);
      expect(isValidRelayUrl('wss://relay.example.com:443/path')).toBe(true);
    });

    it('rejects non-wss protocols', () => {
      expect(isValidRelayUrl('ws://relay.example.com')).toBe(false);
      expect(isValidRelayUrl('https://relay.example.com')).toBe(false);
      expect(isValidRelayUrl('http://relay.example.com')).toBe(false);
    });

    it('rejects invalid URLs', () => {
      expect(isValidRelayUrl('not-a-url')).toBe(false);
      expect(isValidRelayUrl('')).toBe(false);
    });

    it('rejects wss:// with empty hostname', () => {
      expect(isValidRelayUrl('wss:///')).toBe(false);
    });
  });

  describe('sanitizeHtml', () => {
    it('escapes HTML tags (text→innerHTML pattern HTML-encodes)', () => {
      // sanitizeHtml uses textContent→innerHTML which HTML-escapes tags
      const result = sanitizeHtml('<script>alert("xss")</script>');
      expect(result).not.toContain('<script>');
      expect(result).toContain('alert');
    });

    it('preserves plain text', () => {
      expect(sanitizeHtml('Hello, world!')).toBe('Hello, world!');
    });

    it('escapes angle brackets and special chars', () => {
      const result = sanitizeHtml('<b>bold</b>');
      expect(result).not.toContain('<b>');
      expect(result).toContain('bold');
    });
  });

  describe('isValidPassphrase', () => {
    it('accepts passphrases with 8+ characters', () => {
      expect(isValidPassphrase('12345678')).toBe(true);
      expect(isValidPassphrase('correct horse battery staple')).toBe(true);
    });

    it('rejects short passphrases', () => {
      expect(isValidPassphrase('1234567')).toBe(false);
      expect(isValidPassphrase('')).toBe(false);
    });
  });

  describe('isValidPin', () => {
    it('accepts 4-6 digit PINs', () => {
      expect(isValidPin('1234')).toBe(true);
      expect(isValidPin('123456')).toBe(true);
      expect(isValidPin('0000')).toBe(true);
    });

    it('rejects non-digit PINs', () => {
      expect(isValidPin('abcd')).toBe(false);
      expect(isValidPin('12a4')).toBe(false);
    });

    it('rejects wrong-length PINs', () => {
      expect(isValidPin('123')).toBe(false);
      expect(isValidPin('1234567')).toBe(false);
      expect(isValidPin('')).toBe(false);
    });
  });

  describe('isSafeUrl', () => {
    it('accepts http and https URLs', () => {
      expect(isSafeUrl('https://example.com')).toBe(true);
      expect(isSafeUrl('http://example.com')).toBe(true);
    });

    it('blocks javascript: URLs', () => {
      expect(isSafeUrl('javascript:alert(1)')).toBe(false);
      expect(isSafeUrl('JAVASCRIPT:alert(1)')).toBe(false);
    });

    it('blocks data: URLs with script', () => {
      expect(isSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    });

    it('blocks non-http protocols', () => {
      expect(isSafeUrl('ftp://example.com')).toBe(false);
    });

    it('rejects invalid URLs', () => {
      expect(isSafeUrl('not-a-url')).toBe(false);
    });
  });

  describe('RateLimiter', () => {
    let limiter: RateLimiter;

    beforeEach(() => {
      vi.useFakeTimers();
      limiter = new RateLimiter(3, 10_000); // 3 requests per 10s window
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('allows requests under limit', () => {
      expect(limiter.check()).toBe(true);
      expect(limiter.check()).toBe(true);
      expect(limiter.check()).toBe(true);
    });

    it('blocks after limit reached', () => {
      limiter.check();
      limiter.check();
      limiter.check();
      expect(limiter.check()).toBe(false);
    });

    it('allows after window expires', () => {
      limiter.check();
      limiter.check();
      limiter.check();
      expect(limiter.check()).toBe(false);

      vi.advanceTimersByTime(10_001);
      expect(limiter.check()).toBe(true);
    });

    it('reset clears the rate limit', () => {
      limiter.check();
      limiter.check();
      limiter.check();
      limiter.reset();
      expect(limiter.check()).toBe(true);
    });
  });

  describe('isValidDisplayName', () => {
    it('accepts valid names', () => {
      expect(isValidDisplayName('Alice')).toBe(true);
      expect(isValidDisplayName('Bob Smith')).toBe(true);
    });

    it('rejects empty or too-long names', () => {
      expect(isValidDisplayName('')).toBe(false);
      expect(isValidDisplayName('A'.repeat(101))).toBe(false);
    });

    it('rejects names with control characters', () => {
      expect(isValidDisplayName('test\x00name')).toBe(false);
      expect(isValidDisplayName('test\x1fname')).toBe(false);
    });
  });

  describe('isValidMnemonicFormat', () => {
    it('accepts 12 or 24 word mnemonics', () => {
      expect(isValidMnemonicFormat('word '.repeat(11) + 'word')).toBe(true); // 12 words
      expect(isValidMnemonicFormat('word '.repeat(23) + 'word')).toBe(true); // 24 words
    });

    it('rejects other word counts', () => {
      expect(isValidMnemonicFormat('word '.repeat(10) + 'word')).toBe(false); // 11 words
      expect(isValidMnemonicFormat('word '.repeat(14) + 'word')).toBe(false); // 15 words
    });
  });

  describe('isAllowedMimeType', () => {
    it('accepts common MIME types', () => {
      expect(isAllowedMimeType('image/jpeg')).toBe(true);
      expect(isAllowedMimeType('video/mp4')).toBe(true);
      expect(isAllowedMimeType('application/pdf')).toBe(true);
    });

    it('accepts any image/* or audio/* type', () => {
      expect(isAllowedMimeType('image/custom')).toBe(true);
      expect(isAllowedMimeType('audio/custom')).toBe(true);
    });
  });

  describe('isAllowedAttachmentSize', () => {
    it('accepts sizes within range', () => {
      expect(isAllowedAttachmentSize(1)).toBe(true);
      expect(isAllowedAttachmentSize(MAX_ATTACHMENT_SIZE)).toBe(true);
    });

    it('rejects zero and oversized', () => {
      expect(isAllowedAttachmentSize(0)).toBe(false);
      expect(isAllowedAttachmentSize(MAX_ATTACHMENT_SIZE + 1)).toBe(false);
    });
  });

  describe('isValidFileName', () => {
    it('accepts valid file names', () => {
      expect(isValidFileName('photo.jpg')).toBe(true);
      expect(isValidFileName('document.pdf')).toBe(true);
    });

    it('rejects empty, too-long, path traversal, null bytes', () => {
      expect(isValidFileName('')).toBe(false);
      expect(isValidFileName('A'.repeat(256))).toBe(false);
      expect(isValidFileName('..\x00file')).toBe(false);
      expect(isValidFileName('../secret')).toBe(false);
      expect(isValidFileName('/etc/passwd')).toBe(false);
      expect(isValidFileName('.hidden')).toBe(false);
    });
  });
});
