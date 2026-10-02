import { describe, it, expect, vi } from 'vitest'
import {
  translate,
  interpolate,
  detectLocale,
  LOCALE_CODES,
  LOCALE_DIRECTION,
  LOCALE_NAMES,
  LOCALE_SHORT_NAMES,
  DICTIONARIES,
  type LocaleCode,
} from '../src/i18n'
import { en } from '../src/i18n/en'

describe('translate', () => {
  it('translates a top-level key', () => {
    expect(translate('en', 'common.next')).toBe('Next')
    expect(translate('en', 'common.cancel')).toBe('Cancel')
  })

  it('translates a nested key', () => {
    expect(translate('en', 'onboarding.backupTitle')).toBe(en.onboarding.backupTitle)
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
    const result = translate('fa', 'common.next')
    expect(result).toBeDefined()
    expect(result.length).toBeGreaterThan(0)
  })

  it('returns the key for completely unknown keys', () => {
    const result = translate('en', 'nonexistent.key' as any)
    expect(result).toBe('nonexistent.key')
  })

  it('returns a string for every locale and a common key', () => {
    for (const code of LOCALE_CODES) {
      const result = translate(code as LocaleCode, 'common.cancel')
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    }
  })

  it('preserves untranslated placeholders when the value is not provided', () => {
    const result = translate('en', 'lock.withBiometric', {})
    // The template has {method}; without the value it stays
    expect(result).toContain('{method}')
  })
})

describe('interpolate', () => {
  it('replaces single placeholder', () => {
    expect(interpolate('Hello {name}', { name: 'World' })).toBe('Hello World')
  })

  it('replaces multiple placeholders', () => {
    expect(interpolate('{a} and {b}', { a: 'X', b: 'Y' })).toBe('X and Y')
  })

  it('leaves unknown placeholders untouched', () => {
    expect(interpolate('Hello {unknown}', { name: 'World' })).toBe('Hello {unknown}')
  })

  it('returns the template unchanged when no values given', () => {
    expect(interpolate('Hello {name}')).toBe('Hello {name}')
    expect(interpolate('No placeholders')).toBe('No placeholders')
  })

  it('converts numbers to strings', () => {
    expect(interpolate('Count: {n}', { n: 42 })).toBe('Count: 42')
  })

  it('handles numeric zero correctly', () => {
    expect(interpolate('Count: {n}', { n: 0 })).toBe('Count: 0')
  })

  it('replaces repeated placeholders', () => {
    expect(interpolate('{x} + {x}', { x: '1' })).toBe('1 + 1')
  })
})

describe('detectLocale', () => {
  it('returns en when navigator is undefined', () => {
    const saved = globalThis.navigator
    // @ts-expect-error -- intentionally delete for test
    delete globalThis.navigator
    expect(detectLocale()).toBe('en')
    globalThis.navigator = saved
  })

  it('matches an exact locale from navigator.languages', () => {
    const original = navigator.languages
    Object.defineProperty(navigator, 'languages', {
      value: ['fa', 'en'],
      configurable: true,
    })
    expect(detectLocale()).toBe('fa')
    Object.defineProperty(navigator, 'languages', {
      value: original,
      configurable: true,
    })
  })

  it('matches the base language from a regional tag', () => {
    const original = navigator.languages
    Object.defineProperty(navigator, 'languages', {
      value: ['pt-BR', 'en'],
      configurable: true,
    })
    expect(detectLocale()).toBe('pt')
    Object.defineProperty(navigator, 'languages', {
      value: original,
      configurable: true,
    })
  })

  it('falls back to en for an unsupported language', () => {
    const original = navigator.languages
    Object.defineProperty(navigator, 'languages', {
      value: ['xx-YY'],
      configurable: true,
    })
    expect(detectLocale()).toBe('en')
    Object.defineProperty(navigator, 'languages', {
      value: original,
      configurable: true,
    })
  })

  it('skips the base tag when it is not a shipped locale', () => {
    const original = navigator.languages
    Object.defineProperty(navigator, 'languages', {
      value: ['xx', 'de'],
      configurable: true,
    })
    expect(detectLocale()).toBe('de')
    Object.defineProperty(navigator, 'languages', {
      value: original,
      configurable: true,
    })
  })
})

describe('locale metadata consistency', () => {
  it('every locale code has a dictionary', () => {
    for (const code of LOCALE_CODES) {
      expect(DICTIONARIES[code as LocaleCode]).toBeDefined()
    }
  })

  it('every locale code has a short name', () => {
    for (const code of LOCALE_CODES) {
      expect(LOCALE_SHORT_NAMES[code as LocaleCode]).toBeDefined()
      expect(LOCALE_SHORT_NAMES[code as LocaleCode].length).toBeGreaterThan(0)
    }
  })

  it('short names are compact (≤ 6 characters)', () => {
    for (const code of LOCALE_CODES) {
      const short = LOCALE_SHORT_NAMES[code as LocaleCode]
      expect(short.length).toBeLessThanOrEqual(6)
    }
  })
})
