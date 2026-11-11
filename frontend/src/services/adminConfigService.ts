import { fetchWithCsrf } from './apiClient';
import type {
  ConfigItem,
  ConfigStatus,
  ConfigSnapshot,
  TestConnectionResult,
  BatchUpdatePayload,
  RevealPayload,
  RollbackPayload,
} from '../types/adminConfig';

const BASE_URL = '/api/admin/config';

export const adminConfigService = {
  async getStatus(): Promise<ConfigStatus> {
    const res = await fetchWithCsrf(`${BASE_URL}/status`, { credentials: 'include' });
    if (!res.ok) throw new Error('Eroare la preluarea statusului configurării sistem.');
    return res.json();
  },

  async getAllConfigs(): Promise<ConfigItem[]> {
    const res = await fetchWithCsrf(BASE_URL, { credentials: 'include' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Eroare la încărcarea setărilor de sistem.');
    }
    return res.json();
  },

  async updateBatch(payload: BatchUpdatePayload): Promise<{ keysUpdated: number; restartRequired: boolean }> {
    const res = await fetchWithCsrf(`${BASE_URL}/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Eroare la salvarea setărilor de sistem.');
    }
    return res.json();
  },

  async revealSecret(payload: RevealPayload): Promise<string> {
    const res = await fetchWithCsrf(`${BASE_URL}/reveal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Eroare la dezvăluirea valorii secrete.');
    }
    const data = await res.json();
    return data.value;
  },

  async getSnapshots(): Promise<ConfigSnapshot[]> {
    const res = await fetchWithCsrf(`${BASE_URL}/snapshots`, { credentials: 'include' });
    if (!res.ok) throw new Error('Eroare la preluarea istoricului de snapshot-uri.');
    return res.json();
  },

  async createSnapshot(label?: string): Promise<void> {
    const res = await fetchWithCsrf(`${BASE_URL}/snapshots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ label }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Eroare la crearea snapshot-ului.');
    }
  },

  async rollbackSnapshot(id: string, payload: RollbackPayload): Promise<void> {
    const res = await fetchWithCsrf(`${BASE_URL}/snapshots/${id}/rollback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Eroare la restaurarea configurării.');
    }
  },

  async testStripe(secretKey?: string): Promise<TestConnectionResult> {
    const res = await fetchWithCsrf(`${BASE_URL}/test-stripe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ secretKey }),
    });
    return res.json();
  },

  async testEmail(params: { host?: string; port?: number; username?: string; password?: string; targetEmail?: string }): Promise<TestConnectionResult> {
    const res = await fetchWithCsrf(`${BASE_URL}/test-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        smtpHost: params.host,
        smtpPort: params.port,
        smtpUsername: params.username,
        smtpPassword: params.password,
        targetEmail: params.targetEmail,
      }),
    });
    return res.json();
  },

  async testGemini(apiKey?: string, model?: string): Promise<TestConnectionResult> {
    const res = await fetchWithCsrf(`${BASE_URL}/test-gemini`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ geminiApiKey: apiKey, geminiModel: model }),
    });
    return res.json();
  },

  async acknowledgeRestart(): Promise<void> {
    const res = await fetchWithCsrf('/api/admin/system/restart', {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Eroare la confirmarea repornirii.');
    }
  },
};
