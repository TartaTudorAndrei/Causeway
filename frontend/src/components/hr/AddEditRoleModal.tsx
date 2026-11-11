import React, { useState, useEffect } from 'react';
import type { HrStandRole, RoleCategory } from '../../types/hr';
import { useLanguage } from '../../context/LanguageContext';
import { X } from 'lucide-react';
interface AddEditRoleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (roleData: Partial<HrStandRole>) => void;
    roleToEdit: HrStandRole | null;
    isDarkMode: boolean;
}
export const AddEditRoleModal: React.FC<AddEditRoleModalProps> = ({ isOpen, onClose, onSave, roleToEdit, isDarkMode }) => {
    const { t } = useLanguage();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<RoleCategory>('GENERAL');
    useEffect(() => {
        if (roleToEdit) {
            setName(roleToEdit.name || '');
            setDescription(roleToEdit.description || '');
            setCategory(roleToEdit.category || 'GENERAL');
        }
        else {
            setName('');
            setDescription('');
            setCategory('GENERAL');
        }
    }, [roleToEdit, isOpen]);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        setError('');
        setFieldErrors({});
    }, [roleToEdit, isOpen]);

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
            errors.name = t('hr.roleNameRequired', 'Introduceți numele rolului.');
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
        onSave({
            id: roleToEdit?.id,
            name: name.trim(),
            description: description.trim(),
            category
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150" onClick={onClose}>
            <div className={`w-full h-full sm:h-auto sm:max-h-[90vh] max-w-md rounded-none sm:rounded-2xl border-0 sm:border shadow-2xl flex flex-col overflow-hidden transition-all transform scale-100 animate-in zoom-in-95 duration-150 ${modalBg}`} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="px-5 sm:px-6 pt-5 pb-3.5 flex items-center justify-between shrink-0">
                    <h3 className="font-bold text-base sm:text-lg tracking-tight">
                        {roleToEdit ? t('hr.editRole', 'Editare Rol Personalizat') : t('hr.addRole', 'Adăugare Rol Nou Stand')}
                    </h3>
                    <button onClick={onClose} aria-label={t('common.close', 'Închide')} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}>
                        <X className="w-5 h-5"/>
                    </button>
                </div>
                <div className={`mx-5 sm:mx-6 border-b ${modalBorder}`} />

                {/* Scrollable Form Body */}
                <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-4 text-sm">
                    <form id="role-form" noValidate onSubmit={handleSubmit} className="space-y-4 text-sm">
                        <div>
                            <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                                {t('hr.roleName', 'Nume Rol Stand')}
                            </label>
                            <input
                                type="text"
                                disabled={roleToEdit?.isSystem}
                                placeholder={t('hr.roleNamePlaceholder', 'ex. Photographer / Media Lead')}
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' }));
                                }}
                                className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputBg} ${fieldErrors.name ? inputErrorBorder : ''} ${roleToEdit?.isSystem ? 'opacity-60 cursor-not-allowed' : ''}`}
                            />
                            {roleToEdit?.isSystem && (
                                <p className="text-[11px] text-amber-400 mt-1">
                                    {t('hr.systemRoleNotice', 'Numele rolurilor de sistem nu poate fi modificat.')}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                                {t('hr.roleCategory', 'Categorie Rol')}
                            </label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value as RoleCategory)}
                                className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputBg}`}
                            >
                                <option value="GENERAL">General (Voluntariat / Promovare)</option>
                                <option value="LEADERSHIP">Leadership (Coordonare Stand)</option>
                                <option value="FINANCE">Finanțe (Gestionează Încasări & EoD)</option>
                                <option value="LOGISTICS">Logistică (Stoc & Echipament)</option>
                            </select>
                        </div>

                        <div>
                            <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                                {t('hr.roleDescription', 'Descriere & Responsabilități')}
                            </label>
                            <textarea
                                rows={3}
                                placeholder={t('hr.roleDescPlaceholder', 'Descrieți atribuțiile specifice ale voluntarului asignat pe acest rol...')}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
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
                        form="role-form"
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer shrink-0"
                    >
                        {t('general.save', 'Salvează Rol')}
                    </button>
                </div>
            </div>
        </div>
    );
};
