import type { SystemAuditLog, AuditActionType, AuditDepartment } from '../types/audit';
import { fetchWithCsrf } from './apiClient';

const API_BASE_URL = '/api/admin/audit-logs';
const STORAGE_KEY = 'app_system_audit_logs';

function getCurrentUser(): { name: string; email: string } {
  try {
    const raw = localStorage.getItem('adminUser');
    if (raw) {
      const user = JSON.parse(raw);
      return {
        name: user.name || user.fullName || 'Admin Utilizator',
        email: user.email || 'admin@platform.local',
      };
    }
  } catch {
    // ignore
  }
  return {
    name: 'Administrator',
    email: 'admin@platform.local',
  };
}

export const auditService = {
  async getAuditLogs(params?: {
    department?: string;
    action?: string;
    search?: string;
  }): Promise<SystemAuditLog[]> {
    try {
      const query = new URLSearchParams();
      if (params?.department && params.department !== 'ALL') query.append('department', params.department);
      if (params?.action && params.action !== 'ALL') query.append('action', params.action);
      if (params?.search) query.append('search', params.search);

      const res = await fetchWithCsrf(`${API_BASE_URL}?${query.toString()}`);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          // Map backend AuditLog model to frontend SystemAuditLog
          const mapped: SystemAuditLog[] = data.map((item: any) => ({
            id: item.id || `log-${Date.now()}-${Math.random()}`,
            timestamp: item.createdAt || new Date().toISOString(),
            actorName: item.actorName || (item.actorEmail ? item.actorEmail.split('@')[0] : 'Sistem'),
            actorEmail: item.actorEmail || 'system@platform.local',
            department: (item.department as AuditDepartment) || 'GENERAL',
            actionType: (item.action as AuditActionType) || 'UPDATE',
            resourceType: item.resourceType || 'Resource',
            resourceId: item.resourceId,
            resourceName: item.resourceName,
            summary: item.summary || `${item.action} on ${item.resourceType}`,
            details: item.details,
            stateChanges: typeof item.stateChanges === 'string' ? item.stateChanges : JSON.stringify(item.stateChanges),
            ipAddress: item.ipAddress,
            userAgent: item.userAgent,
          }));

          // Sync with local storage
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
          return mapped;
        }
      }
    } catch {
      // Backend not reached or offline, fallback to local storage
    }

    // Local Storage fallback
    const saved = localStorage.getItem(STORAGE_KEY);
    let logs: SystemAuditLog[] = [];
    if (saved) {
      try {
        logs = JSON.parse(saved);
      } catch {
        logs = [];
      }
    }

    // Apply filtering on local fallback
    if (params?.department && params.department !== 'ALL') {
      logs = logs.filter(l => l.department.toUpperCase() === params.department!.toUpperCase());
    }
    if (params?.action && params.action !== 'ALL') {
      logs = logs.filter(l => l.actionType.toUpperCase() === params.action!.toUpperCase());
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      logs = logs.filter(
        l =>
          l.actorEmail.toLowerCase().includes(q) ||
          l.actorName.toLowerCase().includes(q) ||
          l.summary.toLowerCase().includes(q) ||
          (l.resourceName && l.resourceName.toLowerCase().includes(q)) ||
          l.resourceType.toLowerCase().includes(q) ||
          (l.details && l.details.toLowerCase().includes(q))
      );
    }

    return logs;
  },

  async recordAuditLog(entry: {
    department: AuditDepartment;
    actionType: AuditActionType;
    resourceType: string;
    resourceId?: string;
    resourceName?: string;
    summary: string;
    details?: string;
    stateChanges?: string | object;
    actorName?: string;
    actorEmail?: string;
  }): Promise<SystemAuditLog> {
    const current = getCurrentUser();
    const actorName = entry.actorName || current.name;
    const actorEmail = entry.actorEmail || current.email;

    const logEntry: SystemAuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      actorName,
      actorEmail,
      department: entry.department,
      actionType: entry.actionType,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      resourceName: entry.resourceName,
      summary: entry.summary,
      details: entry.details,
      stateChanges:
        typeof entry.stateChanges === 'object'
          ? JSON.stringify(entry.stateChanges, null, 2)
          : entry.stateChanges,
      ipAddress: '127.0.0.1',
      userAgent: navigator.userAgent,
    };

    // 1. Save locally immediately for fast UI feedback
    const saved = localStorage.getItem(STORAGE_KEY);
    let logs: SystemAuditLog[] = [];
    if (saved) {
      try {
        logs = JSON.parse(saved);
      } catch {
        logs = [];
      }
    }
    logs.unshift(logEntry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(0, 500)));

    // 2. Also send to backend
    try {
      await fetchWithCsrf(API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actorName: logEntry.actorName,
          actorEmail: logEntry.actorEmail,
          department: logEntry.department,
          action: logEntry.actionType,
          resourceType: logEntry.resourceType,
          resourceId: logEntry.resourceId,
          resourceName: logEntry.resourceName,
          summary: logEntry.summary,
          stateChanges: logEntry.stateChanges,
          userAgent: logEntry.userAgent,
        }),
      });
    } catch {
      // ignore network errors
    }

    return logEntry;
  },
};
