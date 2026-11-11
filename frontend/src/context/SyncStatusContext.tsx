import React, { createContext, useContext, useEffect, useState } from 'react';
import { syncManager } from '../services/syncManager';
import type { SyncStatus } from '../services/syncManager';
import { useLanguage } from './LanguageContext';

interface SyncStatusContextType extends SyncStatus {
  triggerSync: () => Promise<void>;
}

const SyncStatusContext = createContext<SyncStatusContextType | null>(null);

export const SyncStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<SyncStatus>(() => syncManager.getStatus());

  useEffect(() => {
    syncManager.init();
    const unsubscribe = syncManager.subscribe((newStatus) => {
      setStatus(newStatus);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const triggerSync = async () => {
    await syncManager.triggerSync();
  };

  return (
    <SyncStatusContext.Provider value={{ ...status, triggerSync }}>
      {children}
    </SyncStatusContext.Provider>
  );
};

export const useSyncStatus = (): SyncStatusContextType => {
  const context = useContext(SyncStatusContext);
  if (!context) {
    throw new Error('useSyncStatus must be used within a SyncStatusProvider');
  }
  return context;
};

/**
 * Minimal Zero-Fluff connection & sync indicator pill.
 * - Hidden when online with 0 pending mutations (zero visual bloat).
 * - Amber pill when offline.
 * - Blue pill with spinner when syncing.
 */
export const SyncStatusPill: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isOnline, isSyncing, pendingCount, triggerSync } = useSyncStatus();
  const { t } = useLanguage();

  // Hidden when online with no pending queue (Zero Fluff)
  if (isOnline && !isSyncing && pendingCount === 0) {
    return null;
  }

  if (isSyncing) {
    return (
      <div
        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 transition-all ${className}`}
        title={t('sync.syncingTooltip', 'Sincronizare date în curs...')}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-1.5 animate-pulse" />
        <span>{t('sync.syncing', 'Sincronizare...')}</span>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div
        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 transition-all ${className}`}
        title={t('sync.offlineTooltip', 'Mod offline activ. Modificările sunt salvate local.')}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5" />
        <span>
          {pendingCount > 0
            ? `${t('sync.offline', 'Offline')} · ${pendingCount}`
            : t('sync.offline', 'Offline')}
        </span>
      </div>
    );
  }

  // Online with pending items waiting to be flushed
  return (
    <button
      type="button"
      onClick={() => triggerSync()}
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 cursor-pointer transition-all ${className}`}
      title={t('sync.pendingTooltip', 'Apasă pentru a sincroniza datele salvate local')}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5" />
      <span>{`${t('sync.pending', 'În așteptare')} · ${pendingCount}`}</span>
    </button>
  );
};
