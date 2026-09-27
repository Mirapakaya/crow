import type { LocaleCode, LocaleEntry, TranslationDict } from './types';

const LOCALE_STORAGE_KEY = 'crow-locale';

function deepGet(obj: Record<string, unknown>, path: string[]): string | undefined {
  let current: unknown = obj;
  for (const key of path) {
    if (current == null || typeof current !== 'object' || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'string' ? current : undefined;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = params[key];
    return value !== undefined ? String(value) : match;
  });
}

function detectBrowserLocale(): LocaleCode {
  if (typeof navigator === 'undefined') return 'en';
  const langs = navigator.languages ?? [navigator.language];
  for (const lang of langs) {
    const code = lang.split('-')[0];
    if (code) return code;
  }
  return 'en';
}

class I18n {
  private static instance: I18n | null = null;
  private dictionaries: Map<LocaleCode, TranslationDict> = new Map();
  private metas: Map<LocaleCode, LocaleEntry> = new Map();
  private _currentLocale: LocaleCode = 'en';
  private _defaultLocale: LocaleCode = 'en';

  private constructor() {
    // Auto-detect browser locale on first load
    const stored = this.loadStoredLocale();
    if (stored) {
      this._currentLocale = stored;
    } else {
      this._currentLocale = detectBrowserLocale();
    }
  }

  static getInstance(): I18n {
    if (!I18n.instance) {
      I18n.instance = new I18n();
    }
    return I18n.instance;
  }

  get currentLocale(): LocaleCode {
    return this._currentLocale;
  }

  setLocale(code: LocaleCode): void {
    this._currentLocale = code;
    this.persistLocale(code);
  }

  t(key: string, params?: Record<string, string | number>): string {
    const parts = key.split('.');
    // Try requested locale
    const dict = this.dictionaries.get(this._currentLocale);
    if (dict) {
      const value = deepGet(dict as Record<string, unknown>, parts);
      if (value !== undefined) return interpolate(value, params);
    }
    // Fallback to default (English)
    if (this._currentLocale !== this._defaultLocale) {
      const defaultDict = this.dictionaries.get(this._defaultLocale);
      if (defaultDict) {
        const value = deepGet(defaultDict as Record<string, unknown>, parts);
        if (value !== undefined) return interpolate(value, params);
      }
    }
    // Return key itself as last resort
    return key;
  }

  registerLocale(code: string, dict: TranslationDict, meta: LocaleEntry): void {
    this.dictionaries.set(code, dict);
    this.metas.set(code, meta);
  }

  getAvailableLocales(): LocaleEntry[] {
    return Array.from(this.metas.values()).sort((a, b) =>
      a.englishName.localeCompare(b.englishName),
    );
  }

  isRTL(): boolean {
    const meta = this.metas.get(this._currentLocale);
    return meta?.rtl ?? false;
  }

  formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
    const locale = this._currentLocale;
    const defaults: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };
    try {
      return new Intl.DateTimeFormat(locale, options ?? defaults).format(date);
    } catch {
      return new Intl.DateTimeFormat(this._defaultLocale, options ?? defaults).format(date);
    }
  }

  formatRelativeTime(date: Date): string {
    const now = Date.now();
    const then = date.getTime();
    const diffMs = now - then;
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHour = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHour / 24);
    const diffWeek = Math.round(diffDay / 7);
    const diffMonth = Math.round(diffDay / 30);
    const diffYear = Math.round(diffDay / 365);

    const locale = this._currentLocale;

    try {
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

      if (Math.abs(diffSec) < 10) return rtf.format(0, 'second');
      if (Math.abs(diffMin) < 1) return rtf.format(-diffSec, 'second');
      if (Math.abs(diffHour) < 1) return rtf.format(-diffMin, 'minute');
      if (Math.abs(diffDay) < 1) return rtf.format(-diffHour, 'hour');
      if (Math.abs(diffWeek) < 1) return rtf.format(-diffDay, 'day');
      if (Math.abs(diffMonth) < 1) return rtf.format(-diffWeek, 'week');
      if (Math.abs(diffYear) < 1) return rtf.format(-diffMonth, 'month');
      return rtf.format(-diffYear, 'year');
    } catch {
      // Fallback for environments without Intl.RelativeTimeFormat
      if (Math.abs(diffSec) < 10) return 'just now';
      if (Math.abs(diffMin) < 1) return `${diffSec} seconds ago`;
      if (Math.abs(diffHour) < 1) return `${diffMin} minutes ago`;
      if (Math.abs(diffDay) < 1) return `${diffHour} hours ago`;
      if (Math.abs(diffWeek) < 1) return `${diffDay} days ago`;
      return this.formatDate(date);
    }
  }

  formatNumber(n: number): string {
    const locale = this._currentLocale;
    try {
      return new Intl.NumberFormat(locale).format(n);
    } catch {
      return new Intl.NumberFormat(this._defaultLocale).format(n);
    }
  }

  private loadStoredLocale(): LocaleCode | null {
    try {
      if (typeof localStorage === 'undefined') return null;
      return localStorage.getItem(LOCALE_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private persistLocale(code: LocaleCode): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LOCALE_STORAGE_KEY, code);
      }
    } catch {
      // Silently ignore storage errors (e.g., private browsing)
    }
  }
}

// Convenience singleton accessor
export const i18n = I18n.getInstance();

// Shorthand export for t()
export const t = (key: string, params?: Record<string, string | number>): string =>
  i18n.t(key, params);

export { I18n };
