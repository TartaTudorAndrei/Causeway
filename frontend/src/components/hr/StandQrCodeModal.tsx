import React, { useState } from 'react';
import type { HrStand, StandQrCodeInfo } from '../../types/hr';
import { useLanguage } from '../../context/LanguageContext';
import { useTenant } from '../../context/TenantContext';
import { Modal } from '../common';
export interface StandQrCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    stand: HrStand | null;
    qrInfo: StandQrCodeInfo | null;
    isLoading?: boolean;
    isDarkMode?: boolean;
}
export const StandQrCodeModal: React.FC<StandQrCodeModalProps> = ({ isOpen, onClose, stand, qrInfo, isLoading = false, isDarkMode = true, }) => {
    const { t } = useLanguage();
    const { tenant } = useTenant();
    const [copied, setCopied] = useState(false);
    if (!isOpen || !stand)
        return null;
    const qrToken = qrInfo?.qrToken || stand.qrCodeToken || stand.id.replace(/-/g, '');
    const checkinUrl = `${window.location.origin}/dashboard/hr?checkinStand=${stand.id}&token=${qrToken}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(checkinUrl)}`;
    const handleCopyLink = () => {
        navigator.clipboard.writeText(checkinUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow)
            return;
        printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Stand - ${stand.locationName}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              text-align: center;
              padding: 40px;
              color: #111;
            }
            .card {
              max-width: 450px;
              margin: 0 auto;
              border: 2px solid #222;
              border-radius: 20px;
              padding: 30px;
            }
            h1 { font-size: 24px; margin-bottom: 6px; }
            p { font-size: 14px; color: #555; margin: 4px 0 20px; }
            img { width: 260px; height: 260px; display: block; margin: 0 auto 20px; }
            .badge {
              display: inline-block;
              background: #2563eb;
              color: white;
              font-weight: bold;
              padding: 6px 14px;
              border-radius: 8px;
              font-size: 13px;
            }
            .footer {
              margin-top: 20px;
              font-size: 12px;
              color: #777;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>${stand.locationName}</h1>
            <p>${stand.eventDate} ${stand.eventName ? '• ' + stand.eventName : ''}</p>
            <img src="${qrImageUrl}" alt="QR Stand" />
            <div>
              <span class="badge">SCANEAZĂ PENTRU CONFIRMARE PREZENȚĂ</span>
            </div>
            <div class="footer">
              ${tenant?.identity?.name || 'Organizația Caritabilă'} • Check-in Voluntari
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
        printWindow.document.close();
    };
    return (<Modal isOpen={isOpen} onClose={onClose} title={<div className="flex items-center space-x-2.5"><span>{t('hr.standQrModalTitle', 'Cod QR Stand - Check-in')}</span>
        </div>} maxWidth="md" isDarkMode={isDarkMode}>
      <div className="space-y-4 text-center">
        {/* Header stand info */}
        <div className={`p-3.5 rounded-xl border text-left ${isDarkMode ? 'bg-zinc-900/70 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="font-bold text-sm text-white">{stand.locationName}</h4>
              <p className="text-xs text-zinc-400 mt-0.5">
                <span>{stand.eventDate}</span>
                {stand.eventName && <span> • {stand.eventName}</span>}
              </p>
            </div>
            <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider">
              {t('hr.qrCheckinBadge', 'Check-in QR')}
            </span>
          </div>
        </div>

        {/* QR Code Container */}
        <div className={`p-6 rounded-2xl border flex flex-col items-center justify-center space-y-4 ${isDarkMode ? 'bg-zinc-950 border-zinc-850' : 'bg-white border-zinc-200'}`}>
          {isLoading ? (<div className="w-64 h-64 flex items-center justify-center text-zinc-500 text-xs animate-pulse">
              {t('general.loading', 'Se generează codul QR...')}
            </div>) : (<div className="p-3 bg-white rounded-2xl shadow-xl border border-zinc-200 inline-block">
              <img src={qrImageUrl} alt="Stand QR Code" className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-lg"/>
            </div>)}

          <div className="space-y-1 max-w-sm">
            <p className="text-xs font-semibold text-zinc-200 flex items-center justify-center gap-1.5"><span>{t('hr.qrScanInstruction', 'Voluntarii logați scanează acest cod pentru confirmare prezență.')}</span>
            </p>
            <p className="text-[11px] text-zinc-500">
              {t('hr.qrScanTip', 'Afișați sau imprimați codul QR direct la stand.')}
            </p>
          </div>
        </div>

        {/* Token & Direct URL Box */}
        <div className={`p-3 rounded-xl border space-y-2 text-left ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            {t('hr.directCheckinLink', 'Link Direct Check-in')}
          </label>
          <div className="flex items-center gap-2">
            <input type="text" readOnly value={checkinUrl} className={`w-full px-3 py-2 text-xs font-mono rounded-xl border outline-hidden ${isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-300 text-zinc-800'}`}/>
            <button type="button" onClick={handleCopyLink} className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition cursor-pointer flex items-center space-x-1 shrink-0" title={t('common.copy', 'Copiază')}>
              <span>{copied ? t('common.copied', 'Copiat') : t('common.copy', 'Copiază')}</span>
            </button>
          </div>
        </div>

        {/* Action triggers */}
        <div className="flex items-center justify-end space-x-2 pt-2">
          <button type="button" onClick={handlePrint} className="px-4 py-2 text-xs font-bold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition cursor-pointer flex items-center space-x-1.5"><span>{t('hr.printQr', 'Imprimă QR')}</span>
          </button>
          <a href={qrImageUrl} download={`QR_Stand_${stand.locationName.replace(/\s+/g, '_')}.png`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md transition cursor-pointer flex items-center space-x-1.5"><span>{t('hr.downloadQr', 'Descarcă PNG')}</span>
          </a>
        </div>
      </div>
    </Modal>);
};
