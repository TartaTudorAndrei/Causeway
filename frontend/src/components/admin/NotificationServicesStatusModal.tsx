import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { X } from 'lucide-react';
import type { WhatsAppConnectionStatus } from '../../types/whatsapp';
import type { PwaConnectionStatus } from '../../types/pwa';

interface NotificationServicesStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  waStatus: WhatsAppConnectionStatus;
  pwaStatus: PwaConnectionStatus;
  pwaSubscribersCount: number;
  isBrowserSubscribed: boolean;
  groupsCount: number;
  canWrite?: boolean;
  onOpenPairing: () => void;
  onTogglePwaSubscription: () => void;
}

export const NotificationServicesStatusModal: React.FC<NotificationServicesStatusModalProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  waStatus,
  pwaStatus,
  pwaSubscribersCount,
  isBrowserSubscribed,
  groupsCount,
  canWrite = true,
  onOpenPairing,
  onTogglePwaSubscription,
}) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className={`w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-lg rounded-none sm:rounded-2xl border-0 sm:border flex flex-col overflow-hidden shadow-2xl ${
          isDarkMode ? 'bg-black text-white border-zinc-800' : 'bg-white text-zinc-900 border-zinc-200'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 pt-5 pb-3.5 flex items-center justify-between shrink-0">
          <h2 className="font-bold text-base sm:text-lg tracking-tight">
            {t('notifications.statusModalTitle', 'Status Servicii & Canale')}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inset Divider 1 */}
        <div className={`mx-5 sm:mx-6 border-b ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`} />

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-3.5 text-sm">
          
          {/* WhatsApp Status Card */}
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-xs">WhatsApp Gateway</span>
                {waStatus === 'CONNECTED' ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {t('whatsapp.statusConnected', 'Conectat')}
                  </span>
                ) : waStatus === 'PAIRING_REQUIRED' ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                    {t('whatsapp.statusPairingRequired', 'Scanare QR Necesară')}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    {t('whatsapp.statusDisconnected', 'Deconectat')}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-500">
                {groupsCount} {t('whatsapp.groupsFound', 'grupuri')} • {waStatus === 'CONNECTED' ? t('whatsapp.sessionActive', 'Sesiune activă') : t('whatsapp.sessionInactive', 'Scanare QR pentru activare')}
              </p>
            </div>

            {canWrite && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPairing();
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition cursor-pointer shrink-0"
              >
                {waStatus === 'CONNECTED' ? t('whatsapp.viewQr', 'Re-împerechere') : t('whatsapp.connectNow', 'Conectează QR')}
              </button>
            )}
          </div>

          {/* PWA Push Status Card */}
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-xs">PWA Push Gateway</span>
                {pwaStatus === 'ACTIVE' ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {t('status.ACTIVE', 'Activ')}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {pwaStatus}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-500">
                {pwaSubscribersCount} {t('pwa.activeDevices', 'dispozitive înregistrate')} • {isBrowserSubscribed ? t('pwa.thisDeviceSubscribed', 'Dispozitiv curent abonat') : t('pwa.thisDeviceNotSubscribed', 'Dispozitiv curent neabonat')}
              </p>
            </div>

            <button
              type="button"
              onClick={onTogglePwaSubscription}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                isBrowserSubscribed
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md'
              }`}
            >
              {isBrowserSubscribed ? t('pwa.unsubscribe', 'Dezabonează') : t('pwa.subscribeDevice', 'Abonează')}
            </button>
          </div>
        </div>

        {/* Inset Divider 2 */}
        <div className={`mx-5 sm:mx-6 border-t ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`} />

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer"
          >
            {t('common.close', 'Închide')}
          </button>
        </div>
      </div>
    </div>
  );
};
