import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { X } from 'lucide-react';
import { TimePicker } from '../common';
import type { HrShift } from '../../types/hr';
interface AddShiftModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (shiftName: string, startTime: string, endTime: string, neededVolunteers: number, neededLogistics: number, neededFinance: number, shiftId?: string) => void;
    shiftToEdit?: HrShift | null;
    isDarkMode: boolean;
}
export const AddShiftModal: React.FC<AddShiftModalProps> = ({ isOpen, onClose, onSave, shiftToEdit, isDarkMode }) => {
    const { t } = useLanguage();
    const [shiftName, setShiftName] = useState('Schimbul 1');
    const [startTime, setStartTime] = useState('08:00');
    const [endTime, setEndTime] = useState('12:00');
    const [neededVolunteers, setNeededVolunteers] = useState<number | ''>(2);
    const [neededLogistics, setNeededLogistics] = useState<number | ''>(1);
    const [neededFinance, setNeededFinance] = useState<number | ''>(1);
    // Reset or populate fields on open / shift change
    useEffect(() => {
        if (isOpen) {
            if (shiftToEdit) {
                setShiftName(shiftToEdit.shiftName || 'Schimbul 1');
                setStartTime(shiftToEdit.startTime || '08:00');
                setEndTime(shiftToEdit.endTime || '12:00');
                setNeededVolunteers(shiftToEdit.neededVolunteers ?? 2);
                setNeededLogistics(shiftToEdit.neededLogistics ?? 1);
                setNeededFinance(shiftToEdit.neededFinance ?? 1);
            }
            else {
                setShiftName('Schimbul 1');
                setStartTime('08:00');
                setEndTime('12:00');
                setNeededVolunteers(2);
                setNeededLogistics(1);
                setNeededFinance(1);
            }
        }
    }, [isOpen, shiftToEdit]);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        setError('');
        setFieldErrors({});
    }, [shiftToEdit, isOpen]);

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
        if (!shiftName.trim()) {
            errors.shiftName = t('hr.shiftNameRequired', 'Introduceți denumirea intervalului.');
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
        onSave(shiftName.trim(), startTime, endTime, Math.max(0, Number(neededVolunteers) || 0), Math.max(0, Number(neededLogistics) || 0), Math.max(0, Number(neededFinance) || 0), shiftToEdit?.id);
        onClose();
    };

    const modalBorder = isDarkMode ? 'border-zinc-800' : 'border-zinc-200';
    const modalBg = isDarkMode ? 'bg-black text-white border-zinc-800 shadow-2xl' : 'bg-white text-zinc-900 border-zinc-200 shadow-xl';
    const inputBg = isDarkMode
        ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700 focus:border-zinc-700'
        : 'bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400 focus:border-zinc-400';
    const inputErrorBorder = 'border-rose-500/80 focus:border-rose-500 ring-1 ring-rose-500/40';
    const textSub = isDarkMode ? 'text-zinc-400' : 'text-zinc-500';
    const subCardBg = isDarkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-100/60 border-zinc-200';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150" onClick={onClose}>
            <div className={`w-full h-full sm:h-auto sm:max-h-[90vh] max-w-md rounded-none sm:rounded-2xl border-0 sm:border shadow-2xl flex flex-col overflow-hidden transition-all transform scale-100 animate-in zoom-in-95 duration-150 ${modalBg}`} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="px-5 sm:px-6 pt-5 pb-3.5 flex items-center justify-between shrink-0">
                    <h3 className="font-bold text-base sm:text-lg tracking-tight">
                        {shiftToEdit ? t('hr.editShift', 'Editare Interval / Tură') : t('hr.addShift', 'Adăugare Interval / Tură')}
                    </h3>
                    <button onClick={onClose} aria-label={t('common.close', 'Închide')} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}>
                        <X className="w-5 h-5"/>
                    </button>
                </div>
                <div className={`mx-5 sm:mx-6 border-b ${modalBorder}`} />

                {/* Scrollable Form Body */}
                <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-4 text-sm">
                    <form id="shift-form" noValidate onSubmit={handleSubmit} className="space-y-4 text-sm">
                        <div>
                            <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                                {t('hr.shiftName', 'Denumire Interval')}
                            </label>
                            <input
                                type="text"
                                placeholder={t('hr.shiftNamePlaceholder', 'ex. Dimineață, Prânz, Seară')}
                                value={shiftName}
                                onChange={(e) => {
                                    setShiftName(e.target.value);
                                    if (fieldErrors.shiftName) setFieldErrors(prev => ({ ...prev, shiftName: '' }));
                                }}
                                className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputBg} ${fieldErrors.shiftName ? inputErrorBorder : ''}`}
                            />
                        </div>

                        {/* Time Selectors */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <TimePicker
                                    label={t('hr.startTime', 'Ora Început')}
                                    required={false}
                                    value={startTime}
                                    onChange={(val) => setStartTime(val)}
                                    isDarkMode={isDarkMode}
                                />
                            </div>
                            <div>
                                <TimePicker
                                    label={t('hr.endTime', 'Ora Sfârșit')}
                                    required={false}
                                    value={endTime}
                                    onChange={(val) => setEndTime(val)}
                                    isDarkMode={isDarkMode}
                                />
                            </div>
                        </div>

                        {/* Needed Personnel Breakdown */}
                        <div className="space-y-3">
                            <label className={`block text-xs font-semibold ${textSub}`}>
                                {t('hr.neededRolesBreakdown', 'Necesar Personal pe Roluri')}
                            </label>

                            <div className={`p-3 rounded-xl border space-y-3 ${subCardBg}`}>
                                {/* General Volunteers */}
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-zinc-300">{t('hr.neededVolunteers', 'Voluntari Promo / Stand')}</span>
                                    <div className="flex items-center space-x-1.5">
                                        <button type="button" onClick={() => setNeededVolunteers(prev => Math.max(0, (typeof prev === 'number' ? prev : 0) - 1))} className={`w-7 h-7 rounded-lg border flex items-center justify-center font-bold text-sm transition cursor-pointer ${isDarkMode ? 'border-zinc-800 hover:bg-zinc-800 text-zinc-300' : 'border-zinc-300 hover:bg-zinc-200 text-zinc-700'}`}>
                                            -
                                        </button>
                                        <input type="number" min="0" max="99" value={neededVolunteers} onFocus={(e) => e.target.select()} onChange={(e) => {
                                            const clean = e.target.value.replace(/^0+(?=\d)/, '');
                                            setNeededVolunteers(clean === '' ? '' : Math.max(0, parseInt(clean, 10) || 0));
                                        }} className={`w-12 h-[30px] text-center text-xs font-bold rounded-lg border outline-hidden ${inputBg}`}/>
                                        <button type="button" onClick={() => setNeededVolunteers(prev => (typeof prev === 'number' ? prev : 0) + 1)} className={`w-7 h-7 rounded-lg border flex items-center justify-center font-bold text-sm transition cursor-pointer ${isDarkMode ? 'border-zinc-800 hover:bg-zinc-800 text-zinc-300' : 'border-zinc-300 hover:bg-zinc-200 text-zinc-700'}`}>
                                            +
                                        </button>
                                    </div>
                                </div>

                                {/* Logistics Coordinator */}
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-zinc-300">{t('hr.neededLogistics', 'Coordonator Logistică')}</span>
                                    <div className="flex items-center space-x-1.5">
                                        <button type="button" onClick={() => setNeededLogistics(prev => Math.max(0, (typeof prev === 'number' ? prev : 0) - 1))} className={`w-7 h-7 rounded-lg border flex items-center justify-center font-bold text-sm transition cursor-pointer ${isDarkMode ? 'border-zinc-800 hover:bg-zinc-800 text-zinc-300' : 'border-zinc-300 hover:bg-zinc-200 text-zinc-700'}`}>
                                            -
                                        </button>
                                        <input type="number" min="0" max="99" value={neededLogistics} onFocus={(e) => e.target.select()} onChange={(e) => {
                                            const clean = e.target.value.replace(/^0+(?=\d)/, '');
                                            setNeededLogistics(clean === '' ? '' : Math.max(0, parseInt(clean, 10) || 0));
                                        }} className={`w-12 h-[30px] text-center text-xs font-bold rounded-lg border outline-hidden ${inputBg}`}/>
                                        <button type="button" onClick={() => setNeededLogistics(prev => (typeof prev === 'number' ? prev : 0) + 1)} className={`w-7 h-7 rounded-lg border flex items-center justify-center font-bold text-sm transition cursor-pointer ${isDarkMode ? 'border-zinc-800 hover:bg-zinc-800 text-zinc-300' : 'border-zinc-300 hover:bg-zinc-200 text-zinc-700'}`}>
                                            +
                                        </button>
                                    </div>
                                </div>

                                {/* Finance Coordinator */}
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-zinc-300">{t('hr.neededFinance', 'Coordonator Financiar')}</span>
                                    <div className="flex items-center space-x-1.5">
                                        <button type="button" onClick={() => setNeededFinance(prev => Math.max(0, (typeof prev === 'number' ? prev : 0) - 1))} className={`w-7 h-7 rounded-lg border flex items-center justify-center font-bold text-sm transition cursor-pointer ${isDarkMode ? 'border-zinc-800 hover:bg-zinc-800 text-zinc-300' : 'border-zinc-300 hover:bg-zinc-200 text-zinc-700'}`}>
                                            -
                                        </button>
                                        <input type="number" min="0" max="99" value={neededFinance} onFocus={(e) => e.target.select()} onChange={(e) => {
                                            const clean = e.target.value.replace(/^0+(?=\d)/, '');
                                            setNeededFinance(clean === '' ? '' : Math.max(0, parseInt(clean, 10) || 0));
                                        }} className={`w-12 h-[30px] text-center text-xs font-bold rounded-lg border outline-hidden ${inputBg}`}/>
                                        <button type="button" onClick={() => setNeededFinance(prev => (typeof prev === 'number' ? prev : 0) + 1)} className={`w-7 h-7 rounded-lg border flex items-center justify-center font-bold text-sm transition cursor-pointer ${isDarkMode ? 'border-zinc-800 hover:bg-zinc-800 text-zinc-300' : 'border-zinc-300 hover:bg-zinc-200 text-zinc-700'}`}>
                                            +
                                        </button>
                                    </div>
                                </div>
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
                    <button
                        form="shift-form"
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer shrink-0"
                    >
                        {shiftToEdit ? t('general.saveChanges', 'Salvează Modificările') : t('hr.addShiftBtn', 'Adaugă Interval')}
                    </button>
                </div>
            </div>
        </div>
    );
};
