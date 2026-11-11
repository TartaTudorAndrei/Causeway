export type ModuleCategory =
  | 'GENERAL'
  | 'LOGISTICS'
  | 'FINANCE'
  | 'HR'
  | 'FUNDRAISING'
  | 'MARKETING'
  | 'LEGAL'
  | 'SETTINGS';

export interface ModulePermission {
  code: string;
  labelKey: string;
  defaultRoles: string[];
}

export interface ModuleNotificationTrigger {
  eventType: string;
  labelKey: string;
  payloadSchema: Record<string, string>;
}

export interface ModuleNavigationTab {
  id: string;
  labelKey: string;
  routePath: string;
  order: number;
  requiredPermission: string;
}

export interface ModuleExtensionContribution {
  targetModuleId: string;
  targetSlot: string;
  componentKey: string;
}

export interface ProjectModuleDescriptor {
  id: string;
  nameKey: string;
  category: ModuleCategory;
  dependencies: string[];
  conflictsWith?: string[];
  permissions: ModulePermission[];
  notificationTriggers: ModuleNotificationTrigger[];
  navigationTabs: ModuleNavigationTab[];
  extensionContributions?: ModuleExtensionContribution[];
  configSchema?: Record<string, any>;
  bridge?: boolean;
}

export interface ProjectEnabledModule {
  id: string;
  projectId: string;
  moduleId: string;
  active: boolean;
  configJson: string;
  enabledAt: string;
  enabledBy?: string;
}

export interface ProjectResponse {
  id: string;
  entityId: string;
  name: string;
  slug: string;
  description?: string;
  templatePreset: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  createdByName?: string;
  enabledModules: ProjectEnabledModule[];
  navigationTabs: ModuleNavigationTab[];
}

export interface ProjectPresetDefinition {
  key: string;
  nameKey: string;
  descriptionKey: string;
  defaultModuleIds: string[];
}

export interface CreateProjectRequest {
  entityId: string;
  name: string;
  slug?: string;
  description?: string;
  templatePreset?: string;
  customModuleIds?: string[];
  moduleConfigs?: Record<string, string>;
  inheritHubConfig?: boolean;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: string;
}

export interface UpdateProjectModulesRequest {
  moduleIds: string[];
  cascadeDisable?: boolean;
  moduleConfigs?: Record<string, string>;
}
