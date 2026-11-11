import React, { useEffect, useState } from 'react';
import { X, ExternalLink, Download } from 'lucide-react';
import type { MarketingResource } from '../../types/marketing';
import { marketingService } from '../../services/marketingService';
import { useLanguage } from '../../context/LanguageContext';

interface ResourcePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: MarketingResource | null;
  isDarkMode: boolean;
}

export const ResourcePreviewModal: React.FC<ResourcePreviewModalProps> = ({
  isOpen,
  onClose,
  resource,
  isDarkMode,
}) => {
  const { t } = useLanguage();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !resource) {
      setBlobUrl(null);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    const mime = resource.mimeType || '';
    const isImage = mime.startsWith('image/');
    const isPdf = mime.includes('pdf');

    if (!isImage && !isPdf) {
      setBlobUrl(null);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    let activeUrl = '';
    let isCancelled = false;

    setIsLoading(true);
    setHasError(false);
    setBlobUrl(null);

    marketingService
      .fetchFileBlob(resource.id)
      .then((url) => {
        if (isCancelled) {
          window.URL.revokeObjectURL(url);
        } else {
          activeUrl = url;
          setBlobUrl(url);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setHasError(true);
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
      if (activeUrl) {
        window.URL.revokeObjectURL(activeUrl);
      }
    };
  }, [isOpen, resource]);

  if (!isOpen || !resource) return null;

  const mime = resource.mimeType || '';
  const isImage = mime.startsWith('image/');
  const isPdf = mime.includes('pdf');

  const handleDownload = async () => {
    if (!resource || isDownloading) return;
    try {
      setIsDownloading(true);
      await marketingService.downloadFile(resource.id, resource.name);
    } catch {
      // Handled
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`w-full h-full sm:h-auto sm:max-h-[90vh] max-w-4xl rounded-none sm:rounded-2xl border-0 sm:border flex flex-col overflow-hidden shadow-2xl transition-all transform scale-100 animate-in zoom-in-95 duration-150 ${
          isDarkMode ? 'bg-black text-white border-zinc-800' : 'bg-white text-zinc-900 border-zinc-200'
        }`}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 pt-5 pb-3.5 flex items-center justify-between shrink-0">
          <div className="min-w-0 pr-4">
            <h3 className="font-bold text-base sm:text-lg tracking-tight truncate">
              {resource.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`p-1.5 rounded-lg transition cursor-pointer shrink-0 ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Inset Divider 1 */}
        <div className={`mx-5 sm:mx-6 border-b ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`} />

        {/* Scrollable Preview Body */}
        <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 flex flex-col items-center justify-center min-h-[350px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : hasError ? (
            <div className="text-center py-12 px-4 space-y-4">
              <p className="text-sm text-rose-400">
                {t('marketing.previewLoadError', 'Nu s-a putut încărca previzualizarea fișierului.')}
              </p>
              <div className="flex items-center justify-center gap-3">
                {resource.webViewLink && (
                  <a
                    href={resource.webViewLink}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/50 transition cursor-pointer"
                  >
                    <ExternalLink size={14} />
                    <span>{t('marketing.openFileInDrive', 'Deschide în Google Drive')}</span>
                  </a>
                )}
                <button
                  type="button"
                  disabled={isDownloading}
                  onClick={handleDownload}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  <Download size={14} />
                  <span>{t('marketing.downloadFile', 'Descarcă')}</span>
                </button>
              </div>
            </div>
          ) : isImage && blobUrl ? (
            <div className="w-full h-full flex items-center justify-center p-2 rounded-xl bg-zinc-900/40 border border-zinc-800/60 overflow-hidden">
              <img
                src={blobUrl}
                alt={resource.name}
                className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-md"
              />
            </div>
          ) : isPdf && blobUrl ? (
            <div className="w-full h-[65vh] rounded-xl overflow-hidden border border-zinc-800 shadow-inner bg-zinc-900/40">
              <iframe
                src={blobUrl}
                title={resource.name}
                className="w-full h-full border-0 bg-white"
              />
            </div>
          ) : (
            <div className="text-center py-12 px-4 space-y-4">
              <p className="text-sm text-zinc-400">
                {t('marketing.noDirectPreview', 'Previzualizarea directă în pagină nu este disponibilă pentru acest tip de fișier.')}
              </p>
              <div className="flex items-center justify-center gap-3">
                {resource.webViewLink && (
                  <a
                    href={resource.webViewLink}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/50 transition cursor-pointer"
                  >
                    <ExternalLink size={14} />
                    <span>{t('marketing.openFileInDrive', 'Deschide în Google Drive')}</span>
                  </a>
                )}
                <button
                  type="button"
                  disabled={isDownloading}
                  onClick={handleDownload}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  <Download size={14} />
                  <span>{t('marketing.downloadFile', 'Descarcă')}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Inset Divider 2 */}
        <div className={`mx-5 sm:mx-6 border-b ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`} />

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="text-xs text-zinc-400 truncate pr-2 font-mono">
            {resource.size ? (resource.size / (1024 * 1024)).toFixed(2) + ' MB' : ''}
          </div>
          <div className="flex items-center space-x-2">
            {resource.webViewLink && (
              <a
                href={resource.webViewLink}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/50 transition cursor-pointer"
              >
                <ExternalLink size={13} />
                <span>{t('marketing.openFileInDrive', 'Deschide în Google Drive')}</span>
              </a>
            )}
            <button
              type="button"
              disabled={isDownloading}
              onClick={handleDownload}
              className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition cursor-pointer disabled:opacity-50"
            >
              <Download size={13} />
              <span>{t('marketing.downloadFile', 'Descarcă')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
