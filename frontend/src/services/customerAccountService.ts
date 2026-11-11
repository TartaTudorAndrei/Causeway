import { fetchWithCsrf } from './apiClient';
import type {
  CustomerAccountDetails,
  CustomerDonationItem,
  CustomerProfileUpdatePayload,
} from '../types/customerAccount';

const BASE_URL = '/api/public/account';

export const customerAccountService = {
  async register(payload: { fullName: string; email: string; password: string; phone?: string }) {
    const res = await fetchWithCsrf(`${BASE_URL}/auth/register`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || 'Înregistrarea a eșuat.');
    }

    const data = await res.json();
    if (data.token) {
      localStorage.setItem('adminToken', data.token);
    }
    if (data.user) {
      localStorage.setItem('adminUser', JSON.stringify(data.user));
      window.dispatchEvent(new Event('authChange'));
    }
    return data;
  },

  async login(payload: { email: string; password: string }) {
    const res = await fetchWithCsrf(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Credențiale incorecte.');
    }

    const data = await res.json();
    if (data.token) {
      localStorage.setItem('adminToken', data.token);
    }
    if (data.user) {
      localStorage.setItem('adminUser', JSON.stringify(data.user));
      window.dispatchEvent(new Event('authChange'));
    }
    return data;
  },

  async loginWithGoogle(credential: string) {
    const res = await fetchWithCsrf(`${BASE_URL}/auth/google`, {
      method: 'POST',
      body: JSON.stringify({ credential }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Autentificarea Google a eșuat.');
    }

    const data = await res.json();
    if (data.token) {
      localStorage.setItem('adminToken', data.token);
    }
    if (data.user) {
      localStorage.setItem('adminUser', JSON.stringify(data.user));
      window.dispatchEvent(new Event('authChange'));
    }
    return data;
  },

  async getMe(): Promise<CustomerAccountDetails | null> {
    try {
      const res = await fetchWithCsrf(`${BASE_URL}/me`, { method: 'GET' });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async getDonations(): Promise<CustomerDonationItem[]> {
    const res = await fetchWithCsrf(`${BASE_URL}/donations`, { method: 'GET' });
    if (!res.ok) {
      throw new Error('Nu s-au putut încărca donațiile.');
    }
    return await res.json();
  },

  async getMyDonations(): Promise<CustomerDonationItem[]> {
    return this.getDonations();
  },

  async updateProfile(payload: CustomerProfileUpdatePayload): Promise<CustomerAccountDetails> {
    const res = await fetchWithCsrf(`${BASE_URL}/profile`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Actualizarea profilului a eșuat.');
    }

    const updated = await res.json();
    const stored = localStorage.getItem('adminUser');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        u.fullName = updated.fullName;
        u.phone = updated.phone;
        localStorage.setItem('adminUser', JSON.stringify(u));
        window.dispatchEvent(new Event('authChange'));
      } catch {}
    }
    return updated;
  },

  async logout(): Promise<void> {
    try {
      await fetchWithCsrf(`${BASE_URL}/auth/logout`, { method: 'POST' });
    } catch {}
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    window.dispatchEvent(new Event('authChange'));
  },
};
