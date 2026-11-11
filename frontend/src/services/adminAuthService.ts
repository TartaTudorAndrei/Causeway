import type { AdminUser, AuthResponse, RequestAccessResponse, StatusResponse, UserMembership, Club } from '../types/adminAuth';
import { clearCsrfToken, fetchWithCsrf } from './apiClient';

const API_BASE = '/api/admin';

const mapBackendStatus = (status: string): 'APPROVED' | 'PENDING_EMAIL' | 'PENDING_APPROVAL' | 'REJECTED' => {
  if (status === 'PENDING_EMAIL_VERIFICATION' || status === 'PENDING_EMAIL') {
    return 'PENDING_EMAIL';
  }
  if (status === 'PENDING_APPROVAL') {
    return 'PENDING_APPROVAL';
  }
  if (status === 'REJECTED' || status === 'BLOCKED' || status === 'SUSPENDED' || status === 'INACTIVE') {
    return 'REJECTED';
  }
  if (status === 'APPROVED') {
    return 'APPROVED';
  }
  return 'REJECTED';
};

const BASE_READ_PERMISSIONS = [
  'projects:read',
  'general:*',
  'general:read',
  'general:calendar:read',
  'general:tasks:read',
  'general:locations:read',
  'general:calendar:events:read',
  'general:statistics:read',
  'hr:stands:shifts:write',
  // legacy fallbacks
  'general:calendar:view',
  'general:tasks:view',
  'general:map:view',
  'general:statistics:view',
  'general:event:read',
  'general:task:read',
  'general:location:read',
  'hr:attendance:write',
];

export const buildMembershipsForRole = (role: string): UserMembership[] => {
  return buildMembershipsForRoles([role]);
};

