import type {
  UnifiedNotificationRule,
  UnifiedTriggerDefinition,
  NotificationStatusSummary,
  NotificationChannel,
} from '../types/notifications';
import { UNIFIED_TRIGGERS } from '../types/notifications';
import { whatsappService } from './whatsappService';
import { pwaNotificationService } from './pwaNotificationService';
import { fetchWithCsrf } from './apiClient';

const API_BASE = '/api/admin/notifications';

export const notificationService = {
  async getRules(channel?: string, category?: string): Promise<UnifiedNotificationRule[]> {
    const params = new URLSearchParams();
    if (channel && channel !== 'ALL') params.set('channel', channel);
    if (category && category !== 'ALL') params.set('category', category);
    const query = params.toString() ? `?${params.toString()}` : '';

    try {
      const res = await fetchWithCsrf(`${API_BASE}/rules${query}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch {
      // Fallback to legacy service aggregation
    }

    try {
      const [waRules, pwaRules] = await Promise.all([
        whatsappService.getRules(category).catch(() => []),
        pwaNotificationService.getRules(category).catch(() => []),
      ]);
      const mappedWa: UnifiedNotificationRule[] = (waRules || []).map(r => ({
        ...r,
        channel: 'WHATSAPP' as NotificationChannel,
      }));
      const mappedPwa: UnifiedNotificationRule[] = (pwaRules || []).map(r => ({
        ...r,
        channel: 'PWA' as NotificationChannel,
        customRecipientJid: r.customRecipient || r.customRecipientJid,
      }));
      let combined = [...mappedWa, ...mappedPwa];
      if (channel && channel !== 'ALL') {
        combined = combined.filter(r => r.channel === channel);
      }
      return combined;
    } catch {
      return [];
    }
  },

  async createRule(rule: Partial<UnifiedNotificationRule>): Promise<UnifiedNotificationRule> {
    const channel = rule.channel || 'WHATSAPP';
    const payload = {
      ...rule,
      channel,
      customRecipientJid: rule.customRecipient || rule.customRecipientJid,
      customRecipient: rule.customRecipient || rule.customRecipientJid,
    };

    try {
      const res = await fetchWithCsrf(`${API_BASE}/rules`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return res.json();
      }
    } catch {
      // ignore
    }

    if (channel === 'WHATSAPP') {
      const wa = await whatsappService.createRule(payload as any);
      return { ...wa, channel: 'WHATSAPP' };
    } else {
      const pwa = await pwaNotificationService.createRule(payload as any);
      return { ...pwa, channel: 'PWA' };
    }
  },

  async updateRule(id: string, rule: Partial<UnifiedNotificationRule>): Promise<UnifiedNotificationRule> {
    const channel = rule.channel || 'WHATSAPP';
    const payload = {
      ...rule,
      channel,
      customRecipientJid: rule.customRecipient || rule.customRecipientJid,
      customRecipient: rule.customRecipient || rule.customRecipientJid,
    };

    try {
      const res = await fetchWithCsrf(`${API_BASE}/rules/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return res.json();
      }
    } catch {
      // ignore
    }

    if (channel === 'WHATSAPP') {
      const wa = await whatsappService.updateRule(id, payload as any);
      return { ...wa, channel: 'WHATSAPP' };
    } else {
      const pwa = await pwaNotificationService.updateRule(id, payload as any);
      return { ...pwa, channel: 'PWA' };
    }
  },

  async deleteRule(id: string, channel: NotificationChannel = 'WHATSAPP'): Promise<void> {
    try {
      const res = await fetchWithCsrf(`${API_BASE}/rules/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) return;
    } catch {
      // ignore
    }

    if (channel === 'WHATSAPP') {
      await whatsappService.deleteRule(id);
    } else {
      await pwaNotificationService.deleteRule(id);
    }
  },

  async toggleRule(id: string, active: boolean, channel: NotificationChannel = 'WHATSAPP'): Promise<UnifiedNotificationRule> {
    try {
      const res = await fetchWithCsrf(`${API_BASE}/rules/${id}/toggle`, {
        method: 'PATCH',
        body: JSON.stringify({ active }),
      });
      if (res.ok) {
        return res.json();
      }
    } catch {
      // ignore
    }

    if (channel === 'WHATSAPP') {
      const wa = await whatsappService.toggleRule(id, active);
      return { ...wa, channel: 'WHATSAPP' };
    } else {
      const pwa = await pwaNotificationService.toggleRule(id, active);
      return { ...pwa, channel: 'PWA' };
    }
  },

  async getTriggers(): Promise<UnifiedTriggerDefinition[]> {
    try {
      const res = await fetchWithCsrf(`${API_BASE}/triggers`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch {
      // ignore
    }
    return UNIFIED_TRIGGERS;
  },

  async getStatusSummary(): Promise<NotificationStatusSummary> {
    const [waStatusRes, pwaStatusRes] = await Promise.all([
      whatsappService.getStatus().catch(() => ({ status: 'DISCONNECTED' as const })),
      pwaNotificationService.getStatus().catch(() => ({ status: 'NOT_CONFIGURED' as const, activeSubscribersCount: 0 })),
    ]);

    return {
      whatsappStatus: waStatusRes.status,
      pwaStatus: pwaStatusRes.status,
      pwaSubscribersCount: pwaStatusRes.activeSubscribersCount || 0,
    };
  },

  async getUsers(): Promise<Array<{ id: string; fullName: string; email: string; phone?: string }>> {
    try {
      const res = await fetchWithCsrf(`${API_BASE}/users`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch {
      // ignore
    }
    return whatsappService.getUsers();
  },

  async getRoles(): Promise<Array<{ id: string; label: string }>> {
    try {
      const res = await fetchWithCsrf(`${API_BASE}/roles`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch {
      // ignore
    }
    return whatsappService.getRoles();
  },

  async getActiveStands(): Promise<Array<{ id: string; locationName: string; eventName: string; eventDate: string; status: string; volunteersCount?: number }>> {
    try {
      const res = await fetchWithCsrf(`${API_BASE}/active-stands`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch {
      // ignore
    }
    return whatsappService.getActiveStands();
  },

  async getWhatsAppGroups(): Promise<import('../types/whatsapp').WhatsAppGroupInfo[]> {
    return whatsappService.getGroups();
  },

  async sendWhatsAppManual(req: import('../types/whatsapp').WhatsAppSendManualRequest) {
    return whatsappService.sendManualMessage(req);
  },

  async sendPwaTest(req: import('../types/pwa').PwaSendTestRequest) {
    return pwaNotificationService.sendTestPush(req);
  },
};
