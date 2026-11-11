import { fetchWithCsrf } from './apiClient';

export interface DonationCheckoutPayload {
  amount: number;
  donorEmail: string;
  donorName?: string;
  itemsDescription?: string;
  currency?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface StripeCheckoutResponse {
  sessionId: string;
  url: string;
}

export interface SimulatedOrderResult {
  transactionId: string;
  pickupCode: string;
  amount: number;
  currency: string;
  donorEmail: string;
  donorName: string;
  itemsDescription: string;
  timestamp: string;
}

export const donationService = {
  async createStripeCheckoutSession(payload: DonationCheckoutPayload): Promise<StripeCheckoutResponse> {
    const res = await fetchWithCsrf('/api/stripe/checkout-session', {
      method: 'POST',
      body: JSON.stringify({
        amount: payload.amount,
        donorEmail: payload.donorEmail,
        donorName: payload.donorName || undefined,
        itemsDescription: payload.itemsDescription || undefined,
        currency: (payload.currency || 'RON').toLowerCase(),
        successUrl: payload.successUrl || `${window.location.origin}/donate?status=success`,
        cancelUrl: payload.cancelUrl || `${window.location.origin}/donate?status=cancelled`,
      }),
    });

    if (!res.ok) {
      let errMsg = 'Eroare la inițierea sesiunii de plată Stripe.';
      try {
        const data = await res.json();
        if (data && data.message) errMsg = data.message;
      } catch {
        // fallback
      }
      throw new Error(errMsg);
    }

    return res.json();
  },

  simulateTestOrder(payload: DonationCheckoutPayload, customPrefix: string = 'DON-TEST-'): SimulatedOrderResult {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const prefix = customPrefix.endsWith('-') ? customPrefix : `${customPrefix}-`;
    const code = `${prefix}${randomSuffix}`;
    const txId = `sim_tx_${Date.now()}_${randomSuffix}`;

    return {
      transactionId: txId,
      pickupCode: code,
      amount: payload.amount,
      currency: payload.currency || 'RON',
      donorEmail: payload.donorEmail,
      donorName: payload.donorName || 'Tester',
      itemsDescription: payload.itemsDescription || 'Test Order / Donation',
      timestamp: new Date().toISOString(),
    };
  },
};
