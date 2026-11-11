import type { TenantConfig } from '../types/tenant';

export const defaultTenantConfig: TenantConfig = {
  identity: {
    id: 'causeway',
    name: 'Causeway',
    shorthand: 'CAUSEWAY',
    tagline: 'General project tagline',
    description:
      "this is a general description for you project, it's used in various places",
    missionStatement:
      'This is a general mission statement for your project, bringing the community together to support meaningful causes.'
  },
  theme: {
    brandColors: {
      primary: '#0b3323',
      secondary: '#59101c',
      accent: '#c3984e',
      cream: '#f6efe2',
      creamDark: '#ebdcb9',
      red: '#a32222',
      charcoal: '#1e1e1e'
    },
    assets: {
      logoUrl: '/assets/logo.png',
      logoLightUrl: '/assets/logo-light.png',
      logoDarkUrl: '/assets/logo-dark.png',
      faviconUrl: '/favicon.png',
      appleTouchIconUrl: '/icons/apple-touch-icon.png',
      pwaIcon192: '/icons/pwa-192x192.png',
      pwaIcon512: '/icons/pwa-512x512.png'
    },
    styling: {
      patternStyle: 'argyle',
      borderRadius: 'rounded-2xl'
    }
  },
  location: {
    city: 'general city',
    county: 'general county',
    country: 'General Country',
    timezone: 'Europe/Bucharest',
    coordinates: {
      latitude: 46.7712,
      longitude: 23.6236
    },
    weatherEnabled: true
  },
  legal: {
    entityName: 'General Non-Profit Organization',
    taxId: 'RO12345678',
    registrationNumber: 'J12/1234/2020',
    headquartersAddress: 'General Address, general city',
    iban: 'RO00AAAA0000000000000000',
    bankName: 'General Bank',
    representativeName: 'General Representative',
    representativeRole: 'Director'
  },
  affiliations: {
    categoryLabel: 'Club',
    categories: ['Interact', 'Rotaract', 'Rotary', 'Other']
  },
  terminology: {
    merchandiseItemSingular: 'Articol',
    merchandiseItemPlural: 'Articole',
    campaignSeasonName: 'Campania 2026',
    standLabelSingular: 'Stand',
    standLabelPlural: 'Standuri'
  },
  integrations: {
    pickupCodePrefix: 'APP-',
    stripeStatementDescriptor: 'CAUSEWAY DONATION',
    stripeProductName: 'Causeway Donation',
    totpIssuer: 'Causeway',
    emailSenderName: 'Causeway',
    emailSenderAddress: 'contact@example.org',
    whatsAppClientName: 'Causeway',
    googleDriveWorkspaceFolder: 'Causeway Workspace',
    contactEmail: 'contact@example.org',
    contactPhone: '+40 700 000 000',
    socialLinks: {
      facebook: 'https://facebook.com',
      instagram: 'https://instagram.com',
      website: 'https://example.org'
    }
  },
  features: {
    publicLandingPages: true,
    weatherForecasting: true,
    standVolunteerSignup: true,
    onlineDonations: true,
    emailStudio: true
  }
};
