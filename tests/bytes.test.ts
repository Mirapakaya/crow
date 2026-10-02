import { describe, it, expect } from 'vitest'
import {
  bytesToHex,
  hexToBytes,
  bytesToB64url,
  b64urlToBytes,
  bytesToB64,
  b64ToBytes,
  concatBytes,
  wipe,
  constantTimeEqual,
  toBytes,
  isHex32,
  randomBytes,
  randomInt,
  utf8ToBytes,
  bytesToUtf8,
} from '../src/core/util/bytes'

describe('utf8ToBytes / bytesToUtf8', () => {
  it('round-trips ASCII', () => {
    expect(bytesToUtf8(utf8ToBytes('hello'))).toBe('hello')
  })

  it('round-trips multi-byte Unicode', () => {
    const s = 'مرحبا 🌍'
    expect(bytesToUtf8(utf8ToBytes(s))).toBe(s)
  })

  it('empty string round-trips', () => {
    expect(bytesToUtf8(utf8ToBytes(''))).toBe('')
  })
})

describe('hex encoding', () => {
  it('bytesToHex and hexToBytes round-trip', () => {
    const bytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef])
    expect(bytesToHex(bytes)).toBe('deadbeef')
    expect(hexToBytes('deadbeef')).toEqual(bytes)
  })

  it('is case-insensitive on decode', () => {
    expect(hexToBytes('DEADBEEF')).toEqual(hexToBytes('deadbeef'))
  })

  it('empty round-trip', () => {
    expect(bytesToHex(new Uint8Array(0))).toBe('')
    expect(hexToBytes('')).toEqual(new Uint8Array(0))
  })
})

describe('base64url encoding', () => {
  it('round-trips arbitrary bytes', () => {
    const bytes = new Uint8Array([0xff, 0xfe, 0x00, 0x01])
    expect(b64urlToBytes(bytesToB64url(bytes))).toEqual(bytes)
  })

  it('handles padding on decode', () => {
    // base64url strips padding; decode should restore it
    const encoded = bytesToB64url(new Uint8Array([1, 2, 3]))
    expect(b64urlToBytes(encoded)).toEqual(new Uint8Array([1, 2, 3]))
  })
})

describe('base64 encoding', () => {
  it('round-trips arbitrary bytes', () => {
    const bytes = new Uint8Array([0xff, 0xfe, 0x00, 0x01])
    expect(b64ToBytes(bytesToB64(bytes))).toEqual(bytes)
  })
})

describe('concatBytes', () => {
  it('concatenates multiple arrays', () => {
    const a = new Uint8Array([1, 2])
    const b = new Uint8Array([3, 4, 5])
    expect(concatBytes(a, b)).toEqual(new Uint8Array([1, 2, 3, 4, 5]))
  })

  it('returns empty for no arguments', () => {
    expect(concatBytes()).toEqual(new Uint8Array(0))
  })

  it('handles single argument', () => {
    expect(concatBytes(new Uint8Array([1]))).toEqual(new Uint8Array([1]))
  })
})

describe('wipe', () => {
  it('overwrites arrays with zeros', () => {
    const a = new Uint8Array([1, 2, 3])
    wipe(a)
    expect(a).toEqual(new Uint8Array([0, 0, 0]))
  })

  it('handles undefined and null gracefully', () => {
    expect(() => wipe(undefined, null)).not.toThrow()
  })
})

describe('constantTimeEqual', () => {
  it('returns true for identical arrays', () => {
    const a = new Uint8Array([1, 2, 3])
    const b = new Uint8Array([1, 2, 3])
    expect(constantTimeEqual(a, b)).toBe(true)
  })

  it('returns false for different arrays', () => {
    const a = new Uint8Array([1, 2, 3])
    const b = new Uint8Array([1, 2, 4])
    expect(constantTimeEqual(a, b)).toBe(false)
  })

  it('returns false for different lengths', () => {
    const a = new Uint8Array([1, 2])
    const b = new Uint8Array([1])
    expect(constantTimeEqual(a, b)).toBe(false)
  })
})

describe('toBytes', () => {
  it('passes through Uint8Array', () => {
    const u = new Uint8Array([1, 2])
    expect(toBytes(u)).toBe(u)
  })

  it('wraps ArrayBuffer', () => {
    const ab = new ArrayBuffer(2)
    new Uint8Array(ab).set([3, 4])
    expect(toBytes(ab)).toEqual(new Uint8Array([3, 4]))
  })

  it('wraps DataView', () => {
    const ab = new ArrayBuffer(2)
    new Uint8Array(ab).set([5, 6])
    const dv = new DataView(ab)
    expect(toBytes(dv)).toEqual(new Uint8Array([5, 6]))
  })

  it('throws for non-binary values', () => {
    expect(() => toBytes('hello')).toThrow('expected binary vault field')
    expect(() => toBytes(42)).toThrow('expected binary vault field')
  })
})

describe('isHex32', () => {
  it('accepts 64-character lowercase hex', () => {
    expect(isHex32('a'.repeat(64))).toBe(true)
  })

  it('rejects uppercase hex', () => {
    expect(isHex32('A'.repeat(64))).toBe(false)
  })

  it('rejects wrong length', () => {
    expect(isHex32('a'.repeat(32))).toBe(false)
    expect(isHex32('a'.repeat(65))).toBe(false)
  })

  it('rejects non-hex', () => {
    expect(isHex32('g'.repeat(64))).toBe(false)
  })

  it('rejects non-string', () => {
    expect(isHex32(42 as any)).toBe(false)
  })
})

describe('randomBytes', () => {
  it('returns the requested length', () => {
    expect(randomBytes(16).length).toBe(16)
    expect(randomBytes(0).length).toBe(0)
  })

  it('returns different values on subsequent calls', () => {
    // Extremely unlikely to get the same 32 bytes twice
    const a = randomBytes(32)
    const b = randomBytes(32)
    expect(a).not.toEqual(b)
  })
})

describe('randomInt', () => {
  it('returns values in [0, max)', () => {
    for (let i = 0; i < 100; i++) {
      const v = randomInt(10)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(10)
    }
  })

  it('throws for bad ranges', () => {
    expect(() => randomInt(0)).toThrow()
    expect(() => randomInt(-1)).toThrow()
    expect(() => randomInt(1.5)).toThrow()
  })
})
