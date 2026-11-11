import type { UserMembership } from '../types/adminAuth';

export const BASE_READ_PERMISSIONS = [
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
        'it:read', 'it:write', 'auth:read', 'auth:write', 'admin:read', 'admin:write'
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
              'hr:stands:view', 'hr:statistics:view', 'hr:attendance:write',
              'hr:read', 'hr:write', 'hr:stand:read', 'hr:stand:write'
            ]
          : [
              'hr:stands:read', 'hr:stands:shifts:read', 'hr:stands:shifts:write',
              'hr:members:read', 'hr:feedback:read',
              // legacy
              'hr:stands:view', 'hr:attendance:write',
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
    }
  }

  return memberships;
};
