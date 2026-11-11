import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardContainer, SubTabNav, ToastNotification, DashboardHeaderSection, SearchInput, FilterPopover, ConfirmationModal } from '../common';
import type { ContractTemplate, GeneratedContract, ContractStatus, LegalStats } from '../../types/legal';
import { legalService } from '../../services/legalService';
import { usePermission } from '../../hooks/usePermission';
import { useLanguage } from '../../context/LanguageContext';
import { ContractTemplatesView } from './ContractTemplatesView';
import { ContractGeneratorView } from './ContractGeneratorView';
import { GeneratedContractsView } from './GeneratedContractsView';
import { TemplateEditorModal } from './TemplateEditorModal';
import { ContractViewerModal } from './ContractViewerModal';
import { LegalStatisticsView } from './LegalStatisticsView';

interface LegalDashboardProps {
  isDarkMode: boolean;
}

const LEGAL_TAB_PERMISSIONS: Record<string, string[]> = {
  'templates': ['legal:templates:read', 'legal:templates:view'],
  'generator': ['legal:contracts:write', 'legal:generator:view'],
  'contracts': ['legal:contracts:read', 'legal:contracts:view'],
  'statistics': ['legal:statistics:read', 'legal:statistics:view'],
};

const VALID_LEGAL_SUB_TABS = ['templates', 'generator', 'contracts', 'statistics'];

