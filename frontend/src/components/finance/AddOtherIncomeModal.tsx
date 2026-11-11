import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { FinanceOtherIncome } from '../../types/finance';
import { useLanguage } from '../../context/LanguageContext';
import { DatePicker, CustomSelect, ManageableSelect } from '../common';
interface AddOtherIncomeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (income: Omit<FinanceOtherIncome, 'id' | 'createdAt'>) => void;
    initialData?: FinanceOtherIncome | null;
    isDarkMode: boolean;
    availableCategories?: string[];
    onAddCategory?: (category: string) => void;
    onRenameCategory?: (oldCat: string, newCat: string) => void;
    onDeleteCategory?: (cat: string) => void;
}
export const AddOtherIncomeModal: React.FC<AddOtherIncomeModalProps> = ({
    isOpen,
    onClose,
    onAdd,
    initialData,
    isDarkMode,
    availableCategories = [],
    onAddCategory,
    onRenameCategory,
    onDeleteCategory,
}) => {
    const { t } = useLanguage();
    const [transactionDate, setTransactionDate] = useState(initialData?.transactionDate || new Date().toISOString().split('T')[0]);
    const [amount, setAmount] = useState<number | ''>(initialData?.amount ?? '');
    const [currency, setCurrency] = useState(initialData?.currency || 'RON');
    const [sourcePayer, setSourcePayer] = useState(initialData?.sourcePayer || '');
    const [category, setCategory] = useState(initialData?.category || (availableCategories.length > 0 ? availableCategories[0] : ''));
    const [description, setDescription] = useState(initialData?.description || '');
    const [referenceDoc, setReferenceDoc] = useState(initialData?.referenceDoc || '');
    React.useEffect(() => {
        if (initialData) {
            setTransactionDate(initialData.transactionDate || new Date().toISOString().split('T')[0]);
            setAmount(initialData.amount ?? '');
            setCurrency(initialData.currency || 'RON');
            setSourcePayer(initialData.sourcePayer || '');
            setCategory(initialData.category || (availableCategories.length > 0 ? availableCategories[0] : ''));
            setDescription(initialData.description || '');
            setReferenceDoc(initialData.referenceDoc || '');
        }
        else {
            setTransactionDate(new Date().toISOString().split('T')[0]);
            setAmount('');
            setCurrency('RON');
            setSourcePayer('');
            setCategory(availableCategories.length > 0 ? availableCategories[0] : '');
            setDescription('');
            setReferenceDoc('');
        }
    }, [initialData, isOpen, availableCategories]);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    React.useEffect(() => {
        setError('');
        setFieldErrors({});
    }, [isOpen, initialData]);

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
        if (!transactionDate) {
            errors.date = t('finance.errorDate', 'Selectați data.');
        }
        if (!amount || Number(amount) <= 0) {
            errors.amount = t('finance.errorAmount', 'Introduceți suma.');
        }
        if (!sourcePayer.trim()) {
            errors.sourcePayer = t('finance.errorSourcePayer', 'Introduceți sursa/plătitorul.');
        }
        setFieldErrors(errors);
        if (Object.keys(errors).length > 0) {
            setError(t('common.fillRequiredFields', 'Completați câmpurile obligatorii marcate.'));
            return false;
        }
        setError('');
        return true;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm())
            return;
        onAdd({
            transactionDate,
            amount: Number(amount),
            currency,
            sourcePayer: sourcePayer.trim(),
            category,
            description: description.trim(),
            campaign: initialData?.campaign || undefined,
            referenceDoc: referenceDoc.trim() || undefined,
        });
        onClose();
    };

    const modalBorder = isDarkMode ? 'border-zinc-800' : 'border-zinc-200';
    const modalBg = isDarkMode ? 'bg-black text-white border-zinc-800 shadow-2xl' : 'bg-white text-zinc-900 border-zinc-200 shadow-xl';
    const inputBg = isDarkMode
        ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700 focus:border-zinc-700'
        : 'bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400 focus:border-zinc-400';
    const inputErrorBorder = 'border-rose-500/80 focus:border-rose-500 ring-1 ring-rose-500/40';
    const textSub = isDarkMode ? 'text-zinc-400' : 'text-zinc-500';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150" onClick={onClose}>
            <div className={`w-full h-full sm:h-auto sm:max-h-[90vh] max-w-lg rounded-none sm:rounded-2xl border-0 sm:border shadow-2xl flex flex-col overflow-hidden transition-all transform scale-100 animate-in zoom-in-95 duration-150 ${modalBg}`} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="px-5 sm:px-6 pt-5 pb-3.5 flex items-center justify-between shrink-0">
                    <h3 className="font-bold text-base sm:text-lg tracking-tight">
                        {initialData ? t('finance.editIncome', 'Editează Încasare') : t('finance.addIncome', 'Adaugă Altă Încasare')}
                    </h3>
                    <button onClick={onClose} aria-label={t('common.close', 'Închide')} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}>
                        <X className="w-5 h-5"/>
                    </button>
                </div>
                <div className={`mx-5 sm:mx-6 border-b ${modalBorder}`} />

                {/* Scrollable Form Body */}
                <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-4 text-sm">
                    <form id="other-income-form" noValidate onSubmit={handleSubmit} className="space-y-4 text-sm">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <DatePicker label={t('table.date', 'Dată')} required={false} value={transactionDate} onChange={(val) => {
                                    setTransactionDate(val);
                                    if (fieldErrors.date) setFieldErrors(prev => ({ ...prev, date: '' }));
                                }} isDarkMode={isDarkMode} className={fieldErrors.date ? '[&_>div]:border-rose-500/80' : ''}/>
                            </div>
                            <div>
                                <label className={`block text-xs font-semibold mb-1 ${textSub}`}>{t('table.amount', 'Sumă')} & {t('finance.currency', 'Monedă')}</label>
                                <div className="flex space-x-2">
                                    <input type="number" step="0.01" placeholder="0.00" value={amount} onFocus={(e) => e.target.select()} onChange={(e) => {
                                        const clean = e.target.value.replace(/^0+(?=\d)/, '');
                                        setAmount(clean === '' ? '' : Number(clean));
                                        if (fieldErrors.amount) setFieldErrors(prev => ({ ...prev, amount: '' }));
                                    }} className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputBg} ${fieldErrors.amount ? inputErrorBorder : ''}`}/>
                                    <div className="w-24 shrink-0">
                                        <CustomSelect value={currency} onChange={(val) => setCurrency(val)} options={['RON', 'EUR', 'USD']} isDarkMode={isDarkMode}/>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className={`block text-xs font-semibold mb-1 ${textSub}`}>{t('finance.sourcePayer', 'Sursă / Plătitor')}</label>
                                <input type="text" placeholder="Ex: Sponsor Principal, Vânzare Produse" value={sourcePayer} onChange={(e) => {
                                    setSourcePayer(e.target.value);
                                    if (fieldErrors.sourcePayer) setFieldErrors(prev => ({ ...prev, sourcePayer: '' }));
                                }} className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputBg} ${fieldErrors.sourcePayer ? inputErrorBorder : ''}`}/>
                            </div>
                            <div>
                                <ManageableSelect
                                    label={t('table.category', 'Categorie')}
                                    required={false}
                                    value={category}
                                    onChange={(newVal) => {
                                        setCategory(newVal);
                                        if (fieldErrors.category) setFieldErrors(prev => ({ ...prev, category: '' }));
                                    }}
                                    options={availableCategories}
                                    placeholder={t('finance.selectCategory', 'Selectează categorie...')}
                                    modalTitle={t('finance.manageIncomeCategories', 'Gestionează Categorii Încasări')}
                                    isDarkMode={isDarkMode}
                                    onAddItem={(name) => onAddCategory && onAddCategory(name)}
                                    onRenameItem={(oldVal, newVal) => onRenameCategory && onRenameCategory(oldVal, newVal)}
                                    onDeleteItem={(val) => onDeleteCategory && onDeleteCategory(val)}
                                    className={fieldErrors.category ? '[&_>div]:border-rose-500/80' : ''}
                                />
                            </div>
                        </div>

                        <div>
                            <label className={`block text-xs font-semibold mb-1 ${textSub}`}>{t('table.details', 'Descriere')}</label>
                            <textarea rows={2} placeholder="..." value={description} onChange={(e) => setDescription(e.target.value)} className={`w-full px-3 py-2 text-xs rounded-xl border outline-hidden transition resize-none ${inputBg}`}/>
                        </div>

                        <div>
                            <label className={`block text-xs font-semibold mb-1 ${textSub}`}>{t('finance.referenceDoc', 'Document Referință')}</label>
                            <div className="relative">
                                <input type="text" placeholder="https://..." value={referenceDoc} onChange={(e) => setReferenceDoc(e.target.value)} className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputBg}`}/>
                            </div>
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
                    <button form="other-income-form" type="submit" className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer shrink-0">
                        {initialData ? t('common.saveChanges', 'Salvează Modificările') : t('finance.addIncomeBtn', 'Adaugă Încasarea')}
                    </button>
                </div>
            </div>
        </div>
    );
};
