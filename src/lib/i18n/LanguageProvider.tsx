"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  type LanguageOption,
  type SupportedLanguage,
} from "./languages";
import { TRANSLATIONS } from "./translations";

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (
    key: string,
    defaultOrParams?: string | Record<string, string | number>,
    params?: Record<string, string | number>
  ) => string;
  languages: LanguageOption[];
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_KEY = "gcb-language";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>(DEFAULT_LANGUAGE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as SupportedLanguage | null;
      if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
        setLanguageState(saved);
        document.documentElement.lang = saved;
      } else {
        document.documentElement.lang = DEFAULT_LANGUAGE;
      }
    } catch {
      // LocalStorage not available (private mode / SSR)
    }
  }, []);

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.lang = lang;
    } catch {
      // Ignore storage errors
    }
  }, []);

  const t = useCallback(
    (
      key: string,
      defaultOrParams?: string | Record<string, string | number>,
      params?: Record<string, string | number>
    ): string => {
      let defaultVal: string | undefined;
      let interpolationParams: Record<string, string | number> | undefined;

      if (typeof defaultOrParams === "string") {
        defaultVal = defaultOrParams;
        interpolationParams = params;
      } else if (defaultOrParams && typeof defaultOrParams === "object") {
        interpolationParams = defaultOrParams;
      }

      // Check active language
      const dict = TRANSLATIONS[language];
      let val = dict?.[key];

      // Fallback to English if not found
      if (!val) {
        val = TRANSLATIONS.en[key] ?? defaultVal ?? key;
      }

      // Replace {variable} interpolations if provided
      if (interpolationParams) {
        return Object.entries(interpolationParams).reduce((str, [k, v]) => {
          return str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }, val);
      }

      return val;
    },
    [language]
  );

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        languages: SUPPORTED_LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Graceful fallback if called outside provider (e.g., isolated test or error boundary)
    return {
      language: DEFAULT_LANGUAGE,
      setLanguage: () => {},
      t: (key: string, defaultVal?: string | Record<string, string | number>) =>
        typeof defaultVal === "string" ? defaultVal : key,
      languages: SUPPORTED_LANGUAGES,
    };
  }
  return context;
}
