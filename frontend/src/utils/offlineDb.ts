/**
 * IndexedDB storage layer for offline mutation queue and read-only catalog caching.
 */

export interface OfflineMutation {
  id: string; // UUIDv4 (Idempotency key)
  url: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timestamp: number;
  domain: 'logistics' | 'finance' | 'donations' | 'hr' | 'general';
  retryCount: number;
}

export interface CachedCatalog<T = unknown> {
  key: string;
  data: T;
  timestamp: number;
}

const DB_NAME = 'app_offline_db';
const DB_VERSION = 1;
const QUEUE_STORE = 'mutation_queue';
const CATALOG_STORE = 'cached_catalogs';

let dbPromise: Promise<IDBDatabase> | null = null;

function getIndexedDB(): IDBFactory | null {
  if (typeof window !== 'undefined' && window.indexedDB) {
    return window.indexedDB;
  }
  if (typeof globalThis !== 'undefined' && globalThis.indexedDB) {
    return globalThis.indexedDB;
  }
  return null;
}

export function getDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  const idb = getIndexedDB();
  if (!idb) {
    return Promise.reject(new Error('IndexedDB not supported in this environment'));
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = idb.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const queueStore = db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
        queueStore.createIndex('timestamp', 'timestamp', { unique: false });
        queueStore.createIndex('domain', 'domain', { unique: false });
      }

      if (!db.objectStoreNames.contains(CATALOG_STORE)) {
        const catalogStore = db.createObjectStore(CATALOG_STORE, { keyPath: 'key' });
        catalogStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

export async function enqueueMutation(mutation: OfflineMutation): Promise<void> {
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(QUEUE_STORE);
      const req = store.put(mutation);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('[offlineDb] Failed to enqueue mutation:', err);
  }
}

export async function getPendingMutations(): Promise<OfflineMutation[]> {
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readonly');
      const store = tx.objectStore(QUEUE_STORE);
      const index = store.index('timestamp');
      const req = index.getAll();
      req.onsuccess = () => resolve((req.result as OfflineMutation[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[offlineDb] Failed to get pending mutations:', err);
    return [];
  }
}

export async function removeMutation(id: string): Promise<void> {
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(QUEUE_STORE);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('[offlineDb] Failed to remove mutation:', err);
  }
}

export async function removeMutations(ids: string[]): Promise<void> {
  if (!ids || ids.length === 0) return;
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(QUEUE_STORE);
      for (const id of ids) {
        store.delete(id);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('[offlineDb] Failed to remove mutations:', err);
  }
}

export async function clearMutationQueue(): Promise<void> {
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(QUEUE_STORE);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('[offlineDb] Failed to clear queue:', err);
  }
}

export async function getQueueCount(): Promise<number> {
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readonly');
      const store = tx.objectStore(QUEUE_STORE);
      const req = store.count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    return 0;
  }
}

export async function setCachedCatalog<T>(key: string, data: T): Promise<void> {
  try {
    const db = await getDb();
    const entry: CachedCatalog<T> = {
      key,
      data,
      timestamp: Date.now(),
    };
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CATALOG_STORE, 'readwrite');
      const store = tx.objectStore(CATALOG_STORE);
      const req = store.put(entry);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[offlineDb] Failed to cache catalog:', key, err);
  }
}

export async function getCachedCatalog<T>(key: string): Promise<T | null> {
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CATALOG_STORE, 'readonly');
      const store = tx.objectStore(CATALOG_STORE);
      const req = store.get(key);
      req.onsuccess = () => {
        const result = req.result as CachedCatalog<T> | undefined;
        resolve(result ? result.data : null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    return null;
  }
}

export async function clearCachedCatalogs(): Promise<void> {
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CATALOG_STORE, 'readwrite');
      const store = tx.objectStore(CATALOG_STORE);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('[offlineDb] Failed to clear cached catalogs:', err);
  }
}
