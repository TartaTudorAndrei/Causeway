import React, { useState } from 'react';
import { ExternalLink, Download, Eye, FileQuestion, Folder, ChevronLeft, FileText } from 'lucide-react';
import type { MarketingResource } from '../../types/marketing';
import { marketingService } from '../../services/marketingService';
import { useLanguage } from '../../context/LanguageContext';
import { EmptyState } from '../common';
import { ResourcePreviewModal } from './ResourcePreviewModal';

interface MarketingResourcesViewProps {
  resources: MarketingResource[];
  folderUrl?: string;
  folderId?: string;
  folderStack: { id: string; name: string }[];
  onOpenFolder: (folder: { id: string; name: string }) => void;
  onNavigateBreadcrumb: (index: number) => void;
  isLoading: boolean;
  searchQuery: string;
  typeFilter: string;
  onRefresh?: () => void;
  isDarkMode: boolean;
}

export const MarketingResourcesView: React.FC<MarketingResourcesViewProps> = ({
  resources,
  folderStack,
  onOpenFolder,
  onNavigateBreadcrumb,
  isLoading,
  searchQuery,
  typeFilter,
  isDarkMode,
}) => {
  const { t } = useLanguage();
  const [selectedResource, setSelectedResource] = useState<MarketingResource | null>(null);

  const filteredResources = resources.filter((res) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!res.name.toLowerCase().includes(q)) {
        return false;
      }
    }
    const isFolder = Boolean(
      res.isFolder ||
      res.folder ||
      res.mimeType === 'application/vnd.google-apps.folder' ||
      res.mimeType?.includes('folder')
    );
    if (isFolder) {
      return true;
    }
    if (typeFilter === 'IMAGES') {
      return res.mimeType?.startsWith('image/');
    }
    if (typeFilter === 'PDFS') {
      return res.mimeType?.includes('pdf');
    }
    if (typeFilter === 'OTHER') {
      return !res.mimeType?.startsWith('image/') && !res.mimeType?.includes('pdf');
    }
    return true;
  });

  const handleFolderClick = (folder: { id: string; name: string }) => {
    if (isLoading) return;
    onOpenFolder(folder);
  };

  const handleDownload = (e: React.MouseEvent, item: MarketingResource) => {
    e.stopPropagation();
    marketingService.downloadFile(item.id, item.name).catch(() => {
      // Handled
    });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-3">
      {/* Subfolder Breadcrumb Navigation Bar (only rendered when inside a folder) */}
      {folderStack.length > 0 && (
        <div className="flex items-center space-x-1.5 text-xs font-medium overflow-x-auto py-0.5 px-1 shrink-0">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => onNavigateBreadcrumb(folderStack.length - 2)}
            className={`p-1 rounded-lg transition cursor-pointer shrink-0 disabled:opacity-50 ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'}`}
            title={t('common.back', 'Înapoi')}
          >
            <ChevronLeft size={16} />
          </button>

          {folderStack.map((folder, idx) => (
            <React.Fragment key={folder.id}>
              {idx > 0 && <span className="text-zinc-600">/</span>}
              <button
                type="button"
                disabled={isLoading}
                onClick={() => onNavigateBreadcrumb(idx)}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer max-w-[140px] truncate disabled:opacity-50 ${
                  idx === folderStack.length - 1
                    ? (isDarkMode ? 'bg-zinc-800 text-white border border-zinc-700 font-semibold' : 'bg-zinc-200 text-zinc-900 border border-zinc-300 font-semibold')
                    : (isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100')
                }`}
                title={folder.name}
              >
                {folder.name}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Main Content Area: Inner Scroll Container with Smaller Compact Squares */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {isLoading && resources.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredResources.length === 0 ? (
          <EmptyState
            title={t('marketing.noResourcesFound', 'Nicio resursă găsită')}
            description={t('marketing.noResourcesDesc', 'Nu există fișiere în folderul de marketing sau niciun rezultat nu corespunde căutării.')}
            isDarkMode={isDarkMode}
            className="max-w-md mx-auto my-8"
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 pb-2">
            {filteredResources.map((item) => {
              const isFolder = Boolean(
                item.isFolder ||
                item.folder ||
                item.mimeType === 'application/vnd.google-apps.folder' ||
                item.mimeType?.includes('folder')
              );

              // FOLDER SQUARE CARD
              if (isFolder) {
                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border flex flex-col overflow-hidden transition-all duration-200 hover:border-zinc-700/80 ${
                      isDarkMode ? 'bg-zinc-950 border-zinc-850' : 'bg-white border-zinc-200 shadow-xs'
                    }`}
                  >
                    {/* Folder Square Area - click to open */}
                    <div
                      onClick={() => handleFolderClick({ id: item.id, name: item.name })}
                      className={`relative w-full aspect-square transition-colors flex items-center justify-center border-b cursor-pointer group ${isDarkMode ? 'bg-zinc-900/80 hover:bg-zinc-900 border-zinc-850' : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200'}`}
                    >
                      <Folder size={38} className={`${isDarkMode ? 'text-zinc-400 group-hover:text-zinc-200' : 'text-zinc-500 group-hover:text-zinc-700'} transition-colors`} />
                    </div>

                    {/* Card Details & Action Footer matching file cards */}
                    <div className="p-2.5 flex flex-col flex-1 justify-between gap-2">
                      <div>
                        <h4
                          onClick={() => handleFolderClick({ id: item.id, name: item.name })}
                          className={`font-semibold text-xs transition-colors cursor-pointer truncate ${isDarkMode ? 'text-zinc-100 hover:text-zinc-300' : 'text-zinc-900 hover:text-blue-600'}`}
                          title={item.name}
                        >
                          {item.name}
                        </h4>
                      </div>

                      {/* Separator line with action button aligned right */}
                      <div className={`flex items-center justify-end gap-1 pt-1.5 border-t ${isDarkMode ? 'border-zinc-850/80' : 'border-zinc-200'}`}>

                        {item.webViewLink ? (
                          <a
                            href={item.webViewLink}
                            target="_blank"
                            rel="noreferrer noopener"
                            onClick={(e) => e.stopPropagation()}
                            className={`p-1 rounded-md transition cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}
                            title={t('marketing.openFileInDrive', 'Deschide în Google Drive')}
                          >
                            <ExternalLink size={14} />
                          </a>
                        ) : (
                          <div className="h-6" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              // FILE SQUARE CARD
              const isImg = item.mimeType?.startsWith('image/');
              const isPdf = item.mimeType?.includes('pdf');
              const previewUrl = marketingService.getPreviewUrl(item.id);

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border flex flex-col overflow-hidden transition-all duration-200 hover:border-zinc-700/80 ${
                    isDarkMode ? 'bg-zinc-950 border-zinc-850' : 'bg-white border-zinc-200 shadow-xs'
                  }`}
                >
                  {/* Smaller Square Preview Box */}
                  <div
                    onClick={() => setSelectedResource(item)}
                    className={`relative w-full aspect-square overflow-hidden cursor-pointer group flex items-center justify-center border-b ${isDarkMode ? 'bg-zinc-900/80 border-zinc-850' : 'bg-zinc-50 border-zinc-200'}`}
                  >
                    {isImg ? (
                      <img
                        src={item.thumbnailLink || previewUrl}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : isPdf ? (
                      item.thumbnailLink ? (
                        <img
                          src={item.thumbnailLink}
                          alt={item.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <FileText size={28} className="text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                      )
                    ) : (
                      <FileQuestion size={28} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                    )}

                    {/* Hover Overlay with Eye Icon */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <div className="p-1.5 rounded-lg bg-black/60 text-white backdrop-blur-xs shadow-md">
                        <Eye size={15} />
                      </div>
                    </div>
                  </div>

                  {/* Card Details & Compact Action Footer */}
                  <div className="p-2.5 flex flex-col flex-1 justify-between gap-2">
                    <div>
                      <h4
                        onClick={() => setSelectedResource(item)}
                        className={`font-semibold text-xs transition-colors cursor-pointer truncate ${isDarkMode ? 'text-zinc-100 hover:text-blue-400' : 'text-zinc-900 hover:text-blue-600'}`}
                        title={item.name}
                      >
                        {item.name}
                      </h4>
                    </div>

                    {/* Simple Action Buttons Row */}
                    <div className={`flex items-center justify-between gap-1 pt-1.5 border-t ${isDarkMode ? 'border-zinc-850/80' : 'border-zinc-200'}`}>

                      <button
                        type="button"
                        onClick={() => setSelectedResource(item)}
                        className="p-1 rounded-md text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition cursor-pointer"
                        title={t('marketing.preview', 'Previzualizare')}
                      >
                        <Eye size={14} />
                      </button>

                      <div className="flex items-center space-x-1">
                        {item.webViewLink && (
                          <a
                            href={item.webViewLink}
                            target="_blank"
                            rel="noreferrer noopener"
                            onClick={(e) => e.stopPropagation()}
                            className={`p-1 rounded-md transition cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}
                            title={t('marketing.openFileInDrive', 'Deschide în Google Drive')}
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleDownload(e, item)}
                          className="p-1 rounded-md text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition cursor-pointer"
                          title={t('marketing.downloadFile', 'Descarcă')}
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <ResourcePreviewModal
        isOpen={Boolean(selectedResource)}
        onClose={() => setSelectedResource(null)}
        resource={selectedResource}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};
