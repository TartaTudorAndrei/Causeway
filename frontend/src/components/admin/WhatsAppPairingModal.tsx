import React, { useEffect, useState, useCallback } from 'react';
import { Modal } from '../common/Modal';
import { whatsappService } from '../../services/whatsappService';
import type { WhatsAppConnectionStatus } from '../../types/whatsapp';
import { useLanguage } from '../../context/LanguageContext';
interface WhatsAppPairingModalProps {
    isOpen: boolean;
    onClose: () => void;
    isDarkMode: boolean;
    onStatusChange?: (status: WhatsAppConnectionStatus) => void;
}
export const WhatsAppPairingModal: React.FC<WhatsAppPairingModalProps> = ({ isOpen, onClose, isDarkMode, onStatusChange, }) => {
    const { t } = useLanguage();
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [status, setStatus] = useState<WhatsAppConnectionStatus>('DISCONNECTED');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const fetchQr = useCallback(async () => {
        try {
            setError(null);
            const res = await whatsappService.getQr();
            setQrCode(res.qr);
            setStatus(res.status);
            if (onStatusChange) {
                onStatusChange(res.status);
            }
        }
        catch (err: any) {
            setError(err.message || t('whatsapp.qrError', 'Eroare la obținerea codului QR'));
        }
        finally {
            setIsLoading(false);
        }
    }, [onStatusChange, t]);
    useEffect(() => {
        let interval: any = null;
        if (isOpen) {
            setIsLoading(true);
            fetchQr();
            interval = setInterval(fetchQr, 3000);
        }
        else {
            setQrCode(null);
        }
        return () => {
            if (interval)
                clearInterval(interval);
        };
    }, [isOpen, fetchQr]);
    const css = {
        textSecondary: isDarkMode ? 'text-zinc-400' : 'text-zinc-500',
        stepBox: isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200',
    };
    return (<Modal isOpen={isOpen} onClose={onClose} title={t('whatsapp.pairingModalTitle', 'Conectare WhatsApp (Multi-Device)')} isDarkMode={isDarkMode} maxWidth="md">
      <div className="space-y-4 text-xs">
        {status === 'CONNECTED' ? (<div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center"></div>
            <p className="font-bold text-sm text-emerald-400">
              {t('whatsapp.connectedSuccess', 'WhatsApp este conectat cu succes!')}
            </p>
            <p className={css.textSecondary}>
              {t('whatsapp.connectedDesc', 'Sesiunea este activă și mesajele automate sunt funcționale.')}
            </p>
            <div className="pt-2">
              <button type="button" onClick={onClose} className="px-5 py-2 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition cursor-pointer">
                {t('common.close', 'Închide')}
              </button>
            </div>
          </div>) : (<>
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/40">
              <span className={css.textSecondary}>{t('whatsapp.statusLabel', 'Status Conexiune:')}</span>
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${status === 'PAIRING_REQUIRED'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                {status === 'PAIRING_REQUIRED'
                ? t('whatsapp.statusPairing', 'Scanare QR Necesară')
                : t('whatsapp.statusDisconnected', 'Deconectat')}
              </span>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl border bg-white shadow-inner min-h-[220px]">
              {isLoading ? (<div className="flex flex-col items-center space-y-2 text-zinc-500"><span className="text-[11px] font-medium">{t('whatsapp.loadingQr', 'Se generează codul QR...')}</span>
                </div>) : error ? (<div className="flex flex-col items-center space-y-2 text-rose-500 text-center px-4"><span className="text-[11px] font-medium">{error}</span>
                  <button type="button" onClick={fetchQr} className="mt-2 px-3 py-1 text-[11px] rounded-lg bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition cursor-pointer font-bold">
                    {t('common.retry', 'Reîncearcă')}
                  </button>
                </div>) : qrCode ? (<img src={qrCode} alt="WhatsApp Pairing QR Code" className="w-48 h-48 object-contain rounded-lg"/>) : (<div className="flex flex-col items-center space-y-2 text-zinc-400">
                  <span className="text-[11px] font-medium">{t('whatsapp.waitingQr', 'Așteptare cod de la server...')}</span>
                </div>)}
            </div>

            {/* Instructions */}
            <div className={`p-3 rounded-xl border space-y-2 ${css.stepBox}`}>
              <p className="font-bold text-[11px] uppercase tracking-wider text-zinc-400">
                {t('whatsapp.instructionsTitle', 'Instrucțiuni de scanare:')}
              </p>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-zinc-300">
                <li>{t('whatsapp.step1', 'Deschide WhatsApp pe telefonul tău')}</li>
                <li>{t('whatsapp.step2', 'Mergi la Setări > Dispozitive asociate (Linked Devices)')}</li>
                <li>{t('whatsapp.step3', 'Apasă Asociază un dispozitiv și scanează codul QR de mai sus')}</li>
              </ol>
            </div>
          </>)}
      </div>
    </Modal>);
};
