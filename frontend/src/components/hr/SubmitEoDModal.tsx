import React, { useState } from 'react';
import type { HrShiftAssignment, HrStand, HrShift } from '../../types/hr';
import { useLanguage } from '../../context/LanguageContext';
import { X, Trash2 } from 'lucide-react';
import { ConfirmationModal } from '../common';
interface SubmitEoDModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (assignmentId: string, payload: any) => void;
    onDelete?: (assignmentId: string) => void;
    assignment: HrShiftAssignment;
    stand: HrStand;
    shift: HrShift;
    isDarkMode: boolean;
}
export const SubmitEoDModal: React.FC<SubmitEoDModalProps> = ({ isOpen, onClose, onSubmit, onDelete, assignment, stand, shift, isDarkMode }) => {
    const { t } = useLanguage();
    const [cashCollected, setCashCollected] = useState<number | ''>('');
    const [posCardCollected, setPosCardCollected] = useState<number | ''>('');
    const [openingBalance, setOpeningBalance] = useState<number | ''>(100);
    const [closingBalance, setClosingBalance] = useState<number | ''>(100);
    const [discrepancyNotes, setDiscrepancyNotes] = useState('');
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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

    if (!isOpen || !assignment || !stand || !shift)
        return null;

    const numCash = typeof cashCollected === 'number' ? cashCollected : 0;
    const numCard = typeof posCardCollected === 'number' ? posCardCollected : 0;
    const numOpen = typeof openingBalance === 'number' ? openingBalance : 0;
    const numClose = typeof closingBalance === 'number' ? closingBalance : 0;

    // Expected vs actual discrepancy calculation
    const totalRevenue = numCash + numCard;
    const expectedClosing = numOpen + numCash;
    const discrepancyAmount = numClose - expectedClosing;

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};
        if (cashCollected === '') {
            errors.cash = t('hr.cashRequired', 'Introduceți numerarul încasat.');
        }
        if (posCardCollected === '') {
            errors.card = t('hr.cardRequired', 'Introduceți totalul POS.');
        }
        if (discrepancyAmount !== 0 && !discrepancyNotes.trim()) {
            errors.notes = t('hr.discrepancyNotesRequired', 'Introduceți explicația pentru discrepanță.');
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
        if (!validateForm()) return;
        onSubmit(assignment.id, {
            locationName: stand?.locationName || 'Stand',
            eventDate: stand?.eventDate || new Date().toISOString().split('T')[0],
            shiftName: shift?.shiftName || 'Schimb',
            financeResponsibleName: assignment?.memberName || 'Responsabil Financiar',
            cashCollected: numCash,
            posCardCollected: numCard,
            openingBalance: numOpen,
            closingBalance: numClose,
            discrepancyAmount,
            discrepancyNotes: discrepancyNotes.trim()
        });
        onClose();
    };

    const handleDeleteEoD = () => {
        if (onDelete) {
            onDelete(assignment.id);
            setIsDeleteConfirmOpen(false);
            onClose();
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
            <div className={`w-full h-full sm:h-auto sm:max-h-[90vh] max-w-lg rounded-none sm:rounded-2xl border-0 sm:border shadow-2xl flex flex-col overflow-hidden transition-all transform scale-100 animate-in zoom-in-95 duration-150 ${modalBg}`} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="px-5 sm:px-6 pt-5 pb-3.5 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="font-bold text-base sm:text-lg tracking-tight">
                            {assignment.eodSubmitted
                                ? t('hr.editEoDTitle', 'Editare Formular End-of-Day (EoD)')
                                : t('hr.eodTitle', 'Formular End-of-Day (EoD) Stand')}
                        </h3>
                        <p className={`text-xs ${textSub}`}>{stand.locationName} &bull; {shift.shiftName}</p>
                    </div>
                    <button onClick={onClose} aria-label={t('common.close', 'Închide')} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}>
                        <X className="w-5 h-5"/>
                    </button>
                </div>
                <div className={`mx-5 sm:mx-6 border-b ${modalBorder}`} />

                {/* Scrollable Form Body */}
                <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-4 text-sm">
                    <form id="eod-form" noValidate onSubmit={handleSubmit} className="space-y-4 text-sm">
                        <div className={`p-3 rounded-xl border text-xs ${isDarkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`}>
                            <p><span className={textSub}>{t('hr.financeResp', 'Responsabil Finanțe')}:</span> <span className="font-bold text-white">{assignment.memberName}</span></p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                                    {t('hr.cashCollected', 'Total Numerar Încasat (RON)')}
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={cashCollected}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => {
                                        const clean = e.target.value.replace(/^0+(?=\d)/, '');
                                        setCashCollected(clean === '' ? '' : parseFloat(clean));
                                        if (fieldErrors.cash) setFieldErrors(prev => ({ ...prev, cash: '' }));
                                    }}
                                    className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputBg} ${fieldErrors.cash ? inputErrorBorder : ''}`}
                                />
                            </div>
                            <div>
                                <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                                    {t('hr.posCollected', 'Total Chitanțe POS / Card (RON)')}
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={posCardCollected}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => {
                                        const clean = e.target.value.replace(/^0+(?=\d)/, '');
                                        setPosCardCollected(clean === '' ? '' : parseFloat(clean));
                                        if (fieldErrors.card) setFieldErrors(prev => ({ ...prev, card: '' }));
                                    }}
                                    className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputBg} ${fieldErrors.card ? inputErrorBorder : ''}`}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                                    {t('hr.openingBalance', 'Sold Inițial Sertar (RON)')}
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={openingBalance}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => {
                                        const clean = e.target.value.replace(/^0+(?=\d)/, '');
                                        setOpeningBalance(clean === '' ? '' : parseFloat(clean));
                                    }}
                                    className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputBg}`}
                                />
                            </div>
                            <div>
                                <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                                    {t('hr.closingBalance', 'Sold Final Predat (RON)')}
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={closingBalance}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => {
                                        const clean = e.target.value.replace(/^0+(?=\d)/, '');
                                        setClosingBalance(clean === '' ? '' : parseFloat(clean));
                                    }}
                                    className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputBg}`}
                                />
                            </div>
                        </div>

                        {/* Discrepancy Indicator */}
                        <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                            discrepancyAmount === 0
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        }`}>
                            <span>{t('hr.totalRevenue', 'Încasări Totale')}: {totalRevenue.toFixed(2)} RON</span>
                            <span>{t('hr.discrepancy', 'Discrepanță')}: {discrepancyAmount > 0 ? `+${discrepancyAmount.toFixed(2)}` : discrepancyAmount.toFixed(2)} RON</span>
                        </div>

                        {discrepancyAmount !== 0 && (
                            <div>
                                <label className="block text-xs font-semibold mb-1 text-amber-400">
                                    {t('hr.discrepancyNotes', 'Explicație Discrepanță / Note')}
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder={t('hr.discrepancyPlaceholder', 'Introduceți motivul diferenței dintre soldul preconizat și cel predat...')}
                                    value={discrepancyNotes}
                                    onChange={(e) => {
                                        setDiscrepancyNotes(e.target.value);
                                        if (fieldErrors.notes) setFieldErrors(prev => ({ ...prev, notes: '' }));
                                    }}
                                    className={`w-full px-3 py-2 text-xs rounded-xl border outline-hidden transition resize-none ${inputBg} ${fieldErrors.notes ? inputErrorBorder : ''}`}
                                />
                            </div>
                        )}
                    </form>
                </div>

                <div className={`mx-5 sm:mx-6 border-t ${modalBorder}`} />

                {/* Footer */}
                <div className="px-5 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
                    <div className="min-w-0 pr-3">
                        {error ? (
                            <p className="text-xs text-rose-400 font-medium truncate">{error}</p>
                        ) : assignment.eodSubmitted && onDelete ? (
                            <button
                                type="button"
                                onClick={() => setIsDeleteConfirmOpen(true)}
                                className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-md transition cursor-pointer"
                            >
                                <Trash2 className="w-3.5 h-3.5 inline mr-1"/>
                                <span>{t('hr.deleteEoDBtn', 'Șterge Raport EoD')}</span>
                            </button>
                        ) : null}
                    </div>

                    <button
                        form="eod-form"
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer shrink-0"
                    >
                        {assignment.eodSubmitted
                            ? t('common.saveChanges', 'Salvează Modificările')
                            : t('hr.submitEoD', 'Trimite Formularul EoD')}
                    </button>
                </div>
            </div>

            <ConfirmationModal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={handleDeleteEoD}
                title={t('hr.deleteEoDBtn', 'Șterge Raport EoD')}
                message={t('hr.deleteEoDConfirm', 'Sigur doriți să anulați / ștergeți raportul EoD trimis pentru acest schimb?')}
                variant="danger"
                isDarkMode={isDarkMode}
                zIndex="z-60"
            />
        </div>
    );
};
