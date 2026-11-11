import React, { useState, useMemo } from 'react';
import { Eye, Trash2 } from 'lucide-react';
import type { VolunteerFeedback, HrFeedbackCategory, FeedbackSummary, FeedbackStatus } from '../../../types/hr';
import { useLanguage } from '../../../context/LanguageContext';
import { EmptyState } from '../../common';
import { FeedbackDetailModal } from './FeedbackDetailModal';

interface HRFeedbackViewProps {
  feedbackList: VolunteerFeedback[];
  categories: HrFeedbackCategory[];
  summary: FeedbackSummary | null;
  isLoading?: boolean;
  isSummaryLoading?: boolean;
  canManage?: boolean;
  isDarkMode?: boolean;
  onUpdateStatus: (id: string, status?: FeedbackStatus, categoryId?: string, internalNotes?: string) => Promise<void>;
  onDeleteFeedback: (id: string) => void;
  onReload: () => void;
  onReloadSummary?: () => void;
  searchQuery: string;
  statusFilter?: string;
  typeFilter?: string;
  categoryFilter?: string;
  identityFilter?: string;
  sourceFilter?: string;
  dateFilter?: string;
}

export const HRFeedbackView: React.FC<HRFeedbackViewProps> = ({
  feedbackList,
  categories,
  summary,
  isLoading = false,
  isSummaryLoading = false,
  canManage = true,
  isDarkMode = true,
  onUpdateStatus,
  onDeleteFeedback,
  onReload,
  onReloadSummary,
  searchQuery,
  statusFilter = 'ALL',
  typeFilter = 'ALL',
  categoryFilter = 'ALL',
  identityFilter = 'ALL',
  sourceFilter = 'ALL',
  dateFilter = '',
}) => {
  const { t } = useLanguage();

  const [activeThemeFilter, setActiveThemeFilter] = useState<string | null>(null);

  // Modals
  const [selectedFeedback, setSelectedFeedback] = useState<VolunteerFeedback | null>(null);

  // Filter items
  const filteredFeedback = useMemo(() => {
    return feedbackList.filter(item => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const contentMatch = (item.content || '').toLowerCase().includes(q);
        const nameMatch = (item.submitterName || '').toLowerCase().includes(q);
        const emailMatch = (item.submitterEmail || '').toLowerCase().includes(q);
        const notesMatch = (item.internalNotes || '').toLowerCase().includes(q);
        const catMatch = (item.categoryName || '').toLowerCase().includes(q);
        if (!contentMatch && !nameMatch && !emailMatch && !notesMatch && !catMatch) return false;
      }

      // Theme chip filter
      if (activeThemeFilter) {
        const selectedThemeObj = summary?.clusteredThemes?.find(th => th.theme === activeThemeFilter);
        if (selectedThemeObj?.feedbackIds && selectedThemeObj.feedbackIds.length > 0) {
          if (!selectedThemeObj.feedbackIds.includes(item.id)) return false;
        } else {
          const themeLower = activeThemeFilter.toLowerCase();
          const contentMatch = (item.content || '').toLowerCase().includes(themeLower);
          const catMatch = (item.categoryName || '').toLowerCase().includes(themeLower);
          if (!contentMatch && !catMatch) return false;
        }
      }

      // Status
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;

      // Type
      if (typeFilter !== 'ALL' && item.type !== typeFilter) return false;

      // Category
      if (categoryFilter !== 'ALL' && item.categoryId !== categoryFilter) return false;

      // Identity
      if (identityFilter === 'ANONYMOUS' && !item.isAnonymous) return false;
      if (identityFilter === 'IDENTIFIED' && item.isAnonymous) return false;

      // Source
      if (sourceFilter === 'PUBLIC' && !item.isPublicSubmission) return false;
      if (sourceFilter === 'AUTH' && item.isPublicSubmission) return false;

      // Date
      if (dateFilter && item.createdAt) {
        const itemDate = item.createdAt.split('T')[0];
        if (itemDate !== dateFilter) return false;
      }

      return true;
    });
  }, [feedbackList, searchQuery, activeThemeFilter, statusFilter, typeFilter, categoryFilter, identityFilter, sourceFilter, dateFilter]);

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'NEW':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">{t('hr.statusNew', 'Nou')}</span>;
      case 'IN_REVIEW':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">{t('hr.statusInReview', 'În Analiză')}</span>;
      case 'RESOLVED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{t('hr.statusResolved', 'Rezolvat')}</span>;
      case 'ARCHIVED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-zinc-800/60 text-zinc-300 border border-zinc-700/50">{t('hr.statusArchived', 'Arhivat')}</span>;
      default:
        return null;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'COMPLAINT':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">{t('hr.typeComplaint', 'Reclamație')}</span>;
      case 'SUGGESTION':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">{t('hr.typeSuggestion', 'Sugestie')}</span>;
      case 'REVIEW':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{t('hr.typeReview', 'Recenzie')}</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-zinc-800/60 text-zinc-300 border border-zinc-700/50">{t('hr.typeOther', 'Altele')}</span>;
    }
  };

  const bgCard = isDarkMode ? 'bg-zinc-950 border-zinc-850' : 'bg-white border-zinc-200';
  const tableHeadBg = isDarkMode ? 'bg-zinc-900/60 border-zinc-850 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-600';
  const aiBoxBg = isDarkMode ? 'bg-black border-zinc-800 text-white shadow-2xl' : 'bg-white border-zinc-200 text-zinc-900 shadow-xl';

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-3">
      {/* Clustered AI Themes Strip */}
      {isSummaryLoading && (!summary?.clusteredThemes || summary.clusteredThemes.length === 0) ? (
        <div className={`p-2.5 sm:p-3 rounded-2xl border flex items-center justify-between shrink-0 ${aiBoxBg}`}>
          <div className="flex items-center gap-2 text-xs text-zinc-300">
            <span className="font-medium animate-pulse">{t('hr.aiClusteringLoading', 'Inteligența Artificială analizează și grupează feedback-ul pe teme specifice...')}</span>
          </div>
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
        </div>
      ) : summary?.clusteredThemes && summary.clusteredThemes.length > 0 ? (
        <div className={`p-2.5 sm:p-3 rounded-2xl border flex flex-col gap-1.5 shrink-0 ${aiBoxBg}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              {t('hr.clusteredThemes', 'Teme & Subiecte Recurente (AI)')}
            </span>
            <div className="flex items-center gap-2">
              {isSummaryLoading && (
                <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              )}
              {activeThemeFilter && (
                <button
                  onClick={() => setActiveThemeFilter(null)}
                  className="text-[10px] text-blue-400 hover:underline cursor-pointer"
                >
                  {t('common.clear', 'Resetează selecția')}
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center flex-wrap gap-1.5">
            {summary.clusteredThemes.map((th, i) => {
              const isSelected = activeThemeFilter === th.theme;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveThemeFilter(isSelected ? null : th.theme)}
                  title={th.summary}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                      : isDarkMode
                        ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                        : 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:border-zinc-300'
                  }`}
                >
                  <span>{th.theme}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-blue-700 text-white' : isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200 text-zinc-600'}`}>
                    {th.count}
                  </span>
                </button>
              );
            })}
          </div>
          {activeThemeFilter && (() => {
            const currentThemeObj = summary.clusteredThemes.find(th => th.theme === activeThemeFilter);
            if (!currentThemeObj?.summary) return null;
            return (
              <div className={`mt-0.5 px-3 py-1.5 rounded-xl border text-xs flex items-center justify-between ${
                isDarkMode ? 'bg-zinc-900/60 border-zinc-800 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-800'
              }`}>
                <span className="truncate pr-2">{currentThemeObj.summary}</span>
                <span className="text-[11px] font-mono shrink-0 opacity-80">
                  {currentThemeObj.count} {t('hr.feedbackCountUnit', 'mesaje')}
                </span>
              </div>
            );
          })()}
        </div>
      ) : feedbackList.length > 0 && onReloadSummary ? (
        <div className={`p-2.5 sm:p-3 rounded-2xl border flex items-center justify-between shrink-0 ${aiBoxBg}`}>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span>{t('hr.clusteredThemes', 'Teme & Subiecte Recurente (AI)')}</span>
          </div>
          <button
            type="button"
            onClick={onReloadSummary}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer shrink-0"
          >
            <span>{t('hr.generateAiClustering', 'Generează Gruparea AI')}</span>
          </button>
        </div>
      ) : null}

      {/* Main Table + Mobile Cards Container */}
      <div className={`flex-1 min-h-0 rounded-2xl border flex flex-col overflow-hidden ${bgCard}`}>
        {isLoading ? (
          <div className="flex items-center justify-center h-48 w-full">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredFeedback.length === 0 ? (
          <div className="p-8 flex-1 flex items-center justify-center">
            <EmptyState
              title={t('hr.noFeedbackFound', 'Nu a fost găsit niciun feedback')}
              description={t('hr.noFeedbackFoundSub', 'Nu există trimiteri recente sau filtrele nu au returnat rezultate.')}
              isDarkMode={isDarkMode}
            />
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block flex-1 min-h-0 overflow-auto no-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead className={`sticky top-0 z-10 border-b text-[11px] font-bold uppercase tracking-wider ${tableHeadBg}`}>
                  <tr>
                    <th className="py-3 px-4 whitespace-nowrap">{t('table.date', 'Dată')}</th>
                    <th className="py-3 px-4 whitespace-nowrap">{t('hr.feedbackCategory', 'Categorie')}</th>
                    <th className="py-3 px-4 whitespace-nowrap">{t('hr.feedbackType', 'Tip')}</th>
                    <th className="py-3 px-4 whitespace-nowrap">{t('hr.feedbackSubmitter', 'Expeditor')}</th>
                    <th className="py-3 px-4 whitespace-nowrap">{t('hr.feedbackStatus', 'Stare')}</th>
                    <th className="py-3 px-4 whitespace-nowrap">{t('hr.feedbackContent', 'Mesaj')}</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">{t('table.actions', 'Acțiuni')}</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-zinc-800/40 text-zinc-300' : 'divide-zinc-200 text-zinc-700'}`}>
                  {filteredFeedback.map((item) => (
                    <tr
                      key={item.id}
                      className={`transition-colors border-zinc-850 ${isDarkMode ? 'hover:bg-zinc-900/40' : 'hover:bg-zinc-50'}`}
                    >
                      <td className="py-3 px-4 font-mono text-[11px] whitespace-nowrap">
                        {item.createdAt ? item.createdAt.substring(0, 10) : '-'}
                      </td>
                      <td className="py-3 px-4 font-semibold whitespace-nowrap text-zinc-200">
                        {item.categoryName || '-'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getTypeBadge(item.type)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {item.isAnonymous ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {t('hr.anonymousBadge', 'Anonim')}
                          </span>
                        ) : (
                          <span className="font-medium text-zinc-200">{item.submitterName || item.submitterEmail || 'Utilizator'}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate" title={item.content}>
                        {item.content}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            type="button"
                            onClick={() => setSelectedFeedback(item)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                            title={t('hr.feedbackDetailsTitle', 'Vezi detalii')}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => onDeleteFeedback(item.id)}
                              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
                              title={t('hr.deleteFeedbackTitle', 'Șterge')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className={`block md:hidden divide-y flex-1 min-h-0 overflow-y-auto no-scrollbar ${isDarkMode ? 'divide-zinc-850' : 'divide-zinc-300'}`}>
              {filteredFeedback.map((item) => (
                <div key={item.id} className="p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      {getTypeBadge(item.type)}
                      {getStatusBadge(item.status)}
                    </div>
                    <span className="font-mono text-[10px] text-zinc-500">
                      {item.createdAt ? item.createdAt.substring(0, 10) : ''}
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-zinc-200">
                    {item.categoryName || 'General'}
                  </div>

                  <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">
                    {item.content}
                  </p>

                  <div className="pt-1 flex items-center justify-between border-t border-zinc-800/40 text-[11px] text-zinc-400">
                    <span>
                      {item.isAnonymous ? t('hr.anonymousBadge', 'Anonim') : (item.submitterName || item.submitterEmail)}
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setSelectedFeedback(item)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs cursor-pointer"
                      >
                        {t('table.details', 'Detalii')}
                      </button>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => onDeleteFeedback(item.id)}
                          className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Detail / Status Modal */}
      <FeedbackDetailModal
        isOpen={!!selectedFeedback}
        onClose={() => setSelectedFeedback(null)}
        feedback={selectedFeedback}
        categories={categories}
        onUpdateFeedback={async (id, st, catId, notes) => {
          await onUpdateStatus(id, st, catId, notes);
          onReload();
        }}
        onDelete={(id) => {
          setSelectedFeedback(null);
          onDeleteFeedback(id);
        }}
        canManage={canManage}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};
