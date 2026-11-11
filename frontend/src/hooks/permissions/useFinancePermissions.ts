import { usePermission } from '../usePermission';

export function useFinancePermissions() {
  const { hasPermission, isSuperAdmin, user } = usePermission();
  return {
    canViewExpenses: () => isSuperAdmin || hasPermission('finance:expenses:read') || hasPermission('finance:expense:read'),
    canWriteExpenses: () => isSuperAdmin || hasPermission('finance:expenses:write') || hasPermission('finance:expense:write'),
    canViewEoD: () => isSuperAdmin || hasPermission('finance:stands:read') || hasPermission('finance:eod:read'),
    canSubmitEoD: () => isSuperAdmin || hasPermission('finance:stands:eod:write') || hasPermission('finance:eod:write'),
    canViewDonations: () => isSuperAdmin || hasPermission('finance:donations:read') || hasPermission('finance:donation:read'),
    canViewSponsors: () => isSuperAdmin || hasPermission('finance:sponsorships:read') || hasPermission('finance:sponsor:read'),
    canHandoverStand: () => isSuperAdmin || hasPermission('finance:stands:eod:write') || hasPermission('finance:stand:handover') || hasPermission('finance:write'),
    canReimburseExpense: () => isSuperAdmin || hasPermission('finance:expenses:reimburse:approve') || hasPermission('finance:expense:reimburse') || hasPermission('finance:expenses:write') || hasPermission('finance:expense:write') || hasPermission('finance:write'),
    user,
  };
}
