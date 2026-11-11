import React, { useState, useEffect } from 'react';
import { X, Plus, Pencil, Trash2, Check } from 'lucide-react';
import type { HrFeedbackCategory } from '../../../types/hr';
import { useLanguage } from '../../../context/LanguageContext';
import { ConfirmationModal } from '../../common';

interface ManageFeedbackCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: HrFeedbackCategory[];
  onCreateCategory: (name: string) => Promise<any>;
  onRenameCategory: (id: string, name: string) => Promise<any>;
  onDeleteCategory: (id: string) => Promise<any>;
  isDarkMode?: boolean;
}

export const ManageFeedbackCategoriesModal: React.FC<ManageFeedbackCategoriesModalProps> = ({
  isOpen,
  onClose,
  categories,
  onCreateCategory,
  onRenameCategory,
  onDeleteCategory,
  isDarkMode = true,
}) => {
  const { t } = useLanguage();

  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<HrFeedbackCategory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNewName('');
      setEditingId(null);
      setEditingName('');
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onCreateCategory(newName.trim());
      setNewName('');
    } catch (err: any) {
      setError(err?.message || 'Eroare la crearea categoriei.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onRenameCategory(id, editingName.trim());
      setEditingId(null);
    } catch (err: any) {
      setError(err?.message || 'Eroare la salvarea categoriei.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    setLoading(true);
    setError(null);
    try {
      await onDeleteCategory(categoryToDelete.id);
      setCategoryToDelete(null);
    } catch (err: any) {
      setError(err?.message || 'Eroare la ștergerea categoriei.');
    } finally {
      setLoading(false);
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
        className={`w-full h-full sm:h-auto sm:max-h-[90vh] max-w-md rounded-none sm:rounded-2xl border-0 sm:border flex flex-col overflow-hidden transition-all transform scale-100 animate-in zoom-in-95 duration-150 ${modalBg}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 pt-5 pb-3.5 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-base sm:text-lg tracking-tight">
            {t('hr.manageFeedbackCategories', 'Categorii Feedback')}
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

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-4 text-sm">
          {/* Add Category Form */}
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('hr.addFeedbackCategory', 'Adaugă Categorie')}
              className={`flex-1 h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputClass}`}
            />
            <button
              type="submit"
              disabled={loading || !newName.trim()}
              className="h-[38px] px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50 flex items-center space-x-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('common.add', 'Adaugă')}</span>
            </button>
          </form>

          {/* List of categories */}
          <div className="divide-y divide-zinc-800/40">
            {categories.map((cat) => (
              <div key={cat.id} className="py-2.5 flex items-center justify-between gap-2">
                {editingId === cat.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className={`flex-1 h-[32px] px-2.5 text-xs rounded-lg border outline-hidden transition ${inputClass}`}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(cat.id)}
                      className="p-1 rounded-lg text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-800 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-xs font-medium text-zinc-200">{cat.name}</span>
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(cat.id);
                          setEditingName(cat.name);
                        }}
                        className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCategoryToDelete(cat)}
                        className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {error && <p className="text-xs text-rose-400">{error}</p>}
        </div>

        {/* Divider 2 */}
        <div className={`mx-5 sm:mx-6 border-t ${modalBorder}`} />

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer"
          >
            {t('common.close', 'Închide')}
          </button>
        </div>
      </div>

      <ConfirmationModal
        isOpen={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={t('hr.deleteFeedbackCategoryTitle', 'Șterge Categorie')}
        message={t('hr.confirmDeleteFeedbackCategory', 'Sigur doriți să ștergeți această categorie?')}
        zIndex="z-60"
        isDarkMode={isDarkMode}
      />
    </div>
  );
};
