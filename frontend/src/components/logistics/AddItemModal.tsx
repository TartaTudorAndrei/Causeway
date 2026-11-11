import React, { useState } from 'react';
import { X } from 'lucide-react';
import { logisticsService } from '../../services/logisticsService';
import type { StockItem } from '../../types/logistics';
import { useLanguage } from '../../context/LanguageContext';
import { ManageableSelect } from '../common';
interface AddItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (item: StockItem) => void;
    isDarkMode: boolean;
    existingItems?: StockItem[];
    editingItem?: StockItem | null;
}
export const AddItemModal: React.FC<AddItemModalProps> = ({ isOpen, onClose, onSuccess, isDarkMode, existingItems = [], editingItem = null, }) => {
    const { t } = useLanguage();
    const [name, setName] = useState('');
    const [photoUrl, setPhotoUrl] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [availableCategories, setAvailableCategories] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('app_logistics_categories');
            if (saved)
                return JSON.parse(saved);
        }
        catch { }
        return [];
    });
    const [availableUnits, setAvailableUnits] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('app_logistics_units');
            if (saved)
                return JSON.parse(saved);
        }
        catch { }
        return [];
    });
    // Sync with categories and units from existing items
    React.useEffect(() => {
        if (existingItems && existingItems.length > 0) {
            const itemCats = Array.from(new Set(existingItems.map(i => i.category).filter(Boolean)));
            const itemUnits = Array.from(new Set(existingItems.map(i => i.unit).filter(Boolean)));
            setAvailableCategories(prev => {
                const merged = Array.from(new Set([...prev, ...itemCats]));
                try {
                    localStorage.setItem('app_logistics_categories', JSON.stringify(merged));
                }
                catch { }
                return merged;
            });
            setAvailableUnits(prev => {
                const merged = Array.from(new Set([...prev, ...itemUnits]));
                try {
                    localStorage.setItem('app_logistics_units', JSON.stringify(merged));
                }
                catch { }
                return merged;
            });
        }
    }, [existingItems]);
    const [category, setCategory] = useState<string>('');
    const [unit, setUnit] = useState<string>('');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');

    React.useEffect(() => {
        if (isOpen) {
            if (editingItem) {
                setName(editingItem.name || '');
                setCategory(editingItem.category || '');
                setUnit(editingItem.unit || 'buc');
                setNotes(editingItem.notes || '');
                setPhotoUrl(editingItem.photoUrl || '');
            } else {
                setName('');
                setCategory(availableCategories[0] || 'General');
                setUnit(availableUnits[0] || 'buc');
                setNotes('');
                setPhotoUrl('');
            }
            setFieldErrors({});
            setError('');
        }
    }, [isOpen, editingItem, availableCategories, availableUnits]);
    const handleAddCategory = (cat: string) => {
        const trimmed = cat.trim();
        if (!trimmed)
            return;
        setAvailableCategories(prev => {
            if (prev.includes(trimmed))
                return prev;
            const updated = [...prev, trimmed];
            try {
                localStorage.setItem('app_logistics_categories', JSON.stringify(updated));
            }
            catch { }
            return updated;
        });
        setCategory(trimmed);
    };
    const handleRenameCategory = (oldCat: string, newCat: string) => {
        const trimmed = newCat.trim();
        if (!trimmed || trimmed === oldCat)
            return;
        setAvailableCategories(prev => {
            const updated = prev.map(c => c === oldCat ? trimmed : c);
            try {
                localStorage.setItem('app_logistics_categories', JSON.stringify(updated));
            }
            catch { }
            return updated;
        });
        if (category === oldCat) {
            setCategory(trimmed);
        }
    };
    const handleDeleteCategory = (cat: string) => {
        const remaining = availableCategories.filter(c => c !== cat);
        setAvailableCategories(remaining);
        try {
            localStorage.setItem('app_logistics_categories', JSON.stringify(remaining));
        }
        catch { }
        if (category === cat) {
            setCategory(remaining.length > 0 ? remaining[0] : '');
        }
    };
    const handleAddUnit = (u: string) => {
        const trimmed = u.trim();
        if (!trimmed)
            return;
        setAvailableUnits(prev => {
            if (prev.includes(trimmed))
                return prev;
            const updated = [...prev, trimmed];
            try {
                localStorage.setItem('app_logistics_units', JSON.stringify(updated));
            }
            catch { }
            return updated;
        });
        setUnit(trimmed);
    };
    const handleRenameUnit = (oldU: string, newU: string) => {
        const trimmed = newU.trim();
        if (!trimmed || trimmed === oldU)
            return;
        setAvailableUnits(prev => {
            const updated = prev.map(u => u === oldU ? trimmed : u);
            try {
                localStorage.setItem('app_logistics_units', JSON.stringify(updated));
            }
            catch { }
            return updated;
        });
        if (unit === oldU) {
            setUnit(trimmed);
        }
    };
    const handleDeleteUnit = (u: string) => {
        const remaining = availableUnits.filter(item => item !== u);
        setAvailableUnits(remaining);
        try {
            localStorage.setItem('app_logistics_units', JSON.stringify(remaining));
        }
        catch { }
        if (unit === u) {
            setUnit(remaining.length > 0 ? remaining[0] : '');
        }
    };
    // Keyboard Escape listener
    React.useEffect(() => {
        if (!isOpen)
            return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape')
                onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen)
        return null;

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};
        if (!name.trim()) {
            errors.name = t('logistics.nameRequired', 'Introduceți numele articolului.');
        }
        setFieldErrors(errors);
        if (Object.keys(errors).length > 0) {
            setError(t('common.fillRequiredFields', 'Completați câmpurile obligatorii marcate.'));
            return false;
        }
        setError('');
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm())
            return;
        try {
            if (editingItem) {
                const updated = await logisticsService.updateItem(editingItem.id, {
                    name: name.trim(),
                    category: category || 'General',
                    unit: unit || 'buc',
                    photoUrl: photoUrl.trim(),
                    notes: notes.trim(),
                });
                onSuccess(updated);
            } else {
                const newItem = await logisticsService.addItem({
                    name: name.trim(),
                    sku: `SKU-${Date.now().toString(36).toUpperCase()}`,
                    category: category || 'General',
                    unit: unit || 'buc',
                    photoUrl: photoUrl.trim(),
                    notes: notes.trim(),
                    isSellable: false,
                    isMug: false,
                });
                onSuccess(newItem);
            }
            onClose();
            setName('');
            setCategory(availableCategories[0] || '');
            setUnit(availableUnits[0] || '');
            setNotes('');
            setPhotoUrl('');
            setError('');
        }
        catch (err: any) {
            setError(err.message || (editingItem ? t('logistics.errorUpdateItem', 'Eroare la actualizarea produsului') : t('logistics.errorCreateItem', 'Eroare la crearea produsului')));
        }
    };

    const modalBorder = isDarkMode ? 'border-zinc-800' : 'border-zinc-200';
    const modalBg = isDarkMode ? 'bg-black text-white border-zinc-800 shadow-2xl' : 'bg-white text-zinc-900 border-zinc-200 shadow-xl';
    const inputBg = isDarkMode
        ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700 focus:border-zinc-700'
        : 'bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400 focus:border-zinc-400';
    const inputErrorBorder = 'border-rose-500/80 focus:border-rose-500 ring-1 ring-rose-500/40';
    const textSub = isDarkMode ? 'text-zinc-400' : 'text-zinc-500';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150" onClick={onClose}>
            <div className={`w-full h-full sm:h-auto sm:max-h-[90vh] max-w-md rounded-none sm:rounded-2xl border-0 sm:border shadow-2xl flex flex-col overflow-hidden transition-all transform scale-100 animate-in zoom-in-95 duration-150 ${modalBg}`} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="px-5 sm:px-6 pt-5 pb-3.5 flex items-center justify-between shrink-0">
                    <h3 className="font-bold text-base sm:text-lg tracking-tight">
                        {editingItem ? t('logistics.editItem', 'Editează Articol') : t('logistics.addNewItem', 'Adaugă Articol Nou')}
                    </h3>
                    <button onClick={onClose} aria-label={t('common.close', 'Închide')} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}>
                        <X className="w-5 h-5"/>
                    </button>
                </div>
                <div className={`mx-5 sm:mx-6 border-b ${modalBorder}`} />

                {/* Scrollable Form Body */}
                <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-4 text-sm">
                    <form id="add-item-form" noValidate onSubmit={handleSubmit} className="space-y-4 text-sm">
                        <div>
                            <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                                {t('logistics.itemName', 'Nume Articol')}
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' }));
                                }}
                                placeholder={t('logistics.itemNamePlaceholder', 'e.g. Pahare Roșii 250ml, Boiler Ceai')}
                                className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputBg} ${fieldErrors.name ? inputErrorBorder : ''}`}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <ManageableSelect
                                    label={t('logistics.category', 'Categorie')}
                                    value={category}
                                    onChange={(val) => setCategory(val)}
                                    options={availableCategories}
                                    modalTitle={t('logistics.manageCategories', 'Gestionează Categorii Produse')}
                                    isDarkMode={isDarkMode}
                                    onAddItem={handleAddCategory}
                                    onRenameItem={handleRenameCategory}
                                    onDeleteItem={handleDeleteCategory}
                                />
                            </div>
                            <div>
                                <ManageableSelect
                                    label={t('logistics.unit', 'Unitate Măsură')}
                                    value={unit}
                                    onChange={(val) => setUnit(val)}
                                    options={availableUnits}
                                    modalTitle={t('logistics.manageUnits', 'Gestionează Unități de Măsură')}
                                    isDarkMode={isDarkMode}
                                    onAddItem={handleAddUnit}
                                    onRenameItem={handleRenameUnit}
                                    onDeleteItem={handleDeleteUnit}
                                />
                            </div>
                        </div>

                        <div>
                            <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                                {t('logistics.photoUrl', 'Link Poză (Google Drive)')}
                            </label>
                            <input
                                type="text"
                                value={photoUrl}
                                onChange={(e) => setPhotoUrl(e.target.value)}
                                placeholder={t('logistics.photoUrlPlaceholder', 'https://drive.google.com/file/d/...')}
                                className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputBg}`}
                            />
                        </div>

                        <div>
                            <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                                {t('logistics.notes', 'Note / Detalii')}
                            </label>
                            <textarea
                                rows={2}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder={t('logistics.notesPlaceholder', 'Ex: Păstrați în cutii sigilate...')}
                                className={`w-full px-3 py-2 text-xs rounded-xl border outline-hidden transition resize-none ${inputBg}`}
                            />
                        </div>
                    </form>
                </div>

                <div className={`mx-5 sm:mx-6 border-t ${modalBorder}`} />

                {/* Footer */}
                <div className="px-5 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
                    <div className="min-w-0 pr-3">
                        {error && (
                            <p className="text-xs text-rose-400 font-medium truncate">{error}</p>
                        )}
                    </div>
                    <button
                        form="add-item-form"
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer shrink-0"
                    >
                        {editingItem ? t('common.saveChanges', 'Salvează Modificările') : t('logistics.saveItem', 'Salvează Articol')}
                    </button>
                </div>
            </div>
        </div>
    );
};
