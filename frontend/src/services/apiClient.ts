/**
 * Centralized API client utility that handles CSRF double-submit tokens,
 * automatic UUIDv4 idempotency keys, credentials, and offline-first queue interception.
 */

import { enqueueMutation, getCachedCatalog, setCachedCatalog } from '../utils/offlineDb';
import type { OfflineMutation } from '../utils/offlineDb';

export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function clearCsrfToken(): void {
  if (typeof document !== 'undefined') {
    document.cookie = 'XSRF-TOKEN=; Path=/; Max-Age=0';
  }
}

export function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface FetchOptions extends RequestInit {
  domain?: OfflineMutation['domain'];
  isOfflineCapable?: boolean;
  cacheKey?: string;
  _isRetry?: boolean;
}

let refreshPromise: Promise<string | null> | null = null;

const AUTH_EXCLUDED_REFRESH_PATHS = [
  '/api/admin/login',
  '/api/admin/auth/refresh',
  '/api/admin/auth/google',
  '/api/admin/logout',
  '/api/admin/request-access',
  '/api/admin/forgot-password',
  '/api/admin/reset-password',
  '/api/admin/verify-email',
  '/api/admin/2fa/verify',
  '/api/admin/2fa/send-email-otp',
  '/api/public/account/auth/login',
  '/api/public/account/auth/register',
  '/api/public/account/auth/google',
  '/api/public/account/auth/logout',
];

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const csrf = getCsrfToken();
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      if (csrf) {
        headers.set('X-XSRF-TOKEN', csrf);
      }

      const res = await fetch('/api/admin/auth/refresh', {
        method: 'POST',
        headers,
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          localStorage.setItem('adminToken', data.token);
          if (data.user) {
            localStorage.setItem('adminUser', JSON.stringify(data.user));
          }
          window.dispatchEvent(new Event('authChange'));
          return data.token;
        }
      }
      return null;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export function isNetworkOffline(): boolean {
  if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
    return !navigator.onLine;
  }
  return false;
}

export async function fetchWithCsrf(input: RequestInfo | URL, init: FetchOptions = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const method = (init.method || 'GET').toUpperCase();
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  // 1. CSRF Token for mutating requests
  if (isMutating) {
    const csrfToken = getCsrfToken();
    if (csrfToken && !headers.has('X-XSRF-TOKEN')) {
      headers.set('X-XSRF-TOKEN', csrfToken);
    }
  }

  // 2. Auto Idempotency Key for mutating requests
  let idempotencyKey = headers.get('X-Idempotency-Key');
  if (isMutating && !idempotencyKey) {
    idempotencyKey = generateIdempotencyKey();
    headers.set('X-Idempotency-Key', idempotencyKey);
  }

  // 3. Content-Type default
  if (!headers.has('Content-Type') && init.body && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  // 4. Admin token authentication
  if (typeof localStorage !== 'undefined' && !headers.has('Authorization')) {
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken && adminToken.trim()) {
      headers.set('Authorization', `Bearer ${adminToken.trim()}`);
    }
  }

  // 5. Offline Pre-check
  const isOfflineCapable = init.isOfflineCapable ?? isMutating;
  const offlineDomain = init.domain || inferDomainFromUrl(url);

  if (isNetworkOffline()) {
    if (isMutating && isOfflineCapable) {
      return handleOfflineMutation(idempotencyKey || generateIdempotencyKey(), url, method as OfflineMutation['method'], headers, init.body, offlineDomain);
    }
    if (method === 'GET' && init.cacheKey) {
      const cached = await getCachedCatalog(init.cacheKey);
      if (cached !== null) {
        return new Response(JSON.stringify(cached), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'X-App-From-Cache': 'true' },
        });
      }
    }
  }

  // 6. Timeout handling (15 seconds on mobile / network calls)
  let signal = init.signal;
  if (!signal) {
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
      signal = AbortSignal.timeout(15000);
    }
  }

  try {
    const response = await fetch(input, {
      ...init,
      signal,
      headers,
      credentials: init.credentials || 'include',
    });

    // 7. Silent Token Refresh on 401 Unauthorized
    if (response.status === 401 && !init._isRetry) {
      const isExcluded = AUTH_EXCLUDED_REFRESH_PATHS.some((path) => url.includes(path));
      if (!isExcluded) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          const retryHeaders = new Headers(headers);
          retryHeaders.set('Authorization', `Bearer ${newToken.trim()}`);
          return fetchWithCsrf(input, {
            ...init,
            headers: retryHeaders,
            _isRetry: true,
          });
        } else {
          // Token refresh failed or session expired
          clearCsrfToken();
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('adminUser');
            localStorage.removeItem('adminToken');
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('authChange'));
            }
          }
          // Fire-and-forget server logout to ensure Set-Cookie maxAge=0 clears cookies in browser
          fetch('/api/admin/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
        }
      }
    }

    // If successful GET with cacheKey, update offline cache
    if (response.ok && method === 'GET' && init.cacheKey) {
      try {
        const cloned = response.clone();
        const json = await cloned.json();
        setCachedCatalog(init.cacheKey, json).catch(() => {});
      } catch (_) {
        // Ignore JSON clone errors for non-json
      }
    }

    return response;
  } catch (error: unknown) {
    // Network / timeout error fallback
    const isNetworkError = error instanceof TypeError || (error instanceof Error && error.name === 'TimeoutError');

    if (isNetworkError) {
      if (isMutating && isOfflineCapable) {
        return handleOfflineMutation(idempotencyKey || generateIdempotencyKey(), url, method as OfflineMutation['method'], headers, init.body, offlineDomain);
      }

      if (method === 'GET' && init.cacheKey) {
        const cached = await getCachedCatalog(init.cacheKey);
        if (cached !== null) {
          return new Response(JSON.stringify(cached), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'X-App-From-Cache': 'true' },
          });
        }
      }

      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new Error('Cererea a expirat (timeout). Vă rugăm să verificați conexiunea la internet și să reîncercați.');
      }
    }

    throw error;
  }
}

async function handleOfflineMutation(
  id: string,
  url: string,
  method: OfflineMutation['method'],
  headers: Headers,
  body: unknown,
  domain: OfflineMutation['domain']
): Promise<Response> {
  const headersObj: Record<string, string> = {};
  headers.forEach((val, key) => {
    headersObj[key] = val;
  });

  let parsedBody: unknown = body;
  if (typeof body === 'string') {
    try {
      parsedBody = JSON.parse(body);
    } catch (_) {
      parsedBody = body;
    }
  }

  const mutation: OfflineMutation = {
    id,
    url,
    method,
    headers: headersObj,
    body: parsedBody,
    timestamp: Date.now(),
    domain,
    retryCount: 0,
  };

  await enqueueMutation(mutation);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app:mutation-queued', { detail: mutation }));
  }

  const payload = {
    success: true,
    queued: true,
    id,
    message: 'Salvat local (se va sincroniza la reconectare)',
  };

  return new Response(JSON.stringify(payload), {
    status: 202,
    headers: {
      'Content-Type': 'application/json',
      'X-App-Offline-Queued': 'true',
    },
  });
}

function inferDomainFromUrl(url: string): OfflineMutation['domain'] {
  if (url.includes('/logistics')) return 'logistics';
  if (url.includes('/finance')) return 'finance';
  if (url.includes('/donations')) return 'donations';
  if (url.includes('/hr')) return 'hr';
  return 'general';
}
