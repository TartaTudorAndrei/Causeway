import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { HrFeedbackCategory, FeedbackType } from '../../../types/hr';
import { hrService } from '../../../services/hrService';
import { useLanguage } from '../../../context/LanguageContext';
import { CustomSelect } from '../../common';

interface FeedbackSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: HrFeedbackCategory[];
  isDarkMode?: boolean;
  onSubmitted?: () => void;
  userEmail?: string;
  userName?: string;
}

export const FeedbackSubmissionModal: React.FC<FeedbackSubmissionModalProps> = ({
  isOpen,
  onClose,
  categories,
  isDarkMode = true,
  onSubmitted,
  userEmail,
  userName,
}) => {
  const { t } = useLanguage();

  const [type, setType] = useState<FeedbackType>('COMPLAINT');
  const [categoryId, setCategoryId] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(true);
  const [content, setContent] = useState<string>('');
  const [submitterName, setSubmitterName] = useState<string>('');
  const [submitterEmail, setSubmitterEmail] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setType('COMPLAINT');
      setCategoryId(categories.length > 0 ? categories[0].id : '');
      setIsAnonymous(true);
      setContent('');
      setSubmitterName(userName || '');
      setSubmitterEmail(userEmail || '');
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen, categories, userName, userEmail]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setErrorMessage(t('common.fillRequiredFields', 'Completați câmpurile obligatorii marcate.'));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await hrService.submitFeedback({
        type,
        categoryId: categoryId || undefined,
        isAnonymous,
        isPublicSubmission: false,
        targetType: 'GENERAL',
        content: content.trim(),
        submitterName: !isAnonymous ? (submitterName.trim() || undefined) : undefined,
        submitterEmail: !isAnonymous ? (submitterEmail.trim() || undefined) : undefined,
      });

      setSuccessMessage(t('hr.submitFeedbackSuccess', 'Feedback-ul tău a fost trimis cu succes. Mulțumim!'));
      if (onSubmitted) onSubmitted();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Eroare la trimiterea feedback-ului.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalBg = isDarkMode ? 'bg-black text-white border-zinc-800 shadow-2xl' : 'bg-white text-zinc-900 border-zinc-200 shadow-xl';
  const modalBorder = isDarkMode ? 'border-zinc-800' : 'border-zinc-200';
  const inputClass = isDarkMode
    ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700 focus:border-zinc-700'
    : 'bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400 focus:border-zinc-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150" onClick={onClose}>
      <div
        className={`w-full h-full sm:h-auto sm:max-h-[90vh] max-w-lg rounded-none sm:rounded-2xl border-0 sm:border flex flex-col overflow-hidden transition-all transform scale-100 animate-in zoom-in-95 duration-150 ${modalBg}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 pt-5 pb-3.5 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-base sm:text-lg tracking-tight">
            {t('hr.submitFeedbackTitle', 'Trimite Feedback sau Reclamație')}
          </h3>
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

        {/* Form Body */}
        <form id="feedbackForm" noValidate onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-4 text-sm">
          {/* 2-Column Grid: Type & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-start">
            <div>
              <label className="block text-xs font-semibold mb-1 text-zinc-400">
                {t('hr.feedbackTypeLabel', 'Tip Feedback')}
              </label>
              <CustomSelect
                value={type}
                onChange={(val) => setType(val as FeedbackType)}
                options={[
                  { value: 'COMPLAINT', label: t('hr.typeComplaint', 'Reclamație') },
                  { value: 'SUGGESTION', label: t('hr.typeSuggestion', 'Sugestie') },
                  { value: 'REVIEW', label: t('hr.typeReview', 'Apreciere') },
                ]}
                isDarkMode={isDarkMode}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-zinc-400">
                {t('hr.feedbackCategoryLabel', 'Categorie')}
              </label>
              <CustomSelect
                value={categoryId}
                onChange={setCategoryId}
                options={categories.map(c => ({ value: c.id, label: c.name }))}
                isDarkMode={isDarkMode}
              />
            </div>
          </div>

          {/* Identity Switcher */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 text-zinc-400">
              {t('hr.feedbackIdentityLabel', 'Identitate')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsAnonymous(true)}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer text-center ${
                  isAnonymous
                    ? isDarkMode
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      : 'bg-amber-50 border-amber-300 text-amber-800'
                    : isDarkMode
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      : 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {t('hr.identityAnonymous', 'Anonim')}
              </button>
              <button
                type="button"
                onClick={() => setIsAnonymous(false)}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer text-center ${
                  !isAnonymous
                    ? isDarkMode
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                      : 'bg-blue-50 border-blue-300 text-blue-800'
                    : isDarkMode
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      : 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {t('hr.identityIdentified', 'Identificat')}
              </button>
            </div>
          </div>

          {!isAnonymous && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1 text-zinc-400">
                  {t('hr.feedbackSubmitterName', 'Nume (opțional)')}
                </label>
                <input
                  type="text"
                  value={submitterName}
                  onChange={(e) => setSubmitterName(e.target.value)}
                  placeholder="Ex: Ion Popescu"
                  className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputClass}`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-zinc-400">
                  {t('hr.feedbackSubmitterEmail', 'Email (opțional)')}
                </label>
                <input
                  type="email"
                  value={submitterEmail}
                  onChange={(e) => setSubmitterEmail(e.target.value)}
                  placeholder="Ex: email@exemplu.ro"
                  className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputClass}`}
                />
              </div>
            </div>
          )}

          {/* Feedback Content */}
          <div>
            <label className="block text-xs font-semibold mb-1 text-zinc-400">
              {t('hr.feedbackContent', 'Mesaj / Conținut')}
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder={t('hr.feedbackMessagePlaceholder', 'Descrieți în detaliu sugestia, problema sau aprecierea...')}
              className={`w-full px-3 py-2 text-xs rounded-xl border outline-hidden resize-none transition ${inputClass} ${
                errorMessage && !content.trim() ? 'border-rose-500/80 focus:border-rose-500 ring-1 ring-rose-500/40' : ''
              }`}
            />
          </div>

          {successMessage && (
            <p className="text-xs text-emerald-400 font-semibold">{successMessage}</p>
          )}
        </form>

        {/* Divider 2 */}
        <div className={`mx-5 sm:mx-6 border-b ${modalBorder}`} />

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex-1 mr-3">
            {errorMessage && (
              <p className="text-xs text-rose-400 font-medium truncate">{errorMessage}</p>
            )}
          </div>
          <button
            type="submit"
            form="feedbackForm"
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isSubmitting ? t('general.saving', 'Se trimite...') : t('hr.submitFeedbackButton', 'Trimite Feedback')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackSubmissionModal;
