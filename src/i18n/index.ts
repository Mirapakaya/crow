// i18n barrel export + auto-registration
import { I18n, i18n, t } from './i18n';
export { I18n, i18n, t };
export type { LocaleCode, LocaleEntry, TranslationDict } from './types';

// Import all locale dictionaries and metadata
import { en, enMeta } from './locales/en';
import { te, teMeta } from './locales/te';
import { hi, hiMeta } from './locales/hi';
import { ta, taMeta } from './locales/ta';
import { ar, arMeta } from './locales/ar';
import { zh, zhMeta } from './locales/zh';
import { ja, jaMeta } from './locales/ja';
import { ko, koMeta } from './locales/ko';
import { es, esMeta } from './locales/es';
import { de, deMeta } from './locales/de';
import { fr, frMeta } from './locales/fr';
import { ru, ruMeta } from './locales/ru';
import { pt, ptMeta } from './locales/pt';
import { ur, urMeta } from './locales/ur';
import { bn, bnMeta } from './locales/bn';
import { tr, trMeta } from './locales/tr';
import { id, idMeta } from './locales/id';
import { kn, knMeta } from './locales/kn';
import { ml, mlMeta } from './locales/ml';
import { mr, mrMeta } from './locales/mr';
import { gu, guMeta } from './locales/gu';
import { pa, paMeta } from './locales/pa';
import { fa, faMeta } from './locales/fa';
import { vi, viMeta } from './locales/vi';
import { th, thMeta } from './locales/th';
import { zhHant, zhHantMeta } from './locales/zh-Hant';
import { it, itMeta } from './locales/it';
import { nl, nlMeta } from './locales/nl';
import { pl, plMeta } from './locales/pl';
import { uk, ukMeta } from './locales/uk';
import { ms, msMeta } from './locales/ms';

// Auto-register all locales with the singleton
const instance = I18n.getInstance();

instance.registerLocale('en', en, enMeta);
instance.registerLocale('te', te, teMeta);
instance.registerLocale('hi', hi, hiMeta);
instance.registerLocale('ta', ta, taMeta);
instance.registerLocale('ar', ar, arMeta);
instance.registerLocale('zh', zh, zhMeta);
instance.registerLocale('ja', ja, jaMeta);
instance.registerLocale('ko', ko, koMeta);
instance.registerLocale('es', es, esMeta);
instance.registerLocale('de', de, deMeta);
instance.registerLocale('fr', fr, frMeta);
instance.registerLocale('ru', ru, ruMeta);
instance.registerLocale('pt', pt, ptMeta);
instance.registerLocale('ur', ur, urMeta);
instance.registerLocale('bn', bn, bnMeta);
instance.registerLocale('tr', tr, trMeta);
instance.registerLocale('id', id, idMeta);
instance.registerLocale('kn', kn, knMeta);
instance.registerLocale('ml', ml, mlMeta);
instance.registerLocale('mr', mr, mrMeta);
instance.registerLocale('gu', gu, guMeta);
instance.registerLocale('pa', pa, paMeta);
instance.registerLocale('fa', fa, faMeta);
instance.registerLocale('vi', vi, viMeta);
instance.registerLocale('th', th, thMeta);
instance.registerLocale('zh-Hant', zhHant, zhHantMeta);
instance.registerLocale('it', it, itMeta);
instance.registerLocale('nl', nl, nlMeta);
instance.registerLocale('pl', pl, plMeta);
instance.registerLocale('uk', uk, ukMeta);
instance.registerLocale('ms', ms, msMeta);

// Utility exports
export function setLocale(code: string): void {
  i18n.setLocale(code);
}

export function getAvailableLocales(): LocaleEntry[] {
  return i18n.getAvailableLocales();
}

export function isRTL(): boolean {
  return i18n.isRTL();
}

export function formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
  return i18n.formatDate(date, options);
}

export function formatRelativeTime(date: Date): string {
  return i18n.formatRelativeTime(date);
}

export function formatNumber(n: number): string {
  return i18n.formatNumber(n);
}

// Re-import LocaleEntry for the utility exports above
import type { LocaleEntry } from './types';
