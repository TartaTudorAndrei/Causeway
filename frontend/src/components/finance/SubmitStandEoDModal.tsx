import React, { useState, useEffect, useCallback } from 'react';
import { X, Trash2 } from 'lucide-react';
import type { FinanceStand, FinancePosEntry } from '../../types/finance';
import type { HrStand } from '../../types/hr';
import { hrService, isStandStartedClient } from '../../services/hrService';
import { financeService } from '../../services/financeService';
import { useLanguage } from '../../context/LanguageContext';
import { usePermission } from '../../hooks/usePermission';
import { ManageableSelect, ConfirmationModal } from '../common';
interface SubmitStandEoDModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (stand: Omit<FinanceStand, 'id' | 'createdAt'>) => Promise<void> | void;
    onDelete?: (id: string, location?: string) => Promise<void> | void;
    initialData?: FinanceStand | null;
    initialStandId?: string;
    isDarkMode: boolean;
    availablePosDevices?: string[];
    onAddPosDevice?: (posName: string) => void;
    onRenamePosDevice?: (oldName: string, newName: string) => void;
    onDeletePosDevice?: (posName: string) => void;
}
const BILL_DENOMINATIONS = [
    { value: 500, label: '500 RON' },
    { value: 200, label: '200 RON' },
    { value: 100, label: '100 RON' },
    { value: 50, label: '50 RON' },
    { value: 20, label: '20 RON' },
    { value: 10, label: '10 RON' },
    { value: 5, label: '5 RON' },
    { value: 1, label: '1 RON' },
];
const getAccountName = (): string => {
    try {
        const raw = localStorage.getItem('adminUser');
        if (raw) {
            const u = JSON.parse(raw);
            return u?.name || u?.fullName || '';
        }
    }
    catch { }
    return '';
};
export const SubmitStandEoDModal: React.FC<SubmitStandEoDModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    onDelete,
    initialData,
    initialStandId,
    isDarkMode,
    availablePosDevices,
    onAddPosDevice,
    onRenamePosDevice,
    onDeletePosDevice,
}) => {
    const { t } = useLanguage();
    const { user } = usePermission();
    // HR Stands State
    const [stands, setStands] = useState<HrStand[]>([]);
    const [loadingStands, setLoadingStands] = useState(false);
    const [selectedStandId, setSelectedStandId] = useState('');
    // Form Fields
    const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
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
    // 1. Bill by Bill Cash breakdown
    const [billCounts, setBillCounts] = useState<{
        [denom: number]: number | '';
    }>({
        500: '',
        200: '',
        100: '',
        50: '',
        20: '',
        10: '',
        5: '',
        1: '',
    });
    // 2. POS Terminals & Manageable List
    const [localPosDevices, setLocalPosDevices] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('app_finance_pos_devices');
            if (saved !== null) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed))
                    return parsed;
            }
        }
        catch { }
        return [];
    });
    const currentPosDevices = availablePosDevices !== undefined ? availablePosDevices : localPosDevices;
    const [posEntries, setPosEntries] = useState<FinancePosEntry[]>([]);
    const [posLocationRemaining, setPosLocationRemaining] = useState('');
    const [discrepancyNotes, setDiscrepancyNotes] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    // Load Stands and Reports
    const loadStands = useCallback(async () => {
        setLoadingStands(true);
        setError('');
        try {
            const [allStandsRes, existingReportsRes] = await Promise.allSettled([
                hrService.getStands(),
                financeService.getStands(),
            ]);
            const allStands = allStandsRes.status === 'fulfilled' && Array.isArray(allStandsRes.value)
                ? allStandsRes.value
                : [];
            const existingReports = existingReportsRes.status === 'fulfilled' && Array.isArray(existingReportsRes.value)
                ? existingReportsRes.value
                : [];
            setStands(allStands);
            if (initialData) {
                setSelectedStandId(initialData.standId || '');
                const matchingStand = allStands.find((s) => s &&
                    (s.locationName === initialData.standLocation ||
                        `${s.locationName} (${s.eventDate})` === initialData.standLocation));
                if (matchingStand) {
                    setSelectedStandId(matchingStand.id);
                }
                setEventDate(initialData.eventDate || new Date().toISOString().split('T')[0]);
                if (initialData.cashCollected) {
                    setBillCounts((prev) => ({ ...prev, 1: initialData.cashCollected }));
                }
                if (initialData.posEntries && initialData.posEntries.length > 0) {
                    setPosEntries(initialData.posEntries);
                }
                else if (initialData.posCardCollected) {
                    const defaultPos = currentPosDevices[0] || '';
                    setPosEntries([{ posId: defaultPos, posName: defaultPos, amount: initialData.posCardCollected }]);
                }
                else {
                    setPosEntries([]);
                }
                setPosLocationRemaining(initialData.posLocationRemaining || '');
                setDiscrepancyNotes(initialData.discrepancyNotes || '');
            }
            else {
                const closedStandKeys = new Set(existingReports.filter(Boolean).map((r) => `${r.standLocation}_${r.eventDate}`));
                const available = allStands.filter((s) => {
                    if (!s || s.status !== 'ACTIVE')
                        return false;
                    if (closedStandKeys.has(`${s.locationName}_${s.eventDate}`))
                        return false;
                    if (!isStandStartedClient(s))
                        return false;
                    return true;
                });
                if (initialStandId && allStands.some((s) => s && s.id === initialStandId)) {
                    setSelectedStandId(initialStandId);
                    const found = allStands.find((s) => s && s.id === initialStandId);
                    if (found?.eventDate) {
                        setEventDate(typeof found.eventDate === 'string' ? found.eventDate : String(found.eventDate));
                    }
                }
                else if (available.length > 0) {
                    setSelectedStandId(available[0].id);
                    setEventDate(available[0].eventDate
                        ? typeof available[0].eventDate === 'string'
                            ? available[0].eventDate
                            : String(available[0].eventDate)
                        : new Date().toISOString().split('T')[0]);
                }
                else {
                    setSelectedStandId('');
                    setEventDate(new Date().toISOString().split('T')[0]);
                }
                setBillCounts({ 500: '', 200: '', 100: '', 50: '', 20: '', 10: '', 5: '', 1: '' });
                setPosEntries([]);
                setPosLocationRemaining('');
                setDiscrepancyNotes('');
                setFieldErrors({});
            }
        }
        catch {
            setError(t('logistics.eodLoadError', 'Eroare la încărcarea standurilor active.'));
        }
        finally {
            setLoadingStands(false);
        }
    }, [currentPosDevices, initialData, initialStandId, t]);
    useEffect(() => {
        if (isOpen) {
            loadStands();
        }
    }, [isOpen, initialData?.id, initialStandId, loadStands]);
    if (!isOpen)
        return null;
    const isEditMode = Boolean(initialData);
    const selectedStand = (stands || []).find((s) => s && s.id === selectedStandId);
    // Valid selectable stands
    const validStands = (stands || []).filter((s) => (s && s.status === 'ACTIVE' && isStandStartedClient(s)) ||
        (initialStandId && s && s.id === initialStandId) ||
        (initialData && s && (s.id === selectedStandId || s.locationName === initialData.standLocation)));
    // POS Devices management
    const handleAddPosDevice = (posName: string) => {
        const trimmed = posName.trim();
        if (!trimmed)
            return;
        if (onAddPosDevice) {
            onAddPosDevice(trimmed);
        } else {
            setLocalPosDevices((prev) => {
                if (prev.includes(trimmed))
                    return prev;
                const updated = [...prev, trimmed];
                try {
                    localStorage.setItem('app_finance_pos_devices', JSON.stringify(updated));
                }
                catch (err) {
                    console.error(err);
                }
                return updated;
            });
        }
    };
    const handleRenamePosDevice = (oldName: string, newName: string) => {
        const trimmed = newName.trim();
        if (!trimmed || trimmed === oldName)
            return;
        if (onRenamePosDevice) {
            onRenamePosDevice(oldName, trimmed);
        } else {
            setLocalPosDevices((prev) => {
                const updated = prev.map((p) => (p === oldName ? trimmed : p));
                try {
                    localStorage.setItem('app_finance_pos_devices', JSON.stringify(updated));
                }
                catch (err) {
                    console.error(err);
                }
                return updated;
            });
        }
        setPosEntries((prev) => prev.map((e) => (e.posName === oldName ? { ...e, posName: trimmed, posId: trimmed } : e)));
    };
    const handleDeletePosDevice = (posName: string) => {
        if (onDeletePosDevice) {
            onDeletePosDevice(posName);
        } else {
            setLocalPosDevices((prev) => {
                const updated = prev.filter((p) => p !== posName);
                try {
                    localStorage.setItem('app_finance_pos_devices', JSON.stringify(updated));
                }
                catch (err) {
                    console.error(err);
                }
                return updated;
            });
        }
    };
    // Calculate Cash Total
    const calculatedCashTotal = BILL_DENOMINATIONS.reduce((sum, denom) => {
        const count = Number(billCounts[denom.value]) || 0;
        return sum + count * denom.value;
    }, 0);
    // Calculate POS Total
    const calculatedPosTotal = posEntries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
    const handleBillCountChange = (denom: number, val: string) => {
        const clean = val.replace(/^0+(?=\d)/, '');
        if (clean === '') {
            setBillCounts((prev) => ({ ...prev, [denom]: '' }));
        }
        else {
            const parsed = Math.max(0, parseInt(clean, 10) || 0);
            setBillCounts((prev) => ({ ...prev, [denom]: parsed }));
        }
    };
    const handleAddPosEntry = () => {
        const unusedPos = currentPosDevices.find((p) => !posEntries.some((e) => e.posName === p)) ||
            currentPosDevices[0] ||
            '';
        setPosEntries((prev) => [...prev, { posId: unusedPos, posName: unusedPos, amount: 0 }]);
    };
    const handleRemovePosEntry = (index: number) => {
        setPosEntries((prev) => prev.filter((_, i) => i !== index));
    };
    const handlePosNameChange = (index: number, newName: string) => {
        setPosEntries((prev) => {
            const updated = [...prev];
            updated[index] = {
                ...updated[index],
                posId: newName,
                posName: newName,
            };
            return updated;
        });
    };
    const handlePosAmountChange = (index: number, val: number | string) => {
        setPosEntries((prev) => {
            const updated = [...prev];
            const clean = typeof val === 'string' ? val.replace(/^0+(?=\d)/, '') : val;
            const parsed = typeof clean === 'string' ? (clean === '' ? 0 : Number(clean)) : clean;
            updated[index] = {
                ...updated[index],
                amount: isNaN(parsed) ? 0 : parsed,
            };
            return updated;
        });
    };
    const handleDeleteReport = async () => {
        if (!initialData || !onDelete)
            return;
        try {
            await onDelete(initialData.id, initialData.standLocation);
            setIsDeleteConfirmOpen(false);
            onClose();
        }
        catch (err: any) {
            setIsDeleteConfirmOpen(false);
            setError(err?.message || 'Eroare la ștergerea raportului.');
        }
    };
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const errors: Record<string, string> = {};
        if (!selectedStandId && !initialData) {
            errors.stand = t('finance.errorSelectStand', 'Vă rugăm să selectați un stand valid deschis.');
        }
        if (!initialData && selectedStand && !isStandStartedClient(selectedStand)) {
            errors.stand = t('finance.errorStandNotStarted', 'Standul nu a început încă. Încheierea poate avea loc doar după primul moment al primului schimb.');
        }
        if (!posLocationRemaining.trim()) {
            errors.posLocation = t('finance.errorPosLocation', 'Specificați unde a rămas POS-ul.');
        }
        setFieldErrors(errors);
        if (Object.keys(errors).length > 0) {
            setError(errors.stand || t('common.fillRequiredFields', 'Completați câmpurile obligatorii marcate.'));
            return;
        }
        const fallbackResponsible = t('finance.financeResponsibleFallback', 'Responsabil Financiar');
        const autoAccountName = user?.name || getAccountName() || fallbackResponsible;
        const finalResponsible = initialData?.financeResponsibleName || autoAccountName;
        const defaultStandLabel = t('finance.standFallback', 'Stand');
        const standLocation = initialData?.standLocation
            ? initialData.standLocation
            : selectedStand
                ? selectedStand.locationName
                : defaultStandLabel;
        const finalDate = selectedStand ? selectedStand.eventDate : eventDate;
        setIsSubmitting(true);
        try {
            await onSubmit({
                standLocation,
                eventDate: finalDate,
                shiftName: initialData?.shiftName || 'All Day (EoD)',
                financeResponsibleName: finalResponsible,
                cashCollected: calculatedCashTotal,
                posCardCollected: calculatedPosTotal,
                posEntries: posEntries.filter((entry) => entry.amount > 0 || posEntries.length === 1),
                posLocationRemaining: posLocationRemaining.trim(),
                openingBalance: 0,
                closingBalance: calculatedCashTotal + calculatedPosTotal,
                discrepancyAmount: 0,
                discrepancyNotes: discrepancyNotes || 'Nicio observație.',
                status: initialData?.status || 'SUBMITTED',
            });
            onClose();
        }
        catch (err: any) {
            setError(err?.message || 'Eroare la salvare.');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const modalBorder = isDarkMode ? 'border-zinc-800' : 'border-zinc-200';
    const modalBg = isDarkMode ? 'bg-black text-white border-zinc-800 shadow-2xl' : 'bg-white text-zinc-900 border-zinc-200 shadow-xl';
    const inputBg = isDarkMode
        ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700 focus:border-zinc-700'
        : 'bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400 focus:border-zinc-400';
    const inputErrorBorder = 'border-rose-500/80 focus:border-rose-500 ring-1 ring-rose-500/40';
    const textSub = isDarkMode ? 'text-zinc-400' : 'text-zinc-500';
    const innerBox = isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200';
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150" onClick={onClose}>
            <div className={`w-full h-full sm:h-auto sm:max-h-[90vh] max-w-lg rounded-none sm:rounded-2xl border-0 sm:border shadow-2xl flex flex-col overflow-hidden transition-all transform scale-100 animate-in zoom-in-95 duration-150 ${modalBg}`} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="px-5 sm:px-6 pt-5 pb-3.5 flex items-center justify-between shrink-0">
                    <h3 className="font-bold text-base sm:text-lg tracking-tight">
                        {isEditMode
                            ? t('finance.editEoDModalTitle', 'Editează Raport End of Day (Finanțe)')
                            : t('finance.eodModalTitle', 'Raport End of Day (Finanțe)')}
                    </h3>
                    <button type="button" onClick={onClose} aria-label={t('common.close', 'Închide')} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}>
                        <X className="w-5 h-5"/>
                    </button>
                </div>
                <div className={`mx-5 sm:mx-6 border-b ${modalBorder}`} />

                {/* Scrollable Form Body */}
                <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-4 text-sm">
                    <form id="stand-eod-form" noValidate onSubmit={handleSubmit} className="space-y-4 text-sm">
                        {/* Stand Picker */}
                        <div>
                            <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                                {isEditMode ? t('finance.editingStand', 'Standul editat') : t('finance.selectStandToClose', 'Selectează Standul de Închis')}
                            </label>
                            {isEditMode && initialData ? (
                                <div className={`p-3 rounded-xl border font-bold text-xs ${innerBox}`}>
                                    <span>
                                        {initialData.standLocation} &bull; {initialData.eventDate}
                                    </span>
                                </div>
                            ) : loadingStands ? (
                                <div className="text-xs text-zinc-500 py-2 animate-pulse">
                                    {t('general.loading', 'Se încarcă standurile...')}
                                </div>
                            ) : validStands.length === 0 ? (
                                <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs">
                                    {t('finance.noStandsAvailableToClose', 'Nu există standuri active disponibile pentru închidere (toate standurile sunt fie deja încheiate, fie programate în viitor).')}
                                </div>
                            ) : (
                                <select value={selectedStandId} onChange={(e) => {
                                    const sid = e.target.value;
                                    setSelectedStandId(sid);
                                    const st = stands.find((s) => s.id === sid);
                                    if (st?.eventDate) {
                                        setEventDate(st.eventDate);
                                    }
                                }} className={`w-full h-[38px] px-3 py-2 rounded-xl border text-xs outline-hidden transition ${inputBg}`}>
                                    {validStands.map((stand) => (
                                        <option key={stand.id} value={stand.id}>
                                            {stand.locationName} &bull; {stand.eventDate} ({stand.eventName || t('finance.defaultEventName', 'Eveniment')})
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Bill Denominations Accordion/Grid */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className={`block text-xs font-semibold ${textSub}`}>
                                    {t('finance.cashCountBillByBill', 'Numărare Numerar (Bancnotă cu Bancnotă)')}
                                </label>
                                <span className="text-xs font-bold text-emerald-400">
                                    {calculatedCashTotal.toFixed(2)} RON
                                </span>
                            </div>

                            <div className={`p-3 rounded-xl border grid grid-cols-2 sm:grid-cols-4 gap-2.5 ${innerBox}`}>
                                {BILL_DENOMINATIONS.map((bill) => {
                                    const count = billCounts[bill.value];
                                    const subtotal = (typeof count === 'number' ? count : 0) * bill.value;
                                    return (
                                        <div key={bill.value} className="space-y-1">
                                            <div className="flex items-center justify-between text-[11px]">
                                                <span className="font-bold text-zinc-400">{bill.label}</span>
                                                <span className="text-[10px] text-zinc-500">{subtotal > 0 ? `${subtotal} RON` : ''}</span>
                                            </div>
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                placeholder="0"
                                                value={count}
                                                onFocus={(e) => e.target.select()}
                                                onChange={(e) => handleBillCountChange(bill.value, e.target.value)}
                                                className={`w-full h-[38px] px-2.5 py-1 text-xs rounded-xl border text-center font-bold outline-hidden transition ${inputBg}`}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* POS Entries Section */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className={`block text-xs font-semibold ${textSub}`}>
                                    {t('finance.posTotalsByDevice', 'Încasări POS / Card')}
                                </label>
                                <span className="text-xs font-bold text-blue-400">
                                    {calculatedPosTotal.toFixed(2)} RON
                                </span>
                            </div>

                            <div className="space-y-2">
                                {posEntries.map((entry, idx) => (
                                    <div key={idx} className={`p-2.5 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center gap-2 ${innerBox}`}>
                                        <div className="flex-1">
                                            <ManageableSelect
                                                label=""
                                                value={entry.posName}
                                                onChange={(val) => handlePosNameChange(idx, val)}
                                                options={currentPosDevices}
                                                placeholder={t('finance.selectPosDevice', 'Selectează POS...')}
                                                modalTitle={t('finance.managePosDevices', 'Gestionează Terminale POS')}
                                                isDarkMode={isDarkMode}
                                                onAddItem={handleAddPosDevice}
                                                onRenameItem={handleRenamePosDevice}
                                                onDeleteItem={handleDeletePosDevice}
                                            />
                                        </div>
                                        <div className="w-full sm:w-36 flex items-center space-x-1.5">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={entry.amount === 0 ? '' : entry.amount}
                                                onFocus={(e) => e.target.select()}
                                                onChange={(e) => handlePosAmountChange(idx, e.target.value)}
                                                className={`w-full h-[38px] px-2.5 py-1.5 rounded-xl border text-xs text-right font-bold outline-hidden transition ${inputBg}`}
                                            />
                                            <span className="text-xs text-zinc-500 font-bold shrink-0">RON</span>
                                            {posEntries.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemovePosEntry(idx)}
                                                    className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer shrink-0"
                                                >
                                                    <Trash2 className="w-4 h-4"/>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                <button type="button" onClick={handleAddPosEntry} className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center space-x-1 cursor-pointer pt-1">
                                    <span>{t('finance.addPosBtn', 'Adaugă terminal POS')}</span>
                                </button>
                            </div>
                        </div>

                        {/* Where did the POS remain? */}
                        <div>
                            <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                                {t('finance.posRemainingQuestion', 'Unde a rămas POS-ul?')}
                            </label>
                            <input
                                type="text"
                                placeholder={t('finance.posRemainingPlaceholder', 'Ex: Stand 2, Responsabil Mihai')}
                                value={posLocationRemaining}
                                onChange={(e) => {
                                    setPosLocationRemaining(e.target.value);
                                    if (fieldErrors.posLocation) {
                                        setFieldErrors((prev) => ({ ...prev, posLocation: '' }));
                                    }
                                }}
                                className={`w-full h-[38px] px-3 py-2 rounded-xl border text-xs outline-hidden transition ${inputBg} ${fieldErrors.posLocation ? inputErrorBorder : ''}`}
                            />
                        </div>

                        {/* Closing Notes */}
                        <div>
                            <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                                {t('finance.eodNotes', 'Observații / Mențiuni Încheiere')}
                            </label>
                            <textarea
                                rows={2}
                                value={discrepancyNotes}
                                onChange={(e) => setDiscrepancyNotes(e.target.value)}
                                placeholder={t('finance.eodNotesPlaceholder', 'Ex: Predat la casierie, diferențe...')}
                                className={`w-full px-3 py-2 rounded-xl border text-xs outline-hidden transition resize-none ${inputBg}`}
                            />
                        </div>
                    </form>
                </div>

                <div className={`mx-5 sm:mx-6 border-t ${modalBorder}`} />

                {/* Footer */}
                <div className="px-5 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
                    <div className="min-w-0 pr-3">
                        {error ? (
                            <p className="text-xs text-rose-400 font-medium truncate">{error}</p>
                        ) : isEditMode && initialData && onDelete ? (
                            <button
                                type="button"
                                onClick={() => setIsDeleteConfirmOpen(true)}
                                disabled={isSubmitting}
                                className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-md transition cursor-pointer disabled:opacity-50"
                            >
                                {t('finance.deleteEoDBtn', 'Șterge Raport')}
                            </button>
                        ) : null}
                    </div>

                    <button
                        form="stand-eod-form"
                        type="submit"
                        disabled={isSubmitting || (!isEditMode && validStands.length === 0)}
                        className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50 flex items-center space-x-2 shrink-0"
                    >
                        {isSubmitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/>}
                        <span>
                            {isEditMode
                                ? t('common.saveChanges', 'Salvează Modificările')
                                : t('finance.submitStandBtn', 'Finalizează & Închide Stand')}
                        </span>
                    </button>
                </div>
            </div>

            <ConfirmationModal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={handleDeleteReport}
                title={t('finance.deleteEoDBtn', 'Șterge Raport')}
                message={t('finance.deleteEoDConfirm', 'Sigur doriți să ștergeți raportul End of Day pentru acest stand?')}
                variant="danger"
                isDarkMode={isDarkMode}
                zIndex="z-60"
            />
        </div>
    );
};
