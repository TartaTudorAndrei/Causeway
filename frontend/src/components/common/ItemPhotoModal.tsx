import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface ItemPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  photoUrl?: string | null;
  isDarkMode: boolean;
}

function extractGoogleDriveFileId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch) return fileDMatch[1];
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch) return idParamMatch[1];
  const lh3Match = trimmed.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  if (lh3Match) return lh3Match[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

function formatPhotoUrl(url: string | undefined | null): string {
  if (!url) return '';
  const fileId = extractGoogleDriveFileId(url);
  if (fileId) {
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }
  return url.trim();
}

export const ItemPhotoModal: React.FC<ItemPhotoModalProps> = ({
  isOpen,
  onClose,
  itemName,
  photoUrl,
  isDarkMode,
}) => {
  const { t } = useLanguage();
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [photoUrl, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const fileId = photoUrl ? extractGoogleDriveFileId(photoUrl) : null;
  const directImageUrl = formatPhotoUrl(photoUrl);
  const driveIframeUrl = fileId ? `https://drive.google.com/file/d/${fileId}/preview` : null;

  const modalBg = isDarkMode
    ? 'w-full h-full sm:h-auto sm:max-h-[90vh] max-w-4xl rounded-none sm:rounded-2xl border-0 sm:border flex flex-col overflow-hidden shadow-2xl bg-black text-white border-zinc-800 transition-all transform scale-100 animate-in zoom-in-95 duration-150'
    : 'w-full h-full sm:h-auto sm:max-h-[90vh] max-w-4xl rounded-none sm:rounded-2xl border-0 sm:border flex flex-col overflow-hidden shadow-2xl bg-white text-zinc-900 border-zinc-200 transition-all transform scale-100 animate-in zoom-in-95 duration-150';

  const modalBorder = isDarkMode ? 'border-zinc-800' : 'border-zinc-200';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150" onClick={onClose}>
      <div className={modalBg} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 sm:px-6 pt-5 pb-3.5 flex items-center justify-between shrink-0">
          <div className="min-w-0 pr-4">
            <h3 className="font-bold text-base sm:text-lg tracking-tight truncate">
              {itemName}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close', 'Închide')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Inset Divider 1 */}
        <div className={`mx-5 sm:mx-6 border-b ${modalBorder}`} />

        {/* Scrollable Preview Body */}
        <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 flex flex-col items-center justify-center min-h-[350px]">
          {directImageUrl && !imgError ? (
            <div className="w-full h-full flex items-center justify-center p-2 rounded-xl bg-zinc-900/40 border border-zinc-800/60 overflow-hidden">
              <img
                src={directImageUrl}
                alt={itemName}
                onError={() => setImgError(true)}
                className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-md"
                loading="lazy"
              />
            </div>
          ) : driveIframeUrl ? (
            <div className="w-full h-[65vh] rounded-xl overflow-hidden border border-zinc-800 shadow-inner bg-zinc-900/40">
              <iframe
                src={driveIframeUrl}
                title={itemName}
                className="w-full h-full border-0 bg-white"
                allow="autoplay"
              />
            </div>
          ) : (
            <div className="text-center py-12 px-4 space-y-2">
              <p className="text-sm text-zinc-400">
                {t('logistics.noPhotoAvailable', 'Nu există o previzualizare disponibilă pentru această imagine.')}
              </p>
            </div>
          )}
        </div>

        {/* Inset Divider 2 */}
        <div className={`mx-5 sm:mx-6 border-b ${modalBorder}`} />

        {/* Minimal Clean Footer */}
        <div className="px-5 sm:px-6 py-3.5 flex items-center justify-end shrink-0" />
      </div>
    </div>
  );
};
