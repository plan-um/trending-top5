'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Locale, LOCALES, DEFAULT_LOCALE, CATEGORY_LABELS_BY_LOCALE } from '@/lib/locale';

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  localeConfig: typeof LOCALES[Locale];
  categoryLabels: Record<string, string>;
}

const LocaleContext = createContext<LocaleContextType | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    // Load from localStorage on mount
    const saved = localStorage.getItem('trending-locale') as Locale | null;
    if (saved && LOCALES[saved]) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('trending-locale', newLocale);
  };

  const value: LocaleContextType = {
    locale,
    setLocale,
    localeConfig: LOCALES[locale],
    categoryLabels: CATEGORY_LABELS_BY_LOCALE[locale],
  };

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}
