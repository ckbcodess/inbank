/**
 * Supported Languages and Metadata for GCB Internet Banking.
 */

export type SupportedLanguage = "en" | "fr" | "es" | "zh";

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  shortLabel: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    code: "en",
    name: "English",
    nativeName: "English",
    shortLabel: "EN",
    flag: "🇬🇧",
  },
  {
    code: "fr",
    name: "French",
    nativeName: "Français",
    shortLabel: "FR",
    flag: "🇫🇷",
  },
  {
    code: "es",
    name: "Spanish",
    nativeName: "Español",
    shortLabel: "ES",
    flag: "🇪🇸",
  },
  {
    code: "zh",
    name: "Mandarin",
    nativeName: "中文 (简体)",
    shortLabel: "ZH",
    flag: "🇨🇳",
  },
];

export const DEFAULT_LANGUAGE: SupportedLanguage = "en";
