import { describe, it, expect } from 'vitest'
import { cleanLine } from '../src/core/util/text'

describe('cleanLine', () => {
  it('returns the string unchanged when it is already clean', () => {
    expect(cleanLine('Hello world', 100)).toBe('Hello world')
  })

  it('trims leading and trailing whitespace', () => {
    expect(cleanLine('  hello  ', 100)).toBe('hello')
  })

  it('collapses runs of whitespace into a single space', () => {
    expect(cleanLine('hello   world', 100)).toBe('hello world')
  })

  it('replaces control characters with spaces', () => {
    expect(cleanLine('hello\tworld', 100)).toBe('hello world')
    expect(cleanLine('hello\nworld', 100)).toBe('hello world')
  })

  it('replaces Unicode line separators', () => {
    expect(cleanLine('hello\u2028world', 100)).toBe('hello world')
    expect(cleanLine('hello\u2029world', 100)).toBe('hello world')
  })

  it('truncates to max characters (by grapheme)', () => {
    expect(cleanLine('abcde', 3)).toBe('abc')
  })

  it('respects grapheme clusters when truncating', () => {
    // '👨‍👩‍👧' is a single grapheme cluster but multiple code points
    const family = '👨‍👩‍👧'
    expect(cleanLine(family + 'x', 2)).toBe(family + 'x')
  })

  it('returns null for empty string after cleaning', () => {
    expect(cleanLine('', 100)).toBeNull()
    expect(cleanLine('   ', 100)).toBeNull()
  })

  it('returns null for non-string input', () => {
    expect(cleanLine(42 as any, 100)).toBeNull()
    expect(cleanLine(null as any, 100)).toBeNull()
    expect(cleanLine(undefined as any, 100)).toBeNull()
  })

  it('returns null when only control characters remain after cleaning', () => {
    expect(cleanLine('\t\n\r', 100)).toBeNull()
  })
})
