import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { Modal } from './Modal';
import { ConfirmationModal } from './ConfirmationModal';
export interface ManageableOption {
    value: string;
    label: string;
    isCustom?: boolean;
    isSystem?: boolean;
}
export interface ManageableSelectProps {
    label?: string;
    required?: boolean;
    value: string;
    onChange: (value: string) => void;
    options: (string | ManageableOption)[];
    placeholder?: string;
    modalTitle?: string;
    isDarkMode?: boolean;
    disabled?: boolean;
    className?: string;
    onAddItem?: (name: string) => Promise<string | void> | string | void;
    onRenameItem?: (oldValue: string, newValue: string) => Promise<void> | void;
    onDeleteItem?: (value: string) => Promise<void> | void;
    canDeleteItem?: (value: string) => boolean | string;
}
export const ManageableSelect: React.FC<ManageableSelectProps> = ({ label, required = false, value, onChange, options, placeholder, modalTitle, isDarkMode = true, disabled = false, className = '', onAddItem, onRenameItem, onDeleteItem, canDeleteItem, }) => {
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [newItemName, setNewItemName] = useState('');
    const [editingItemValue, setEditingItemValue] = useState<string | null>(null);
    const [editingItemText, setEditingItemText] = useState('');
    const [manageError, setManageError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<ManageableOption | null>(null);
    const [dropdownStyles, setDropdownStyles] = useState<React.CSSProperties>({});
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const normalizedOptions: ManageableOption[] = (options || []).map((opt) => {
        if (!opt)
            return { value: '', label: '' };
        if (typeof opt === 'string') {
            return { value: opt, label: opt };
        }
        return opt;
    });

    const calculatePosition = useCallback(() => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const dropdownHeight = 224;
        const spaceBelow = window.innerHeight - rect.bottom - 8;
        const spaceAbove = rect.top - 8;
        const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
        const maxHeight = Math.min(240, Math.max(120, openUpward ? spaceAbove : spaceBelow));
        const left = Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8));

        const styles: React.CSSProperties = {
            position: 'fixed',
            left: `${left}px`,
            width: `${rect.width}px`,
            maxHeight: `${maxHeight}px`,
            zIndex: 99999,
        };

        if (openUpward) {
            styles.bottom = `${window.innerHeight - rect.top + 6}px`;
        } else {
            styles.top = `${rect.bottom + 6}px`;
        }

        setDropdownStyles(styles);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                containerRef.current &&
                !containerRef.current.contains(target) &&
                dropdownRef.current &&
                !dropdownRef.current.contains(target)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!isOpen)
            return;
        calculatePosition();
        const handleUpdate = () => calculatePosition();
        window.addEventListener('resize', handleUpdate);
        window.addEventListener('scroll', handleUpdate, true);
        return () => {
            window.removeEventListener('resize', handleUpdate);
            window.removeEventListener('scroll', handleUpdate, true);
        };
    }, [isOpen, calculatePosition]);
    const filteredOptions = normalizedOptions.filter((opt) => (opt.label || '').toLowerCase().includes(searchQuery.toLowerCase()));
    const selectedOption = normalizedOptions.find((opt) => opt.value === value);
    const displayLabel = selectedOption ? selectedOption.label : value || (placeholder || t('common.select', 'Selecteaza...'));
    const handleSelect = (val: string) => {
        onChange(val);
        setIsOpen(false);
        setSearchQuery('');
    };
    const handleQuickAdd = async (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        const trimmed = searchQuery.trim();
        if (!trimmed)
            return;
        if (onAddItem) {
            setIsSubmitting(true);
            try {
                const addedVal = await onAddItem(trimmed);
                if (typeof addedVal === 'string' && addedVal) {
                    onChange(addedVal);
                }
                setSearchQuery('');
                setIsOpen(false);
            }
            catch (err: any) {
                console.error(err);
            }
            finally {
                setIsSubmitting(false);
            }
        }
        else {
            onChange(trimmed);
            setSearchQuery('');
            setIsOpen(false);
        }
    };
    const handleModalAdd = async (e?: React.SyntheticEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        const trimmed = newItemName.trim();
        if (!trimmed)
            return;
        setManageError(null);
        if (onAddItem) {
            setIsSubmitting(true);
            try {
                const addedVal = await onAddItem(trimmed);
                if (typeof addedVal === 'string' && addedVal) {
                    onChange(addedVal);
                }
                setNewItemName('');
            }
            catch (err: any) {
                setManageError(err?.message || t('common.errorSave', 'Eroare la salvare'));
            }
            finally {
                setIsSubmitting(false);
            }
        }
    };
    const handleStartRename = (opt: ManageableOption, e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setEditingItemValue(opt.value);
        setEditingItemText(opt.label);
        setManageError(null);
    };
    const handleSaveRename = async (oldValue: string, e?: React.MouseEvent | React.KeyboardEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        const trimmed = editingItemText.trim();
        if (!trimmed || trimmed === oldValue) {
            setEditingItemValue(null);
            return;
        }
        setManageError(null);
        if (onRenameItem) {
            setIsSubmitting(true);
            try {
                await onRenameItem(oldValue, trimmed);
                if (value === oldValue) {
                    onChange(trimmed);
                }
                setEditingItemValue(null);
            }
            catch (err: any) {
                setManageError(err?.message || t('common.errorUpdate', 'Eroare la actualizare'));
            }
            finally {
                setIsSubmitting(false);
            }
        }
    };
    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        const optValue = itemToDelete.value;
        setItemToDelete(null);
        setManageError(null);
        if (canDeleteItem) {
            const check = canDeleteItem(optValue);
            if (check === false) {
                setManageError(t('common.cannotDeleteItemInUse', 'Acest element este utilizat și nu poate fi șters.'));
                return;
            }
            else if (typeof check === 'string') {
                setManageError(check);
                return;
            }
        }
        if (onDeleteItem) {
            setIsSubmitting(true);
            try {
                await onDeleteItem(optValue);
                if (value === optValue) {
                    onChange('');
                }
            }
            catch (err: any) {
                setManageError(err?.message || t('common.errorDelete', 'Eroare la ștergere'));
            }
            finally {
                setIsSubmitting(false);
            }
        }
    };
    const isDark = isDarkMode;
    const inputBg = isDark
        ? 'bg-zinc-900 border-zinc-800 text-white hover:border-zinc-700'
        : 'bg-zinc-100 border-zinc-300 text-zinc-900 hover:border-zinc-400';
    const dropdownBg = isDark ? 'bg-zinc-900 border-zinc-800 text-white shadow-2xl' : 'bg-white border-zinc-200 text-zinc-900 shadow-xl';
    const itemHover = isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100';
    const textSub = isDark ? 'text-zinc-400' : 'text-zinc-500';
    const exactMatchFound = normalizedOptions.some((opt) => opt.label.toLowerCase() === searchQuery.trim().toLowerCase());
    return (<div className={`relative ${className}`} ref={containerRef}>
      {label && (<label className={`block text-xs font-semibold mb-1 ${textSub}`}>
          {label} {required && '*'}
        </label>)}

      <div onClick={() => !disabled && setIsOpen(!isOpen)} className={`w-full px-3 py-2 min-h-[38px] rounded-xl border text-xs flex items-center justify-between transition cursor-pointer select-none ${inputBg} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <span className={!value ? textSub : 'font-medium truncate'}>{displayLabel}</span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 shrink-0 ${textSub} ${isOpen ? 'rotate-180' : ''}`}/>
      </div>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            style={dropdownStyles}
            className={`rounded-xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${dropdownBg}`}
          >
            <div className={`p-2 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <div className="relative flex items-center">
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('common.searchOrAdd', 'Cauta sau adauga...')}
                  className={`w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border outline-hidden transition ${inputBg}`}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <div className="max-h-[140px] overflow-y-auto divide-y divide-zinc-800/20 scrollbar-thin">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition cursor-pointer ${itemHover} ${
                        isSelected ? (isDark ? 'bg-blue-600/15 text-blue-400 font-semibold' : 'bg-blue-50 text-blue-600 font-semibold') : ''
                      }`}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-blue-500" />}
                    </button>
                  );
                })
              ) : (
                <div className={`px-3 py-2 text-xs text-center ${textSub}`}>
                  {t('common.noResults', 'Niciun rezultat găsit')}
                </div>
              )}

              {searchQuery.trim() && !exactMatchFound && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleQuickAdd}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center space-x-2 font-medium text-blue-500 transition cursor-pointer ${
                    isDark ? 'hover:bg-blue-500/10' : 'hover:bg-blue-50'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {t('common.add', 'Adaugă')} "{searchQuery.trim()}"
                  </span>
                </button>
              )}
            </div>

            {(onAddItem || onRenameItem || onDeleteItem) && (
              <div
                className={`p-1.5 border-t bg-zinc-500/5 shrink-0 flex items-center justify-between ${
                  isDark ? 'border-zinc-800' : 'border-zinc-200'
                }`}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                    setIsManageModalOpen(true);
                  }}
                  className={`w-full py-1.5 px-2 text-[11px] font-medium rounded-lg flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                    isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  <span>{modalTitle || t('common.manageOptions', 'Gestionează opțiunile')}</span>
                </button>
              </div>
            )}
          </div>,
          document.body
        )}

      {isManageModalOpen && (<Modal isOpen={isManageModalOpen} onClose={() => {
                setIsManageModalOpen(false);
                setEditingItemValue(null);
                setManageError(null);
            }} title={modalTitle || t('common.manageOptions', 'Gestionează opțiunile')} maxWidth="md" isDarkMode={isDark} zIndex="z-60">
          <div className="space-y-4">
            {manageError && (<div className="p-3 text-xs rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-start space-x-2"><span>{manageError}</span>
              </div>)}

            {onAddItem && (<div className="flex space-x-2">
                <input type="text" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        handleModalAdd(e);
                    }
                }} placeholder={t('common.newItemPlaceholder', 'Nume element nou...')} className={`flex-1 px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputBg}`}/>
                <button type="button" onClick={handleModalAdd} disabled={!newItemName.trim() || isSubmitting} className="px-3.5 py-2 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md transition cursor-pointer font-bold disabled:opacity-50 flex items-center space-x-1 shrink-0">
                  <Plus className="w-3.5 h-3.5"/>
                  <span>{t('common.add', 'Adaugă')}</span>
                </button>
              </div>)}

            <div className={`rounded-xl border divide-y overflow-hidden max-h-64 overflow-y-auto ${isDark ? 'border-zinc-800 divide-zinc-800' : 'border-zinc-200 divide-zinc-200'}`}>
              {normalizedOptions.length === 0 ? (<div className={`p-4 text-center text-xs ${textSub}`}>
                  {t('common.noItems', 'Nu exista elemente în lista.')}
                </div>) : (normalizedOptions.map((opt) => {
                const isEditing = editingItemValue === opt.value;
                return (<div key={opt.value} className={`px-3 py-2 text-xs flex items-center justify-between transition ${itemHover}`}>
                      {isEditing ? (<div className="flex items-center space-x-2 flex-1 mr-2">
                          <input type="text" autoFocus value={editingItemText} onChange={(e) => setEditingItemText(e.target.value)} className={`flex-1 px-2.5 py-1 text-xs rounded-lg border outline-hidden transition ${inputBg}`} onKeyDown={(e) => {
                            if (e.key === 'Enter')
                                handleSaveRename(opt.value);
                            if (e.key === 'Escape')
                                setEditingItemValue(null);
                        }}/>
                          <button type="button" onClick={() => handleSaveRename(opt.value)} disabled={isSubmitting || !editingItemText.trim()} className="p-1 rounded-md text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition cursor-pointer" title={t('common.save', 'Salveaza')}>
                            <Check className="w-3.5 h-3.5"/>
                          </button>
                          <button type="button" onClick={() => setEditingItemValue(null)} className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer" title={t('common.cancel', 'Anuleaza')}>
                            <X className="w-3.5 h-3.5"/>
                          </button>
                        </div>) : (<div className="flex items-center space-x-2 truncate">
                          <span className="font-medium truncate">{opt.label}</span>
                          {opt.isSystem && (<span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                              system
                            </span>)}
                        </div>)}

                      {!isEditing && (<div className="flex items-center space-x-1 shrink-0 ml-2">
                          {onRenameItem && !opt.isSystem && (<button type="button" onClick={() => handleStartRename(opt)} className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition cursor-pointer disabled:opacity-40" title={t('common.edit', 'Editeaza')}>
                              <Pencil className="w-3.5 h-3.5"/>
                            </button>)}
                          {onDeleteItem && !opt.isSystem && (<button type="button" onClick={() => setItemToDelete(opt)} disabled={isSubmitting} className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer disabled:opacity-40" title={t('common.delete', 'Șterge')}>
                              <Trash2 className="w-3.5 h-3.5"/>
                            </button>)}
                        </div>)}
                    </div>);
            }))}
            </div>
          </div>
        </Modal>)}

      {itemToDelete && (
        <ConfirmationModal
          isOpen={!!itemToDelete}
          onClose={() => setItemToDelete(null)}
          onConfirm={handleConfirmDelete}
          title={t('common.delete', 'Șterge')}
          message={t('common.confirmDeleteItem', `Sigur doriți să ștergeți "${itemToDelete.label || itemToDelete.value}"?`)}
          confirmText={t('common.delete', 'Șterge')}
          cancelText={t('common.cancel', 'Anulează')}
          variant="danger"
          isDarkMode={isDark}
          zIndex="z-70"
        />
      )}
    </div>);
};
