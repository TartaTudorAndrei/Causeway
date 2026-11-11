import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import type { VolunteerFeedback, FeedbackStatus, HrFeedbackCategory } from '../../../types/hr';
import { useLanguage } from '../../../context/LanguageContext';
import { CustomSelect } from '../../common';

interface FeedbackDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedback: VolunteerFeedback | null;
  categories: HrFeedbackCategory[];
  onUpdateFeedback: (id: string, status?: FeedbackStatus, categoryId?: string, internalNotes?: string) => Promise<void>;
  onDelete: (id: string) => void;
  canManage?: boolean;
  isDarkMode?: boolean;
}

export const FeedbackDetailModal: React.FC<FeedbackDetailModalProps> = ({
  isOpen,
  onClose,
  feedback,
  categories,
  onUpdateFeedback,
  onDelete,
  canManage = true,
  isDarkMode = true,
}) => {
  const { t } = useLanguage();

  const [status, setStatus] = useState<FeedbackStatus>('NEW');
  const [categoryId, setCategoryId] = useState<string>('');
  const [internalNotes, setInternalNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (feedback) {
      setStatus(feedback.status || 'NEW');
      setCategoryId(feedback.categoryId || '');
      setInternalNotes(feedback.internalNotes || '');
    }
  }, [feedback]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !feedback) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onUpdateFeedback(feedback.id, status, categoryId || undefined, internalNotes.trim() || undefined);
      onClose();
    } catch {
      // toast in parent
    } finally {
      setIsSaving(false);
    }
  };

  const modalBg = isDarkMode ? 'bg-black text-white border-zinc-800 shadow-2xl' : 'bg-white text-zinc-900 border-zinc-200 shadow-xl';
  const modalBorder = isDarkMode ? 'border-zinc-800' : 'border-zinc-200';
  const inputClass = isDarkMode
    ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700 focus:border-zinc-700'
    : 'bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400 focus:border-zinc-400';

  const getTypeBadge = (type: string) => {
    switch (type?.toUpperCase()) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150" onClick={onClose}>
      <div
        className={`w-full h-full sm:h-auto sm:max-h-[90vh] max-w-lg rounded-none sm:rounded-2xl border-0 sm:border flex flex-col overflow-hidden transition-all transform scale-100 animate-in zoom-in-95 duration-150 ${modalBg}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 pt-5 pb-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <h3 className="font-bold text-base sm:text-lg tracking-tight">
              {t('hr.feedbackDetailsTitle', 'Detalii Feedback')}
            </h3>
            {getTypeBadge(feedback.type)}
          </div>
          <button
            onClick={onClose}
            aria-label={t('common.close', 'Închide')}
            className={`p-1.5 rounded-lg transition cursor-pointer ${
              isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Divider 1 */}
        <div className={`mx-5 sm:mx-6 border-b ${modalBorder}`} />

        {/* Modal Scrollable Body */}
        <form id="feedbackDetailForm" noValidate onSubmit={handleSave} className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-4 text-sm">
          {/* Metadata Grid */}
          <div className={`p-3 rounded-xl border grid grid-cols-2 gap-2 text-xs ${isDarkMode ? 'bg-zinc-900/40 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
            <div>
              <span className="block text-zinc-400 font-semibold">{t('hr.feedbackSubmitter', 'Expeditor')}</span>
              <span className="font-medium text-zinc-200">
                {feedback.isAnonymous ? (
                  <span className="text-amber-400 font-bold">{t('hr.anonymousBadge', 'Anonim')}</span>
                ) : (
                  feedback.submitterName || feedback.submitterEmail || 'Utilizator'
                )}
              </span>
            </div>

            <div>
              <span className="block text-zinc-400 font-semibold">{t('hr.feedbackSource', 'Sursă')}</span>
              <span className="font-medium text-zinc-200">
                {feedback.isPublicSubmission ? t('hr.sourcePublic', 'Link Public') : t('hr.sourceAuth', 'Cont Utilizator')}
              </span>
            </div>

            <div>
              <span className="block text-zinc-400 font-semibold">{t('hr.feedbackCategory', 'Categorie')}</span>
              <span className="font-medium text-zinc-200">{feedback.categoryName || '-'}</span>
            </div>

            <div>
              <span className="block text-zinc-400 font-semibold">{t('table.date', 'Dată')}</span>
              <span className="font-medium text-zinc-200">
                {feedback.createdAt ? feedback.createdAt.replace('T', ' ').substring(0, 16) : '-'}
              </span>
            </div>
          </div>

          {/* Feedback Body */}
          <div>
            <label className="block text-xs font-semibold mb-1 text-zinc-400">
              {t('hr.feedbackContent', 'Mesaj / Conținut Feedback')}
            </label>
            <div className={`p-3.5 rounded-xl border text-xs leading-relaxed whitespace-pre-wrap ${isDarkMode ? 'bg-zinc-900/80 border-zinc-800 text-zinc-100' : 'bg-zinc-100 border-zinc-300 text-zinc-900'}`}>
              {feedback.content}
            </div>
          </div>

          {/* Category & Status Changers */}
          {canManage && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1 text-zinc-400">
                  {t('hr.feedbackCategory', 'Categorie')}
                </label>
                <CustomSelect
                  value={categoryId}
                  onChange={(val) => setCategoryId(val)}
                  options={categories.map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                  isDarkMode={isDarkMode}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-zinc-400">
                  {t('hr.feedbackStatus', 'Stare')}
                </label>
                <CustomSelect
                  value={status}
                  onChange={(val) => setStatus(val as FeedbackStatus)}
                  options={[
                    { value: 'NEW', label: t('hr.statusNew', 'Nou') },
                    { value: 'IN_REVIEW', label: t('hr.statusInReview', 'În Analiză') },
                    { value: 'RESOLVED', label: t('hr.statusResolved', 'Rezolvat') },
                    { value: 'ARCHIVED', label: t('hr.statusArchived', 'Arhivat') },
                  ]}
                  isDarkMode={isDarkMode}
                />
              </div>
            </div>
          )}

          {/* Internal Notes */}
          {canManage && (
            <div>
              <label className="block text-xs font-semibold mb-1 text-zinc-400">
                {t('hr.feedbackInternalNotes', 'Note Interne HR')}
              </label>
              <textarea
                rows={3}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder={t('hr.feedbackInternalNotesPlaceholder', 'Adăugați detalii despre măsurile luate, clarificări sau concluzii...')}
                className={`w-full p-3 text-xs rounded-xl border outline-hidden resize-none transition ${inputClass}`}
              />
            </div>
          )}
        </form>

        {/* Divider 2 */}
        <div className={`mx-5 sm:mx-6 border-t ${modalBorder}`} />

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
          <div>
            {canManage && (
              <button
                type="button"
                onClick={() => onDelete(feedback.id)}
                className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
                title={t('hr.deleteFeedbackTitle', 'Șterge Feedback')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          {canManage ? (
            <button
              type="submit"
              form="feedbackDetailForm"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50 flex items-center space-x-2 shrink-0"
            >
              {isSaving && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <span>{t('common.save', 'Salvează')}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer"
            >
              {t('common.close', 'Închide')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
