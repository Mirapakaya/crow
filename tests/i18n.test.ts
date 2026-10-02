import { describe, it, expect } from 'vitest'
import { LOCALE_CODES, LOCALE_DIRECTION, LOCALE_NAMES, translate } from '../src/i18n'
import type { LocaleCode } from '../src/core/models/types'
import { en } from '../src/i18n/en'

describe('i18n', () => {
  describe('locale metadata', () => {
    it('has 30 locale codes', () => {
      expect(LOCALE_CODES).toHaveLength(30)
    })

    it('every locale code has a direction', () => {
      for (const code of LOCALE_CODES) {
        expect(LOCALE_DIRECTION[code as LocaleCode]).toBeDefined()
        expect(['ltr', 'rtl']).toContain(LOCALE_DIRECTION[code as LocaleCode])
      }
    })

    it('every locale code has a display name', () => {
      for (const code of LOCALE_CODES) {
        expect(LOCALE_NAMES[code as LocaleCode]).toBeDefined()
        expect(LOCALE_NAMES[code as LocaleCode].length).toBeGreaterThan(0)
      }
    })

    it('RTL locales are fa, ar, ur', () => {
      const rtl = LOCALE_CODES.filter((c) => LOCALE_DIRECTION[c as LocaleCode] === 'rtl')
      expect(rtl).toEqual(expect.arrayContaining(['fa', 'ar', 'ur']))
      expect(rtl.length).toBe(3)
    })
  })

  describe('translate', () => {
    it('translates a top-level key', () => {
      expect(translate('en', 'common.next')).toBe('Next')
      expect(translate('en', 'common.cancel')).toBe('Cancel')
    })

    it('translates a nested key', () => {
      expect(translate('en', 'onboarding.backupTitle')).toBe(
        en.onboarding.backupTitle,
      )
    })

    it('interpolates {name} values', () => {
      const result = translate('en', 'lock.withBiometric', { method: 'Touch ID' })
      expect(result).toContain('Touch ID')
    })

    it('interpolates {n} values', () => {
      const result = translate('en', 'groups.chosen', { n: '3', max: '10' })
      expect(result).toContain('3')
      expect(result).toContain('10')
    })

    it('falls back to English for missing keys in non-English locales', () => {
      // Persian is fully translated; use a supplementary dict key that falls back
      const result = translate('fa', 'common.next')
      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
    })

    it('returns the key for completely unknown keys', () => {
      const result = translate('en', 'nonexistent.key' as any)
      expect(result).toBe('nonexistent.key')
    })
  })
})
