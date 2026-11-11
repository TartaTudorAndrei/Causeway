import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  enqueueMutation,
  getPendingMutations,
  removeMutation,
  removeMutations,
  clearMutationQueue,
  getQueueCount,
  setCachedCatalog,
  getCachedCatalog,
  clearCachedCatalogs,
  OfflineMutation,
} from '../../utils/offlineDb';

describe('offlineDb', () => {
  beforeEach(async () => {
    await clearMutationQueue();
    await clearCachedCatalogs();
  });

  it('enqueues and retrieves mutations sorted by timestamp', async () => {
    const mutation1: OfflineMutation = {
      id: 'm-1',
      url: '/api/admin/logistics/transfers',
      method: 'POST',
      body: { delta: 10 },
      timestamp: 1000,
      domain: 'logistics',
      retryCount: 0,
    };

    const mutation2: OfflineMutation = {
      id: 'm-2',
      url: '/api/admin/finances/expenses',
      method: 'POST',
      body: { amount: 50 },
      timestamp: 500,
      domain: 'finance',
      retryCount: 0,
    };

    await enqueueMutation(mutation1);
    await enqueueMutation(mutation2);

    const pending = await getPendingMutations();
    expect(pending.length).toBe(2);
    // Should be sorted by timestamp ASC
    expect(pending[0].id).toBe('m-2');
    expect(pending[1].id).toBe('m-1');

    const count = await getQueueCount();
    expect(count).toBe(2);
  });

  it('removes single and batch mutations correctly', async () => {
    await enqueueMutation({
      id: 'm-1',
      url: '/api/1',
      method: 'POST',
      timestamp: 100,
      domain: 'general',
      retryCount: 0,
    });
    await enqueueMutation({
      id: 'm-2',
      url: '/api/2',
      method: 'POST',
      timestamp: 200,
      domain: 'general',
      retryCount: 0,
    });
    await enqueueMutation({
      id: 'm-3',
      url: '/api/3',
      method: 'POST',
      timestamp: 300,
      domain: 'general',
      retryCount: 0,
    });

    await removeMutation('m-1');
    let pending = await getPendingMutations();
    expect(pending.map(p => p.id)).toEqual(['m-2', 'm-3']);

    await removeMutations(['m-2', 'm-3']);
    pending = await getPendingMutations();
    expect(pending.length).toBe(0);
    expect(await getQueueCount()).toBe(0);
  });

  it('caches and retrieves read-only catalogs', async () => {
    const sampleLocations = [{ id: 'loc-1', name: 'Stand Central' }];
    await setCachedCatalog('logistics:locations', sampleLocations);

    const retrieved = await getCachedCatalog<typeof sampleLocations>('logistics:locations');
    expect(retrieved).toEqual(sampleLocations);

    const nonExistent = await getCachedCatalog('unknown:key');
    expect(nonExistent).toBeNull();
  });
});
