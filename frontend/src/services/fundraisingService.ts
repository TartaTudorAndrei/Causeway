import type { FundraisingSponsor } from '../types/fundraising';
import { auditService } from './auditService';
import { fetchWithCsrf } from './apiClient';

const API_BASE = '/api/admin/fundraising';

export const fundraisingService = {
  async getSponsors(): Promise<FundraisingSponsor[]> {
    const res = await fetchWithCsrf(`${API_BASE}/sponsors`);
    if (!res.ok) throw new Error(`Failed to load sponsors: ${res.status}`);
    return res.json();
  },

  async createSponsor(sponsorData: Partial<FundraisingSponsor>): Promise<FundraisingSponsor> {
    const res = await fetchWithCsrf(`${API_BASE}/sponsors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sponsorData),
    });
    if (!res.ok) throw new Error(`Failed to create sponsor: ${res.status}`);
    const created: FundraisingSponsor = await res.json();

    await auditService.recordAuditLog({
      department: 'FUNDRAISING',
      actionType: 'CREATE',
      resourceType: 'Sponsor Lead',
      resourceId: created.id,
      resourceName: created.companyName,
      summary: `Sponsor nou adăugat: ${created.companyName} (Stadiu: ${created.status || 'PENDING'})`,
      details: created.notes || undefined,
      stateChanges: created,
    });

    return created;
  },

  async updateSponsor(id: string, sponsorData: Partial<FundraisingSponsor>): Promise<FundraisingSponsor> {
    const res = await fetchWithCsrf(`${API_BASE}/sponsors/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sponsorData),
    });
    if (!res.ok) throw new Error(`Failed to update sponsor: ${res.status}`);
    const updated: FundraisingSponsor = await res.json();

    await auditService.recordAuditLog({
      department: 'FUNDRAISING',
      actionType: 'UPDATE',
      resourceType: 'Sponsor Lead',
      resourceId: id,
      resourceName: updated.companyName || sponsorData.companyName || `Sponsor #${id.substring(0, 8)}`,
      summary: `Sponsor actualizat: ${updated.companyName || id} (Stadiu: ${updated.status || 'Modificat'})`,
      stateChanges: sponsorData,
    });

    return updated;
  },

  async deleteSponsor(id: string, companyName?: string): Promise<void> {
    const res = await fetchWithCsrf(`${API_BASE}/sponsors/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete sponsor: ${res.status}`);

    await auditService.recordAuditLog({
      department: 'FUNDRAISING',
      actionType: 'DELETE',
      resourceType: 'Sponsor Lead',
      resourceId: id,
      resourceName: companyName || `Sponsor #${id.substring(0, 8)}`,
      summary: `Sponsor șters din pipeline: ${companyName || id}`,
    });
  },
};
