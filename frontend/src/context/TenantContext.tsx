import React, { createContext, useContext, useState, useEffect } from 'react';
import type { TenantConfig } from '../types/tenant';
import { defaultTenantConfig } from '../config/tenantConfig';

interface TenantContextType {
  tenant: TenantConfig;
  isLoading: boolean;
  isOverridden: boolean;
  refetchConfig: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType>({
  tenant: defaultTenantConfig,
  isLoading: false,
  isOverridden: false,
  refetchConfig: async () => {}
});

function applyThemeVariables(config: TenantConfig) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const colors = config.theme?.brandColors;
  if (!colors) return;

  root.style.setProperty('--brand-primary', colors.primary);
  root.style.setProperty('--brand-secondary', colors.secondary);
  root.style.setProperty('--brand-accent', colors.accent);
  root.style.setProperty('--brand-cream', colors.cream);
  root.style.setProperty('--brand-cream-dark', colors.creamDark);
  root.style.setProperty('--brand-red', colors.red);
  root.style.setProperty('--brand-charcoal', colors.charcoal);

  // Update favicon if provided
  if (config.theme?.assets?.faviconUrl) {
    const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
    if (favicon) {
      favicon.href = config.theme.assets.faviconUrl;
    }
  }

  // Update apple-touch-icon if provided
  if (config.theme?.assets?.appleTouchIconUrl) {
    const appleIcon = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement | null;
    if (appleIcon) {
      appleIcon.href = config.theme.assets.appleTouchIconUrl;
    }
  }

  // Update document title if provided
  if (config.identity?.name) {
    document.title = config.location?.city
      ? `${config.identity.name} | ${config.location.city}`
      : config.identity.name;
  }

  // Update apple-mobile-web-app-title if provided
  if (config.identity?.shorthand) {
    const pwaTitle = document.querySelector("meta[name='apple-mobile-web-app-title']") as HTMLMetaElement | null;
    if (pwaTitle) {
      pwaTitle.content = config.identity.shorthand;
    }
  }

  // Update description meta tag if provided
  if (config.identity?.description) {
    const metaDesc = document.querySelector("meta[name='description']") as HTMLMetaElement | null;
    if (metaDesc) {
      metaDesc.content = config.identity.description;
    }
  }

  // Update web manifest dynamically with tenant identity
  if (config.identity?.name && typeof Blob !== 'undefined' && typeof URL !== 'undefined' && URL.createObjectURL) {
    const manifestLink = document.querySelector("link[rel*='manifest']") as HTMLLinkElement | null;
    if (manifestLink) {
      try {
        const dynamicManifest = {
          name: config.identity.name,
          short_name: config.identity.shorthand || config.identity.name,
          scope: '/dashboard',
          start_url: '/dashboard',
          display: 'standalone',
          background_color: '#09090b',
          theme_color: colors?.primary || '#09090b',
          icons: [
            { src: config.theme?.assets?.pwaIcon192 || '/icons/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: config.theme?.assets?.pwaIcon512 || '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }
          ]
        };
        const blob = new Blob([JSON.stringify(dynamicManifest)], { type: 'application/manifest+json' });
        manifestLink.href = URL.createObjectURL(blob);
      } catch {
        // Silent fallback in test runners
      }
    }
  }
}

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<TenantConfig>(defaultTenantConfig);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOverridden, setIsOverridden] = useState<boolean>(false);

  // Apply default variables immediately on mount
  useEffect(() => {
    applyThemeVariables(defaultTenantConfig);
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/public/config', { cache: 'no-cache' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.identity && data.theme) {
          // Merge with default to guarantee fallback integrity
          const merged: TenantConfig = {
            ...defaultTenantConfig,
            ...data,
            identity: { ...defaultTenantConfig.identity, ...data.identity },
            theme: {
              ...defaultTenantConfig.theme,
              ...data.theme,
              brandColors: { ...defaultTenantConfig.theme.brandColors, ...data.theme?.brandColors },
              assets: { ...defaultTenantConfig.theme.assets, ...data.theme?.assets },
              styling: { ...defaultTenantConfig.theme.styling, ...data.theme?.styling }
            },
            location: {
              ...defaultTenantConfig.location,
              ...data.location,
              coordinates: { ...defaultTenantConfig.location.coordinates, ...data.location?.coordinates }
            },
            legal: { ...defaultTenantConfig.legal, ...data.legal },
            affiliations: { ...defaultTenantConfig.affiliations, ...data.affiliations },
            terminology: { ...defaultTenantConfig.terminology, ...data.terminology },
            integrations: {
              ...defaultTenantConfig.integrations,
              ...data.integrations,
              socialLinks: { ...defaultTenantConfig.integrations.socialLinks, ...data.integrations?.socialLinks }
            },
            features: { ...defaultTenantConfig.features, ...data.features }
          };
          setTenant(merged);
          setIsOverridden(true);
          applyThemeVariables(merged);
        }
      }
    } catch {
      // Fallback silently to defaultTenantConfig
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return (
    <TenantContext.Provider value={{ tenant, isLoading, isOverridden, refetchConfig: fetchConfig }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => useContext(TenantContext);
