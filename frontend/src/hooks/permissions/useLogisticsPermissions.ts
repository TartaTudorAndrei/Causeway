import { usePermission } from '../usePermission';

export function useLogisticsPermissions(departmentId?: string) {
  const { hasPermission, isSuperAdmin, user } = usePermission();
  return {
    canWriteInventory: () => isSuperAdmin || 
      hasPermission('logistics:inventory:items:write') || 
      hasPermission('logistics:inventory:write') || 
      (departmentId ? (hasPermission('logistics:inventory:items:write', 'DEPARTMENT', departmentId) || hasPermission('logistics:inventory:write', 'DEPARTMENT', departmentId)) : false),
    user,
  };
}
