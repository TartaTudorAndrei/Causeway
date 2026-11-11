import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { GeneratedContract, ContractStatus } from '../../types/legal';
import { useLanguage } from '../../context/LanguageContext';
import { formatContractDocumentHtml } from '../../utils/contractTemplates';

interface ContractViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: GeneratedContract | null;
  onStatusChange: (id: string, newStatus: ContractStatus) => Promise<void>;
  isDarkMode: boolean;
}

export const ContractViewerModal: React.FC<ContractViewerModalProps> = ({
  isOpen,
  onClose,
  contract,
  onStatusChange,
  isDarkMode,
}) => {
  const { t } = useLanguage();
  const [copied, setCopied] = useState<boolean>(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  // Keyboard Escape listener
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !contract) return null;

  const googleDocsEditUrl = contract.driveFileId && contract.driveFileId.trim()
    ? (contract.driveFileId.startsWith('http') 
        ? contract.driveFileId 
        : `https://docs.google.com/document/d/${contract.driveFileId}/edit`)
    : null;

  const handleCopy = () => {
    navigator.clipboard.writeText(contract.renderedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStatusSelect = async (newStatus: ContractStatus) => {
    setIsUpdatingStatus(true);
    try {
      await onStatusChange(contract.id, newStatus);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'signed':
        return isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'pending_signature':
        return isDarkMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200';
      case 'draft':
        return isDarkMode ? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' : 'bg-zinc-100 text-zinc-600 border-zinc-200';
      case 'archived':
        return isDarkMode ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-zinc-100 text-zinc-600 border-zinc-200';
      default:
        return isDarkMode ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const formattedIframeDoc = formatContractDocumentHtml(contract.renderedContent, contract.title, contract.contractNumber);

  const modalBorder = isDarkMode ? 'border-zinc-800' : 'border-zinc-200';
  const modalBg = isDarkMode ? 'bg-black text-white border-zinc-800 shadow-2xl' : 'bg-white text-zinc-900 border-zinc-200 shadow-xl';
  const textSub = isDarkMode ? 'text-zinc-400' : 'text-zinc-500';

  const formatDateDisplay = (dateStr?: string | null): string => {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, d] = dateStr.split('-');
      return `${d}.${m}.${y}`;
    }
    return dateStr;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className={`w-full h-full sm:h-auto sm:max-h-[90vh] max-w-5xl rounded-none sm:rounded-2xl border-0 sm:border shadow-2xl flex flex-col overflow-hidden transition-all transform scale-100 animate-in zoom-in-95 duration-150 ${modalBg}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 pt-5 pb-3.5 flex items-center justify-between shrink-0">
          <div className="min-w-0 pr-3">
            <h3 className="font-bold text-base sm:text-lg tracking-tight truncate">
              {contract.title}
            </h3>
            {contract.contractNumber && (
              <p className={`text-xs ${textSub} font-mono truncate`}>
                {contract.contractNumber}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label={t('common.close', 'Închide')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className={`mx-5 sm:mx-6 border-b ${modalBorder}`} />

        {/* Scrollable Document Body */}
        <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-4 text-sm flex flex-col min-h-0">
          {/* Metadata & Status Strip */}
          <div className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 ${
            isDarkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-100 border-zinc-200'
          }`}>
            <div className="flex flex-wrap items-center gap-3 text-zinc-400">
              {contract.validFrom && (
                <div>
                  <span className="font-semibold text-zinc-500 mr-1">{t('legal.validFrom', 'Valabil')}:</span>
                  <span className="text-zinc-200 font-mono">{formatDateDisplay(contract.validFrom)}</span>
                </div>
              )}
            </div>

            {/* Status Changer */}
            <div className="flex items-center space-x-2">
              <span className="text-zinc-400 font-medium">{t('legal.status', 'Stare')}:</span>
              <select
                value={contract.status}
                disabled={isUpdatingStatus}
                onChange={e => handleStatusSelect(e.target.value as ContractStatus)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border focus:outline-hidden cursor-pointer ${getStatusBadge(contract.status)}`}
              >
                <option value="not_signed">{t('legal.statusNotSigned', 'Nesemnat')}</option>
                <option value="signed">{t('legal.statusSigned', 'Semnat')}</option>
                <option value="draft">{t('legal.statusDraft', 'Draft')}</option>
                <option value="pending_signature">{t('legal.statusPending', 'Așteaptă Semnare')}</option>
                <option value="archived">{t('legal.statusArchived', 'Arhivat')}</option>
              </select>
            </div>
          </div>

          {/* Sandboxed Document Preview Container */}
          <div className="flex-1 min-h-[400px] p-2 rounded-xl bg-zinc-900/50 border border-zinc-800 flex justify-center items-stretch">
            <div className="w-full max-w-[860px] h-full bg-white rounded-lg shadow-xl overflow-hidden border border-zinc-300">
              {contract.pdfData ? (
                <iframe
                  src={`/api/admin/legal/contracts/${contract.id}/pdf`}
                  title={contract.title}
                  className="w-full h-full min-h-[380px] border-0"
                />
              ) : (
                <iframe
                  srcDoc={formattedIframeDoc}
                  title={contract.title}
                  className="w-full h-full min-h-[380px] border-0"
                  sandbox="allow-same-origin allow-scripts"
                />
              )}
            </div>
          </div>
        </div>

        <div className={`mx-5 sm:mx-6 border-t ${modalBorder}`} />

        {/* Footer Actions */}
        <div className="px-5 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="text-xs text-zinc-500 truncate pr-3">
            {contract.notes ? `${t('legal.notes', 'Obs')}: ${contract.notes}` : ''}
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3.5 py-1.5 rounded-xl border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition cursor-pointer"
            >
              {copied ? t('legal.copied', 'Copiat!') : t('legal.copyContract', 'Copiază')}
            </button>

            {googleDocsEditUrl && (
              <a
                href={googleDocsEditUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center cursor-pointer shadow-md transition shrink-0"
              >
                {t('legal.openInGoogleDocs', 'Deschide în Google Docs')}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
