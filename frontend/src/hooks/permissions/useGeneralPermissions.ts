import { usePermission } from '../usePermission';

export function useGeneralPermissions() {
  const { hasPermission, isSuperAdmin, user } = usePermission();
  return {
    canWriteExpense: (deptId?: string) => isSuperAdmin || 
      hasPermission('finance:expenses:write') || 
      hasPermission('finance:expense:write') || 
      hasPermission('finance:expense:create') || 
      (deptId ? (hasPermission('finance:expenses:write', 'DEPARTMENT', deptId) || hasPermission('finance:expense:write', 'DEPARTMENT', deptId) || hasPermission('finance:expense:create', 'DEPARTMENT', deptId)) : false),
    canWriteITSettings: (deptId?: string) => isSuperAdmin || 
      hasPermission('it:settings:write') || 
      hasPermission('it:write') || 
      (deptId ? (hasPermission('it:settings:write', 'DEPARTMENT', deptId) || hasPermission('it:write', 'DEPARTMENT', deptId)) : false),
    canWriteSponsor: (deptId?: string) => isSuperAdmin || 
      hasPermission('fundraising:sponsors:write') || 
      hasPermission('fundraising:sponsor:write') || 
      (deptId ? (hasPermission('fundraising:sponsors:write', 'DEPARTMENT', deptId) || hasPermission('fundraising:sponsor:write', 'DEPARTMENT', deptId)) : false),
    canWriteInventory: (deptId?: string) => isSuperAdmin || 
      hasPermission('logistics:inventory:items:write') || 
      hasPermission('logistics:inventory:write') || 
      (deptId ? (hasPermission('logistics:inventory:items:write', 'DEPARTMENT', deptId) || hasPermission('logistics:inventory:write', 'DEPARTMENT', deptId)) : false),
    canWriteStand: (deptId?: string) => isSuperAdmin || 
      hasPermission('hr:stands:shifts:write') || 
      hasPermission('hr:stand:write') || 
      (deptId ? (hasPermission('hr:stands:shifts:write', 'DEPARTMENT', deptId) || hasPermission('hr:stand:write', 'DEPARTMENT', deptId)) : false),
    canWriteContract: (deptId?: string) => isSuperAdmin || 
      hasPermission('legal:contracts:write') || 
      hasPermission('legal:contract:write') || 
      (deptId ? (hasPermission('legal:contracts:write', 'DEPARTMENT', deptId) || hasPermission('legal:contract:write', 'DEPARTMENT', deptId)) : false),
    user,
  };
}
