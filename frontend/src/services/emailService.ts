import type { EmailTemplate, EmailLog } from '../types/email';
import { fetchWithCsrf } from './apiClient';
import { auditService } from './auditService';

const API_BASE = '/api/admin/emails';

export const emailService = {
  async getTemplates(department?: string): Promise<EmailTemplate[]> {
    const url = department && department !== 'ALL'
      ? `${API_BASE}/templates?department=${encodeURIComponent(department)}`
      : `${API_BASE}/templates`;
    const res = await fetchWithCsrf(url);
    if (!res.ok) throw new Error(`Failed to load email templates: ${res.status}`);
    const data = await res.json();
    return data.map((t: any) => ({
      ...t,
      blocks: typeof t.blocks === 'string' ? JSON.parse(t.blocks) : (t.blocks || []),
    }));
  },

  async getTemplateById(id: string): Promise<EmailTemplate> {
    const res = await fetchWithCsrf(`${API_BASE}/templates/${id}`);
    if (!res.ok) throw new Error(`Failed to load email template: ${res.status}`);
    const t = await res.json();
    return {
      ...t,
      blocks: typeof t.blocks === 'string' ? JSON.parse(t.blocks) : (t.blocks || []),
    };
  },

  async createTemplate(templateData: {
    name: string;
    department: string;
    subject: string;
    blocks: any[];
  }): Promise<EmailTemplate> {
    const res = await fetchWithCsrf(`${API_BASE}/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...templateData,
        blocks: JSON.stringify(templateData.blocks || []),
      }),
    });
    if (!res.ok) throw new Error(`Failed to create template: ${res.status}`);
    const created = await res.json();

    await auditService.recordAuditLog({
      department: (templateData.department || 'FUNDRAISING').toUpperCase() as any,
      actionType: 'CREATE',
      resourceType: 'Email Template',
      resourceId: created.id,
      resourceName: created.name,
      summary: `Șablon email creat: ${created.name} (${templateData.department})`,
      stateChanges: created,
    });

    return {
      ...created,
      blocks: typeof created.blocks === 'string' ? JSON.parse(created.blocks) : (created.blocks || []),
    };
  },

  async updateTemplate(id: string, templateData: {
    name: string;
    department?: string;
    subject: string;
    blocks: any[];
  }): Promise<EmailTemplate> {
    const res = await fetchWithCsrf(`${API_BASE}/templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...templateData,
        blocks: JSON.stringify(templateData.blocks || []),
      }),
    });
    if (!res.ok) throw new Error(`Failed to update template: ${res.status}`);
    const updated = await res.json();

    await auditService.recordAuditLog({
      department: (templateData.department || 'FUNDRAISING').toUpperCase() as any,
      actionType: 'UPDATE',
      resourceType: 'Email Template',
      resourceId: id,
      resourceName: updated.name,
      summary: `Șablon email actualizat: ${updated.name}`,
      stateChanges: updated,
    });

    return {
      ...updated,
      blocks: typeof updated.blocks === 'string' ? JSON.parse(updated.blocks) : (updated.blocks || []),
    };
  },

  async deleteTemplate(id: string, name?: string): Promise<void> {
    const res = await fetchWithCsrf(`${API_BASE}/templates/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Failed to delete template: ${res.status}`);

    await auditService.recordAuditLog({
      department: 'FUNDRAISING',
      actionType: 'DELETE',
      resourceType: 'Email Template',
      resourceId: id,
      resourceName: name || id,
      summary: `Șablon email șters: ${name || id}`,
    });
  },

  async copyTemplate(id: string, name?: string): Promise<EmailTemplate> {
    const res = await fetchWithCsrf(`${API_BASE}/templates/${id}/copy`, {
      method: 'POST',
      headers: name ? { 'Content-Type': 'application/json' } : undefined,
      body: name ? JSON.stringify({ name }) : undefined,
    });
    if (!res.ok) throw new Error(`Failed to copy template: ${res.status}`);
    const copied = await res.json();

    await auditService.recordAuditLog({
      department: (copied.department || 'FUNDRAISING').toUpperCase() as any,
      actionType: 'CREATE',
      resourceType: 'Email Template',
      resourceId: copied.id,
      resourceName: copied.name,
      summary: `Șablon email duplicat: ${copied.name}`,
      stateChanges: copied,
    });

    return {
      ...copied,
      blocks: typeof copied.blocks === 'string' ? JSON.parse(copied.blocks) : (copied.blocks || []),
    };
  },

  async dispatchEmail(payload: {
    templateId?: string;
    recipientEmail: string;
    recipientName?: string;
    subject: string;
    htmlContent: string;
    mergeData?: Record<string, any>;
  }): Promise<EmailLog> {
    const res = await fetchWithCsrf(`${API_BASE}/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || `Failed to dispatch email: ${res.status}`);
    }
    const log = await res.json();

    await auditService.recordAuditLog({
      department: 'FUNDRAISING',
      actionType: 'SEND',
      resourceType: 'Email Dispatch',
      resourceId: log.id,
      resourceName: payload.recipientEmail,
      summary: `Email trimis direct către: ${payload.recipientEmail} (Subiect: ${payload.subject})`,
    });

    return log;
  },

  async recordLog(payload: {
    templateId?: string;
    recipientEmail?: string;
    recipientName?: string;
    subject?: string;
    dispatchMethod: string;
    status?: string;
  }): Promise<EmailLog> {
    const res = await fetchWithCsrf(`${API_BASE}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Failed to record email log: ${res.status}`);
    return res.json();
  },

  async getLogs(limit: number = 50): Promise<EmailLog[]> {
    const res = await fetchWithCsrf(`${API_BASE}/logs?limit=${limit}`);
    if (!res.ok) throw new Error(`Failed to load email logs: ${res.status}`);
    return res.json();
  },

  async uploadImage(file: File): Promise<{ url: string; fileName: string; size: number }> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetchWithCsrf(`${API_BASE}/upload-image`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      let message = `Upload failed (${res.status})`;
      try {
        const data = await res.json();
        if (data && data.message) message = data.message;
      } catch (_) {}
      throw new Error(message);
    }

    return res.json();
  },
};

