import React, { useState } from 'react';
import { X } from 'lucide-react';
import { logisticsService } from '../../services/logisticsService';
import type { StockLocation, LocationType } from '../../types/logistics';
import { useLanguage } from '../../context/LanguageContext';
interface AddLocationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (location: StockLocation) => void;
    isDarkMode: boolean;
}
export const AddLocationModal: React.FC<AddLocationModalProps> = ({ isOpen, onClose, onSuccess, isDarkMode, }) => {
    const { t } = useLanguage();
    const [name, setName] = useState('');
    const [type, setType] = useState<LocationType>('DEPOSIT');
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    React.useEffect(() => {
        setError('');
        setFieldErrors({});
    }, [isOpen]);

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
            errors.name = t('logistics.errorLocationNameRequired', 'Numele locației este obligatoriu.');
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
            const generatedCode = `LOC-${Date.now().toString(36).toUpperCase()}`;
            const newLoc = await logisticsService.addLocation({
                name: name.trim(),
                code: generatedCode,
                type,
                description: description.trim(),
            });
            onSuccess(newLoc);
            onClose();
            setName('');
            setType('DEPOSIT');
            setDescription('');
            setError('');
        }
        catch (err: any) {
            setError(err.message || t('logistics.errorCreateLocation', 'Eroare la crearea locației'));
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
                        {t('logistics.addNewLocation', 'Adaugă Locație / Destinație')}
                    </h3>
                    <button onClick={onClose} aria-label={t('common.close', 'Închide')} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}>
                        <X className="w-5 h-5"/>
                    </button>
                </div>
                <div className={`mx-5 sm:mx-6 border-b ${modalBorder}`} />

                {/* Scrollable Form Body */}
                <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-4 text-sm">
                    <form id="add-location-form" noValidate onSubmit={handleSubmit} className="space-y-4 text-sm">
                        <div>
                            <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                                {t('logistics.locationName', 'Nume Locație')}
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' }));
                                }}
                                placeholder={t('logistics.locationNamePlaceholder', 'e.g. Stand Central, Depozit Sud, Magazie')}
                                className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputBg} ${fieldErrors.name ? inputErrorBorder : ''}`}
                            />
                        </div>

                        <div>
                            <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                                {t('logistics.locationType', 'Tip Locație')}
                            </label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value as LocationType)}
                                className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputBg}`}
                            >
                                <option value="DEPOSIT">{t('logistics.typeDeposit', 'Depozit')}</option>
                                <option value="STAND">{t('logistics.typeStand', 'Stand')}</option>
                            </select>
                        </div>

                        <div>
                            <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                                {t('logistics.description', 'Descriere')}
                            </label>
                            <textarea
                                rows={2}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder={t('logistics.descriptionPlaceholder', 'Ex: Amplasat în zona centrală...')}
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
                        form="add-location-form"
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer shrink-0"
                    >
                        {t('logistics.saveLocation', 'Salvează Locație')}
                    </button>
                </div>
            </div>
        </div>
    );
};
