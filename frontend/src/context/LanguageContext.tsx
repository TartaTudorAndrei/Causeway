import React, { createContext, useContext, useState, useEffect } from 'react';
import { ro } from '../i18n/ro';
import { en } from '../i18n/en';
import { useTenant } from './TenantContext';

export type Language = 'ro' | 'en';

export function interpolate(template: string, vars: Record<string, string | number>): string {
  if (!template) return '';
  return template.replace(/\{(\w+)\}/g, (_, key) => (key in vars && vars[key] !== undefined ? String(vars[key]) : `{${key}}`));
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string, params?: Record<string, string | number>) => string;
}

// Global UI Translation Dictionary
const translations: Record<Language, Record<string, string>> = {
  ro,
  en
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'ro',
  setLanguage: () => { },
  t: (key: string, fallback?: string, params?: Record<string, string | number>) => {
    const raw = fallback || key;
    return params ? interpolate(raw, params) : raw;
  },
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tenant } = useTenant();
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('adminLanguage');
    return saved === 'en' ? 'en' : 'ro';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('adminLanguage', lang);
    window.dispatchEvent(new Event('languageChange'));
  };

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('adminLanguage');
      if (saved === 'en' || saved === 'ro') {
        setLanguageState(saved);
      }
    };
    window.addEventListener('languageChange', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('languageChange', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const t = (key: string, fallback?: string, params?: Record<string, string | number>): string => {
    let raw = (translations[language] && translations[language][key]) || fallback || key;
    
    // Automatically combine tenant global variables with local params
    const mergedParams: Record<string, string | number> = {
      orgName: tenant?.identity?.name || '',
      orgShorthand: tenant?.identity?.shorthand || '',
      city: tenant?.location?.city || '',
      county: tenant?.location?.county || '',
      country: tenant?.location?.country || '',
      contactEmail: tenant?.integrations?.contactEmail || '',
      contactPhone: tenant?.integrations?.contactPhone || '',
      merchItem: tenant?.terminology?.merchandiseItemSingular || '',
      merchItems: tenant?.terminology?.merchandiseItemPlural || '',
      campaignSeason: tenant?.terminology?.campaignSeasonName || '',
      standLabel: tenant?.terminology?.standLabelSingular || '',
      standLabels: tenant?.terminology?.standLabelPlural || '',
      ...params
    };

    return interpolate(raw, mergedParams);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const PublicLanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tenant } = useTenant();

  const t = (key: string, fallback?: string, params?: Record<string, string | number>): string => {
    const raw = (translations.ro && translations.ro[key]) || fallback || key;

    const mergedParams: Record<string, string | number> = {
      orgName: tenant?.identity?.name || '',
      orgShorthand: tenant?.identity?.shorthand || '',
      city: tenant?.location?.city || '',
      county: tenant?.location?.county || '',
      country: tenant?.location?.country || '',
      contactEmail: tenant?.integrations?.contactEmail || '',
      contactPhone: tenant?.integrations?.contactPhone || '',
      merchItem: tenant?.terminology?.merchandiseItemSingular || '',
      merchItems: tenant?.terminology?.merchandiseItemPlural || '',
      campaignSeason: tenant?.terminology?.campaignSeasonName || '',
      standLabel: tenant?.terminology?.standLabelSingular || '',
      standLabels: tenant?.terminology?.standLabelPlural || '',
      ...params
    };

    return interpolate(raw, mergedParams);
  };

  return (
    <LanguageContext.Provider value={{ language: 'ro', setLanguage: () => {}, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components, react/only-export-components
export const useLanguage = () => useContext(LanguageContext);
