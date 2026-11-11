export type ConfigCategory =
  | 'BRANDING'
  | 'THEME'
  | 'INTEGRATIONS'
  | 'EMAIL'
  | 'SECURITY'
  | 'BUSINESS'
  | 'KERNEL';

export interface ConfigItem {
  key: string;
  category: ConfigCategory | string;
  value: string;
  dataType: 'STRING' | 'BOOLEAN' | 'NUMBER' | 'JSON' | string;
  isSecret: boolean;
  isConfigured: boolean;
  requiresRestart: boolean;
  descriptionRo?: string;
  descriptionEn?: string;
  updatedAt?: string;
}

export interface ConfigStatus {
  uiConfigEnabled: boolean;
  restartRequired: boolean;
  totalConfigs: number;
}

export interface ConfigSnapshot {
  id: string;
  snapshotLabel: string;
  createdAt: string;
  createdBy?: string;
  keysCount: number;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  details?: string;
}

export interface BatchUpdatePayload {
  values: Record<string, string>;
  password?: string;
  totpCode?: string;
}

export interface RevealPayload {
  key: string;
  password?: string;
  totpCode?: string;
}

export interface RollbackPayload {
  password?: string;
  totpCode?: string;
}
