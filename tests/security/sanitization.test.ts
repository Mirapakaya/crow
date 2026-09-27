import { describe, it, expect } from 'vitest';
import { sanitizeLinkUrl, isDangerousMimeType, isSafeSvg } from '@security/sanitization';

describe('sanitization', () => {
  describe('sanitizeLinkUrl', () => {
    it('accepts https:// URLs', () => {
      expect(sanitizeLinkUrl('https://example.com')).toBe('https://example.com/');
    });

    it('accepts http:// URLs', () => {
      expect(sanitizeLinkUrl('http://example.com/path')).toBe('http://example.com/path');
    });

    it('rejects javascript: URLs', () => {
      expect(sanitizeLinkUrl('javascript:alert(1)')).toBeNull();
    });

    it('rejects data: URLs', () => {
      expect(sanitizeLinkUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    });

    it('rejects malformed URLs', () => {
      expect(sanitizeLinkUrl('not a url')).toBeNull();
    });
  });

  describe('isDangerousMimeType', () => {
    it('flags executable MIME types as dangerous', () => {
      expect(isDangerousMimeType('application/x-executable')).toBe(true);
      expect(isDangerousMimeType('application/x-msdownload')).toBe(true);
      expect(isDangerousMimeType('application/x-sh')).toBe(true);
      expect(isDangerousMimeType('application/java-archive')).toBe(true);
    });

    it('does not flag safe MIME types', () => {
      expect(isDangerousMimeType('image/png')).toBe(false);
      expect(isDangerousMimeType('application/pdf')).toBe(false);
      expect(isDangerousMimeType('text/plain')).toBe(false);
      expect(isDangerousMimeType('video/mp4')).toBe(false);
    });
  });

  describe('isSafeSvg', () => {
    it('accepts clean SVG content', () => {
      expect(isSafeSvg('<svg><circle r="10"/></svg>')).toBe(true);
    });

    it('rejects SVG with script tags', () => {
      expect(isSafeSvg('<svg><script>alert(1)</script></svg>')).toBe(false);
    });

    it('rejects SVG with event handlers', () => {
      expect(isSafeSvg('<svg onclick="alert(1)"></svg>')).toBe(false);
    });

    it('rejects SVG with iframe', () => {
      expect(isSafeSvg('<svg><iframe src="evil.com"></iframe></svg>')).toBe(false);
    });

    it('rejects SVG with javascript: href', () => {
      expect(isSafeSvg('<svg><a href="javascript:alert(1)"></a></svg>')).toBe(false);
    });

    it('rejects SVG with xlink:href javascript:', () => {
      expect(isSafeSvg('<svg><a xlink:href="javascript:alert(1)"></a></svg>')).toBe(false);
    });

    it('rejects SVG with embed tags', () => {
      expect(isSafeSvg('<svg><embed src="evil.swf"></embed></svg>')).toBe(false);
    });

    it('rejects SVG with object tags', () => {
      expect(isSafeSvg('<svg><object data="evil.swf"></object></svg>')).toBe(false);
    });
  });
});
