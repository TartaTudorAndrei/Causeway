export type AdminUIState =
  | 'SIGN_IN'
  | 'REQUEST_ACCESS'
  | 'GOOGLE_ONBOARDING'
  | 'FORGOT_PASSWORD'
  | 'RESET_PASSWORD'
  | 'EMAIL_VERIFY_PENDING'
  | 'APPROVAL_PENDING'
  | 'REJECTED'
  | 'TWO_FACTOR'
  | 'SUCCESS';

export interface UserMembership {
  roleName: string;
  scopeType: 'GLOBAL' | 'PROJECT' | 'DEPARTMENT';
  scopeId: string | null;
  permissions: string[];
}

export interface AdminUser {
  id?: string;
  name: string;
  email: string;
  role: string;
  roles?: string[];
  permissions?: string[];
  phone?: string;
  organizationType?: string;
  organizationDetails?: string;
  twoFactorEnabled?: boolean;
  twoFactorMethod?: string;
  whatsappNotificationsEnabled?: boolean;
  referralCode?: string;
  memberships: UserMembership[];
}

export interface AuthResponse {
  token?: string;
  expiresAt?: string;
  user?: AdminUser;
  twoFactorRequired?: boolean;
  twoFactorSessionToken?: string;
  twoFactorMethods?: string[];
  maskedEmail?: string;
}

export interface TwoFactorStatusResponse {
  enabled: boolean;
  method: string;
  availableMethods: string[];
}

export interface TwoFactorSetupInitiateResponse {
  secret: string;
  otpAuthUrl: string;
  email: string;
  availableMethods: string[];
}

export interface RequestAccessResponse {
  status: 'PENDING_EMAIL' | 'PENDING_APPROVAL';
  emailSent: boolean;
}

export interface StatusResponse {
  status: 'APPROVED' | 'PENDING_EMAIL' | 'PENDING_APPROVAL' | 'REJECTED';
}

export interface Club {
  id: string;
  name: string;
  organizationType: string;
  createdAt?: string;
  updatedAt?: string;
}

