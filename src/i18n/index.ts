import { createContext, useContext } from 'react'
import type { LocaleCode } from '../core/models/types'
import { en, type Dictionary } from './en'
import { fa } from './fa'
import { ar } from './ar'
import { ur } from './ur'
import { hi } from './hi'
import { bn } from './bn'
import { te } from './te'
import { ta } from './ta'
import { kn } from './kn'
import { ml } from './ml'
import { mr } from './mr'
import { gu } from './gu'
import { pa } from './pa'
import { zh } from './zh'
import { ja } from './ja'
import { ko } from './ko'
import { th } from './th'
import { vi } from './vi'
import { id } from './id'
import { ms } from './ms'
import { es } from './es'
import { pt } from './pt'
import { fr } from './fr'
import { de } from './de'
import { it } from './it'
import { nl } from './nl'
import { pl } from './pl'
import { uk } from './uk'
import { ru } from './ru'
import { tr } from './tr'

export type { Dictionary }

export const DICTIONARIES: Record<LocaleCode, Dictionary> = {
  en, fa, ar, ur,
  hi, bn, te, ta, kn, ml, mr, gu, pa,
  zh, ja, ko, th, vi, id, ms,
  es, pt, fr, de, it, nl, pl, uk, ru, tr,
}

export const LOCALE_NAMES: Record<LocaleCode, string> = {
  en: 'English',
  fa: 'فارسی',
  ar: 'العربية',
  ur: 'اردو',
  hi: 'हिन्दी',
  bn: 'বাংলা',
  te: 'తెలుగు',
  ta: 'தமிழ்',
  kn: 'ಕನ್ನಡ',
  ml: 'മലയാളം',
  mr: 'मराठी',
  gu: 'ગુજરાતી',
  pa: 'ਪੰਜਾਬੀ',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
  th: 'ไทย',
  vi: 'Tiếng Việt',
  id: 'Bahasa Indonesia',
  ms: 'Bahasa Melayu',
  es: 'Español',
  pt: 'Português',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  nl: 'Nederlands',
  pl: 'Polski',
  uk: 'Українська',
  ru: 'Русский',
  tr: 'Türkçe',
}

/**
 * Two-character labels for the compact language switch on the entry screens,
 * written in each language's own script so a reader can find their own without
 * knowing the others.
 */
export const LOCALE_SHORT_NAMES: Record<LocaleCode, string> = {
  en: 'EN', fa: 'فا', ar: 'عرب', ur: 'ارد',
  hi: 'हिं', bn: 'বাं', te: 'తె', ta: 'த', kn: 'ಕ', ml: 'മ', mr: 'म', gu: 'ગુ', pa: 'ਪਂ',
  zh: '中文', ja: '日本', ko: '한국', th: 'ไท', vi: 'Vi', id: 'ID', ms: 'MS',
  es: 'ES', pt: 'PT', fr: 'FR', de: 'DE', it: 'IT', nl: 'NL', pl: 'PL', uk: 'УК', ru: 'РУ', tr: 'TR',
}

/** Every shipped locale, in the order they are offered. */
export const LOCALE_CODES = Object.keys(LOCALE_NAMES) as LocaleCode[]

export const LOCALE_DIRECTION: Record<LocaleCode, 'ltr' | 'rtl'> = {
  en: 'ltr', fa: 'rtl', ar: 'rtl', ur: 'rtl',
  hi: 'ltr', bn: 'ltr', te: 'ltr', ta: 'ltr', kn: 'ltr', ml: 'ltr', mr: 'ltr', gu: 'ltr', pa: 'ltr',
  zh: 'ltr', ja: 'ltr', ko: 'ltr', th: 'ltr', vi: 'ltr', id: 'ltr', ms: 'ltr',
  es: 'ltr', pt: 'ltr', fr: 'ltr', de: 'ltr', it: 'ltr', nl: 'ltr', pl: 'ltr', uk: 'ltr', ru: 'ltr', tr: 'ltr',
}

/**
 * Dotted key into the dictionary, e.g. `chat.placeholder`.
 *
 * Typed against the English dictionary so a missing or renamed key is a compile
 * error rather than a string rendered raw in the UI.
 */
type Leaves<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Leaves<T[K]>}`
}[keyof T & string]

export type TranslationKey = Leaves<Dictionary>

export type Interpolations = Record<string, string | number>

function lookup(dictionary: Dictionary, key: string): string | undefined {
  let node: unknown = dictionary
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined
    node = (node as Record<string, unknown>)[part]
  }
  return typeof node === 'string' ? node : undefined
}

export function translate(locale: LocaleCode, key: TranslationKey, values?: Interpolations): string {
  // Fall back to English rather than showing a raw key: an untranslated string
  // is a small annoyance, a visible `settings.relayLatency` is a bug report.
  const template = lookup(DICTIONARIES[locale], key) ?? lookup(en, key) ?? key
  return interpolate(template, values)
}

/**
 * Fill `{name}` placeholders. Shared with the few lazy screens that carry
 * their own words rather than growing the dictionaries every cold start
 * downloads (ADR-046).
 */
export function interpolate(template: string, values?: Interpolations): string {
  if (!values) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  )
}

export type TranslateFn = (key: TranslationKey, values?: Interpolations) => string

export interface I18nContextValue {
  locale: LocaleCode
  dir: 'ltr' | 'rtl'
  t: TranslateFn
}

export const I18nContext = createContext<I18nContextValue>({
  locale: 'en',
  dir: 'ltr',
  t: (key, values) => translate('en', key, values),
})

export const useI18n = (): I18nContextValue => useContext(I18nContext)

export const useT = (): TranslateFn => useI18n().t

/** Best-effort match of the browser's languages against what we ship. */
export function detectLocale(): LocaleCode {
  if (typeof navigator === 'undefined') return 'en'
  for (const tag of navigator.languages ?? [navigator.language]) {
    const base = tag?.toLowerCase().split('-')[0]
    if (base && (LOCALE_CODES as readonly string[]).includes(base)) return base as LocaleCode
  }
  return 'en'
}
