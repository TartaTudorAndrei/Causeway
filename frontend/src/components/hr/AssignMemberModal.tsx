import React, { useState, useMemo, useEffect } from 'react';
import type { HrMember, HrStandRole } from '../../types/hr';
import type { Club } from '../../types/adminAuth';
import { adminAuthService } from '../../services/adminAuthService';
import { hrService } from '../../services/hrService';
import { useLanguage } from '../../context/LanguageContext';
import { ManageableSelect, type ManageableOption } from '../common';
import { X } from 'lucide-react';
interface AssignMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAssign: (memberId: string, roleId: string) => void;
    members: HrMember[];
    roles: HrStandRole[];
    onCreateRole?: (name: string) => Promise<HrStandRole>;
    onRenameRole?: (roleId: string, newName: string) => Promise<void>;
    onDeleteRole?: (roleId: string) => Promise<void>;
    isDarkMode: boolean;
}
const isCoreRole = (name?: string): boolean => {
    if (!name)
        return false;
    const n = name.trim().toLowerCase();
    return (n.includes('finance') ||
        n.includes('financiar') ||
        n.includes('finanțe') ||
        n.includes('finante') ||
        n.includes('logistic') ||
        n.includes('volunteer') ||
        n.includes('voluntar'));
};
const getMemberOrg = (m: HrMember): string => {
    if (!m)
        return 'Other';
    if (m.organizationType && typeof m.organizationType === 'string' && m.organizationType.trim()) {
        return m.organizationType.trim();
    }
    const clubOrDept = (typeof m.organizationDetails === 'string' ? m.organizationDetails : '') ||
        (typeof m.department === 'string' ? m.department : '');
    const lower = clubOrDept.toLowerCase().trim();
    if (lower.startsWith('interact'))
        return 'Interact';
    if (lower.startsWith('rotaract'))
        return 'Rotaract';
    if (lower.startsWith('rotary'))
        return 'Rotary';
    if (lower.length > 0)
        return 'Other';
    return 'Other';
};
const getMemberClub = (m: HrMember): string => {
    if (!m)
        return '';
    if (m.organizationDetails && typeof m.organizationDetails === 'string' && m.organizationDetails.trim()) {
        return m.organizationDetails.trim();
    }
    if (m.department && typeof m.department === 'string' && m.department.trim()) {
        return m.department.trim();
    }
    return '';
};
const getMemberRole = (m: HrMember): string => {
    if (!m)
        return 'VOLUNTEER';
    if (m.authRole && typeof m.authRole === 'string' && m.authRole.trim()) {
        return m.authRole.trim();
    }
    if (m.role && typeof m.role === 'string' && m.role.trim()) {
        return m.role.trim();
    }
    return 'VOLUNTEER';
};
const ALL_SYSTEM_ROLES = [
    'SUPER_ADMIN',
    'IT_ADMIN',
    'FINANCE_HEAD',
    'FINANCE_MEMBER',
    'LOGISTICS_HEAD',
    'LOGISTICS_MEMBER',
    'MARKETING_HEAD',
    'MARKETING_MEMBER',
    'FUNDRAISING_HEAD',
    'FUNDRAISING_MEMBER',
    'HR_HEAD',
    'HR_MEMBER',
    'LEGAL_HEAD',
    'LEGAL_MEMBER',
    'VOLUNTEER',
];
const memberMatchesRole = (m: HrMember, targetRole: string): boolean => {
    if (targetRole === 'ALL')
        return true;
    const target = targetRole.toUpperCase();
    const authRole = (m.authRole || '').toUpperCase();
    const rawRole = (m.role || '').toUpperCase();
    if (authRole === target || rawRole === target)
        return true;
    if (target === 'IT_ADMIN' && (authRole === 'IT' || rawRole === 'IT'))
        return true;
    if (target === 'SUPER_ADMIN' && (authRole.includes('SUPER') || rawRole.includes('SUPER') || rawRole.includes('ADMINISTRATOR')))
        return true;
    if (target === 'VOLUNTEER' && (!authRole || authRole === 'VOLUNTEER' || rawRole.includes('VOLUNTAR') || rawRole === 'VOLUNTEER'))
        return true;
    return authRole.includes(target) || rawRole.includes(target);
};
export const AssignMemberModal: React.FC<AssignMemberModalProps> = ({ isOpen, onClose, onAssign, members, roles, onCreateRole, onRenameRole, onDeleteRole, isDarkMode }) => {
    const { t } = useLanguage();
    // Internal members & roles fallback to ensure members & roles always populate
    const [internalMembers, setInternalMembers] = useState<HrMember[]>([]);
    const [internalRoles, setInternalRoles] = useState<HrStandRole[]>([]);
    // DB Clubs State
    const [dbClubs, setDbClubs] = useState<Club[]>([]);
    // 3-Factor Filter States: Organization, Club, Role (IT Dashboard) + Search
    const [searchQuery, setSearchQuery] = useState('');
    const [orgFilter, setOrgFilter] = useState('ALL');
    const [clubFilter, setClubFilter] = useState('ALL');
    const [roleFilter, setRoleFilter] = useState('ALL');
    useEffect(() => {
        if (isOpen) {
            adminAuthService.getClubs().then(clubs => {
                if (clubs && clubs.length > 0) {
                    setDbClubs(clubs);
                }
            });
            if (members && members.length > 0) {
                setInternalMembers(members);
            }
            else {
                hrService.getMembers().then(data => {
                    if (data && data.length > 0) {
                        setInternalMembers(data);
                    }
                });
            }
            if (!roles || roles.length === 0) {
                hrService.getRoles().then(data => {
                    if (data && data.length > 0) {
                        setInternalRoles(data);
                    }
                });
            }
            setSearchQuery('');
            setOrgFilter('ALL');
            setClubFilter('ALL');
            setRoleFilter('ALL');
        }
    }, [isOpen, members, roles]);
    const activeMembers = useMemo(() => {
        return (members && members.length > 0) ? members : internalMembers;
    }, [members, internalMembers]);
    const activeRoles = useMemo(() => {
        return (roles && roles.length > 0) ? roles : internalRoles;
    }, [roles, internalRoles]);
    const [selectedMemberId, setSelectedMemberId] = useState('');
    const [selectedRoleId, setSelectedRoleId] = useState('');
    // Unique Organizations (Interact, Rotaract, Rotary, Other + any custom)
    const availableOrgs = useMemo(() => {
        const defaultOrgs = ['Interact', 'Rotaract', 'Rotary', 'Other'];
        const set = new Set<string>(defaultOrgs);
        dbClubs.forEach(c => {
            if (c.organizationType)
                set.add(c.organizationType);
        });
        activeMembers.forEach(m => {
            const org = getMemberOrg(m);
            if (org)
                set.add(org);
        });
        return Array.from(set).sort((a, b) => {
            const order = ['Interact', 'Rotaract', 'Rotary', 'Other'];
            const idxA = order.indexOf(a);
            const idxB = order.indexOf(b);
            if (idxA !== -1 && idxB !== -1)
                return idxA - idxB;
            if (idxA !== -1)
                return -1;
            if (idxB !== -1)
                return 1;
            return a.localeCompare(b);
        });
    }, [dbClubs, activeMembers]);
    // Available Clubs from DB + members (filtered dynamically if an organization is chosen)
    const availableClubs = useMemo(() => {
        const set = new Set<string>();
        dbClubs.forEach(c => {
            if (c.name) {
                if (orgFilter === 'ALL' || c.organizationType?.toLowerCase() === orgFilter.toLowerCase()) {
                    set.add(c.name);
                }
            }
        });
        activeMembers.forEach(m => {
            const org = getMemberOrg(m);
            const club = getMemberClub(m);
            if (club) {
                if (orgFilter === 'ALL' || org.toLowerCase() === orgFilter.toLowerCase()) {
                    set.add(club);
                }
            }
        });
        return Array.from(set).sort();
    }, [dbClubs, activeMembers, orgFilter]);
    // Unique IT Dashboard Roles (Full standard platform list + any custom)
    const uniqueRoles = useMemo(() => {
        const set = new Set<string>(ALL_SYSTEM_ROLES);
        activeMembers.forEach(m => {
            const role = getMemberRole(m);
            if (role && !set.has(role.toUpperCase())) {
                set.add(role);
            }
        });
        return Array.from(set);
    }, [activeMembers]);
    // Filtered members list
    const filteredMembers = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        return activeMembers.filter(m => {
            if (!m)
                return false;
            const memberOrg = getMemberOrg(m);
            const memberClub = getMemberClub(m);
            const memberRole = getMemberRole(m);
            const fullName = (m.fullName || '').toLowerCase();
            const email = (m.email || '').toLowerCase();
            const phone = (m.phone ? String(m.phone) : '').toLowerCase();
            const matchSearch = !q ||
                fullName.includes(q) ||
                email.includes(q) ||
                phone.includes(q) ||
                memberOrg.toLowerCase().includes(q) ||
                memberClub.toLowerCase().includes(q) ||
                memberRole.toLowerCase().includes(q);
            const matchOrg = orgFilter === 'ALL' || memberOrg.toLowerCase() === orgFilter.toLowerCase();
            const matchClub = clubFilter === 'ALL' || memberClub.toLowerCase() === clubFilter.toLowerCase();
            const matchRole = roleFilter === 'ALL' || memberMatchesRole(m, roleFilter);
            return matchSearch && matchOrg && matchClub && matchRole;
        });
    }, [activeMembers, searchQuery, orgFilter, clubFilter, roleFilter]);
    // Sync member selection with filtered list
    useEffect(() => {
        if (isOpen) {
            if (filteredMembers.length > 0) {
                if (!selectedMemberId || !filteredMembers.some(m => m.id === selectedMemberId)) {
                    setSelectedMemberId(filteredMembers[0].id);
                }
            }
            else if (activeMembers.length > 0) {
                if (!selectedMemberId || !activeMembers.some(m => m.id === selectedMemberId)) {
                    setSelectedMemberId(activeMembers[0].id);
                }
            }
            else {
                setSelectedMemberId('');
            }
        }
    }, [isOpen, filteredMembers, activeMembers, selectedMemberId]);
    // Sync role selection with active roles
    useEffect(() => {
        if (isOpen) {
            if (activeRoles.length > 0) {
                if (!selectedRoleId || !activeRoles.some(r => r.id === selectedRoleId)) {
                    setSelectedRoleId(activeRoles[0].id);
                }
            }
            else {
                setSelectedRoleId('');
            }
        }
    }, [isOpen, activeRoles, selectedRoleId]);
    const selectedMember = useMemo(() => {
        return activeMembers.find(m => m.id === selectedMemberId) || null;
    }, [activeMembers, selectedMemberId]);
    const roleOptions: ManageableOption[] = useMemo(() => {
        return activeRoles.map(r => ({
            value: r.id,
            label: r.name,
            isSystem: Boolean(r.isSystem || isCoreRole(r.name))
        }));
    }, [activeRoles]);
    const [error, setError] = useState('');
    useEffect(() => { setError(''); }, [isOpen]);
    React.useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);
    if (!isOpen) return null;
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMemberId || !selectedRoleId) { setError(t('common.fillRequiredFields', 'Completați câmpurile obligatorii marcate.')); return; }
        onAssign(selectedMemberId, selectedRoleId);
        onClose();
    };
    const isFiltersActive = Boolean(searchQuery || orgFilter !== 'ALL' || clubFilter !== 'ALL' || roleFilter !== 'ALL');
    const handleResetFilters = () => { setSearchQuery(''); setOrgFilter('ALL'); setClubFilter('ALL'); setRoleFilter('ALL'); };
    const modalBorder = isDarkMode ? 'border-zinc-800' : 'border-zinc-200';
    const modalBg = isDarkMode ? 'bg-black text-white border-zinc-800 shadow-2xl' : 'bg-white text-zinc-900 border-zinc-200 shadow-xl';
    const inputBg = isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500' : 'bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400';
    const panelBg = isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-100/50 border-zinc-200';
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150" onClick={onClose}>
            <div className={`w-full h-full sm:h-auto sm:max-h-[90vh] max-w-4xl rounded-none sm:rounded-2xl border-0 sm:border shadow-2xl flex flex-col overflow-hidden transition-all transform scale-100 animate-in zoom-in-95 duration-150 ${modalBg}`} onClick={(e) => e.stopPropagation()}>
                <div className="px-5 sm:px-6 pt-5 pb-3.5 flex items-center justify-between shrink-0">
                    <h3 className="font-bold text-base sm:text-lg tracking-tight">{t('hr.assignPersonnel', 'Asignare Personal pe Schimb')}</h3>
                    <button type="button" onClick={onClose} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}>
                        <X className="w-5 h-5"/>
                    </button>
                </div>
                <div className={`mx-5 sm:mx-6 border-b ${modalBorder}`} />
                <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-4 text-sm">
                    <form id="assign-member-form" noValidate onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                            <div className="md:col-span-7 space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">{t('hr.selectMember', 'Selectează Membru')} ({filteredMembers.length})</label>
                                    {isFiltersActive && (<button type="button" onClick={handleResetFilters} className="text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer">{t('hr.clearFilters', 'Șterge filtre')}</button>)}
                                </div>
                                <div className="space-y-2">
                                    <div className="relative">
                                        <input type="text" placeholder={t('hr.searchMemberPlaceholder', 'Căutare nume, email...')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputBg}`} />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <select value={orgFilter} onChange={(e) => { setOrgFilter(e.target.value); setClubFilter('ALL'); }} className={`w-full h-[38px] px-2 py-1 text-xs rounded-xl border outline-hidden transition ${inputBg}`}>
                                            <option value="ALL">{t('hr.allOrgs', 'Toate Org.')}</option>
                                            {availableOrgs.map(org => (<option key={org} value={org}>{org}</option>))}
                                        </select>
                                        <select value={clubFilter} onChange={(e) => setClubFilter(e.target.value)} className={`w-full h-[38px] px-2 py-1 text-xs rounded-xl border outline-hidden transition ${inputBg}`}>
                                            <option value="ALL">{t('hr.allClubs', 'Toate Cluburile')}</option>
                                            {availableClubs.map(club => (<option key={club} value={club}>{club}</option>))}
                                        </select>
                                        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={`w-full h-[38px] px-2 py-1 text-xs rounded-xl border outline-hidden transition ${inputBg}`}>
                                            <option value="ALL">{t('hr.allRoles', 'Toate Rolurile')}</option>
                                            {uniqueRoles.map(role => (<option key={role} value={role}>{role}</option>))}
                                        </select>
                                    </div>
                                </div>
                                <div className={`rounded-xl border divide-y overflow-y-auto max-h-[320px] ${isDarkMode ? 'border-zinc-800 divide-zinc-800/60' : 'border-zinc-200 divide-zinc-200'}`}>
                                    {filteredMembers.map(m => (
                                        <div key={m.id} onClick={() => { setSelectedMemberId(m.id); setError(''); }} className={`p-2.5 transition cursor-pointer flex items-center justify-between ${selectedMemberId === m.id ? 'bg-blue-600/15' : ''}`}>
                                            <span className="text-xs truncate">{m.fullName}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="md:col-span-5 flex flex-col justify-between space-y-4">
                                <div className="space-y-4">
                                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">{t('hr.assignmentDetails', 'Detalii Asignare')}</label>
                                    <div className={`p-3.5 rounded-xl border ${panelBg}`}>
                                        {selectedMember ? <span className="text-xs font-bold text-white">{selectedMember.fullName}</span> : <span className="text-xs italic text-zinc-500">Alege un membru</span>}
                                    </div>
                                    <ManageableSelect
                                        label={t('hr.selectRole', 'Rol')}
                                        value={selectedRoleId}
                                        onChange={(val) => { setSelectedRoleId(val); setError(''); }}
                                        options={roleOptions}
                                        placeholder={t('hr.selectRolePlaceholder', 'Selectează rol...')}
                                        modalTitle={t('hr.manageRoles', 'Gestionează Roluri')}
                                        isDarkMode={isDarkMode}
                                        onAddItem={onCreateRole ? async (name: string) => {
                                            const created = await onCreateRole(name);
                                            return created.id;
                                        } : undefined}
                                        onRenameItem={onRenameRole}
                                        onDeleteItem={onDeleteRole}
                                    />
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                <div className={`mx-5 sm:mx-6 border-t ${modalBorder}`} />
                <div className="px-5 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
                    <div className="min-w-0 pr-3">{error && <p className="text-xs text-rose-400 font-medium truncate">{error}</p>}</div>
                    <button form="assign-member-form" type="submit" disabled={!selectedMemberId || !selectedRoleId} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50">{t('hr.assign', 'Asignează')}</button>
                </div>
            </div>
        </div>
    );
};
