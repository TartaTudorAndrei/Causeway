import React, { useState, useEffect } from 'react';
import type { PlatformUser, SystemRoleType, RoleWithPermissions } from '../../types/adminSettings';
import type { UserMembership } from '../../types/adminAuth';
import { X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { usePermission } from '../../hooks/usePermission';
import { buildMembershipsForRoles } from '../../services/adminAuthService';
import { adminSettingsService } from '../../services/adminSettingsService';

interface UserRoleEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: PlatformUser | null;
    isDarkMode: boolean;
    onSave: (userId: string, primaryRole: SystemRoleType, roles: SystemRoleType[], memberships: UserMembership[]) => Promise<void>;
}

interface RoleOption {
    key: string;
    label: string;
    category: string;
    description: string;
}

const getFallbackRolesList = (t: (key: string, fallback?: string) => string): RoleOption[] => [
    {
        key: 'ADMIN',
        label: t('roles.admin', 'Admin'),
        category: t('roles.catAdmin', 'Administrare'),
        description: t('roles.adminDesc', 'Acces complet de administrare')
    },
    {
        key: 'VOLUNTEER',
        label: t('roles.volunteer', 'Volunteer'),
        category: t('roles.catGeneral', 'General'),
        description: t('roles.volunteerDesc', 'Acces de bază la calendarul general și standuri')
    },
];

