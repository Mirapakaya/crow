export type LocaleCode = string;

export interface LocaleEntry {
  code: LocaleCode;
  name: string; // Native name (e.g., "తెలుగు" for Telugu)
  englishName: string; // English name
  rtl: boolean;
  pluralRules?: Intl.PluralRules;
}

export interface TranslationDict {
  [key: string]: string | TranslationDict;
}