export const LegalDashboard: React.FC<LegalDashboardProps> = ({ isDarkMode }) => {
  const { t } = useLanguage();
  const { hasPermission, isSuperAdmin } = usePermission();
  const [searchParams, setSearchParams] = useSearchParams();

  // Permissions
  const isTabAccessible = useCallback((tabId: string): boolean => {
    if (isSuperAdmin) return true;
    const codes = LEGAL_TAB_PERMISSIONS[tabId];
    return codes ? codes.some(code => hasPermission(code)) : true;
  }, [isSuperAdmin, hasPermission]);

  // URL-Driven Sub-Tab ('templates' | 'generator' | 'contracts' | 'statistics')
  const accessibleTabs = VALID_LEGAL_SUB_TABS.filter(tab => isTabAccessible(tab));
  const rawSubTab = searchParams.get('subtab');
  const requestedTab = (rawSubTab && VALID_LEGAL_SUB_TABS.includes(rawSubTab)) ? rawSubTab : 'templates';
  const activeSubTab = isTabAccessible(requestedTab) ? requestedTab : (accessibleTabs[0] || 'templates');

  const setSubTab = useCallback((subtab: 'templates' | 'generator' | 'contracts' | 'statistics', extraParams?: Record<string, string>) => {
    if (!isTabAccessible(subtab)) return;
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('subtab', subtab);
      if (extraParams) {
        Object.entries(extraParams).forEach(([k, v]) => next.set(k, v));
      }
      return next;
    });
  }, [isTabAccessible, setSearchParams]);

  useEffect(() => {
    if (rawSubTab && !isTabAccessible(rawSubTab)) {
      setSubTab(activeSubTab as 'templates' | 'generator' | 'contracts' | 'statistics');
    }
  }, [rawSubTab, activeSubTab, isTabAccessible, setSubTab]);

  const canWriteLegal = hasPermission('legal:contract:write', 'DEPARTMENT', 'legal-dept-uuid') ||
                        hasPermission('legal:contract:create', 'DEPARTMENT', 'legal-dept-uuid') ||
                        isSuperAdmin;

  // State
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [contracts, setContracts] = useState<GeneratedContract[]>([]);
  const [stats, setStats] = useState<LegalStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Search & Filter State
  const [templateSearchQuery, setTemplateSearchQuery] = useState<string>('');
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<string>('ALL');

  const [contractSearchQuery, setContractSearchQuery] = useState<string>('');
  const [contractStatusFilter, setContractStatusFilter] = useState<string>('ALL');

  // Modals state
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const [viewerContract, setViewerContract] = useState<GeneratedContract | null>(null);

  // Selected template for generator tab
  const [selectedTemplateForGen, setSelectedTemplateForGen] = useState<string | null>(null);

  // Toast State
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
  }, []);

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedTemplates, fetchedContracts, fetchedStats] = await Promise.all([
        legalService.getTemplates(),
        legalService.getContracts(),
        legalService.getStats().catch(() => null),
      ]);
      setTemplates(fetchedTemplates);
      setContracts(fetchedContracts);
      if (fetchedStats) setStats(fetchedStats);
    } catch (err) {
      console.error('Error loading legal data:', err);
      showToast(t('legal.loadError', 'Eroare la încărcarea datelor Legal'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast, t]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Template Handlers
  const handleSaveTemplate = async (templateData: Partial<ContractTemplate>) => {
    try {
      if (templateData.id) {
        await legalService.updateTemplate(templateData.id, templateData);
        showToast(t('legal.templateSaved', 'Șablonul a fost actualizat.'));
      } else {
        await legalService.createTemplate(templateData);
        showToast(t('legal.templateSaved', 'Șablonul a fost creat cu succes.'));
      }
      await loadAllData();
    } catch (err: any) {
      showToast(err?.message || 'Eroare la salvarea șablonului', 'error');
    }
  };

  // Confirmation Modal State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    message: '',
    onConfirm: () => {},
  });

  const handleDeleteTemplate = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: t('legal.deleteTemplateTitle', 'Șterge Șablon'),
      message: t('legal.confirmDeleteTemplate', 'Sigur doriți să ștergeți acest șablon?'),
      onConfirm: async () => {
        try {
          await legalService.deleteTemplate(id);
          showToast(t('legal.templateDeleted', 'Șablonul a fost șters.'));
          await loadAllData();
        } catch (err: any) {
          showToast(err?.message || 'Eroare la ștergerea șablonului', 'error');
        } finally {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleUseTemplateInGenerator = (template: ContractTemplate) => {
    setSelectedTemplateForGen(template.id);
    setSubTab('generator');
  };

  // Contract Generation Handlers
  const handleGenerateContract = async (contractData: any) => {
    try {
      await legalService.generateContract(contractData);
      showToast(t('legal.contractGenerated', 'Contractul a fost generat și salvat în Drive!'));
      await loadAllData();
      setSubTab('contracts');
    } catch (err: any) {
      showToast(err?.message || 'Eroare la generarea contractului', 'error');
    }
  };

  const handleStatusChange = async (id: string, newStatus: ContractStatus) => {
    try {
      const updated = await legalService.updateContract(id, { status: newStatus });
      setViewerContract(updated);
      showToast(t('legal.contractUpdated', 'Starea contractului a fost actualizată.'));
      await loadAllData();
    } catch (err: any) {
      showToast(err?.message || 'Eroare la actualizarea stării', 'error');
    }
  };

  const handleDeleteContract = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: t('legal.deleteContractTitle', 'Șterge Contract'),
      message: t('legal.confirmDeleteContract', 'Sigur doriți să ștergeți acest contract?'),
      onConfirm: async () => {
        try {
          await legalService.deleteContract(id);
          showToast(t('legal.contractDeleted', 'Contractul a fost șters.'));
          if (viewerContract?.id === id) setViewerContract(null);
          await loadAllData();
        } catch (err: any) {
          showToast(err?.message || 'Eroare la ștergerea contractului', 'error');
        } finally {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const subTabItems: { id: 'templates' | 'generator' | 'contracts' | 'statistics'; label: string; disabled?: boolean }[] = [
    {
      id: 'templates',
      label: t('legal.tabTemplates', 'Șabloane Documente'),
      disabled: !isTabAccessible('templates'),
    },
    {
      id: 'generator',
      label: t('legal.tabGenerator', 'Generator Documente'),
      disabled: !isTabAccessible('generator'),
    },
    {
      id: 'contracts',
      label: t('legal.tabContracts', 'Documente Generate'),
      disabled: !isTabAccessible('contracts'),
    },
    {
      id: 'statistics',
      label: t('common.tabStatistics', 'Statistici'),
      disabled: !isTabAccessible('statistics'),
    },
  ];

  const activeLegalFilterCount =
    activeSubTab === 'templates'
      ? (templateCategoryFilter !== 'ALL' ? 1 : 0)
      : activeSubTab === 'contracts'
      ? (contractStatusFilter !== 'ALL' ? 1 : 0)
      : 0;

  const currentSearchQuery =
    activeSubTab === 'templates'
      ? templateSearchQuery
      : activeSubTab === 'contracts'
      ? contractSearchQuery
      : '';

  return (
    <DashboardContainer noScroll>
      
      {/* Toast Notification (Top Right) */}
      <ToastNotification toast={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Unified Dashboard Sub-Header */}
      <DashboardHeaderSection
        isDarkMode={isDarkMode}
        activeTabLabel={
          activeSubTab === 'templates' ? t('legal.tabTemplates', 'Șabloane Documente') :
          activeSubTab === 'generator' ? t('legal.tabGenerator', 'Generator Documente') :
          activeSubTab === 'contracts' ? t('legal.tabContracts', 'Documente Generate') :
          t('common.tabStatistics', 'Statistici')
        }
        activeFilterCount={activeLegalFilterCount}
        searchQuery={currentSearchQuery}
        subTabNav={
          <SubTabNav<'templates' | 'generator' | 'contracts' | 'statistics'>
            tabs={subTabItems}
            activeTab={activeSubTab as 'templates' | 'generator' | 'contracts' | 'statistics'}
            onChange={(tabId) => setSubTab(tabId)}
            isDarkMode={isDarkMode}
          />
        }
        controls={
          activeSubTab === 'templates' ? (
            <>
              <SearchInput
                value={templateSearchQuery}
                onChange={setTemplateSearchQuery}
                placeholder={t('legal.searchPlaceholder', 'Caută după titlu...')}
                isDarkMode={isDarkMode}
              />
              <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0">
                <FilterPopover
                  activeCount={templateCategoryFilter !== 'ALL' ? 1 : 0}
                  onReset={() => setTemplateCategoryFilter('ALL')}
                  isDarkMode={isDarkMode}
                >
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                      {t('legal.category', 'Categorie Șablon')}
                    </label>
                    <select
                      value={templateCategoryFilter}
                      onChange={e => setTemplateCategoryFilter(e.target.value)}
                      className={`w-full px-3 py-2 text-xs rounded-xl border font-medium outline-hidden ${
                        isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                      }`}
                    >
                      <option value="ALL">{t('legal.allCategories', 'Toate Categoriile')}</option>
                      <option value="sponsorship">{t('legal.categorySponsorship', 'Sponsorizare')}</option>
                      <option value="partnership">{t('legal.categoryPartnership', 'Parteneriat')}</option>
                      <option value="contract">{t('legal.categoryContract', 'Contract')}</option>
                      <option value="volunteer">{t('legal.categoryVolunteer', 'Voluntariat')}</option>
                      <option value="vendor">{t('legal.categoryVendor', 'Prestări Servicii')}</option>
                      <option value="general">{t('legal.categoryGeneral', 'General')}</option>
                    </select>
                  </div>
                </FilterPopover>

                {canWriteLegal && (
                  <button
                    onClick={() => {
                      setEditingTemplate(null);
                      setIsTemplateModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer shadow-md transition-all shrink-0"
                  >
                    <span>{t('legal.newTemplate', 'Șablon Nou')}</span>
                  </button>
                )}
              </div>
            </>
          ) : activeSubTab === 'contracts' ? (
            <>
              <SearchInput
                value={contractSearchQuery}
                onChange={setContractSearchQuery}
                placeholder={t('legal.searchPlaceholder', 'Caută după titlu, număr...')}
                isDarkMode={isDarkMode}
              />
              <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0">
                <FilterPopover
                  activeCount={contractStatusFilter !== 'ALL' ? 1 : 0}
                  onReset={() => setContractStatusFilter('ALL')}
                  isDarkMode={isDarkMode}
                >
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                      {t('legal.status', 'Stare Document')}
                    </label>
                    <select
                      value={contractStatusFilter}
                      onChange={e => setContractStatusFilter(e.target.value)}
                      className={`w-full px-3 py-2 text-xs rounded-xl border font-medium outline-hidden ${
                        isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                      }`}
                    >
                      <option value="ALL">{t('legal.allStatuses', 'Toate Stările')}</option>
                      <option value="not_signed">{t('legal.statusNotSigned', 'Nesemnat')}</option>
                      <option value="signed">{t('legal.statusSigned', 'Semnat')}</option>
                      <option value="draft">{t('legal.statusDraft', 'Ciornă')}</option>
                      <option value="pending_signature">{t('legal.statusPending', 'Așteaptă Semnare')}</option>
                      <option value="archived">{t('legal.statusArchived', 'Arhivat')}</option>
                    </select>
                  </div>
                </FilterPopover>

                {canWriteLegal && (
                  <button
                    onClick={() => setSubTab('generator')}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer shadow-md transition-all shrink-0"
                  >
                    <span>{t('legal.generateContract', 'Generează Document')}</span>
                  </button>
                )}
              </div>
            </>
          ) : undefined
        }
      />

      {/* Main View Area */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pr-0.5 space-y-4">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
            <p className="text-xs text-zinc-400 font-medium">{t('general.loading', 'Se încarcă datele...')}</p>
          </div>
        ) : (
          <>
            {activeSubTab === 'templates' && (
              <ContractTemplatesView
                templates={templates}
                searchQuery={templateSearchQuery}
                selectedCategory={templateCategoryFilter}
                onEdit={(tmpl) => {
                  setEditingTemplate(tmpl);
                  setIsTemplateModalOpen(true);
                }}
                onDelete={handleDeleteTemplate}
                onUseTemplate={handleUseTemplateInGenerator}
                onNewTemplate={() => {
                  setEditingTemplate(null);
                  setIsTemplateModalOpen(true);
                }}
                canWrite={canWriteLegal}
                isDarkMode={isDarkMode}
              />
            )}

            {activeSubTab === 'generator' && (
              <ContractGeneratorView
                templates={templates}
                selectedTemplateId={selectedTemplateForGen}
                onGenerate={handleGenerateContract}
                canWrite={canWriteLegal}
                isDarkMode={isDarkMode}
              />
            )}

            {activeSubTab === 'contracts' && (
              <GeneratedContractsView
                contracts={contracts}
                searchQuery={contractSearchQuery}
                statusFilter={contractStatusFilter}
                onStatusChange={handleStatusChange}
                onDelete={handleDeleteContract}
                onNewContractClick={() => setSubTab('generator')}
                canWrite={canWriteLegal}
                isDarkMode={isDarkMode}
              />
            )}

            {activeSubTab === 'statistics' && (
              <LegalStatisticsView
                stats={stats}
                templates={templates}
                contracts={contracts}
                isLoading={isLoading}
                isDarkMode={isDarkMode}
              />
            )}
          </>
        )}
      </div>

      {/* Template Editor / Google Docs Importer Modal */}
      {isTemplateModalOpen && (
        <TemplateEditorModal
          isOpen={isTemplateModalOpen}
          onClose={() => {
            setIsTemplateModalOpen(false);
            setEditingTemplate(null);
          }}
          template={editingTemplate}
          onSave={handleSaveTemplate}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Contract Viewer & Print Modal */}
      {viewerContract && (
        <ContractViewerModal
          isOpen={!!viewerContract}
          onClose={() => setViewerContract(null)}
          contract={viewerContract}
          onStatusChange={handleStatusChange}
          isDarkMode={isDarkMode}
        />
      )}

      <ConfirmationModal
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant="danger"
        isDarkMode={isDarkMode}
      />
    </DashboardContainer>
  );
};
export default LegalDashboard;
