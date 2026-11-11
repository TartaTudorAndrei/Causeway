import type { PlatformUser, SystemRoleType, UserPlatformStatus, AdminAuditLog, PermissionItem, RoleWithPermissions, CreateCustomRoleDTO } from '../types/adminSettings';
import type { UserMembership } from '../types/adminAuth';
import { auditService } from './auditService';
import { buildMembershipsForRoles } from './adminAuthService';
import { fetchWithCsrf } from './apiClient';

const API_BASE = '/api/admin';

const mapBackendStatus = (status: string): UserPlatformStatus => {
  if (!status) return 'APPROVED';
  const clean = status.trim().toUpperCase();
  if (clean === 'PENDING_EMAIL_VERIFICATION' || clean === 'PENDING_EMAIL') return 'PENDING_EMAIL';
  if (clean === 'PENDING_APPROVAL' || clean === 'PENDING') return 'PENDING_APPROVAL';
  if (clean === 'REJECTED') return 'REJECTED';
  if (clean === 'SUSPENDED') return 'SUSPENDED';
  return 'APPROVED';
};

const mapBackendUser = (raw: any): PlatformUser => {
  const primaryRole = (raw.role || 'VOLUNTEER') as SystemRoleType;
  const rawRoles = raw.roles;
  const roles: SystemRoleType[] = (Array.isArray(rawRoles) && rawRoles.length > 0)
    ? rawRoles as SystemRoleType[]
    : (typeof rawRoles === 'string' && rawRoles.trim().length > 0)
    ? rawRoles.split(',').map((r: string) => r.trim() as SystemRoleType)
    : [primaryRole];
  
  // Default memberships based on all assigned roles if not explicitly provided
  const memberships: UserMembership[] = (raw.memberships && raw.memberships.length > 0) 
    ? raw.memberships 
    : buildMembershipsForRoles(roles);

  return {
    id: raw.id,
    fullName: raw.fullName || raw.full_name || '',
    email: raw.email || '',
    phone: raw.phone || undefined,
    organizationType: raw.organizationType || raw.organization_type || undefined,
    organizationDetails: raw.organizationDetails || raw.organization_details || undefined,
    status: mapBackendStatus(raw.status),
    primaryRole: primaryRole,
    roles,
    memberships,
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
    lastLoginAt: raw.lastLoginAt || raw.last_login_at || undefined,
    notes: raw.notes || undefined,
  };
};

