import React, { useState, useEffect } from 'react';
import type { HrStand, HrLocation } from '../../types/hr';
import { useLanguage } from '../../context/LanguageContext';
import { X } from 'lucide-react';
import { ManageableSelect, DatePicker } from '../common';
interface AddEditStandModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (standData: Partial<HrStand>) => void;
    locations: HrLocation[];
    onCreateLocation?: (name: string) => Promise<HrLocation>;
    onRenameLocation?: (oldName: string, newName: string) => Promise<void>;
    onDeleteLocation?: (locationName: string) => Promise<void>;
    standToEdit: HrStand | null;
    isDarkMode: boolean;
}
export const AddEditStandModal: React.FC<AddEditStandModalProps> = ({ isOpen, onClose, onSave, locations, onCreateLocation, onRenameLocation, onDeleteLocation, standToEdit, isDarkMode }) => {
    const { t } = useLanguage();
    const [selectedLocation, setSelectedLocation] = useState<string>('');
    const [eventDate, setEventDate] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    useEffect(() => {
        if (isOpen) {
            if (standToEdit) {
                setSelectedLocation(standToEdit.locationName || '');
                setEventDate(standToEdit.eventDate || '');
                setNotes(standToEdit.notes || '');
            }
            else {
                setSelectedLocation(locations.length > 0 ? locations[0].name : '');
                setEventDate(new Date().toISOString().split('T')[0]);
                setNotes('');
            }
        }
    }, [isOpen, standToEdit, locations]);

    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        setError('');
        setFieldErrors({});
    }, [standToEdit, isOpen]);

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
        if (!selectedLocation.trim()) {
            errors.location = t('hr.locationRequired', 'Selectați locația standului.');
        }
        if (!eventDate) {
            errors.date = t('hr.dateRequired', 'Selectați data desfășurării.');
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
        onSave({
            id: standToEdit?.id,
            locationName: selectedLocation.trim(),
            eventName: standToEdit?.eventName || selectedLocation.trim(),
            eventDate,
            status: standToEdit?.status || 'ACTIVE',
            notes: notes.trim()
        });
        onClose();
    };

    const modalBorder = isDarkMode ? 'border-zinc-800' : 'border-zinc-200';
    const modalBg = isDarkMode ? 'bg-black text-white border-zinc-800 shadow-2xl' : 'bg-white text-zinc-900 border-zinc-200 shadow-xl';
    const inputBg = isDarkMode
        ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700 focus:border-zinc-700'
        : 'bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400 focus:border-zinc-400';
    const textSub = isDarkMode ? 'text-zinc-400' : 'text-zinc-500';

    const locationOptions = locations.map(l => l.name);
    if (selectedLocation && !locationOptions.includes(selectedLocation)) {
        locationOptions.unshift(selectedLocation);
    }
    if (standToEdit && standToEdit.locationName && !locationOptions.includes(standToEdit.locationName)) {
        locationOptions.unshift(standToEdit.locationName);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150" onClick={onClose}>
            <div className={`w-full h-full sm:h-auto sm:max-h-[90vh] max-w-lg rounded-none sm:rounded-2xl border-0 sm:border shadow-2xl flex flex-col overflow-hidden transition-all transform scale-100 animate-in zoom-in-95 duration-150 ${modalBg}`} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="px-5 sm:px-6 pt-5 pb-3.5 flex items-center justify-between shrink-0">
                    <h3 className="font-bold text-base sm:text-lg tracking-tight">
                        {standToEdit ? t('hr.editStand', 'Editare Stand') : t('hr.addStand', 'Adăugare Stand Nou')}
                    </h3>
                    <button onClick={onClose} aria-label={t('common.close', 'Închide')} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}>
                        <X className="w-5 h-5"/>
                    </button>
                </div>
                <div className={`mx-5 sm:mx-6 border-b ${modalBorder}`} />

                {/* Scrollable Form Body */}
                <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-4 text-sm">
                    <form id="stand-form" noValidate onSubmit={handleSubmit} className="space-y-4 text-sm">
                        {/* Location Selector */}
                        <div>
                            <ManageableSelect
                                label={t('hr.locationName', 'Locație Stand')}
                                required={false}
                                value={selectedLocation}
                                onChange={(val) => {
                                    setSelectedLocation(val);
                                    if (fieldErrors.location) setFieldErrors(prev => ({ ...prev, location: '' }));
                                }}
                                options={locationOptions}
                                placeholder={t('hr.selectLocation', 'Selectează locație...')}
                                modalTitle={t('hr.manageLocations', 'Gestionează Locații')}
                                isDarkMode={isDarkMode}
                                onAddItem={async (name) => {
                                    if (onCreateLocation) {
                                        const created = await onCreateLocation(name);
                                        if (created?.name) {
                                            setSelectedLocation(created.name);
                                        } else {
                                            setSelectedLocation(name);
                                        }
                                    } else {
                                        setSelectedLocation(name);
                                    }
                                }}
                                onRenameItem={async (oldName, newName) => {
                                    if (onRenameLocation) {
                                        await onRenameLocation(oldName, newName);
                                        if (selectedLocation === oldName) {
                                            setSelectedLocation(newName);
                                        }
                                    }
                                }}
                                onDeleteItem={async (name) => {
                                    if (onDeleteLocation) {
                                        await onDeleteLocation(name);
                                        if (selectedLocation === name) {
                                            setSelectedLocation('');
                                        }
                                    }
                                }}
                                className={fieldErrors.location ? '[&_>div]:border-rose-500/80' : ''}
                            />
                        </div>

                        <div>
                            <DatePicker
                                label={t('hr.eventDate', 'Data Desfășurării')}
                                required={false}
                                value={eventDate}
                                onChange={(val) => {
                                    setEventDate(val);
                                    if (fieldErrors.date) setFieldErrors(prev => ({ ...prev, date: '' }));
                                }}
                                isDarkMode={isDarkMode}
                                className={fieldErrors.date ? '[&_>div]:border-rose-500/80' : ''}
                            />
                        </div>

                        <div>
                            <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                                {t('hr.notes', 'Descriere Stand')}
                            </label>
                            <textarea
                                rows={3}
                                placeholder={t('hr.notesPlaceholder', 'Descriere și instrucțiuni despre acest stand...')}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
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
                        form="stand-form"
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer shrink-0"
                    >
                        {t('general.save', 'Salvează')}
                    </button>
                </div>
            </div>
        </div>
    );
};
