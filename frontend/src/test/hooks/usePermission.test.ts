import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePermission } from '../../hooks/usePermission';

vi.mock('../../services/adminAuthService', () => ({
  adminAuthService: {
    getMe: vi.fn().mockResolvedValue(null),
  },
}));

describe('usePermission hook', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns unauthenticated state when no user exists in storage', () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.hasPermission('finance:read')).toBe(false);
  });

  it('grants global permissions when user has global wildcard membership', () => {
    localStorage.setItem('adminUser', JSON.stringify({
      id: '123',
      name: 'Admin',
      email: 'admin@example.org',
      role: 'ADMIN',
      roles: ['ADMIN'],
      status: 'APPROVED',
      memberships: [
        {
          scopeType: 'GLOBAL',
          scopeId: null,
          roleId: 'role-1',
          permissions: ['*'],
        },
      ],
    }));

    const { result } = renderHook(() => usePermission());
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.hasPermission('any:action:here')).toBe(true);
  });

  it('allows general read for volunteer but denies write operations', () => {
    localStorage.setItem('adminUser', JSON.stringify({
      id: '456',
      name: 'Volunteer User',
      email: 'vol@example.org',
      role: 'VOLUNTEER',
      roles: ['VOLUNTEER'],
      status: 'APPROVED',
      memberships: [
        {
          scopeType: 'GLOBAL',
          scopeId: null,
          roleId: 'role-2',
          permissions: ['general:read', 'general:event:read', 'general:task:read'],
        },
      ],
    }));

    const { result } = renderHook(() => usePermission());
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.hasPermission('general:read')).toBe(true);
    expect(result.current.hasPermission('general:event:read')).toBe(true);
    expect(result.current.hasPermission('finance:write')).toBe(false);
    expect(result.current.hasPermission('hr:stand:write')).toBe(false);
  });

  it('correctly grants finance permissions for FINANCE_HEAD role memberships', () => {
    localStorage.setItem('adminUser', JSON.stringify({
      id: '789',
      name: 'Finance Lead',
      email: 'finance@example.org',
      role: 'FINANCE_HEAD',
      roles: ['FINANCE_HEAD'],
      status: 'APPROVED',
      memberships: [
        {
          roleName: 'VOLUNTEER',
          scopeType: 'GLOBAL',
          scopeId: null,
          permissions: ['general:read', 'general:calendar:view'],
        },
        {
          roleName: 'FINANCE_HEAD',
          scopeType: 'DEPARTMENT',
          scopeId: 'finance-dept-uuid',
          permissions: [
            'finance:*',
            'finance:expenses:view',
            'finance:onlinedonations:view',
            'finance:expense:write',
          ],
        },
      ],
    }));

    const { result } = renderHook(() => usePermission());
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.hasPermission('finance:expenses:view')).toBe(true);
    expect(result.current.hasPermission('finance:onlinedonations:view')).toBe(true);
    expect(result.current.hasPermission('finance:expense:write')).toBe(true);
    expect(result.current.hasPermission('finance:stands:view')).toBe(true); // wildcard finance:*
    expect(result.current.hasPermission('hr:stands:view')).toBe(false);
  });

  it('grants permissions from direct user.permissions array', () => {
    localStorage.setItem('adminUser', JSON.stringify({
      id: '999',
      name: 'Custom User',
      email: 'custom@example.org',
      role: 'VOLUNTEER',
      roles: ['VOLUNTEER'],
      status: 'APPROVED',
      permissions: ['finance:expenses:view', 'marketing:*'],
      memberships: [],
    }));

    const { result } = renderHook(() => usePermission());
    expect(result.current.hasPermission('finance:expenses:view')).toBe(true);
    expect(result.current.hasPermission('marketing:resources:view')).toBe(true);
    expect(result.current.hasPermission('hr:stands:view')).toBe(false);
  });

  it('supports arbitrary depth multi-level hierarchical wildcard matching', () => {
    localStorage.setItem('adminUser', JSON.stringify({
      id: '888',
      name: 'Scope Master',
      email: 'master@example.org',
      role: 'VOLUNTEER',
      roles: ['VOLUNTEER'],
      status: 'APPROVED',
      memberships: [
        {
          scopeType: 'GLOBAL',
          scopeId: null,
          roleId: 'role-3',
          permissions: [
            'logistics:inventory:*',
            'finance:expenses:reimburse:approve',
            'deep:nested:sub:section:*',
          ],
        },
      ],
    }));

    const { result } = renderHook(() => usePermission());
    expect(result.current.hasPermission('logistics:inventory:items:read')).toBe(true);
    expect(result.current.hasPermission('logistics:inventory:locations:write')).toBe(true);
    expect(result.current.hasPermission('logistics:inventory:a:b:c:manage')).toBe(true);
    expect(result.current.hasPermission('logistics:stands:stock:read')).toBe(false);
    expect(result.current.hasPermission('finance:expenses:reimburse:approve')).toBe(true);
    expect(result.current.hasPermission('finance:expenses:reimburse:write')).toBe(false);
    expect(result.current.hasPermission('deep:nested:sub:section:widget:button:click:read')).toBe(true);
  });
});
