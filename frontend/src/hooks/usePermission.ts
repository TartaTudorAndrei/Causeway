import { useState, useEffect } from 'react';
import type { AdminUser } from '../types/adminAuth';
import { adminAuthService } from '../services/adminAuthService';

export const usePermission = () => {
  const [user, setUser] = useState<AdminUser | null>(() => {
    const storedUser = localStorage.getItem('adminUser');
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    const syncUser = () => {
      const storedUser = localStorage.getItem('adminUser');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };

    syncUser();
    // Validate and fetch the fresh role from database immediately
    adminAuthService.getMe().then((freshUser) => {
      if (freshUser) {
        setUser(freshUser);
      }
    });

    const handleSyncAndValidate = () => {
      if (document.visibilityState === 'visible') {
        adminAuthService.getMe().then((freshUser) => {
          if (freshUser) {
            setUser(freshUser);
          } else {
            syncUser();
          }
        });
      }
    };

    window.addEventListener('authChange', syncUser);
    window.addEventListener('storage', syncUser);
    window.addEventListener('focus', handleSyncAndValidate);
    document.addEventListener('visibilitychange', handleSyncAndValidate);
    return () => {
      window.removeEventListener('authChange', syncUser);
      window.removeEventListener('storage', syncUser);
      window.removeEventListener('focus', handleSyncAndValidate);
      document.removeEventListener('visibilitychange', handleSyncAndValidate);
    };
  }, []);


  const isSuperAdmin = Boolean(
    user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' ||
    user?.roles?.includes('ADMIN') || user?.roles?.includes('SUPER_ADMIN') ||
    user?.memberships?.some(m => m.roleName === 'ADMIN' || m.roleName === 'SUPER_ADMIN')
  );

  const hasPermission = (
    permissionCode: string,
    scopeType?: 'GLOBAL' | 'PROJECT' | 'DEPARTMENT',
    scopeId?: string | null
  ): boolean => {
    if (!user) return false;

    // Admin role check (bypass all permission checks)
    const rolesList: string[] = [
      ...(user.roles || []),
      ...(user.role ? [user.role] : []),
      ...(user.memberships?.map(m => m.roleName) || [])
    ];

    if (rolesList.includes('ADMIN') || rolesList.includes('SUPER_ADMIN')) {
      return true;
    }

    // Helper for matching permission code against a list of permissions (including arbitrary multi-level wildcards)
    const matchesPermissionList = (perms?: string[]): boolean => {
      if (!perms || !Array.isArray(perms) || perms.length === 0) return false;
      if (perms.includes('*') || perms.includes(permissionCode)) return true;

      // Check all hierarchical wildcard prefixes: e.g. for "a:b:c:d" -> "a:*", "a:b:*", "a:b:c:*"
      let idx = permissionCode.indexOf(':');
      while (idx > 0) {
        const prefix = permissionCode.substring(0, idx);
        if (perms.includes(prefix + ':*')) {
          return true;
        }
        idx = permissionCode.indexOf(':', idx + 1);
      }
      return false;
    };

    // Direct user permissions check (from database via /me or login)
    if (matchesPermissionList(user.permissions)) {
      return true;
    }

    if (!user.memberships || !Array.isArray(user.memberships)) return false;

    for (const membership of user.memberships) {
      // 1. Global membership permissions apply everywhere
      if (membership.scopeType === 'GLOBAL') {
        if (matchesPermissionList(membership.permissions)) {
          return true;
        }
      }

      // 2. When scopeType is not specified, any active membership granting the permission applies
      if (!scopeType) {
        if (matchesPermissionList(membership.permissions)) {
          return true;
        }
      }

      // 3. Scoped matching memberships
      if (scopeType && membership.scopeType === scopeType) {
        if (!scopeId || !membership.scopeId || membership.scopeId === scopeId) {
          if (matchesPermissionList(membership.permissions)) {
            return true;
          }
        }
      }
    }

    return false;
  };

  return {
    user,
    isAuthenticated: !!user,
    hasPermission,
    isSuperAdmin,
  };
};
