import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { getCsrfToken, clearCsrfToken, fetchWithCsrf } from '../../services/apiClient';

describe('apiClient', () => {
  beforeEach(() => {
    // Clear cookies
    document.cookie.split(';').forEach((c) => {
      document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
    });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('correctly reads and clears CSRF token from document.cookie', () => {
    expect(getCsrfToken()).toBeNull();

    document.cookie = 'XSRF-TOKEN=test-csrf-token-123; Path=/';
    expect(getCsrfToken()).toBe('test-csrf-token-123');

    clearCsrfToken();
    expect(getCsrfToken()).toBeNull();
  });

  it('injects X-XSRF-TOKEN header on mutating requests when cookie exists', async () => {
    document.cookie = 'XSRF-TOKEN=secret-token-xyz; Path=/';

    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    globalThis.fetch = mockFetch;

    await fetchWithCsrf('/api/admin/stands', {
      method: 'POST',
      body: JSON.stringify({ name: 'Stand Central' }),
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, options] = mockFetch.mock.calls[0];
    const headers = options.headers as Headers;
    expect(headers.get('X-XSRF-TOKEN')).toBe('secret-token-xyz');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('does not inject X-XSRF-TOKEN on safe GET requests', async () => {
    document.cookie = 'XSRF-TOKEN=secret-token-xyz; Path=/';

    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    globalThis.fetch = mockFetch;

    await fetchWithCsrf('/api/admin/stands', { method: 'GET' });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, options] = mockFetch.mock.calls[0];
    const headers = options.headers as Headers;
    expect(headers.get('X-XSRF-TOKEN')).toBeNull();
  });
});
