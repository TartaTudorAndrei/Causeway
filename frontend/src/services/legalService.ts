import type { 
  ContractTemplate, 
  GeneratedContract, 
  LegalStats, 
  GoogleDocImportResponse 
} from '../types/legal';
import { auditService } from './auditService';
import { fetchWithCsrf } from './apiClient';

const API_BASE = '/api/admin/legal';

export const legalService = {
  // ================= TEMPLATES =================
  async getTemplates(): Promise<ContractTemplate[]> {
    const res = await fetchWithCsrf(`${API_BASE}/templates`);
    if (!res.ok) throw new Error(`Failed to load templates: ${res.status}`);
    const data: ContractTemplate[] = await res.json();
    return data.map(t => ({
      ...t,
      fieldsSchema: typeof t.fieldsSchema === 'string' ? JSON.parse(t.fieldsSchema || '[]') : t.fieldsSchema
    }));
  },

  async getTemplateById(id: string): Promise<ContractTemplate> {
    const res = await fetchWithCsrf(`${API_BASE}/templates/${id}`);
    if (!res.ok) throw new Error(`Failed to load template: ${res.status}`);
    const data: ContractTemplate = await res.json();
    return {
      ...data,
      fieldsSchema: typeof data.fieldsSchema === 'string' ? JSON.parse(data.fieldsSchema || '[]') : data.fieldsSchema
    };
  },

  async createTemplate(template: Partial<ContractTemplate>): Promise<ContractTemplate> {
    const payload = {
      ...template,
      fieldsSchema: typeof template.fieldsSchema === 'object' ? JSON.stringify(template.fieldsSchema) : template.fieldsSchema
    };
    const res = await fetchWithCsrf(`${API_BASE}/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || `Failed to create template: ${res.status}`);
    }
    const created: ContractTemplate = await res.json();

    await auditService.recordAuditLog({
      department: 'LEGAL',
      actionType: 'CREATE',
      resourceType: 'ContractTemplate',
      resourceId: created.id,
      resourceName: created.title,
      summary: `Șablon de contract creat: ${created.title}`,
      details: `Categorie: ${created.category}`,
      stateChanges: created
    }).catch(() => {});

    return {
      ...created,
      fieldsSchema: typeof created.fieldsSchema === 'string' ? JSON.parse(created.fieldsSchema || '[]') : created.fieldsSchema
    };
  },

  async updateTemplate(id: string, template: Partial<ContractTemplate>): Promise<ContractTemplate> {
    const payload = {
      ...template,
      fieldsSchema: typeof template.fieldsSchema === 'object' ? JSON.stringify(template.fieldsSchema) : template.fieldsSchema
    };
    const res = await fetchWithCsrf(`${API_BASE}/templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || `Failed to update template: ${res.status}`);
    }
    const updated: ContractTemplate = await res.json();

    await auditService.recordAuditLog({
      department: 'LEGAL',
      actionType: 'UPDATE',
      resourceType: 'ContractTemplate',
      resourceId: id,
      resourceName: updated.title,
      summary: `Șablon de contract actualizat: ${updated.title}`,
      details: `Categorie: ${updated.category}`,
      stateChanges: updated
    }).catch(() => {});

    return {
      ...updated,
      fieldsSchema: typeof updated.fieldsSchema === 'string' ? JSON.parse(updated.fieldsSchema || '[]') : updated.fieldsSchema
    };
  },

  async deleteTemplate(id: string): Promise<void> {
    const res = await fetchWithCsrf(`${API_BASE}/templates/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete template: ${res.status}`);

    await auditService.recordAuditLog({
      department: 'LEGAL',
      actionType: 'DELETE',
      resourceType: 'ContractTemplate',
      resourceId: id,
      resourceName: id,
      summary: `Șablon de contract șters: ${id}`,
      details: '',
      stateChanges: undefined
    }).catch(() => {});
  },

  async importGoogleDoc(params: { url?: string; rawText?: string }): Promise<GoogleDocImportResponse> {
    const res = await fetchWithCsrf(`${API_BASE}/templates/import-doc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || `Failed to import Google Doc: ${res.status}`);
    }
    return res.json();
  },

  async detectFields(content: string): Promise<string[]> {
    const res = await fetchWithCsrf(`${API_BASE}/templates/detect-fields`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    if (!res.ok) throw new Error(`Failed to detect fields: ${res.status}`);
    return res.json();
  },

  // ================= CONTRACTS =================
  async getContracts(): Promise<GeneratedContract[]> {
    const res = await fetchWithCsrf(`${API_BASE}/contracts`);
    if (!res.ok) throw new Error(`Failed to load contracts: ${res.status}`);
    const data: GeneratedContract[] = await res.json();
    return data.map(c => ({
      ...c,
      fieldValues: typeof c.fieldValues === 'string' ? JSON.parse(c.fieldValues || '{}') : c.fieldValues
    }));
  },

  async getContractById(id: string): Promise<GeneratedContract> {
    const res = await fetchWithCsrf(`${API_BASE}/contracts/${id}`);
    if (!res.ok) throw new Error(`Failed to load contract: ${res.status}`);
    const data: GeneratedContract = await res.json();
    return {
      ...data,
      fieldValues: typeof data.fieldValues === 'string' ? JSON.parse(data.fieldValues || '{}') : data.fieldValues
    };
  },

  async generateContract(payload: {
    templateId?: string;
    contractNumber?: string;
    title: string;
    partyAName?: string;
    partyBName: string;
    partyBEmail?: string;
    fieldValues: Record<string, any>;
    customContent?: string;
    validFrom?: string;
    validUntil?: string;
    notes?: string;
    status?: string;
  }): Promise<GeneratedContract> {
    const res = await fetchWithCsrf(`${API_BASE}/contracts/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || `Failed to generate contract: ${res.status}`);
    }
    const created: GeneratedContract = await res.json();

    await auditService.recordAuditLog({
      department: 'LEGAL',
      actionType: 'CREATE',
      resourceType: 'GeneratedContract',
      resourceId: created.id,
      resourceName: created.contractNumber,
      summary: `Contract generat: ${created.contractNumber} (${created.partyBName})`,
      details: `Titlu: ${created.title}, Partener: ${created.partyBName}`,
      stateChanges: created
    }).catch(() => {});

    return {
      ...created,
      fieldValues: typeof created.fieldValues === 'string' ? JSON.parse(created.fieldValues || '{}') : created.fieldValues
    };
  },

  async updateContract(id: string, contract: Partial<GeneratedContract>): Promise<GeneratedContract> {
    const payload = {
      ...contract,
      fieldValues: typeof contract.fieldValues === 'object' ? JSON.stringify(contract.fieldValues) : contract.fieldValues
    };
    const res = await fetchWithCsrf(`${API_BASE}/contracts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || `Failed to update contract: ${res.status}`);
    }
    const updated: GeneratedContract = await res.json();

    await auditService.recordAuditLog({
      department: 'LEGAL',
      actionType: 'UPDATE',
      resourceType: 'GeneratedContract',
      resourceId: id,
      resourceName: updated.contractNumber,
      summary: `Contract actualizat: ${updated.contractNumber} (${updated.status})`,
      details: `Stare: ${updated.status}`,
      stateChanges: updated
    }).catch(() => {});

    return {
      ...updated,
      fieldValues: typeof updated.fieldValues === 'string' ? JSON.parse(updated.fieldValues || '{}') : updated.fieldValues
    };
  },

  async deleteContract(id: string): Promise<void> {
    const res = await fetchWithCsrf(`${API_BASE}/contracts/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete contract: ${res.status}`);

    await auditService.recordAuditLog({
      department: 'LEGAL',
      actionType: 'DELETE',
      resourceType: 'GeneratedContract',
      resourceId: id,
      resourceName: id,
      summary: `Contract șters: ${id}`,
      details: '',
      stateChanges: undefined
    }).catch(() => {});
  },

  async getStats(): Promise<LegalStats> {
    const res = await fetchWithCsrf(`${API_BASE}/stats`);
    if (!res.ok) throw new Error(`Failed to load stats: ${res.status}`);
    return res.json();
  },

  async getGoogleStatus(): Promise<{ connected: boolean; clientEmail?: string; projectId?: string; message: string }> {
    try {
      const res = await fetchWithCsrf(`${API_BASE}/google-status`);
      if (!res.ok) return { connected: false, message: 'Status endpoint unreachable' };
      return res.json();
    } catch {
      return { connected: false, message: 'Google API status check failed' };
    }
  },

  getContractPdfUrl(id: string): string {
    return `${API_BASE}/contracts/${id}/pdf`;
  },

  async downloadContractPdf(id: string, filename?: string): Promise<void> {
    const url = this.getContractPdfUrl(id);
    const res = await fetchWithCsrf(url);
    if (!res.ok) {
      throw new Error(`Failed to download PDF: ${res.status}`);
    }
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename || `contract-${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  }
};
