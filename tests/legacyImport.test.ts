import { describe, expect, it } from 'vitest'
import { hasLegacyData, readLegacyLocalStorage } from '../src/core/legacy/importLegacy'

describe('legacy import', () => {
  it('returns null when no legacy data exists', () => {
    expect(readLegacyLocalStorage()).toBeNull()
  })

  it('detects legacy data flag', () => {
    expect(hasLegacyData()).toBe(false)
  })
})
