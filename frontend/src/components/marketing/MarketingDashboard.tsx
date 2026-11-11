import React, { useState, useEffect, useCallback } from 'react';
import { ExternalLink } from 'lucide-react';
import {
  DashboardContainer,
  DashboardHeaderSection,
  SearchInput,
  FilterPopover,
  ToastNotification,
} from '../common';
import { useLanguage } from '../../context/LanguageContext';
import { marketingService } from '../../services/marketingService';
import type { MarketingResource } from '../../types/marketing';
import { MarketingResourcesView } from './MarketingResourcesView';

interface MarketingDashboardProps {
  isDarkMode: boolean;
}

export const MarketingDashboard: React.FC<MarketingDashboardProps> = ({ isDarkMode }) => {
  const { t } = useLanguage();

  // Sub-Tab: 'resources'
  const activeSubTab = 'resources';

  // State
  const [resources, setResources] = useState<MarketingResource[]>([]);
  const [folderId, setFolderId] = useState<string | undefined>();
  const [folderUrl, setFolderUrl] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const [folderStack, setFolderStack] = useState<{ id: string; name: string }[]>([]);
  const currentFolderId = folderStack.length > 0 ? folderStack[folderStack.length - 1].id : undefined;

  // Toast state
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
  };

  const loadResources = useCallback(async (targetFolderId?: string) => {
    setIsLoading(true);
    try {
      const data = await marketingService.getResources(targetFolderId);
      setResources(data.resources || []);
      setFolderId(data.folderId);
      setFolderUrl(data.folderUrl);
    } catch (err: any) {
      showToast(err?.message || t('marketing.errorLoading', 'Eroare la încărcarea datelor modulului marketing'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadResources(currentFolderId);
  }, [loadResources, currentFolderId]);

  const handleOpenFolder = (folder: { id: string; name: string }) => {
    setFolderStack((prev) => {
      if (prev.length > 0 && prev[prev.length - 1].id === folder.id) {
        return prev;
      }
      return [...prev, folder];
    });
  };

  const handleNavigateBreadcrumb = (index: number) => {
    if (index === -1) {
      setFolderStack([]);
    } else {
      setFolderStack((prev) => {
        if (index >= prev.length - 1) return prev;
        return prev.slice(0, index + 1);
      });
    }
  };

  const activeFilterCount = typeFilter !== 'ALL' ? 1 : 0;

  return (
    <DashboardContainer noScroll>
      <ToastNotification toast={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Navigation Sub-Tabs Header */}
      <DashboardHeaderSection
        isDarkMode={isDarkMode}
        activeTabLabel={t('marketing.subtabResources', 'Resurse')}
        activeFilterCount={activeFilterCount}
        searchQuery={searchQuery}
        subTabNav={undefined}
        controls={
          activeSubTab === 'resources' ? (
            <>
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={t('marketing.searchPlaceholder', 'Caută resurse după nume sau extensie...')}
                isDarkMode={isDarkMode}
              />

              <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0">
                <FilterPopover
                  activeCount={activeFilterCount}
                  onReset={() => setTypeFilter('ALL')}
                  isDarkMode={isDarkMode}
                >
                  <div className="space-y-3 p-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                        {t('marketing.materialType', 'Tip')}
                      </label>
                      <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className={`w-full h-[34px] px-2.5 text-xs rounded-xl border focus:outline-hidden cursor-pointer ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-300 text-zinc-900'}`}
                      >
                        <option value="ALL">{t('marketing.allTypes', 'Toate tipurile')}</option>
                        <option value="IMAGES">{t('marketing.typeImages', 'Imagini')}</option>
                        <option value="PDFS">{t('marketing.typePdfs', 'Documente PDF')}</option>
                        <option value="OTHER">{t('marketing.typeOther', 'Alte Fișiere')}</option>
                      </select>
                    </div>
                  </div>
                </FilterPopover>

                {folderUrl && (
                  <a
                    href={folderUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/50 transition cursor-pointer shrink-0 shadow-xs"
                  >
                    <ExternalLink size={13} />
                    <span>{t('marketing.openDriveFolder', 'Deschide în Google Drive')}</span>
                  </a>
                )}
              </div>
            </>
          ) : undefined
        }
      />

      {/* Main SubTab Views */}
      <MarketingResourcesView
        resources={resources}
        folderUrl={folderUrl}
        folderId={folderId}
        folderStack={folderStack}
        onOpenFolder={handleOpenFolder}
        onNavigateBreadcrumb={handleNavigateBreadcrumb}
        isLoading={isLoading}
        searchQuery={searchQuery}
        typeFilter={typeFilter}
        onRefresh={() => loadResources(currentFolderId)}
        isDarkMode={isDarkMode}
      />
    </DashboardContainer>
  );
};

export default MarketingDashboard;
