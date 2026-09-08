'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language, TranslationKey } from './translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, fallback?: string) => string;
  strings: typeof translations['en'];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Default to Indonesian ('id') as requested, with fallback to saved choice
  const [language, setLanguageState] = useState<Language>('id');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('agent_ui_lang') as Language;
    if (saved === 'en' || saved === 'id') {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (newLang: Language) => {
    setLanguageState(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('agent_ui_lang', newLang);
    }
  };

  const t = (key: TranslationKey, fallback?: string): string => {
    const currentDict = translations[language] || translations.id;
    const value = currentDict[key];
    if (value) return value;
    return fallback || translations.en[key] || String(key);
  };

  const strings = translations[language] || translations.id;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, strings }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
