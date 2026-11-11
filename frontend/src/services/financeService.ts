import type {
  FinanceExpense,
  FinanceOnlineDonation,
  FinanceStand,
  FinanceSponsorship,
  FinanceOtherIncome,
  FinancialStats,
  ScannedExpenseData,
} from '../types/finance';
import { auditService } from './auditService';
import { fetchWithCsrf } from './apiClient';

const API_BASE = '/api/admin/finances';

export const financeService = {
  // 1. Expenses
  async scanReceipt(file: File, categories?: string[]): Promise<ScannedExpenseData> {
    const formData = new FormData();
    formData.append('file', file);
    if (categories && categories.length > 0) {
      categories.forEach(cat => {
        if (cat && cat.trim()) {
          formData.append('categories', cat.trim());
        }
      });
    }

    const res = await fetchWithCsrf(`${API_BASE}/expenses/scan-receipt`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      let errMsg = `Scan failed: ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson.message) errMsg = errJson.message;
      } catch {
        const errText = await res.text().catch(() => '');
        if (errText) errMsg = errText;
      }
      throw new Error(errMsg);
    }
    return res.json();
  },

  async scanDriveReceipt(fileUrlOrId: string, categories?: string[]): Promise<ScannedExpenseData> {
    const res = await fetchWithCsrf(`${API_BASE}/expenses/scan-drive-receipt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileUrlOrId, categories }),
    });
    if (!res.ok) {
      let errMsg = `Google Drive scan failed: ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson.message) errMsg = errJson.message;
      } catch {
        const errText = await res.text().catch(() => '');
        if (errText) errMsg = errText;
      }
      throw new Error(errMsg);
    }
    return res.json();
  },

  async getDriveReceiptFiles(): Promise<import('../types/finance').DriveReceiptFile[]> {
    const res = await fetchWithCsrf(`${API_BASE}/expenses/drive-receipts`);
    if (!res.ok) return [];
    return res.json();
  },

  async getExpenses(): Promise<FinanceExpense[]> {
    const res = await fetchWithCsrf(`${API_BASE}/expenses`, {
      cacheKey: 'finance:expenses',
    } as any);
    if (!res.ok) throw new Error(`Failed to load expenses: ${res.status}`);
    return res.json();
  },

  async addExpense(expense: Omit<FinanceExpense, 'id' | 'createdAt'>): Promise<FinanceExpense> {
    const res = await fetchWithCsrf(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense),
      domain: 'finance',
      isOfflineCapable: true,
    } as any);
    if (!res.ok) throw new Error(`Failed to add expense: ${res.status}`);
    const created: FinanceExpense = await res.json();

    await auditService.recordAuditLog({
      department: 'FINANCE',
      actionType: 'CREATE',
      resourceType: 'Expense',
      resourceId: created.id || 'offline-pending',
      resourceName: created.name || created.description || created.category,
      summary: `Cheltuială nouă înregistrată: ${created.name || created.description || created.category} (${created.amount} ${created.currency || 'RON'})`,
      details: `Categorie: ${created.category}, Metodă plată: ${created.paymentMethod}, Departament: ${created.campaignDepartment || 'General'}`,
      stateChanges: created,
    });

    return created;
  },

  async updateExpense(id: string, expense: Partial<FinanceExpense>): Promise<void> {
    const res = await fetchWithCsrf(`${API_BASE}/expenses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense),
      domain: 'finance',
      isOfflineCapable: true,
    } as any);
    if (!res.ok) throw new Error(`Failed to update expense: ${res.status}`);

    await auditService.recordAuditLog({
      department: 'FINANCE',
      actionType: 'UPDATE',
      resourceType: 'Expense',
      resourceId: id,
      resourceName: expense.name || expense.description || expense.category || `Expense #${id.substring(0, 8)}`,
      summary: `Cheltuială actualizată: ${expense.name || expense.description || expense.category || id} (${expense.amount ? `${expense.amount} RON` : ''})`,
      details: `Modificări efectuate pe cheltuiala ID ${id}`,
      stateChanges: expense,
    });
  },

  async deleteExpense(id: string, nameOrDesc?: string): Promise<void> {
    const res = await fetchWithCsrf(`${API_BASE}/expenses/${id}`, {
      method: 'DELETE',
      domain: 'finance',
      isOfflineCapable: true,
    } as any);
    if (!res.ok) throw new Error(`Failed to delete expense: ${res.status}`);

    await auditService.recordAuditLog({
      department: 'FINANCE',
      actionType: 'DELETE',
      resourceType: 'Expense',
      resourceId: id,
      resourceName: nameOrDesc || `Expense #${id.substring(0, 8)}`,
      summary: `Cheltuială ștearsă: ${nameOrDesc || id}`,
      details: `ID cheltuială: ${id}`,
    });
  },

  // 2. Online Donations
  async getOnlineDonations(): Promise<FinanceOnlineDonation[]> {
    const res = await fetchWithCsrf(`${API_BASE}/online-donations`, {
      cacheKey: 'finance:online-donations',
    } as any);
    if (!res.ok) throw new Error(`Failed to load online donations: ${res.status}`);
    return res.json();
  },

  // 3. Stands
  async getStands(): Promise<FinanceStand[]> {
    const res = await fetchWithCsrf(`${API_BASE}/stands`, {
      cacheKey: 'finance:stands',
    } as any);
    if (!res.ok) throw new Error(`Failed to load stands: ${res.status}`);
    return res.json();
  },

  async submitStandEoD(stand: Omit<FinanceStand, 'id' | 'createdAt'>): Promise<FinanceStand> {
    const res = await fetchWithCsrf(`${API_BASE}/stands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stand),
      domain: 'finance',
      isOfflineCapable: true,
    } as any);
    if (!res.ok) throw new Error(`Failed to submit stand EoD: ${res.status}`);
    const created: FinanceStand = await res.json();

    const totalCollected = (created.cashCollected || 0) + (created.posCardCollected || 0);

    try {
      await auditService.recordAuditLog({
        department: 'FINANCE',
        actionType: 'SUBMIT',
        resourceType: 'Stand Financial EoD',
        resourceId: created.id || 'offline-pending',
        resourceName: created.standLocation || 'Stand',
        summary: `Închidere financiară stand (EoD): ${created.standLocation || 'Stand'} (Total încasat: ${totalCollected} RON - Numerar: ${created.cashCollected || 0} RON, POS: ${created.posCardCollected || 0} RON)`,
        details: `Data: ${created.eventDate || ''}, Responsabil: ${created.financeResponsibleName || ''}`,
        stateChanges: created,
      });
    } catch (auditErr) {
      console.warn('Failed to record audit log for stand submit:', auditErr);
    }

    return created;
  },

  async updateStand(id: string, stand: Partial<FinanceStand>): Promise<void> {
    const res = await fetchWithCsrf(`${API_BASE}/stands/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stand),
    });
    if (!res.ok) throw new Error(`Failed to update stand: ${res.status}`);

    try {
      await auditService.recordAuditLog({
        department: 'FINANCE',
        actionType: 'UPDATE',
        resourceType: 'Stand Financial EoD',
        resourceId: id,
        resourceName: stand.standLocation || `Stand #${id.substring(0, 8)}`,
        summary: `Înregistrare stand financiar actualizată: ${stand.standLocation || id}`,
        stateChanges: stand,
      });
    } catch (auditErr) {
      console.warn('Failed to record audit log for stand update:', auditErr);
    }
  },

  async deleteStand(id: string, location?: string): Promise<void> {
    const res = await fetchWithCsrf(`${API_BASE}/stands/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete stand: ${res.status}`);

    await auditService.recordAuditLog({
      department: 'FINANCE',
      actionType: 'DELETE',
      resourceType: 'Stand Financial EoD',
      resourceId: id,
      resourceName: location || `Stand #${id.substring(0, 8)}`,
      summary: `Înregistrare financiară stand ștearsă: ${location || id}`,
    });
  },

  // 4. Sponsorships
  async getSponsorships(): Promise<FinanceSponsorship[]> {
    const res = await fetchWithCsrf(`${API_BASE}/sponsorships`);
    if (!res.ok) throw new Error(`Failed to load sponsorships: ${res.status}`);
    return res.json();
  },

  async updateSponsorship(id: string, sponsorship: Partial<FinanceSponsorship>): Promise<void> {
    const res = await fetchWithCsrf(`${API_BASE}/sponsorships/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sponsorship),
    });
    if (!res.ok) throw new Error(`Failed to update sponsorship: ${res.status}`);

    await auditService.recordAuditLog({
      department: 'FINANCE',
      actionType: 'UPDATE',
      resourceType: 'Sponsorship',
      resourceId: id,
      resourceName: sponsorship.sponsorName || `Sponsor #${id.substring(0, 8)}`,
      summary: `Sponsorizare actualizată: ${sponsorship.sponsorName || id} (Sumă: ${sponsorship.agreedAmount || 0} RON)`,
      stateChanges: sponsorship,
    });
  },

  async deleteSponsorship(id: string, sponsorName?: string): Promise<void> {
    const res = await fetchWithCsrf(`${API_BASE}/sponsorships/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete sponsorship: ${res.status}`);

    await auditService.recordAuditLog({
      department: 'FINANCE',
      actionType: 'DELETE',
      resourceType: 'Sponsorship',
      resourceId: id,
      resourceName: sponsorName || `Sponsor #${id.substring(0, 8)}`,
      summary: `Sponsorizare ștearsă: ${sponsorName || id}`,
    });
  },

  // 5. Other Incomes
  async getOtherIncomes(): Promise<FinanceOtherIncome[]> {
    const res = await fetchWithCsrf(`${API_BASE}/other-incomes`);
    if (!res.ok) throw new Error(`Failed to load other incomes: ${res.status}`);
    return res.json();
  },

  async addOtherIncome(income: Omit<FinanceOtherIncome, 'id' | 'createdAt'>): Promise<FinanceOtherIncome> {
    const res = await fetchWithCsrf(`${API_BASE}/other-incomes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(income),
    });
    if (!res.ok) throw new Error(`Failed to add other income: ${res.status}`);
    const created: FinanceOtherIncome = await res.json();

    await auditService.recordAuditLog({
      department: 'FINANCE',
      actionType: 'CREATE',
      resourceType: 'Other Income',
      resourceId: created.id,
      resourceName: created.sourcePayer,
      summary: `Venit adițional înregistrat: ${created.sourcePayer} (${created.amount} RON)`,
      details: created.description,
      stateChanges: created,
    });

    return created;
  },

  async updateOtherIncome(id: string, income: Partial<FinanceOtherIncome>): Promise<void> {
    const res = await fetchWithCsrf(`${API_BASE}/other-incomes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(income),
    });
    if (!res.ok) throw new Error(`Failed to update other income: ${res.status}`);

    await auditService.recordAuditLog({
      department: 'FINANCE',
      actionType: 'UPDATE',
      resourceType: 'Other Income',
      resourceId: id,
      resourceName: income.sourcePayer || `Income #${id.substring(0, 8)}`,
      summary: `Venit adițional actualizat: ${income.sourcePayer || id}`,
      stateChanges: income,
    });
  },

  async deleteOtherIncome(id: string, sourcePayer?: string): Promise<void> {
    const res = await fetchWithCsrf(`${API_BASE}/other-incomes/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete other income: ${res.status}`);

    await auditService.recordAuditLog({
      department: 'FINANCE',
      actionType: 'DELETE',
      resourceType: 'Other Income',
      resourceId: id,
      resourceName: sourcePayer || `Income #${id.substring(0, 8)}`,
      summary: `Venit adițional șters: ${sourcePayer || id}`,
    });
  },

  // 6. Stats
  async getStats(): Promise<FinancialStats> {
    const res = await fetchWithCsrf(`${API_BASE}/stats`);
    if (!res.ok) throw new Error(`Failed to load stats: ${res.status}`);
    return res.json();
  },
};
