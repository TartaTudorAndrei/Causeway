import React, { useState, useEffect, useCallback } from 'react';
import { googleSyncService } from '../../services/googleSyncService';
import type { GoogleSyncStatus } from '../../types/googleSync';
import { useLanguage } from '../../context/LanguageContext';
import { usePermission } from '../../hooks/usePermission';
interface GoogleSyncDashboardViewProps {
    isDarkMode: boolean;
    canWrite?: boolean;
    onShowToast: (text: string, type?: 'success' | 'error') => void;
}
export const GoogleSyncDashboardView: React.FC<GoogleSyncDashboardViewProps> = ({ isDarkMode, canWrite, onShowToast }) => {
    const { t } = useLanguage();
    const { hasPermission, isSuperAdmin } = usePermission();
    
    const canSync = canWrite !== undefined ? canWrite : (isSuperAdmin || hasPermission('it:sync:manage') || hasPermission('it:write'));
    const [status, setStatus] = useState<GoogleSyncStatus | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSyncing, setIsSyncing] = useState<boolean>(false);
    const [customFolderId, setCustomFolderId] = useState<string>('');
    const [isSavingFolderId, setIsSavingFolderId] = useState<boolean>(false);
    const fetchStatus = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await googleSyncService.getStatus();
            setStatus(data);
            if (data.folderId) {
                setCustomFolderId(data.folderId);
            }
        }
        catch (err: any) {
            console.error('Error fetching sync status:', err);
            onShowToast(err?.message || t('sync.errorToast', 'Eroare la preluarea statusului de sincronizare'), 'error');
        }
        finally {
            setIsLoading(false);
        }
    }, [onShowToast, t]);
    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);
    const handleTriggerSync = async () => {
        if (isSyncing)
            return;
        setIsSyncing(true);
        try {
            const updated = await googleSyncService.triggerSync();
            setStatus(updated);
            if (updated.lastSyncStatus === 'SUCCESS') {
                onShowToast(t('sync.successToast', 'Sincronizarea cu Google Drive a fost finalizată cu succes!'), 'success');
            }
            else {
                onShowToast(updated.message || t('sync.errorToast', 'Eroare la sincronizare'), 'error');
            }
        }
        catch (err: any) {
            console.error('Sync failed:', err);
            onShowToast(err?.message || t('sync.errorToast', 'Eroare la sincronizare'), 'error');
        }
        finally {
            setIsSyncing(false);
        }
    };
    const handleSaveFolderId = async () => {
        if (isSavingFolderId)
            return;
        setIsSavingFolderId(true);
        try {
            const updated = await googleSyncService.updateFolderId(customFolderId.trim());
            setStatus(updated);
            onShowToast(t('sync.folderSavedToast', 'ID Folder Google Drive actualizat cu succes.'), 'success');
        }
        catch (err: any) {
            onShowToast(err?.message || 'Eroare la salvare folder', 'error');
        }
        finally {
            setIsSavingFolderId(false);
        }
    };
    const getStatusDisplayMessage = () => {
        if (isSyncing) {
            return t('sync.syncing', 'Se sincronizează...');
        }
        if (!status?.connected || status?.lastSyncStatus === 'NOT_CONFIGURED') {
            return t('sync.statusNotConfigured', 'Neconfigurat');
        }
        if (status?.lastSyncStatus === 'SUCCESS') {
            return t('sync.statusSuccess', 'Sincronizare completă reușită');
        }
        if (status?.lastSyncStatus === 'FAILED') {
            return t('sync.statusFailed', 'Eroare la sincronizare');
        }
        return t('sync.statusReady', 'Gata de sincronizare.');
    };
    const cardBg = isDarkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-zinc-200 shadow-xs';
    const inputBg = isDarkMode ? 'bg-zinc-950 border-zinc-800 text-white placeholder-zinc-500' : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400';
    return (<div className="max-w-2xl mx-auto w-full space-y-4 pt-2">
      {/* Main Card */}
      <div className={`p-5 sm:p-6 rounded-2xl border ${cardBg} space-y-5`}>
        {/* Header with Title & Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/40">
          <div className="space-y-1">
            <h3 className="font-bold text-base text-zinc-100">
              {t('sync.title', 'Sincronizare Google Drive')}
            </h3>
            <p className="text-xs text-zinc-400">
              {status?.lastSyncTimestamp
            ? `${t('sync.lastSync', 'Ultima Sincronizare')}: ${new Date(status.lastSyncTimestamp).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}`
            : t('sync.statusReady', 'Gata de sincronizare.')}
            </p>
          </div>
<div className="flex items-center gap-2 shrink-0">
            {status?.folderUrl && (<a href={status.folderUrl} target="_blank" rel="noreferrer noopener" className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/50 transition cursor-pointer">
                <span>{t('sync.openInDrive', 'Deschide în Google Drive')}</span></a>)}

            <button onClick={handleTriggerSync} disabled={isSyncing || isLoading || !canSync} className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition cursor-pointer shadow-md disabled:opacity-50"><span>{isSyncing ? t('sync.syncing', 'Se sincronizează...') : t('sync.syncNow', 'Sincronizează Acum')}</span>
            </button>
          </div>
        </div>

        {/* Sync Status Banner */}
        <div className="flex items-center text-xs p-3.5 rounded-xl bg-zinc-950/50 border border-zinc-800">
          <div className="flex items-center space-x-2.5 min-w-0">
            <span className="text-zinc-300 font-medium truncate">
              {getStatusDisplayMessage()}
            </span>
          </div>
        </div>

        {/* Drive Folder ID Configuration (Super Admin / IT Admin / it:sync:manage only) */}
        {canSync && (<div className="pt-3 border-t border-zinc-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-zinc-300">
                {t('sync.folderId', 'ID Folder Google Drive')}
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <input type="text" value={customFolderId} onChange={(e) => setCustomFolderId(e.target.value)} placeholder={t('sync.folderPlaceholder', 'Introduceți ID Folder Google Drive (ex: 1A2b3C...)')} className={`flex-1 px-3.5 py-2 text-xs rounded-xl border font-mono outline-hidden ${inputBg}`}/>
              <button onClick={handleSaveFolderId} disabled={isSavingFolderId} className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer transition shadow-md disabled:opacity-50">
                {isSavingFolderId ? '...' : t('common.save', 'Salvează')}
              </button>
            </div>
          </div>)}
      </div>
    </div>);
};
