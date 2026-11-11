import type { GoogleSyncStatus } from '../types/googleSync';
import { fetchWithCsrf } from './apiClient';

const API_BASE = '/api/admin/sync/google-sheets';

export const googleSyncService = {
  async getStatus(): Promise<GoogleSyncStatus> {
    const res = await fetchWithCsrf(`${API_BASE}/status`);

    if (!res.ok) {
      throw new Error('Eroare la preluarea statusului de sincronizare Google Sheets.');
    }

    return res.json();
  },

  async triggerSync(): Promise<GoogleSyncStatus> {
    const res = await fetchWithCsrf(`${API_BASE}/trigger`, {
      method: 'POST',
    });

    if (!res.ok) {
      let errorMsg = 'Eroare la pornirea sincronizării Google Sheets.';
      try {
        const data = await res.json();
        if (data.message) errorMsg = data.message;
      } catch {}
      throw new Error(errorMsg);
    }

    return res.json();
  },

  async updateSpreadsheetId(spreadsheetId: string): Promise<GoogleSyncStatus> {
    const res = await fetchWithCsrf(`${API_BASE}/spreadsheet-id`, {
      method: 'POST',
      body: JSON.stringify({ spreadsheetId }),
    });

    if (!res.ok) {
      throw new Error('Eroare la salvarea ID-ului Spreadsheet-ului.');
    }

    return res.json();
  },

  async updateFolderId(folderId: string): Promise<GoogleSyncStatus> {
    const res = await fetchWithCsrf(`${API_BASE}/folder-id`, {
      method: 'POST',
      body: JSON.stringify({ folderId }),
    });

    if (!res.ok) {
      throw new Error('Eroare la salvarea ID-ului Folder-ului Google Drive.');
    }

    return res.json();
  },
};
