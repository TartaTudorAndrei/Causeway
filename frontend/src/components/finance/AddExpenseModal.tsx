import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import type { FinanceExpense } from '../../types/finance';
import { financeService } from '../../services/financeService';
import { useLanguage } from '../../context/LanguageContext';
import { ManageableSelect, DatePicker, CustomSelect, ConfirmationModal } from '../common';
interface AddExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (expense: Omit<FinanceExpense, 'id' | 'createdAt'>) => Promise<void> | void;
    initialData?: FinanceExpense | null;
    isDarkMode: boolean;
    availableCategories?: string[];
    onAddCategory?: (category: string) => void;
    onRenameCategory?: (oldCat: string, newCat: string) => void;
    onDeleteCategory?: (cat: string) => void;
}
export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ isOpen, onClose, onAdd, initialData, isDarkMode, availableCategories = [], onAddCategory, onRenameCategory, onDeleteCategory, }) => {
    const { t } = useLanguage();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [name, setName] = useState(initialData?.name || '');
    const [transactionDate, setTransactionDate] = useState(initialData?.transactionDate || new Date().toISOString().split('T')[0]);
    const [amount, setAmount] = useState<number | ''>(initialData?.amount ?? '');
    const [currency, setCurrency] = useState(initialData?.currency || 'RON');
    const [category, setCategory] = useState(initialData?.category || (availableCategories.length > 0 ? availableCategories[0] : ''));
    const [description, setDescription] = useState(initialData?.description || '');
    const [paymentMethod, setPaymentMethod] = useState(initialData?.paymentMethod || 'Bank Transfer');
    const [receiptAttachment, setReceiptAttachment] = useState(initialData?.receiptAttachment || '');
    const [error, setError] = useState<string>('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    // AI Scan states
    const [scanTab, setScanTab] = useState<'upload' | 'drive'>('upload');
    const [driveUrlInput, setDriveUrlInput] = useState<string>('');
    const [isScanning, setIsScanning] = useState<boolean>(false);
    const [scanSuccessInfo, setScanSuccessInfo] = useState<string>('');
    const [isDragOver, setIsDragOver] = useState<boolean>(false);
    const [wasAiScanned, setWasAiScanned] = useState<boolean>(false);
    const [showAiVerifyConfirm, setShowAiVerifyConfirm] = useState<boolean>(false);
    React.useEffect(() => {
        setError('');
        setFieldErrors({});
        setIsSubmitting(false);
        setIsScanning(false);
        setScanSuccessInfo('');
        setWasAiScanned(false);
        setShowAiVerifyConfirm(false);
        if (initialData) {
            setName(initialData.name || '');
            setTransactionDate(initialData.transactionDate || new Date().toISOString().split('T')[0]);
            setAmount(initialData.amount ?? '');
            setCurrency(initialData.currency || 'RON');
            setCategory(initialData.category || (availableCategories.length > 0 ? availableCategories[0] : ''));
            setDescription(initialData.description || '');
            setPaymentMethod(initialData.paymentMethod || 'Bank Transfer');
            setReceiptAttachment(initialData.receiptAttachment || '');
        }
        else {
            setName('');
            setTransactionDate(new Date().toISOString().split('T')[0]);
            setAmount('');
            setCurrency('RON');
            setCategory(availableCategories.length > 0 ? availableCategories[0] : '');
            setDescription('');
            setPaymentMethod('Bank Transfer');
            setReceiptAttachment('');
        }
    }, [initialData, isOpen, availableCategories]);
    // Keyboard Escape listener
    useEffect(() => {
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
    const applyScanResult = (result: any) => {
        if (result.name) {
            setName(result.name);
        }
        if (result.transactionDate) {
            setTransactionDate(result.transactionDate);
        }
        if (typeof result.amount === 'number' && !isNaN(result.amount)) {
            setAmount(result.amount);
        }
        if (result.currency) {
            setCurrency(result.currency.toUpperCase());
        }
        if (result.category) {
            const matched = availableCategories.find((c) => c.toLowerCase() === result.category?.toLowerCase());
            if (matched) {
                setCategory(matched);
            }
            else {
                if (onAddCategory)
                    onAddCategory(result.category);
                setCategory(result.category);
            }
        }
        if (result.description) {
            setDescription(result.description);
        }
        if (result.paymentMethod) {
            const validMethods = ['Bank Transfer', 'Card', 'Cash', 'Reimbursement'];
            const matchedMethod = validMethods.find((m) => m.toLowerCase() === result.paymentMethod?.toLowerCase());
            if (matchedMethod)
                setPaymentMethod(matchedMethod);
        }
        if (result.receiptUrl || result.receiptAttachment) {
            setReceiptAttachment(result.receiptUrl || result.receiptAttachment || '');
        }
        const summaryText = result.name || (result.merchantName
            ? `${result.merchantName} (${result.amount ?? ''} ${result.currency ?? 'RON'})`
            : `${result.amount ?? ''} ${result.currency ?? 'RON'}`);
        setScanSuccessInfo(summaryText);
        setWasAiScanned(true);
    };
    const handleScanFile = async (file: File) => {
        if (!file)
            return;
        setError('');
        setScanSuccessInfo('');
        setIsScanning(true);
        try {
            const result = await financeService.scanReceipt(file, availableCategories);
            applyScanResult(result);
        }
        catch (err: any) {
            console.error('Scan error:', err);
            setError(err?.message || t('finance.scanError', 'Eroare la scanarea bonului.'));
        }
        finally {
            setIsScanning(false);
            if (fileInputRef.current)
                fileInputRef.current.value = '';
        }
    };
    const handleScanDriveReceipt = async (urlOrId: string) => {
        const clean = urlOrId.trim();
        if (!clean)
            return;
        setError('');
        setScanSuccessInfo('');
        setIsScanning(true);
        try {
            const result = await financeService.scanDriveReceipt(clean, availableCategories);
            applyScanResult(result);
        }
        catch (err: any) {
            console.error('Google Drive scan error:', err);
            setError(err?.message || t('finance.driveFetchError', 'Eroare la încărcarea fișierului din Google Drive.'));
        }
        finally {
            setIsScanning(false);
        }
    };
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file)
            handleScanFile(file);
    };
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file)
            handleScanFile(file);
    };
    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};
        const finalName = name.trim();
        if (!finalName) {
            errors.name = t('finance.errorName', 'Introduceți numele cheltuielii.');
        }
        if (!transactionDate) {
            errors.date = t('finance.errorDate', 'Selectați data.');
        }
        if (!amount || Number(amount) <= 0) {
            errors.amount = t('finance.errorAmount', 'Introduceți suma.');
        }
        const finalCategory = category.trim();
        if (!finalCategory) {
            errors.category = t('finance.errorCategory', 'Selectați categoria.');
        }
        setFieldErrors(errors);
        if (Object.keys(errors).length > 0) {
            setError(t('common.fillRequiredFields', 'Completați câmpurile obligatorii marcate.'));
            return false;
        }
        setError('');
        return true;
    };
    const executeSubmit = async () => {
        if (!validateForm())
            return;
        setError('');
        setIsSubmitting(true);
        try {
            const finalCategory = category.trim();
            if (onAddCategory) {
                onAddCategory(finalCategory);
            }
            await onAdd({
                name: name.trim(),
                transactionDate,
                amount: Number(amount),
                currency,
                category: finalCategory,
                description: description.trim(),
                paymentMethod,
                receiptAttachment: receiptAttachment.trim() || undefined,
            });
            onClose();
        }
        catch (err: any) {
            setError(err?.message || t('finance.expenseError', 'Eroare la salvarea cheltuielii.'));
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm())
            return;
        setError('');
        if (wasAiScanned) {
            setShowAiVerifyConfirm(true);
            return;
        }
        executeSubmit();
    };
    const modalBorder = isDarkMode ? 'border-zinc-800' : 'border-zinc-200';
    const modalBg = isDarkMode ? 'bg-black text-white border-zinc-800 shadow-2xl' : 'bg-white text-zinc-900 border-zinc-200 shadow-xl';
    const inputBg = isDarkMode
        ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700 focus:border-zinc-700'
        : 'bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400 focus:border-zinc-400';
    const inputErrorBorder = 'border-rose-500/80 focus:border-rose-500 ring-1 ring-rose-500/40';
    const textSub = isDarkMode ? 'text-zinc-400' : 'text-zinc-500';
    return (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div className={`w-full h-full sm:h-auto sm:max-h-[90vh] max-w-lg rounded-none sm:rounded-2xl border-0 sm:border shadow-2xl flex flex-col overflow-hidden transition-all transform scale-100 animate-in zoom-in-95 duration-150 ${modalBg}`} onClick={(e) => e.stopPropagation()}>
        {/* Header with inset divider matching container border */}
        <div className="px-5 sm:px-6 pt-5 pb-3.5 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-base sm:text-lg tracking-tight">
            {initialData ? t('finance.editExpense', 'Editează Cheltuială') : t('finance.addExpense', 'Adaugă Cheltuială')}
          </h3>
          <button onClick={onClose} aria-label={t('common.close', 'Închide')} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}>
            <X className="w-5 h-5"/>
          </button>
        </div>
        <div className={`mx-5 sm:mx-6 border-b ${modalBorder}`} />

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-4 text-sm">
          {/* Scan Source Tab Header */}
          <div>
            <div className={`flex p-1 rounded-xl border ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`}>
              <button type="button" onClick={() => setScanTab('upload')} className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center space-x-1.5 cursor-pointer ${scanTab === 'upload'
              ? isDarkMode
                  ? 'bg-zinc-800 text-white shadow-xs'
                  : 'bg-white text-zinc-900 shadow-xs'
              : textSub}`}><span>{t('finance.uploadDevice', 'Încarcă din Dispozitiv')}</span>
              </button>
              <button type="button" onClick={() => setScanTab('drive')} className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center space-x-1.5 cursor-pointer ${scanTab === 'drive'
              ? isDarkMode
                  ? 'bg-zinc-800 text-white shadow-xs'
                  : 'bg-white text-zinc-900 shadow-xs'
              : textSub}`}><span>{t('finance.googleDriveTab', 'Google Drive')}</span>
              </button>
            </div>
          </div>

          {/* Tab 1: Local upload / drag & drop */}
          {scanTab === 'upload' && (<div className="mt-2.5">
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,application/pdf" className="hidden" onChange={handleFileChange}/>
              <div onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
              }} onDragLeave={() => setIsDragOver(false)} onDrop={handleDrop} onClick={() => !isScanning && fileInputRef.current?.click()} className={`p-3.5 rounded-xl border border-dashed transition text-center cursor-pointer ${isDragOver
                  ? 'border-blue-500 bg-blue-500/10'
                  : isDarkMode
                      ? 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                      : 'border-zinc-300 bg-zinc-100 hover:border-zinc-400'}`}>
                {isScanning ? (<div className="flex items-center justify-center space-x-2 py-1 text-blue-400"><span className="text-xs font-semibold">{t('finance.scanningReceipt', 'Se analizează documentul cu AI...')}</span>
                  </div>) : scanSuccessInfo ? (<div className="flex items-center justify-between text-xs px-1">
                    <div className="flex items-center space-x-2 text-emerald-400 font-semibold truncate"><span className="truncate">{t('finance.scanSuccess', 'Extras automat:')} {scanSuccessInfo}</span>
                    </div>
                    <span className="text-[11px] text-zinc-400 underline ml-2 shrink-0">
                      {t('finance.rescan', 'Alt fișier')}
                    </span>
                  </div>) : (<div className="flex items-center justify-center space-x-2 text-xs"><span className="font-semibold text-zinc-300">
                      {t('finance.scanReceipt', 'Scanează Bon / Factură cu AI')}
                    </span>
                    <span className={`text-[11px] hidden sm:inline ${textSub}`}>
                      (PDF, JPG, PNG)
                    </span>
                  </div>)}
              </div>
            </div>)}

          {/* Tab 2: Google Drive Scan */}
          {scanTab === 'drive' && (<div className="mt-2.5 space-y-2.5">
              <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`}>
                <div className="flex space-x-2">
                  <input type="text" placeholder={t('finance.driveLinkPlaceholder', 'Lipiți linkul sau ID-ul Google Drive...')} value={driveUrlInput} onChange={(e) => setDriveUrlInput(e.target.value)} onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                      e.preventDefault();
                      handleScanDriveReceipt(driveUrlInput);
                  }
              }} className={`flex-1 px-3 py-1.5 text-xs rounded-xl border outline-hidden transition ${inputBg}`}/>
                  <button type="button" disabled={isScanning || !driveUrlInput.trim()} onClick={() => handleScanDriveReceipt(driveUrlInput)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer shrink-0">
                    <span>{t('finance.scanDriveBtn', 'Scanează')}</span>
                  </button>
                </div>

                {isScanning && (<div className="flex items-center justify-center space-x-2 pt-2 text-blue-400 text-xs"><span>{t('finance.driveScanningReceipt', 'Se descarcă și se analizează din Google Drive...')}</span>
                  </div>)}

                {scanSuccessInfo && !isScanning && (<div className="flex items-center space-x-2 pt-2 text-emerald-400 text-xs font-semibold truncate"><span className="truncate">{t('finance.scanSuccess', 'Extras automat:')} {scanSuccessInfo}</span>
                  </div>)}
              </div>
            </div>)}

          <form id="expense-form" noValidate onSubmit={handleSubmit} className="space-y-4 text-sm pt-1">
            <div>
              <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                {t('finance.expenseName', 'Nume / Titlu Cheltuială')}
              </label>
              <input type="text" placeholder={t('finance.expenseNamePlaceholder', 'Ex: Kaufland - Apă & Gustări Protocol')} value={name} onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' }));
              }} className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputBg} ${fieldErrors.name ? inputErrorBorder : ''}`}/>
            </div>
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
                <ManageableSelect label={t('table.category', 'Categorie')} required={false} value={category} onChange={(newVal) => {
                  setCategory(newVal);
                  if (fieldErrors.category) setFieldErrors(prev => ({ ...prev, category: '' }));
                }} options={availableCategories} placeholder={t('finance.selectCategory', 'Selectează categorie...')} modalTitle={t('finance.manageCategories', 'Gestionează Categorii Cheltuieli')} isDarkMode={isDarkMode} onAddItem={(name) => onAddCategory && onAddCategory(name)} onRenameItem={(oldVal, newVal) => onRenameCategory && onRenameCategory(oldVal, newVal)} onDeleteItem={(val) => onDeleteCategory && onDeleteCategory(val)} className={fieldErrors.category ? '[&_>div]:border-rose-500/80' : ''}/>
              </div>
              <div>
                <CustomSelect label={t('finance.paymentMethod', 'Metodă de Plată')} value={paymentMethod} onChange={(val) => setPaymentMethod(val)} options={[
              { value: 'Bank Transfer', label: t('finance.bankTransfer', 'Transfer Bancar') },
              { value: 'Card', label: t('finance.card', 'Card') },
              { value: 'Cash', label: t('finance.cash', 'Cash (Numerar)') },
              { value: 'Reimbursement', label: t('finance.reimbursement', 'Decontare Personală') },
          ]} isDarkMode={isDarkMode}/>
              </div>
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                {t('finance.expenseItemsDescription', 'Articole & Detalii')}
              </label>
              <textarea rows={3} placeholder={t('finance.expenseItemsPlaceholder', 'Ex: Apă 5L x 6, Cafea 1kg x 2...')} value={description} onChange={(e) => setDescription(e.target.value)} className={`w-full px-3 py-2 text-xs rounded-xl border outline-hidden transition resize-none ${inputBg}`}/>
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1 ${textSub}`}>{t('finance.receiptUrl', 'Link Atașament Bon')}</label>
              <div className="relative">
                <input type="text" placeholder="https://..." value={receiptAttachment} onChange={(e) => setReceiptAttachment(e.target.value)} className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputBg}`}/>
              </div>
            </div>
          </form>
        </div>

        {/* Inset border matching container border */}
        <div className={`mx-5 sm:mx-6 border-t ${modalBorder}`} />

        {/* Footer with single primary action and error banner if needed */}
        <div className="px-5 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="min-w-0 pr-3">
            {error && (
              <p className="text-xs text-rose-400 font-medium truncate">{error}</p>
            )}
          </div>
          <button form="expense-form" type="submit" disabled={isSubmitting || isScanning} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50 flex items-center space-x-2 shrink-0">
            {isSubmitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/>}
            <span>{initialData ? t('common.saveChanges', 'Salvează Modificările') : t('finance.addExpenseBtn', 'Adaugă Cheltuială')}</span>
          </button>
        </div>
      </div>
<ConfirmationModal isOpen={showAiVerifyConfirm} onClose={() => setShowAiVerifyConfirm(false)} onConfirm={async () => {
            setShowAiVerifyConfirm(false);
            await executeSubmit();
        }} title={t('finance.aiVerificationTitle', 'Verificare Date Scanate cu AI')} message={t('finance.aiVerificationWarning', 'Scanarea bonurilor cu AI poate să nu fie 100% exactă. Vă rugăm să verificați valorile și detaliile înainte de salvarea finală.')} confirmText={t('finance.confirmAndSubmit', 'Confirmă & Salvează')} cancelText={t('finance.reviewDetails', 'Verifică Datele')} variant="primary" isDarkMode={isDarkMode} zIndex="z-60" isLoading={isSubmitting}/>
    </div>);
};