export const adminSettingsService = {
  async getUsers(): Promise<PlatformUser[]> {
    const res = await fetchWithCsrf(`${API_BASE}/users`, {
      credentials: 'include',
    });

    if (!res.ok) {
      let errorMsg = 'Eroare la preluarea utilizatorilor din baza de date.';
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
    return Array.isArray(data) ? data.map(mapBackendUser) : [];
  },

  async approveUser(userId: string, actorEmail: string = 'admin@platform.local'): Promise<PlatformUser> {
    const res = await fetchWithCsrf(`${API_BASE}/approve/${userId}`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!res.ok) {
      let errorMsg = 'Eroare la aprobarea utilizatorului.';
      try {
        const data = await res.json();
        if (data.message) errorMsg = data.message;
      } catch {
        const text = await res.text().catch(() => '');
        if (text) errorMsg = text;
      }
      throw new Error(errorMsg);
    }

    // Refresh users from DB to get the updated entity
    const all = await this.getUsers();
    const updated = all.find(u => u.id === userId);
    if (!updated) {
      throw new Error('Utilizatorul actualizat nu a putut fi regăsit.');
    }

    await auditService.recordAuditLog({
      department: 'IT_AUTH',
      actionType: 'APPROVE',
      resourceType: 'User Access',
      resourceId: updated.id,
      resourceName: updated.fullName,
      summary: `Acces aprobat pentru ${updated.fullName} (${updated.email})`,
      details: `Rol: ${updated.primaryRole}`,
      actorEmail,
    });

    return updated;
  },

  async rejectUser(userId: string, reason?: string, actorEmail: string = 'admin@platform.local'): Promise<PlatformUser> {
    const res = await fetchWithCsrf(`${API_BASE}/reject/${userId}`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ reason }),
    });

    if (!res.ok) {
      let errorMsg = 'Eroare la respingerea utilizatorului.';
      try {
        const data = await res.json();
        if (data.message) errorMsg = data.message;
      } catch {
        const text = await res.text().catch(() => '');
        if (text) errorMsg = text;
      }
      throw new Error(errorMsg);
    }

    const all = await this.getUsers();
    const updated = all.find(u => u.id === userId);
    if (!updated) {
      throw new Error('Utilizatorul actualizat nu a putut fi regăsit.');
    }

    await auditService.recordAuditLog({
      department: 'IT_AUTH',
      actionType: 'REJECT',
      resourceType: 'User Access',
      resourceId: updated.id,
      resourceName: updated.fullName,
      summary: `Cerere de acces respinsă pentru ${updated.fullName} (${updated.email})`,
      details: reason ? `Motiv: ${reason}` : 'Fără motiv specificat.',
      actorEmail,
    });

    return updated;
  },

  async suspendUser(userId: string, actorEmail: string = 'admin@platform.local'): Promise<PlatformUser> {
    const res = await fetchWithCsrf(`${API_BASE}/users/${userId}/suspend`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!res.ok) {
      let errorMsg = 'Eroare la suspendarea contului.';
      try {
        const data = await res.json();
        if (data.message) errorMsg = data.message;
      } catch {
        const text = await res.text().catch(() => '');
        if (text) errorMsg = text;
      }
      throw new Error(errorMsg);
    }

    const all = await this.getUsers();
    const updated = all.find(u => u.id === userId);
    if (!updated) {
      throw new Error('Utilizatorul actualizat nu a putut fi regăsit.');
    }

    await auditService.recordAuditLog({
      department: 'IT_AUTH',
      actionType: 'SUSPEND',
      resourceType: 'User Access',
      resourceId: updated.id,
      resourceName: updated.fullName,
      summary: `Cont utilizator suspendat: ${updated.fullName} (${updated.email})`,
      actorEmail,
    });

    return updated;
  },

  async deleteUser(userId: string, actorEmail: string = 'admin@platform.local'): Promise<void> {
    const res = await fetchWithCsrf(`${API_BASE}/users/${userId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!res.ok) {
      let errorMsg = 'Eroare la ștergerea contului.';
      try {
        const data = await res.json();
        if (data.message) errorMsg = data.message;
      } catch {
        const text = await res.text().catch(() => '');
        if (text) errorMsg = text;
      }
      throw new Error(errorMsg);
    }

    await auditService.recordAuditLog({
      department: 'IT_AUTH',
      actionType: 'DELETE',
      resourceType: 'User Access',
      resourceId: userId,
      resourceName: userId,
      summary: `Cont utilizator șters: ${userId}`,
      actorEmail,
    });
  },

  async updateUserRolesAndMemberships(
    userId: string,
    primaryRole: SystemRoleType,
    roles: SystemRoleType[],
    memberships: UserMembership[],
    actorEmail: string = 'admin@platform.local'
  ): Promise<PlatformUser> {
    const res = await fetchWithCsrf(`${API_BASE}/users/${userId}/role`, {
      method: 'PUT',
      credentials: 'include',
      body: JSON.stringify({ primaryRole, role: primaryRole, roles, memberships }),
    });

    if (!res.ok) {
      let errorMsg = 'Eroare la actualizarea rolului utilizatorului.';
      try {
        const data = await res.json();
        if (data.message) errorMsg = data.message;
      } catch {
        const text = await res.text().catch(() => '');
        if (text) errorMsg = text;
      }
      throw new Error(errorMsg);
    }

    let responseData: any = null;
    try {
      responseData = await res.json();
    } catch {}

    const all = await this.getUsers();
    const updated = all.find(u => u.id === userId);
    if (!updated) {
      throw new Error('Utilizatorul actualizat nu a putut fi regăsit.');
    }

    const rolesStr = roles.join(', ');
    await auditService.recordAuditLog({
      department: 'IT_AUTH',
      actionType: 'UPDATE',
      resourceType: 'User Roles & Permissions',
      resourceId: updated.id,
      resourceName: updated.fullName,
      summary: `Roluri actualizate la [${rolesStr}] pentru ${updated.fullName} (${updated.email})`,
      details: `Rol principal: ${primaryRole}, Roluri: ${rolesStr}`,
      stateChanges: { primaryRole, roles, memberships },
      actorEmail,
    });

    // If the updated user is currently logged in, sync localStorage & notify permission hook
    const currentStoredUser = localStorage.getItem('adminUser');
    if (currentStoredUser) {
      try {
        const parsed = JSON.parse(currentStoredUser);
        if (parsed.email && updated.email && parsed.email.toLowerCase() === updated.email.toLowerCase()) {
          const syncedUser = {
            ...parsed,
            role: primaryRole,
            roles,
            memberships,
          };
          localStorage.setItem('adminUser', JSON.stringify(syncedUser));
          if (responseData?.details && typeof responseData.details === 'string') {
            localStorage.setItem('adminToken', responseData.details);
          }
          window.dispatchEvent(new Event('authChange'));
          window.dispatchEvent(new Event('storage'));
        }
      } catch {}
    }

    return updated;
  },

  async createUser(
    userData: Omit<PlatformUser, 'id' | 'createdAt'>,
    actorEmail: string = 'admin@platform.local'
  ): Promise<PlatformUser> {
    const res = await fetchWithCsrf(`${API_BASE}/users`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({
        fullName: userData.fullName,
        email: userData.email,
        phone: userData.phone,
        organizationType: userData.organizationType,
        organizationDetails: userData.organizationDetails,
        role: userData.primaryRole,
        roles: userData.roles && userData.roles.length > 0 ? userData.roles : [userData.primaryRole],
        status: userData.status,
        notes: userData.notes,
      }),
    });

    if (!res.ok) {
      let errorMsg = 'Eroare la crearea utilizatorului.';
      try {
        const data = await res.json();
        if (data.message) errorMsg = data.message;
      } catch {
        const text = await res.text().catch(() => '');
        if (text) errorMsg = text;
      }
      throw new Error(errorMsg);
    }

    const created = await res.json();
    const platformUser = mapBackendUser(created);

    await auditService.recordAuditLog({
      department: 'IT_AUTH',
      actionType: 'CREATE',
      resourceType: 'User Account',
      resourceId: platformUser.id,
      resourceName: platformUser.fullName,
      summary: `Utilizator nou creat: ${platformUser.fullName} (${platformUser.email}) - Rol: ${platformUser.primaryRole}`,
      details: platformUser.notes || '',
      actorEmail,
    });

    return platformUser;
  },

  async getAuditLogs(): Promise<AdminAuditLog[]> {
    return [];
  },

  async logAudit(_log: AdminAuditLog): Promise<void> {
    // Handled by auditService
  },

  async getAllPermissions(): Promise<PermissionItem[]> {
    const res = await fetchWithCsrf(`${API_BASE}/permissions`);
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(err || 'Eroare la preluarea catalogului de permisiuni.');
    }
    return res.json();
  },

  async getRolesWithPermissions(): Promise<RoleWithPermissions[]> {
    const res = await fetchWithCsrf(`${API_BASE}/roles-permissions`);
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(err || 'Eroare la preluarea rolurilor și a permisiunilor.');
    }
    return res.json();
  },

  async updateRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
    const res = await fetchWithCsrf(`${API_BASE}/roles/${roleId}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissionIds }),
    });
    if (!res.ok) {
      let errorMsg = 'Eroare la actualizarea permisiunilor rolului.';
      try {
        const data = await res.json();
        if (data.message) errorMsg = data.message;
      } catch {
        const text = await res.text().catch(() => '');
        if (text) errorMsg = text;
      }
      throw new Error(errorMsg);
    }
  },

  async createCustomRole(data: CreateCustomRoleDTO): Promise<RoleWithPermissions> {
    const res = await fetchWithCsrf(`${API_BASE}/roles`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      let errorMsg = 'Eroare la crearea rolului.';
      try {
        const d = await res.json();
        if (d.message) errorMsg = d.message;
      } catch {
        const text = await res.text().catch(() => '');
        if (text) errorMsg = text;
      }
      throw new Error(errorMsg);
    }
    return res.json();
  },

  async deleteRole(roleId: string): Promise<void> {
    const res = await fetchWithCsrf(`${API_BASE}/roles/${roleId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      let errorMsg = 'Eroare la ștergerea rolului.';
      try {
        const d = await res.json();
        if (d.message) errorMsg = d.message;
      } catch {
        const text = await res.text().catch(() => '');
        if (text) errorMsg = text;
      }
      throw new Error(errorMsg);
    }
  },
};

export const itSettingsService = adminSettingsService;


