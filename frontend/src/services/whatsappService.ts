import type {
  WhatsAppStatusResponse,
  WhatsAppQrResponse,
  WhatsAppSendTestResponse,
  WhatsAppSendManualRequest,
  WhatsAppSendManualResponse,
  NotificationRule,
  TriggerDefinition,
} from '../types/whatsapp';

import { fetchWithCsrf } from './apiClient';

const API_BASE = '/api/admin/whatsapp';

export const whatsappService = {
  async getStatus(): Promise<WhatsAppStatusResponse> {
    const res = await fetchWithCsrf(`${API_BASE}/status`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = (err.message && err.message !== 'No message available') ? err.message : (err.error || `HTTP ${res.status} ${res.statusText}`);
      throw new Error(msg || 'Failed to fetch WhatsApp status');
    }
    return res.json();
  },

  async getQr(): Promise<WhatsAppQrResponse> {
    const res = await fetchWithCsrf(`${API_BASE}/qr`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = (err.message && err.message !== 'No message available') ? err.message : (err.error || `HTTP ${res.status} ${res.statusText}`);
      throw new Error(msg || 'Failed to fetch WhatsApp QR code');
    }
    return res.json();
  },

  async sendManualMessage(request: WhatsAppSendManualRequest): Promise<WhatsAppSendManualResponse> {
    const res = await fetchWithCsrf(`${API_BASE}/send-manual`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = (err.message && err.message !== 'No message available') ? err.message : (err.error || `HTTP ${res.status} ${res.statusText}`);
      throw new Error(msg || 'Failed to send WhatsApp message');
    }
    return res.json();
  },

  async sendTestMessage(to: string, message: string): Promise<WhatsAppSendTestResponse> {
    return this.sendManualMessage({ to, message });
  },

  async getUsers(): Promise<Array<{ id: string; fullName: string; email: string; phone?: string }>> {
    try {
      const res = await fetchWithCsrf(`${API_BASE}/users`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch {
      // fallback
    }
    return [];
  },

  async getRoles(): Promise<Array<{ id: string; label: string }>> {
    try {
      const res = await fetchWithCsrf(`${API_BASE}/roles`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch {
      // fallback
    }
    return [
      { id: 'ADMIN', label: 'Admin' },
      { id: 'VOLUNTEER', label: 'Voluntar' },
    ];
  },

  async getActiveStands(): Promise<Array<{ id: string; locationName: string; eventName: string; eventDate: string; status: string; volunteersCount?: number }>> {
    try {
      const res = await fetchWithCsrf(`${API_BASE}/active-stands`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch {
      // fallback
    }
    return [];
  },

  async getGroups(): Promise<import('../types/whatsapp').WhatsAppGroupInfo[]> {
    const res = await fetchWithCsrf(`${API_BASE}/groups`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = (err.message && err.message !== 'No message available') ? err.message : (err.error || `HTTP ${res.status} ${res.statusText}`);
      throw new Error(msg || 'Failed to fetch WhatsApp groups');
    }
    return res.json();
  },

  async getTriggers(): Promise<TriggerDefinition[]> {
    const res = await fetchWithCsrf(`${API_BASE}/triggers`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = (err.message && err.message !== 'No message available') ? err.message : (err.error || `HTTP ${res.status} ${res.statusText}`);
      throw new Error(msg || 'Failed to fetch trigger catalog');
    }
    return res.json();
  },

  async getRules(category?: string): Promise<NotificationRule[]> {
    const url = category && category !== 'ALL' ? `${API_BASE}/rules?category=${encodeURIComponent(category)}` : `${API_BASE}/rules`;
    const res = await fetchWithCsrf(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = (err.message && err.message !== 'No message available') ? err.message : (err.error || `HTTP ${res.status} ${res.statusText}`);
      throw new Error(msg || 'Failed to fetch notification rules');
    }
    return res.json();
  },

  async createRule(rule: Partial<NotificationRule>): Promise<NotificationRule> {
    const res = await fetchWithCsrf(`${API_BASE}/rules`, {
      method: 'POST',
      body: JSON.stringify({ ...rule, channel: 'WHATSAPP' }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = (err.message && err.message !== 'No message available') ? err.message : (err.error || `HTTP ${res.status} ${res.statusText}`);
      throw new Error(msg || 'Failed to create notification rule');
    }
    return res.json();
  },

  async updateRule(id: string, rule: Partial<NotificationRule>): Promise<NotificationRule> {
    const res = await fetchWithCsrf(`${API_BASE}/rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...rule, channel: 'WHATSAPP' }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = (err.message && err.message !== 'No message available') ? err.message : (err.error || `HTTP ${res.status} ${res.statusText}`);
      throw new Error(msg || 'Failed to update notification rule');
    }
    return res.json();
  },

  async deleteRule(id: string): Promise<void> {
    const res = await fetchWithCsrf(`${API_BASE}/rules/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = (err.message && err.message !== 'No message available') ? err.message : (err.error || `HTTP ${res.status} ${res.statusText}`);
      throw new Error(msg || 'Failed to delete notification rule');
    }
  },

  async toggleRule(id: string, active: boolean): Promise<NotificationRule> {
    const res = await fetchWithCsrf(`${API_BASE}/rules/${id}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = (err.message && err.message !== 'No message available') ? err.message : (err.error || `HTTP ${res.status} ${res.statusText}`);
      throw new Error(msg || 'Failed to toggle notification rule');
    }
    return res.json();
  },
};