export const UserRoleEditModal: React.FC<UserRoleEditModalProps> = ({ isOpen, onClose, user, isDarkMode, onSave }) => {
    const { t } = useLanguage();
    const { isSuperAdmin, hasPermission } = usePermission();

    const [fetchedRoles, setFetchedRoles] = useState<RoleWithPermissions[]>([]);
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            adminSettingsService.getRolesWithPermissions()
                .then(roles => setFetchedRoles(roles))
                .catch(err => console.error('Failed to fetch roles:', err));
        }
    }, [isOpen]);

    const rolesList: RoleOption[] = React.useMemo(() => {
        if (fetchedRoles.length === 0) {
            return getFallbackRolesList(t);
        }
        return fetchedRoles
            .filter(r => r.name !== 'SUPER_ADMIN')
            .map(r => {
                let cat = t('roles.catCustom', 'Personalizat');
                if (r.name === 'ADMIN' || r.name === 'IT_ADMIN') cat = t('roles.catAdmin', 'Administrare');
                else if (r.name.startsWith('FINANCE')) cat = t('roles.catFinance', 'Finanțe');
                else if (r.name.startsWith('HR')) cat = t('roles.catHR', 'HR');
                else if (r.name.startsWith('MARKETING')) cat = t('roles.catMarketing', 'Marketing');
                else if (r.name.startsWith('FUNDRAISING')) cat = t('roles.catFundraising', 'Fundraising');
                else if (r.name.startsWith('LOGISTICS')) cat = t('roles.catLogistics', 'Logistică');
                else if (r.name.startsWith('LEGAL')) cat = t('roles.catLegal', 'Legal');
                else if (r.name === 'VOLUNTEER') cat = t('roles.catGeneral', 'General');

                return {
                    key: r.name,
                    label: r.name,
                    category: cat,
                    description: r.description || ''
                };
            });
    }, [fetchedRoles, t]);

    // Check if the assigner is allowed to delegate this role
    const isRoleAssignable = (roleKey: string): boolean => {
        if (isSuperAdmin) return true;
        const roleObj = fetchedRoles.find(r => r.name === roleKey);
        if (!roleObj) return true;
        return roleObj.permissionCodes.every(code => hasPermission(code));
    };

    // Calculate distance to ADMIN root in hierarchy tree
    const getRoleTreeDistance = React.useCallback((roleName: string): number => {
        const clean = roleName.trim().toUpperCase();
        if (clean === 'ADMIN' || clean === 'SUPER_ADMIN') return 0;
        if (clean === 'VOLUNTEER') return 9999;

        const roleObj = fetchedRoles.find(r => r.name.toUpperCase() === clean);
        if (!roleObj) return 9998;

        let distance = 0;
        let currParentId = roleObj.parentRoleId;
        const visited = new Set<string>();

        while (currParentId && !visited.has(currParentId)) {
            visited.add(currParentId);
            distance++;
            const parent = fetchedRoles.find(r => r.id === currParentId);
            if (!parent) break;
            if (parent.name.toUpperCase() === 'ADMIN') return distance;
            currParentId = parent.parentRoleId;
        }

        return 9998;
    }, [fetchedRoles]);

    // Highest role computed dynamically from selected roles
    const computedPrimaryRole = React.useMemo<string>(() => {
        if (selectedRoles.length === 0) return 'VOLUNTEER';
        if (selectedRoles.includes('ADMIN')) return 'ADMIN';

        let best = selectedRoles[0];
        let minDistance = getRoleTreeDistance(best);

        for (let i = 1; i < selectedRoles.length; i++) {
            const role = selectedRoles[i];
            const dist = getRoleTreeDistance(role);
            if (dist < minDistance) {
                minDistance = dist;
                best = role;
            }
        }

        return best;
    }, [selectedRoles, getRoleTreeDistance]);

    useEffect(() => {
        if (user) {
            const initialRoles: string[] = (user.roles && user.roles.length > 0)
                ? user.roles.map(r => String(r)).filter(r => r !== 'SUPER_ADMIN')
                : [user.primaryRole && String(user.primaryRole) !== 'SUPER_ADMIN' ? String(user.primaryRole) : 'VOLUNTEER'];
            setSelectedRoles(initialRoles.length > 0 ? initialRoles : ['VOLUNTEER']);
            setSearchQuery('');
        }
    }, [user, isOpen]);

    // Keyboard Escape listener
    React.useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !user) return null;

    const toggleRole = (roleKey: string) => {
        if (!isRoleAssignable(roleKey)) return;
        setSelectedRoles(prev => {
            if (prev.includes(roleKey)) {
                if (prev.length <= 1) return prev;
                return prev.filter(r => r !== roleKey);
            } else {
                return [...prev, roleKey];
            }
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const finalRoles = (selectedRoles.length > 0 ? selectedRoles : [computedPrimaryRole]) as SystemRoleType[];
            const memberships = buildMembershipsForRoles(finalRoles);
            await onSave(user.id, computedPrimaryRole as SystemRoleType, finalRoles, memberships);
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };
    const filteredRoles = rolesList.filter(r => r.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const modalBorder = isDarkMode ? 'border-zinc-800' : 'border-zinc-200';
    const modalBg = isDarkMode ? 'bg-black text-white border-zinc-800 shadow-2xl' : 'bg-white text-zinc-900 border-zinc-200 shadow-xl';
    const inputBg = isDarkMode
        ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700 focus:border-zinc-700'
        : 'bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400 focus:border-zinc-400';
    const textSub = isDarkMode ? 'text-zinc-400' : 'text-zinc-500';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150" onClick={onClose}>
            <div className={`w-full h-full sm:h-auto sm:max-h-[90vh] max-w-2xl rounded-none sm:rounded-2xl border-0 sm:border shadow-2xl flex flex-col overflow-hidden transition-all transform scale-100 animate-in zoom-in-95 duration-150 ${modalBg}`} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="px-5 sm:px-6 pt-5 pb-3.5 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="font-bold text-base sm:text-lg tracking-tight">{t('it.roleModalTitle', 'Selectare Roluri & Permisiuni')}</h3>
                        <p className={`text-xs ${textSub}`}>{user.fullName} ({user.email})</p>
                    </div>
                    <button onClick={onClose} aria-label={t('common.close', 'Închide')} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}>
                        <X className="w-5 h-5"/>
                    </button>
                </div>
                <div className={`mx-5 sm:mx-6 border-b ${modalBorder}`} />

                {/* Scrollable Body */}
                <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-4 text-sm">
                    {/* Selected Roles Chips Strip */}
                    <div className={`p-3 rounded-xl border space-y-2 ${isDarkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`}>
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-blue-400">
                                {t('it.assignedRoles', 'Roluri Atribuite')} ({selectedRoles.length})
                            </label>
                            <span className={`text-[10px] ${textSub}`}>
                                {t('it.primaryRoleAutomatic', 'Rolul principal este calculat automat din ierarhie')}
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 min-h-[32px] items-center">
                            {selectedRoles.map(roleKey => {
                                const roleOpt = rolesList.find(r => r.key === roleKey);
                                const isPrimary = computedPrimaryRole === roleKey;
                                return (
                                    <div
                                        key={roleKey}
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all ${
                                            isPrimary
                                                ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                                                : isDarkMode
                                                    ? 'bg-zinc-800/80 text-zinc-200 border-zinc-700'
                                                    : 'bg-white text-zinc-800 border-zinc-300'
                                        }`}
                                    >
                                        {isPrimary && (
                                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-400 text-zinc-950">
                                                {t('it.primaryBadge', 'Principal')}
                                            </span>
                                        )}
                                        <span>{roleOpt?.label || roleKey}</span>
                                        {selectedRoles.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => toggleRole(roleKey)}
                                                className={`cursor-pointer p-0.5 rounded hover:bg-black/20 ${isPrimary ? 'text-blue-100' : 'text-zinc-400 hover:text-rose-400'}`}
                                                title={t('common.delete', 'Elimină')}
                                            >
                                                <X className="w-3 h-3"/>
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('it.searchRolePlaceholder', 'Caută rol sau departament...')}
                            className={`w-full h-[38px] px-3 py-2 rounded-xl border text-xs outline-hidden transition ${inputBg}`}
                        />
                    </div>

                    {/* Roles Picker Grid */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                            {t('it.chooseRoles', 'Selectează Rolurile')}
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {filteredRoles.map(role => {
                                const isSelected = selectedRoles.includes(role.key);
                                const isPrimary = computedPrimaryRole === role.key;
                                const isAllowed = isRoleAssignable(role.key);

                                return (
                                    <button
                                        key={role.key}
                                        type="button"
                                        disabled={!isAllowed}
                                        onClick={() => toggleRole(role.key)}
                                        className={`p-3 rounded-xl border text-left flex items-start justify-between transition-all select-none ${
                                            !isAllowed
                                                ? 'opacity-40 cursor-not-allowed bg-zinc-950/20 border-zinc-800/40 text-zinc-500'
                                                : isSelected
                                                ? 'bg-blue-600/15 border-blue-500 ring-1 ring-blue-500/50 text-white shadow-xs cursor-pointer'
                                                : isDarkMode
                                                    ? 'bg-zinc-900/40 border-zinc-800/80 text-zinc-300 hover:bg-zinc-900 hover:border-zinc-700 cursor-pointer'
                                                    : 'bg-zinc-50/80 border-zinc-200 text-zinc-700 hover:bg-white hover:border-zinc-300 cursor-pointer'
                                        }`}
                                        title={!isAllowed ? t('it.cannotAssignRole', 'Nu aveți permisiunile necesare pentru a atribui acest rol.') : role.description || role.label}
                                    >
                                        <div className="flex items-start space-x-3 pr-2 min-w-0 flex-1">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                                                    <span className="text-xs font-bold leading-none">{role.label}</span>
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase font-semibold ${
                                                        isSelected
                                                            ? 'bg-blue-500/20 text-blue-300'
                                                            : isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200 text-zinc-600'
                                                    }`}>
                                                        {role.category}
                                                    </span>
                                                    {isPrimary && (
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                            {t('it.primaryBadge', 'Principal')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`w-5 h-5 rounded-lg border shrink-0 flex items-center justify-center mt-0.5 transition-all ${isSelected ? 'bg-blue-600 border-blue-500 text-white ring-2 ring-blue-500/20' : 'border-zinc-700'}`}>
                                            {isSelected && <span className="text-xs font-bold">✓</span>}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {filteredRoles.length === 0 && (
                            <div className="py-8 text-center text-xs text-zinc-500">
                                {t('common.noResults', 'Niciun rol găsit.')}
                            </div>
                        )}
                    </div>
                </div>

                <div className={`mx-5 sm:mx-6 border-t ${modalBorder}`} />

                {/* Footer */}
                <div className="px-5 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
                    <span className={`text-xs ${textSub}`}>
                        {selectedRoles.length} {t('it.rolesSelected', 'roluri selectate')}
                    </span>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving || selectedRoles.length === 0}
                        className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                    >
                        {isSaving ? <span>{t('it.saving', 'Se salvează...')}</span> : <span>{t('it.saveRoles', 'Salvează Rolurile')}</span>}
                    </button>
                </div>
            </div>
        </div>
    );
};
