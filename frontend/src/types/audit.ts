export type AuditActionType =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'ADJUSTMENT'
  | 'TRANSFER'
  | 'SUBMIT'
  | 'SEND'
  | 'APPROVE'
  | 'REJECT'
  | 'SUSPEND'
  | 'AUTH';

export type AuditDepartment =
  | 'LOGISTICS'
  | 'FINANCE'
  | 'HR'
  | 'FUNDRAISING'
  | 'MARKETING'
  | 'LEGAL'
  | 'GENERAL'
  | 'IT_AUTH';

export interface SystemAuditLog {
  id: string;
  timestamp: string; // ISO 8601 string
  actorName: string;
  actorEmail: string;
  department: AuditDepartment;
  actionType: AuditActionType;
  resourceType: string;
  resourceId?: string;
  resourceName?: string;
  summary: string;
  details?: string;
  stateChanges?: string;
  ipAddress?: string;
  userAgent?: string;
}