export const buildMembershipsForRoles = (roles: string[]): UserMembership[] => {
  const roleList = (roles && roles.length > 0) ? roles.map(r => (r || 'VOLUNTEER').toUpperCase()) : ['VOLUNTEER'];
  
  if (roleList.includes('ADMIN') || roleList.includes('SUPER_ADMIN')) {
    return [
      {
        roleName: 'ADMIN',
        scopeType: 'GLOBAL',
        scopeId: null,
        permissions: ['*'],
      },
    ];
  }

  const baseMembership: UserMembership = {
    roleName: roleList[0] || 'VOLUNTEER',
    scopeType: 'GLOBAL',
    scopeId: null,
    permissions: [...BASE_READ_PERMISSIONS],
  };

  const memberships: UserMembership[] = [baseMembership];

  for (const r of roleList) {
    if (r === 'IT_ADMIN') {
      const itPerms = [
        'it:*', 'auth:*', 'admin:*', 'audit:*',
        'it:users:read', 'it:users:write', 'it:users:delete',
        'it:permissions:read', 'it:permissions:write',
        'it:audit:read', 'it:audit:write',
        'it:sync:manage', 'it:whatsapp:read', 'it:whatsapp:write', 'it:pwa:read', 'it:pwa:write',
        'it:statistics:read',
        // legacy
        'it:users:view', 'it:permissions:view', 'it:audit:view', 'it:sync:view', 'it:whatsapp:view', 'it:statistics:view',
        'it:sync:manage', 'it:read', 'it:write', 'auth:read', 'auth:write', 'admin:read', 'admin:write'
      ];
      memberships.push({
        roleName: 'IT_ADMIN',
        scopeType: 'GLOBAL',
        scopeId: null,
        permissions: itPerms,
      });
    } else if (r.startsWith('FINANCE')) {
      const isHead = r.includes('HEAD');
      memberships.push({
        roleName: r,
        scopeType: 'DEPARTMENT',
        scopeId: 'finance-dept-uuid',
        permissions: isHead
          ? [
              'finance:*',
              'finance:expenses:*', 'finance:donations:*', 'finance:stands:*',
              'finance:sponsorships:*', 'finance:other_incomes:*', 'finance:statistics:read',
              // legacy
              'finance:expenses:view', 'finance:onlinedonations:view', 'finance:stands:view',
              'finance:sponsorships:view', 'finance:otherincomes:view', 'finance:statistics:view',
              'finance:read', 'finance:write', 'finance:expense:read', 'finance:expense:write',
              'finance:stand:handover', 'finance:expense:reimburse',
              'donations:read', 'donations:write'
            ]
          : [
              'finance:expenses:read', 'finance:expenses:write', 'finance:expenses:reimburse:approve',
              'finance:stands:read', 'finance:stands:eod:write', 'finance:statistics:read',
              // legacy
              'finance:expenses:view', 'finance:statistics:view',
              'finance:read', 'finance:expense:read', 'finance:expense:write',
              'finance:stand:handover', 'finance:expense:reimburse'
            ],
      });
    } else if (r.startsWith('HR')) {
      const isHead = r.includes('HEAD');
      memberships.push({
        roleName: r,
        scopeType: 'DEPARTMENT',
        scopeId: 'hr-dept-uuid',
        permissions: isHead
          ? [
              'hr:*',
              'hr:stands:*', 'hr:members:*', 'hr:feedback:*', 'hr:statistics:read',
              // legacy
              'hr:stands:view', 'hr:statistics:view', 'hr:feedback:view', 'hr:feedback:manage', 'hr:feedback:delete',
              'hr:attendance:write', 'hr:read', 'hr:write', 'hr:stand:read', 'hr:stand:write'
            ]
          : [
              'hr:stands:read', 'hr:stands:shifts:read', 'hr:stands:shifts:write',
              'hr:members:read', 'hr:feedback:read',
              // legacy
              'hr:stands:view', 'hr:feedback:view', 'hr:attendance:write',
              'hr:read', 'hr:stand:read', 'hr:stand:write'
            ],
      });
    } else if (r.startsWith('FUNDRAISING')) {
      const isHead = r.includes('HEAD');
      memberships.push({
        roleName: r,
        scopeType: 'DEPARTMENT',
        scopeId: 'fundraising-dept-uuid',
        permissions: isHead
          ? [
              'fundraising:*', 'donations:*',
              'fundraising:sponsors:*',
              // legacy
              'fundraising:leads:view', 'fundraising:finished:view', 'fundraising:statistics:view',
              'fundraising:read', 'fundraising:write', 'fundraising:sponsor:read', 'fundraising:sponsor:write',
              'donations:read', 'donations:write'
            ]
          : [
              'fundraising:sponsors:read', 'fundraising:sponsors:write',
              // legacy
              'fundraising:leads:view', 'fundraising:finished:view', 'fundraising:statistics:view',
              'fundraising:read', 'fundraising:sponsor:read', 'donations:read'
            ],
      });
    } else if (r.startsWith('LOGISTICS')) {
      const isHead = r.includes('HEAD');
      memberships.push({
        roleName: r,
        scopeType: 'DEPARTMENT',
        scopeId: 'logistics-dept-uuid',
        permissions: isHead
          ? [
              'logistics:*',
              'logistics:inventory:*', 'logistics:stands:*', 'logistics:predictions:read',
              // legacy
              'logistics:stockeditor:view', 'logistics:inventory:view', 'logistics:predictor:view',
              'logistics:standstats:view', 'logistics:history:view', 'logistics:statistics:view',
              'logistics:read', 'logistics:write', 'logistics:inventory:read', 'logistics:inventory:write'
            ]
          : [
              'logistics:inventory:items:read', 'logistics:inventory:items:write',
              'logistics:inventory:locations:read', 'logistics:inventory:transfers:read', 'logistics:inventory:transfers:write',
              'logistics:inventory:adjustments:read', 'logistics:inventory:adjustments:write',
              'logistics:stands:stock:read', 'logistics:stands:eod:read', 'logistics:stands:eod:write',
              // legacy
              'logistics:stockeditor:view', 'logistics:inventory:view',
              'logistics:read', 'logistics:inventory:read', 'logistics:inventory:write'
            ],
      });
    } else if (r.startsWith('LEGAL')) {
      const isHead = r.includes('HEAD');
      memberships.push({
        roleName: r,
        scopeType: 'DEPARTMENT',
        scopeId: 'legal-dept-uuid',
        permissions: isHead
          ? [
              'legal:*',
              'legal:templates:*', 'legal:contracts:*', 'legal:statistics:read',
              // legacy
              'legal:templates:view', 'legal:generator:view', 'legal:contracts:view', 'legal:statistics:view',
              'legal:read', 'legal:write', 'legal:contract:read', 'legal:contract:write'
            ]
          : [
              'legal:templates:read', 'legal:contracts:read', 'legal:contracts:pdf:export', 'legal:statistics:read',
              // legacy
              'legal:templates:view', 'legal:contracts:view', 'legal:statistics:view',
              'legal:read', 'legal:contract:read'
            ],
      });
    } else if (r.startsWith('MARKETING')) {
      const isHead = r.includes('HEAD') || r.includes('LEAD');
      memberships.push({
        roleName: r,
        scopeType: 'PROJECT',
        scopeId: 'marketing-uuid',
        permissions: isHead
          ? [
              'marketing:*',
              'marketing:resources:*',
              // legacy
              'marketing:resources:view', 'marketing:campaign:read', 'marketing:campaign:write',
              'marketing:post:publish', 'marketing:resources:read', 'marketing:read', 'marketing:write'
            ]
          : [
              'marketing:resources:read', 'marketing:resources:export',
              // legacy
              'marketing:resources:view', 'marketing:campaign:read', 'marketing:campaign:write',
              'marketing:resources:read', 'marketing:read'
            ],
      });
    } else if (r === 'PROJECT_CREATOR') {
      memberships.push({
        roleName: 'PROJECT_CREATOR',
        scopeType: 'GLOBAL',
        scopeId: null,
        permissions: ['projects:read', 'projects:write'],
      });
    } else if (r === 'CONFIG_INHERITOR') {
      memberships.push({
        roleName: 'CONFIG_INHERITOR',
        scopeType: 'GLOBAL',
        scopeId: null,
        permissions: ['projects:config:inherit'],
      });
    } else if (r && r !== 'VOLUNTEER') {
      memberships.push({
        roleName: r,
        scopeType: 'GLOBAL',
        scopeId: null,
        permissions: [],
      });
    }
  }

  return memberships;
};

