import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { syncManager } from '../../services/syncManager';
import { enqueueMutation, clearMutationQueue } from '../../utils/offlineDb';

describe('syncManager', () => {
  beforeEach(async () => {
    await clearMutationQueue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('tracks subscription and updates status', async () => {
    const statuses: any[] = [];
    const unsubscribe = syncManager.subscribe((status) => {
      statuses.push(status);
    });

    expect(statuses.length).toBeGreaterThanOrEqual(1);
    const initial = statuses[0];
    expect(initial).toHaveProperty('isOnline');
    expect(initial).toHaveProperty('isSyncing');
    expect(initial).toHaveProperty('pendingCount');

    unsubscribe();
  });

  it('flushes pending mutations via batch sync', async () => {
    await enqueueMutation({
      id: 'test-sync-1',
      url: '/api/admin/logistics/adjustments',
      method: 'POST',
      body: { delta: 5 },
      timestamp: Date.now(),
      domain: 'logistics',
      retryCount: 0,
    });

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/api/sync/batch')) {
        return new Response(JSON.stringify({ processed: ['test-sync-1'], conflicts: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('{}', { status: 200 });
    });

    await syncManager.flushQueue();

    const status = syncManager.getStatus();
    expect(status.pendingCount).toBe(0);
    expect(status.isSyncing).toBe(false);
    expect(fetchSpy).toHaveBeenCalled();
  });
});
