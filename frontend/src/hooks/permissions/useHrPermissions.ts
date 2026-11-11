import { usePermission } from '../usePermission';

export function useHrPermissions(departmentId?: string) {
  const { hasPermission, isSuperAdmin, user } = usePermission();
  return {
    canWriteStands: () => isSuperAdmin || 
      hasPermission('hr:stands:shifts:write') || 
      hasPermission('hr:stand:write') || 
      hasPermission('hr:stand:create') || 
      (departmentId ? (hasPermission('hr:stands:shifts:write', 'DEPARTMENT', departmentId) || hasPermission('hr:stand:write', 'DEPARTMENT', departmentId) || hasPermission('hr:stand:create', 'DEPARTMENT', departmentId)) : false),
    user,
  };
}