export const adminAuthService = {
  async signIn(email: string, password: string): Promise<AuthResponse> {
    const res = await fetchWithCsrf(`${API_BASE}/login`, {
      method: 'POST',
      
      credentials: 'include',
      body: JSON.stringify({ email: email.trim(), password }),
    });

    if (res.status === 403) {
      const data = await res.json().catch(() => ({}));
      if (data.status) {
        const error: any = new Error(data.message || 'Contul nu este activ.');
        error.status = mapBackendStatus(data.status);
        throw error;
      }
      throw new Error(data.message || 'Acces interzis.');
    }

    if (!res.ok) {
      let errorMsg = 'Credențiale incorecte.';
      try {
        const data = await res.json();
        if (data.message) errorMsg = data.message;
      } catch {
        const text = await res.text().catch(() => '');
        if (text) errorMsg = text;
      }
      throw new Error(errorMsg);
    }

    const data = await res.json();

    // Check if 2FA challenge is returned
    if (data.twoFactorRequired) {
      return {
        twoFactorRequired: true,
        twoFactorSessionToken: data.twoFactorSessionToken,
        twoFactorMethods: data.twoFactorMethods || ['TOTP', 'EMAIL'],
        maskedEmail: data.maskedEmail,
      };
    }

    const userRole = (data.user?.role || 'VOLUNTEER').toUpperCase();
    const userRoles: string[] = Array.isArray(data.user?.roles) && data.user.roles.length > 0
      ? data.user.roles.map((r: string) => r.toUpperCase())
      : [userRole];
    const memberships: UserMembership[] = buildMembershipsForRoles(userRoles);

    const rawPermissions = Array.isArray(data.user?.permissions) ? data.user.permissions : (Array.isArray(data.permissions) ? data.permissions : undefined);

    return {
      token: data.token || '',
      expiresAt: data.expiresAt,
      user: {
        name: data.user?.name || email.split('@')[0].replace('.', ' '),
        email: data.user?.email || email,
        role: userRole,
        roles: userRoles,
        phone: data.user?.phone || '',
        organizationType: data.user?.organizationType || '',
        organizationDetails: data.user?.organizationDetails || '',
        memberships,
        permissions: rawPermissions,
      },
    };
  },

  async signInWithGoogle(credential: string): Promise<AuthResponse> {
    const res = await fetchWithCsrf(`${API_BASE}/auth/google`, {
      method: 'POST',
      
      credentials: 'include',
      body: JSON.stringify({ credential }),
    });

    if (res.status === 403) {
      const data = await res.json().catch(() => ({}));
      if (data.status === 'NEEDS_REGISTRATION') {
        const error: any = new Error(data.message || 'Contul nu este înregistrat.');
        error.status = 'NEEDS_REGISTRATION';
        error.email = data.email;
        throw error;
      }
      if (data.status) {
        const error: any = new Error(data.message || 'Contul nu este activ.');
        error.status = mapBackendStatus(data.status);
        error.email = data.email;
        throw error;
      }
      throw new Error(data.message || 'Acces interzis.');
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Eroare la autentificarea cu Google.');
    }

    const data = await res.json();
    const userRole = (data.user?.role || 'VOLUNTEER').toUpperCase();
    const userRoles: string[] = Array.isArray(data.user?.roles) && data.user.roles.length > 0
      ? data.user.roles.map((r: string) => r.toUpperCase())
      : [userRole];
    const memberships: UserMembership[] = buildMembershipsForRoles(userRoles);
    const rawPermissions = Array.isArray(data.user?.permissions) ? data.user.permissions : (Array.isArray(data.permissions) ? data.permissions : undefined);

    return {
      token: data.token || '',
      expiresAt: data.expiresAt,
      user: {
        name: data.user?.name || data.user?.email?.split('@')[0] || '',
        email: data.user?.email || '',
        role: userRole,
        roles: userRoles,
        phone: data.user?.phone || '',
        organizationType: data.user?.organizationType || '',
        organizationDetails: data.user?.organizationDetails || '',
        memberships,
        permissions: rawPermissions,
      },
    };
  },

  async registerWithGoogle(payload: {
    credential: string;
    fullName: string;
    phone: string;
    orgType: string;
    orgDetails: string;
    justification?: string;
  }): Promise<{ success: boolean; message: string; email?: string }> {
    const res = await fetchWithCsrf(`${API_BASE}/auth/google/register`, {
      method: 'POST',
      
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    if (res.status === 403) {
      const data = await res.json().catch(() => ({}));
      if (data.status) {
        const error: any = new Error(data.message || 'Contul este în așteptare.');
        error.status = mapBackendStatus(data.status);
        error.email = data.email;
        throw error;
      }
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Eroare la trimiterea solicitării Google.');
    }

    return res.json();
  },

  async verify2FA(sessionToken: string, code: string, method?: string): Promise<AuthResponse> {
    const res = await fetchWithCsrf(`${API_BASE}/2fa/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ sessionToken, code: code.trim(), method }),
    });

    if (!res.ok) {
      let errorMsg = 'Cod de verificare incorect.';
      try {
        const data = await res.json();
        if (data.message) errorMsg = data.message;
      } catch {
        const text = await res.text().catch(() => '');
        if (text) errorMsg = text;
      }
      throw new Error(errorMsg);
    }

    const data = await res.json();
    const userRole = (data.user?.role || 'VOLUNTEER').toUpperCase();
    const userRoles: string[] = Array.isArray(data.user?.roles) && data.user.roles.length > 0
      ? data.user.roles.map((r: string) => r.toUpperCase())
      : [userRole];
    const memberships: UserMembership[] = buildMembershipsForRoles(userRoles);
    const rawPermissions = Array.isArray(data.user?.permissions) ? data.user.permissions : (Array.isArray(data.permissions) ? data.permissions : undefined);

    return {
      token: data.token || '',
      expiresAt: data.expiresAt,
      user: {
        name: data.user?.name || data.user?.email?.split('@')[0] || '',
        email: data.user?.email || '',
        role: userRole,
        roles: userRoles,
        phone: data.user?.phone || '',
        organizationType: data.user?.organizationType || '',
        organizationDetails: data.user?.organizationDetails || '',
        memberships,
        permissions: rawPermissions,
      },
    };
  },

  async sendLoginEmailOtp(sessionToken: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/2fa/send-email-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ sessionToken }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message || 'Eroare la trimiterea codului pe email.');
    }
    return res.json();
  },

  async get2FAStatus(): Promise<{ enabled: boolean; method: string; availableMethods: string[] }> {
    const res = await fetch(`${API_BASE}/2fa/status`, {
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error('Eroare la obținerea stării 2FA.');
    }
    return res.json();
  },

  async initiate2FASetup(): Promise<{ secret: string; otpAuthUrl: string; email: string; availableMethods: string[] }> {
    const res = await fetch(`${API_BASE}/2fa/setup/initiate`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error('Eroare la inițierea configurării 2FA.');
    }
    return res.json();
  },

  async resendSetupEmailOtp(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/2fa/setup/resend-email`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error('Eroare la retransmiterea codului de confirmare.');
    }
    return res.json();
  },

  async confirm2FASetup(method: string, code: string, secret?: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/2fa/setup/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ method, code: code.trim(), secret }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message || 'Eroare la confirmarea 2FA.');
    }
    return res.json();
  },

  async disable2FA(password: string, code?: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/2fa/disable`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ password, code }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message || 'Eroare la dezactivarea 2FA.');
    }
    return res.json();
  },

  async signOut(): Promise<void> {
    try {
      await fetchWithCsrf(`${API_BASE}/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // ignore network errors on logout
    }
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminToken');
    clearCsrfToken();
    window.dispatchEvent(new Event('authChange'));
  },

  async verifyEmail(token: string): Promise<{ success: boolean; message: string; email?: string }> {
    const res = await fetchWithCsrf(`${API_BASE}/verify-email?token=${encodeURIComponent(token.trim())}`, {
      credentials: 'include',
    });
    if (!res.ok) {
      let errorMsg = 'Token invalid sau expirat.';
      try {
        const data = await res.json();
        if (data.message) errorMsg = data.message;
        else if (data.error && typeof data.error === 'string') errorMsg = data.error;
      } catch {
        const text = await res.text().catch(() => '');
        if (text && text.length < 300 && !text.includes('<!DOCTYPE')) errorMsg = text;
      }
      throw new Error(errorMsg);
    }
    return res.json();
  },

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Origin': typeof window !== 'undefined' ? window.location.origin : '',
      },
      credentials: 'include',
      body: JSON.stringify({ email: email.trim() }),
    });

    if (!res.ok) {
      let errorMsg = 'Eroare la trimiterea link-ului de resetare.';
      try {
        const data = await res.json();
        if (data.message) errorMsg = data.message;
      } catch {
        const text = await res.text().catch(() => '');
        if (text && text.length < 300 && !text.includes('<!DOCTYPE')) errorMsg = text;
      }
      throw new Error(errorMsg);
    }

    return res.json();
  },

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ token: token.trim(), newPassword }),
    });

    if (!res.ok) {
      let errorMsg = 'Eroare la resetarea parolei.';
      try {
        const data = await res.json();
        if (data.message) errorMsg = data.message;
      } catch {
        const text = await res.text().catch(() => '');
        if (text && text.length < 300 && !text.includes('<!DOCTYPE')) errorMsg = text;
      }
      throw new Error(errorMsg);
    }

    return res.json();
  },

  async validateResetToken(token: string): Promise<{ valid: boolean; message?: string }> {
    try {
      const res = await fetch(`${API_BASE}/validate-reset-token?token=${encodeURIComponent(token.trim())}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        let errorMsg = 'Token-ul de resetare a parolei este invalid sau a expirat.';
        try {
          const data = await res.json();
          if (data.message) errorMsg = data.message;
        } catch {
          const text = await res.text().catch(() => '');
          if (text && text.length < 300 && !text.includes('<!DOCTYPE')) errorMsg = text;
        }
        return { valid: false, message: errorMsg };
      }
      return { valid: true };
    } catch {
      return { valid: false, message: 'Eroare la verificarea token-ului.' };
    }
  },

  async requestAccess(
    fullName: string,
    email: string,
    password: string,
    phone: string,
    orgType: string,
    orgDetails: string
  ): Promise<RequestAccessResponse> {
    const res = await fetch(`${API_BASE}/request-access`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Origin': typeof window !== 'undefined' ? window.location.origin : '',
      },
      credentials: 'include',
      body: JSON.stringify({
        fullName: fullName.trim(),
        email: email.trim(),
        password: password,
        phone: phone.trim(),
        orgType,
        orgDetails,
        justification: `Access request from ${orgType} - ${orgDetails}`,
      }),
    });

    if (!res.ok) {
      let errorMsg = res.status === 409 
        ? 'Există deja o solicitare sau un cont înregistrat cu aceste date.'
        : 'Eroare la trimiterea solicitării.';
      try {
        const data = await res.json();
        if (data.message) errorMsg = data.message;
        else if (data.error && typeof data.error === 'string') errorMsg = data.error;
      } catch {
        const text = await res.text().catch(() => '');
        if (text && text.length < 300 && !text.includes('<!DOCTYPE')) errorMsg = text;
      }
      throw new Error(errorMsg);
    }

    return {
      status: 'PENDING_EMAIL',
      emailSent: true,
    };
  },

  async checkStatus(email: string): Promise<StatusResponse> {
    const res = await fetch(`${API_BASE}/status?email=${encodeURIComponent(email.trim())}`, {
      credentials: 'include',
    });
    if (!res.ok) {
      let errorMsg = 'Utilizatorul nu a fost găsit.';
      try {
        const data = await res.json();
        if (data.message) errorMsg = data.message;
        else if (data.error && typeof data.error === 'string') errorMsg = data.error;
      } catch {
        const text = await res.text().catch(() => '');
        if (text && text.length < 300 && !text.includes('<!DOCTYPE')) errorMsg = text;
      }
      throw new Error(errorMsg);
    }

    const data = await res.json();
    return {
      status: mapBackendStatus(data.status),
    };
  },

  async approveUser(userId: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/approve/${userId}`, {
      method: 'POST',
      
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(err || 'Eroare la aprobarea utilizatorului.');
    }
    return res.json();
  },

  async rejectUser(userId: string): Promise<{ success: boolean; message: string }> {
    const res = await fetchWithCsrf(`${API_BASE}/reject/${userId}`, {
      method: 'POST',
      
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(err || 'Eroare la respingerea utilizatorului.');
    }
    return res.json();
  },

  async getMe(): Promise<AdminUser | null> {
    try {
      const res = await fetchWithCsrf(`${API_BASE}/me`, {
        
        credentials: 'include',
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('adminUser');
          localStorage.removeItem('adminToken');
          clearCsrfToken();
          window.dispatchEvent(new Event('authChange'));
        }
        return null;
      }

      const data = await res.json();
      const userRole = (data.role || 'VOLUNTEER').toUpperCase();
      const userRoles: string[] = Array.isArray(data.roles) && data.roles.length > 0
        ? data.roles.map((r: string) => r.toUpperCase())
        : [userRole];
      const memberships = buildMembershipsForRoles(userRoles);
      const rawPermissions = Array.isArray(data.permissions) ? data.permissions : (Array.isArray(data.user?.permissions) ? data.user.permissions : undefined);

      const refreshedUser: AdminUser = {
        name: data.name || (data.email ? data.email.split('@')[0].replace('.', ' ') : ''),
        email: data.email || '',
        role: userRole,
        roles: userRoles,
        phone: data.phone || '',
        organizationType: data.organizationType || '',
        organizationDetails: data.organizationDetails || '',
        whatsappNotificationsEnabled: data.whatsappNotificationsEnabled !== false,
        memberships,
        permissions: rawPermissions,
      };

      const existingStr = localStorage.getItem('adminUser');
      const newStr = JSON.stringify(refreshedUser);
      if (existingStr !== newStr) {
        localStorage.setItem('adminUser', newStr);
        window.dispatchEvent(new Event('authChange'));
      }

      return refreshedUser;
    } catch {
      return null;
    }
  },

  async updateWhatsappNotificationsPreference(enabled: boolean): Promise<{ success: boolean; whatsappNotificationsEnabled: boolean }> {
    const res = await fetchWithCsrf(`${API_BASE}/me/whatsapp-notifications`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(err || 'Eroare la actualizarea preferințelor WhatsApp.');
    }
    return res.json();
  },

  setMockStatus(_email: string, _status: 'APPROVED' | 'PENDING_EMAIL' | 'PENDING_APPROVAL' | 'REJECTED') {
    // Retained for backward compatibility with IT state updates
  },

  async getClubs(orgType?: string): Promise<Club[]> {
    try {
      const url = orgType && orgType !== 'ALL'
        ? `${API_BASE}/clubs?organizationType=${encodeURIComponent(orgType)}`
        : `${API_BASE}/clubs`;
      const res = await fetchWithCsrf(url, {
        
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          return data;
        }
      }
      return [];
    } catch {
      return [];
    }
  },

  async generateReferralCode(): Promise<{ referralCode: string }> {
    const res = await fetchWithCsrf(`${API_BASE}/referral/generate-code`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) {
      // Fallback: If backend endpoint is not yet present, generate a unique deterministic/random client-side referral code
      const stored = localStorage.getItem('adminUser');
      let prefix = 'VOL';
      if (stored) {
        try {
          const user = JSON.parse(stored);
          const namePart = (user.name || user.email || 'user').split(/[@\s]+/)[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
          if (namePart) prefix = namePart.slice(0, 8);
        } catch {}
      }
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const code = `${prefix}-${randomSuffix}`;
      return { referralCode: code };
    }
    return res.json();
  },
};



