import type { UserMembership } from './adminAuth';

export type UserPlatformStatus = 
  | 'APPROVED' 
  | 'PENDING_APPROVAL' 
  | 'PENDING_EMAIL' 
  | 'REJECTED' 
  | 'SUSPENDED';

export type SystemRoleType = 
  | 'ADMIN'
  | 'IT_ADMIN'
  | 'FINANCE_HEAD'
  | 'FINANCE_MEMBER'
  | 'MARKETING_HEAD'
  | 'MARKETING_MEMBER'
  | 'FUNDRAISING_HEAD'
  | 'FUNDRAISING_MEMBER'
  | 'LOGISTICS_HEAD'
  | 'LOGISTICS_MEMBER'
  | 'HR_HEAD'
  | 'HR_MEMBER'
  | 'LEGAL_HEAD'
  | 'LEGAL_MEMBER'
  | 'VOLUNTEER'
  | (string & {});

export interface PlatformUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  organizationType?: string;
  organizationDetails?: string;
  status: UserPlatformStatus;
  primaryRole: SystemRoleType;
  roles: SystemRoleType[];
  memberships: UserMembership[];
  createdAt: string;
  lastLoginAt?: string;
  notes?: string;
}

export interface AdminAuditLog {
  id: string;
  timestamp: string;
  actorEmail: string;
  action: 'USER_APPROVED' | 'USER_REJECTED' | 'USER_SUSPENDED' | 'ROLES_UPDATED' | 'USER_CREATED';
  targetEmail: string;
  details: string;
}

export type ITAuditLog = AdminAuditLog;

export interface PermissionItem {
  id: string;
  code: string;
  description: string;
  category: string;
  createdAt?: string;
}

export interface RoleWithPermissions {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  createdBy?: string;
  parentRoleId?: string;
  permissionIds: string[];
  permissionCodes: string[];
}

export interface CreateCustomRoleDTO {
  name: string;
  description?: string;
  permissionCodes: string[];
  parentRoleId?: string;
}


