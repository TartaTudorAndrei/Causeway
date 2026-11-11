export interface TenantIdentity {
  id: string;
  name: string;
  shorthand: string;
  tagline: string;
  description: string;
  missionStatement: string;
}

export interface TenantThemeBrandColors {
  primary: string;
  secondary: string;
  accent: string;
  cream: string;
  creamDark: string;
  red: string;
  charcoal: string;
}

export interface TenantThemeAssets {
  logoUrl: string;
  logoLightUrl: string;
  logoDarkUrl: string;
  faviconUrl: string;
  appleTouchIconUrl: string;
  pwaIcon192: string;
  pwaIcon512: string;
}

export interface TenantThemeStyling {
  patternStyle: string;
  borderRadius: string;
}

export interface TenantTheme {
  brandColors: TenantThemeBrandColors;
  assets: TenantThemeAssets;
  styling: TenantThemeStyling;
}

export interface TenantCoordinates {
  latitude: number;
  longitude: number;
}

export interface TenantLocation {
  city: string;
  county: string;
  country: string;
  address?: string;
  timezone: string;
  coordinates: TenantCoordinates;
  weatherEnabled: boolean;
}

export interface TenantLegal {
  entityName: string;
  taxId: string;
  registrationNumber: string;
  headquartersAddress: string;
  iban: string;
  bankName: string;
  representativeName: string;
  representativeRole: string;
}

export interface TenantAffiliations {
  categoryLabel: string;
  categories: string[];
}

export interface TenantTerminology {
  merchandiseItemSingular: string;
  merchandiseItemPlural: string;
  campaignSeasonName: string;
  standLabelSingular: string;
  standLabelPlural: string;
}

export interface TenantSocialLinks {
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  website?: string;
}

export interface TenantIntegrations {
  pickupCodePrefix: string;
  stripeStatementDescriptor: string;
  stripeProductName: string;
  totpIssuer: string;
  emailSenderName: string;
  emailSenderAddress: string;
  whatsAppClientName: string;
  googleDriveWorkspaceFolder: string;
  contactEmail: string;
  contactPhone: string;
  socialLinks: TenantSocialLinks;
}

export interface TenantFeatures {
  publicLandingPages: boolean;
  weatherForecasting: boolean;
  standVolunteerSignup: boolean;
  onlineDonations: boolean;
  emailStudio: boolean;
}

export interface TenantConfig {
  identity: TenantIdentity;
  theme: TenantTheme;
  location: TenantLocation;
  legal: TenantLegal;
  affiliations: TenantAffiliations;
  terminology: TenantTerminology;
  integrations: TenantIntegrations;
  features: TenantFeatures;
}
