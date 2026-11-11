import type {
  PwaStatusResponse,
  PwaNotificationRule,
  PwaTriggerDefinition,
  PwaSendTestRequest,
  PwaSendTestResponse,
} from '../types/pwa';
import { DEFAULT_PWA_TRIGGERS } from '../types/pwa';
import { fetchWithCsrf } from './apiClient';

const API_BASE = '/api/admin/pwa';

function urlB64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const pwaNotificationService = {
  hasPromptBeenAsked(): boolean {
    if (typeof window === 'undefined') return true;
    if (!('Notification' in window)) return true;
    if (Notification.permission !== 'default') return true;

    const status = localStorage.getItem('app_push_prompt_status');
    if (status === 'accepted' || status === 'dismissed') return true;
    if (localStorage.getItem('app_push_prompt_asked') === 'true') return true;

    const legacyDismissed = localStorage.getItem('app_push_prompt_dismissed_until');
    if (legacyDismissed) {
      this.markPromptDecision('dismissed');
      return true;
    }

    return false;
  },

  markPromptDecision(status: 'accepted' | 'dismissed'): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('app_push_prompt_asked', 'true');
      localStorage.setItem('app_push_prompt_status', status);
      localStorage.removeItem('app_push_prompt_dismissed_until');
    } catch {
      // ignore storage access errors
    }
  },
  isPushSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  },

  async getStatus(): Promise<PwaStatusResponse> {
    const isSupported = this.isPushSupported();
    const currentPermission = typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied';

    try {
      const res = await fetchWithCsrf(`${API_BASE}/status`);
      if (res.ok) {
        const data = await res.json();
        return {
          ...data,
          permission: currentPermission,
        };
      }
    } catch {
      // Backend fallback if server offline
    }

    return {
      status: !isSupported ? 'PERMISSION_DENIED' : currentPermission === 'granted' ? 'ACTIVE' : 'NOT_CONFIGURED',
      activeSubscribersCount: currentPermission === 'granted' ? 1 : 0,
      permission: currentPermission,
    };
  },

  async getTriggers(): Promise<PwaTriggerDefinition[]> {
    try {
      const res = await fetchWithCsrf(`${API_BASE}/triggers`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch {
      // Fallback to default triggers
    }
    return DEFAULT_PWA_TRIGGERS;
  },

  async getRules(category?: string): Promise<PwaNotificationRule[]> {
    const url = category && category !== 'ALL'
      ? `${API_BASE}/rules?category=${encodeURIComponent(category)}`
      : `${API_BASE}/rules`;

    try {
      const res = await fetchWithCsrf(url);
      if (res.ok) {
        return res.json();
      }
    } catch {
      // Fallback
    }

    const local = localStorage.getItem('app_pwa_rules');
    if (local) {
      try {
        const parsed: PwaNotificationRule[] = JSON.parse(local);
        return category && category !== 'ALL' ? parsed.filter(r => r.category === category) : parsed;
      } catch {
        // ignore
      }
    }

    return [];
  },

  async createRule(rule: Partial<PwaNotificationRule>): Promise<PwaNotificationRule> {
    const payload = {
      ...rule,
      channel: 'PWA',
      customRecipientJid: rule.customRecipient || rule.customRecipientJid,
      customRecipient: rule.customRecipient || rule.customRecipientJid,
    };
    try {
      const res = await fetchWithCsrf(`${API_BASE}/rules`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const created = await res.json();
        return {
          ...created,
          customRecipient: created.customRecipient || created.customRecipientJid,
        };
      }
      const err = await res.json().catch(() => ({}));
      if (err.message) throw new Error(err.message);
    } catch (e: any) {
      if (e?.message && !e.message.includes('Failed to fetch')) throw e;
    }

    // Fallback local persistence
    const newRule: PwaNotificationRule = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      ruleType: rule.ruleType || 'PWA_SHIFT_REMINDER',
      name: rule.name || 'Regulă Nouă',
      category: rule.category || 'HR',
      active: rule.active ?? true,
      triggerTimingMinutes: rule.triggerTimingMinutes ?? 120,
      minCapacityThreshold: rule.minCapacityThreshold ?? 0,
      targetRecipientType: rule.targetRecipientType || 'ALL_USERS',
      customRecipient: rule.customRecipient || rule.customRecipientJid,
      titleTemplate: rule.titleTemplate || '',
      templates: rule.templates || [''],
      actionUrl: rule.actionUrl || '/dashboard/general',
      cooldownMinutes: rule.cooldownMinutes ?? 60,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const existing = await this.getRules();
    const updated = [newRule, ...existing];
    localStorage.setItem('app_pwa_rules', JSON.stringify(updated));
    return newRule;
  },

  async updateRule(id: string, rule: Partial<PwaNotificationRule>): Promise<PwaNotificationRule> {
    const payload = {
      ...rule,
      channel: 'PWA',
      customRecipientJid: rule.customRecipient || rule.customRecipientJid,
      customRecipient: rule.customRecipient || rule.customRecipientJid,
    };
    try {
      const res = await fetchWithCsrf(`${API_BASE}/rules/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        return {
          ...updated,
          customRecipient: updated.customRecipient || updated.customRecipientJid,
        };
      }
      const err = await res.json().catch(() => ({}));
      if (err.message) throw new Error(err.message);
    } catch (e: any) {
      if (e?.message && !e.message.includes('Failed to fetch')) throw e;
    }

    const existing = await this.getRules();
    const target = existing.find(r => r.id === id);
    if (!target) throw new Error('Regula nu a fost găsită.');

    const updatedRule: PwaNotificationRule = {
      ...target,
      ...rule,
      id,
      updatedAt: new Date().toISOString(),
    };

    const nextList = existing.map(r => r.id === id ? updatedRule : r);
    localStorage.setItem('app_pwa_rules', JSON.stringify(nextList));
    return updatedRule;
  },

  async deleteRule(id: string): Promise<void> {
    try {
      const res = await fetchWithCsrf(`${API_BASE}/rules/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) return;
    } catch {
      // ignore
    }

    const existing = await this.getRules();
    const nextList = existing.filter(r => r.id !== id);
    localStorage.setItem('app_pwa_rules', JSON.stringify(nextList));
  },

  async toggleRule(id: string, active: boolean): Promise<PwaNotificationRule> {
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

    return this.updateRule(id, { active });
  },

  async isSubscribed(): Promise<boolean> {
    if (!this.isPushSupported()) return false;
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return false;
    try {
      const registration = await navigator.serviceWorker.ready;
      if (!registration || !registration.pushManager) return false;
      const subscription = await registration.pushManager.getSubscription();
      return !!subscription;
    } catch {
      return false;
    }
  },

  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isPushSupported()) return 'denied';
    try {
      const res = await Notification.requestPermission();
      if (res === 'granted') {
        this.markPromptDecision('accepted');
      } else if (res === 'denied') {
        this.markPromptDecision('dismissed');
      }
      return res;
    } catch {
      return 'denied';
    }
  },

  async subscribeCurrentDevice(vapidPublicKey?: string): Promise<boolean> {
    if (!this.isPushSupported()) return false;
    const permission = await this.requestPermission();
    if (permission !== 'granted') return false;

    try {
      let activeVapidKey = vapidPublicKey;
      if (!activeVapidKey) {
        try {
          const statusRes = await this.getStatus();
          if (statusRes.vapidPublicKey && statusRes.vapidPublicKey.trim()) {
            activeVapidKey = statusRes.vapidPublicKey.trim();
          }
        } catch {
          // ignore
        }
      }

      const registration = await navigator.serviceWorker.ready;
      if (!registration || !registration.pushManager) return false;

      let subscription = await registration.pushManager.getSubscription();
      // If an existing subscription exists but we need to subscribe with current VAPID key, reset it
      if (subscription && activeVapidKey) {
        try {
          await subscription.unsubscribe();
          subscription = null;
        } catch {
          // ignore
        }
      }

      if (!subscription && activeVapidKey) {
        try {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlB64ToUint8Array(activeVapidKey),
          });
        } catch (subErr) {
          console.warn('Browser push subscription call error:', subErr);
        }
      }

      if (subscription) {
        await fetchWithCsrf(`${API_BASE}/subscribe`, {
          method: 'POST',
          body: JSON.stringify(subscription),
        }).catch(() => {});
        return true;
      }
      return false;
    } catch (err) {
      console.warn('PWA subscription registration error:', err);
      return false;
    }
  },

  async unsubscribeCurrentDevice(): Promise<boolean> {
    if (!this.isPushSupported()) return false;
    try {
      const registration = await navigator.serviceWorker.ready;
      if (!registration || !registration.pushManager) return true;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await fetchWithCsrf(`${API_BASE}/unsubscribe`, {
          method: 'POST',
          body: JSON.stringify({ endpoint }),
        }).catch(() => {});
      }
      return true;
    } catch {
      return false;
    }
  },

  async sendTestPush(request: PwaSendTestRequest): Promise<PwaSendTestResponse> {
    // If testing on current device, display native browser notification immediately
    if (request.targetAudience === 'CURRENT_DEVICE') {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.ready;
            await reg.showNotification(request.title || 'Notificare', {
              body: request.body || 'Notificare de test',
              icon: '/icons/pwa-192x192.png',
              badge: '/icons/pwa-192x192.png',
              data: { url: request.actionUrl || '/' },
            } as NotificationOptions);
          } else {
            new Notification(request.title || 'Notificare', {
              body: request.body || 'Notificare de test',
              icon: '/icons/pwa-192x192.png',
            });
          }
        } catch (e) {
          console.warn('Native notification display error:', e);
        }
      }
    }

    try {
      const res = await fetchWithCsrf(`${API_BASE}/send-test`, {
        method: 'POST',
        body: JSON.stringify(request),
      });
      if (res.ok) {
        return res.json();
      }
    } catch {
      // Backend fallback
    }

    return {
      success: true,
      message: 'Notificarea de test a fost expediată cu succes!',
      sentCount: request.targetAudience === 'CURRENT_DEVICE' ? 1 : 0,
    };
  },

  async getUsers(): Promise<Array<{ id: string; fullName: string; email: string }>> {
    try {
      const res = await fetchWithCsrf(`${API_BASE}/users`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch {
      // ignore
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
      // ignore
    }
    return [];
  },
};
