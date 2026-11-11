/**
 * Background synchronization manager for offline mutations.
 * Listens for network changes, page focus, periodic heartbeats, and flushes
 * queued IndexedDB mutations to the backend.
 */

import {
  getPendingMutations,
  removeMutations,
  getQueueCount,
} from '../utils/offlineDb';
import type { OfflineMutation } from '../utils/offlineDb';
import { fetchWithCsrf } from './apiClient';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: number | null;
  lastError: string | null;
}

type SyncListener = (status: SyncStatus) => void;

class SyncManager {
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isSyncing: boolean = false;
  private pendingCount: number = 0;
  private lastSyncTime: number | null = null;
  private lastError: string | null = null;
  private listeners: Set<SyncListener> = new Set();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private isInitialized: boolean = false;

  public init(): void {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    this.isOnline = navigator.onLine;
    this.updatePendingCount();

    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    window.addEventListener('focus', this.handleFocus);
    window.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('app:mutation-queued', this.handleMutationQueued as EventListener);

    // Heartbeat every 30s when online to process any pending items
    this.heartbeatInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.flushQueue();
      }
    }, 30000);

    // Initial check
    if (this.isOnline) {
      setTimeout(() => this.flushQueue(), 1500);
    }
  }

  public destroy(): void {
    if (typeof window === 'undefined') return;
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    window.removeEventListener('focus', this.handleFocus);
    window.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('app:mutation-queued', this.handleMutationQueued as EventListener);

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.isInitialized = false;
  }

  public getStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount: this.pendingCount,
      lastSyncTime: this.lastSyncTime,
      lastError: this.lastError,
    };
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const status = this.getStatus();
    this.listeners.forEach((listener) => {
      try {
        listener(status);
      } catch (err) {
        console.error('[syncManager] Error in sync listener:', err);
      }
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app:sync-status', { detail: status }));
    }
  }

  public async updatePendingCount(): Promise<number> {
    const count = await getQueueCount();
    this.pendingCount = count;
    this.notify();
    return count;
  }

  private handleOnline = (): void => {
    this.isOnline = true;
    this.notify();
    this.flushQueue();
  };

  private handleOffline = (): void => {
    this.isOnline = false;
    this.notify();
  };

  private handleFocus = (): void => {
    if (navigator.onLine && !this.isSyncing) {
      this.isOnline = true;
      this.flushQueue();
    }
  };

  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible' && navigator.onLine && !this.isSyncing) {
      this.flushQueue();
    }
  };

  private handleMutationQueued = (): void => {
    this.updatePendingCount();
    if (this.isOnline && !this.isSyncing) {
      this.flushQueue();
    }
  };

  public async triggerSync(): Promise<void> {
    if (!this.isOnline || this.isSyncing) return;
    await this.flushQueue();
  }

  public async flushQueue(): Promise<void> {
    if (this.isSyncing) return;

    const pending = await getPendingMutations();
    this.pendingCount = pending.length;
    if (pending.length === 0) {
      this.notify();
      return;
    }

    this.isSyncing = true;
    this.lastError = null;
    this.notify();

    try {
      // First attempt: batch sync endpoint POST /api/sync/batch
      const batchSuccess = await this.tryBatchSync(pending);

      if (!batchSuccess) {
        // Fallback: sequential direct requests
        await this.syncSequentially(pending);
      }

      this.lastSyncTime = Date.now();
      await this.updatePendingCount();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app:sync-complete'));
      }
    } catch (err: unknown) {
      this.lastError = err instanceof Error ? err.message : 'Eroare la sincronizare';
      console.warn('[syncManager] Sync failed:', err);
    } finally {
      this.isSyncing = false;
      await this.updatePendingCount();
    }
  }

  private async tryBatchSync(mutations: OfflineMutation[]): Promise<boolean> {
    try {
      const response = await fetchWithCsrf('/api/sync/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mutations }),
        isOfflineCapable: false,
      });

      if (response.ok) {
        const result = (await response.json()) as { processed?: string[]; failed?: string[] };
        const processedIds = result.processed || [];
        if (processedIds.length > 0) {
          await removeMutations(processedIds);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private async syncSequentially(mutations: OfflineMutation[]): Promise<void> {
    const successfullyProcessed: string[] = [];

    for (const mutation of mutations) {
      try {
        const headers: Record<string, string> = {
          ...mutation.headers,
          'X-Idempotency-Key': mutation.id,
        };

        const init: RequestInit = {
          method: mutation.method,
          headers,
          body: mutation.body ? JSON.stringify(mutation.body) : undefined,
        };

        const res = await fetchWithCsrf(mutation.url, {
          ...init,
          isOfflineCapable: false,
        });

        if (res.ok || res.status === 409 || res.status === 202) {
          successfullyProcessed.push(mutation.id);
        } else if (res.status >= 400 && res.status < 500) {
          // Client error (e.g. invalid data) — remove from queue to prevent infinite blocking
          successfullyProcessed.push(mutation.id);
        }
      } catch (err) {
        // Network drop during sequential flush — break early
        break;
      }
    }

    if (successfullyProcessed.length > 0) {
      await removeMutations(successfullyProcessed);
    }
  }
}

export const syncManager = new SyncManager();
