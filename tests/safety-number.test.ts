import { describe, it, expect } from 'vitest'
import { safetyNumber } from '../src/core/crypto/safetyNumber'

describe('safetyNumber', () => {
  const keyA = 'a'.repeat(64)
  const keyB = 'b'.repeat(64)

  it('returns 12 groups of 5 digits', () => {
    const result = safetyNumber(keyA, keyB)
    expect(result.groups).toHaveLength(12)
    for (const group of result.groups) {
      expect(group).toMatch(/^\d{5}$/)
    }
  })

  it('returns 8 emoji', () => {
    const result = safetyNumber(keyA, keyB)
    expect(result.emoji).toHaveLength(8)
  })

  it('compact is groups joined without separators', () => {
    const result = safetyNumber(keyA, keyB)
    expect(result.compact).toBe(result.groups.join(''))
    expect(result.compact.length).toBe(60) // 12 × 5
  })

  it('is symmetric: same result regardless of key order', () => {
    const ab = safetyNumber(keyA, keyB)
    const ba = safetyNumber(keyB, keyA)
    expect(ab.groups).toEqual(ba.groups)
    expect(ab.emoji).toEqual(ba.emoji)
    expect(ab.compact).toBe(ba.compact)
  })

  it('produces different numbers for different key pairs', () => {
    const keyC = 'c'.repeat(64)
    const ab = safetyNumber(keyA, keyB)
    const ac = safetyNumber(keyA, keyC)
    expect(ab.compact).not.toBe(ac.compact)
  })

  it('produces deterministic results for the same inputs', () => {
    const first = safetyNumber(keyA, keyB)
    const second = safetyNumber(keyA, keyB)
    expect(first.compact).toBe(second.compact)
    expect(first.emoji).toEqual(second.emoji)
  })
})
