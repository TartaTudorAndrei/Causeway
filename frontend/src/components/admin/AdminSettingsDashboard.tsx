import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { PlatformUser, SystemRoleType, UserPlatformStatus } from '../../types/adminSettings';
import type { UserMembership } from '../../types/adminAuth';
import { adminSettingsService } from '../../services/adminSettingsService';
import { UserRoleEditModal } from './UserRoleEditModal';
import { UserDetailModal } from './UserDetailModal';
import { AuditLogsView } from './AuditLogsView';
import { GoogleSyncDashboardView } from './GoogleSyncDashboardView';
import { NotificationsIntegrationView } from './NotificationsIntegrationView';
import { RolePermissionsView } from './RolePermissionsView';
import { AdminEmailView } from './AdminEmailView';
import { EmailTemplateEditorModal } from '../email/EmailTemplateEditorModal';
import { EmailComposerModal } from '../email/EmailComposerModal';
import { ConfirmationModal } from '../common';
import { emailService } from '../../services/emailService';
import type { EmailTemplate } from '../../types/email';
import { useLanguage } from '../../context/LanguageContext';
import { usePermission } from '../../hooks/usePermission';
import { AlertCircle, Check, Eye, ShieldCheck, Trash2, X } from 'lucide-react';
import { DashboardContainer, SubTabNav, ToastNotification, SearchInput, FilterPopover, DashboardHeaderSection, CustomSelect } from '../common';
import { AdminStatisticsView } from './AdminStatisticsView';
import { AdminConfigView } from './AdminConfigView';

import { adminConfigService } from '../../services/adminConfigService';

export interface AdminSettingsDashboardProps {
    isDarkMode: boolean;
}
export type AdminSubTab = 'users' | 'permissions' | 'config' | 'audit' | 'sync' | 'notifications' | 'email' | 'statistics';
export type ITSubTab = AdminSubTab;

const ADMIN_TAB_PERMISSIONS: Record<AdminSubTab, string[]> = {
    'users': ['it:users:read', 'admin:users:view', 'it:users:view'],
    'permissions': ['it:permissions:read', 'admin:permissions:view', 'it:permissions:view'],
    'config': ['SYSTEM_CONFIG_MANAGE', 'it:config:manage', 'it:config:read', 'admin:all', 'it:all'],
    'audit': ['it:audit:read', 'admin:audit:view', 'it:audit:view'],
    'sync': ['it:sync:manage', 'admin:sync:view', 'it:sync:view'],
    'notifications': ['it:notifications:read', 'it:whatsapp:read', 'admin:whatsapp:view', 'it:pwa:read', 'admin:pwa:view', 'it:whatsapp:view', 'it:pwa:view', 'it:notifications:view'],
    'email': ['it:email:read', 'admin:email:view', 'it:email:view', 'fundraising:emails:view', 'it:notifications:read', 'admin:all', 'it:all', 'it:users:read'],
    'statistics': ['it:statistics:read', 'admin:statistics:view', 'it:statistics:view'],
};

const BASE_ADMIN_SUB_TABS: AdminSubTab[] = ['users', 'permissions', 'config', 'audit', 'sync', 'notifications', 'email', 'statistics'];

export const AdminSettingsDashboard: React.FC<AdminSettingsDashboardProps> = ({ isDarkMode }) => {
    const { t } = useLanguage();
    const { hasPermission, isSuperAdmin } = usePermission();
    const [isUiConfigEnabled, setIsUiConfigEnabled] = useState<boolean>(false);

    useEffect(() => {
        let isMounted = true;
        adminConfigService.getStatus()
            .then(status => {
                if (isMounted) {
                    setIsUiConfigEnabled(Boolean(status?.uiConfigEnabled));
                }
            })
            .catch(() => {
                if (isMounted) {
                    setIsUiConfigEnabled(false);
                }
            });
        return () => {
            isMounted = false;
        };
    }, []);

    const validSubTabs = useMemo<AdminSubTab[]>(() => {
        if (!isUiConfigEnabled) {
            return BASE_ADMIN_SUB_TABS.filter(tab => tab !== 'config');
        }
        return BASE_ADMIN_SUB_TABS;
    }, [isUiConfigEnabled]);

    const isTabAccessible = useCallback((tabId: AdminSubTab): boolean => {
        if (tabId === 'config' && !isUiConfigEnabled) return false;
        if (isSuperAdmin) return true;
        const codes = ADMIN_TAB_PERMISSIONS[tabId] || [];
        return codes.some(code => hasPermission(code));
    }, [isSuperAdmin, hasPermission, isUiConfigEnabled]);

    const canWriteAdmin = hasPermission('admin:settings:write', 'DEPARTMENT', 'it-dept-uuid') || 
      hasPermission('it:settings:write', 'DEPARTMENT', 'it-dept-uuid') || 
      hasPermission('admin:write', 'GLOBAL') || 
      hasPermission('it:write', 'GLOBAL') || 
      isSuperAdmin;
    const canWriteIT = canWriteAdmin;
    const [searchParams, setSearchParams] = useSearchParams();
    const accessibleTabs = validSubTabs.filter((tab: AdminSubTab) => isTabAccessible(tab));
    const rawSubTabParam = searchParams.get('subtab');
    const normalizedSubTab = (rawSubTabParam === 'whatsapp' || rawSubTabParam === 'pwa') ? 'notifications' : rawSubTabParam;
    const rawSubTab = normalizedSubTab as AdminSubTab;
    const requestedTab: AdminSubTab = (rawSubTab && validSubTabs.includes(rawSubTab)) ? rawSubTab : 'users';
    const activeSubTab: AdminSubTab = isTabAccessible(requestedTab) ? requestedTab : (accessibleTabs[0] || 'users');

    const setActiveSubTab = useCallback((subtab: AdminSubTab) => {
        if (!isTabAccessible(subtab)) return;
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('subtab', subtab);
            return next;
        });
    }, [isTabAccessible, setSearchParams]);

    useEffect(() => {
        if (rawSubTab && !isTabAccessible(rawSubTab)) {
            setActiveSubTab(activeSubTab);
        }
    }, [rawSubTab, activeSubTab, isTabAccessible, setActiveSubTab]);
    // State
    const [users, setUsers] = useState<PlatformUser[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    // Filters & Search
    const searchQuery = searchParams.get('search') || '';
    const setSearchQuery = (query: string) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (query)
                next.set('search', query);
            else
                next.delete('search');
            return next;
        }, { replace: true });
    };
    const statusFilter = searchParams.get('status') || 'ALL';
    const setStatusFilter = (status: string) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (status && status !== 'ALL')
                next.set('status', status);
            else
                next.delete('status');
            return next;
        }, { replace: true });
    };
    const roleFilter = searchParams.get('role') || 'ALL';
    const setRoleFilter = (role: string) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (role && role !== 'ALL')
                next.set('role', role);
            else
                next.delete('role');
            return next;
        }, { replace: true });
    };
    // Modals
    const [selectedUserForEdit, setSelectedUserForEdit] = useState<PlatformUser | null>(null);
    const [isRoleModalOpen, setIsRoleModalOpen] = useState<boolean>(false);
    const [selectedUserForDetail, setSelectedUserForDetail] = useState<PlatformUser | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
    const [isNotificationStatusModalOpen, setIsNotificationStatusModalOpen] = useState<boolean>(false);
    const [isNotificationCreateModalOpen, setIsNotificationCreateModalOpen] = useState<boolean>(false);
    // Email Studio State
    const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
    const [isEmailLoading, setIsEmailLoading] = useState<boolean>(false);
    const [emailSearchQuery, setEmailSearchQuery] = useState<string>('');
    const [emailDepartmentFilter, setEmailDepartmentFilter] = useState<string>('ALL');
    const [selectedTemplateForEdit, setSelectedTemplateForEdit] = useState<EmailTemplate | null>(null);
    const [selectedTemplateForSend, setSelectedTemplateForSend] = useState<EmailTemplate | null>(null);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);
    const [isSendModalOpen, setIsSendModalOpen] = useState<boolean>(false);
    const [deletingTemplate, setDeletingTemplate] = useState<EmailTemplate | null>(null);

    // Confirmation Modal for Rejection
    const [userToReject, setUserToReject] = useState<PlatformUser | null>(null);
    const [rejectReason, setRejectReason] = useState<string>('');
    // Toast Notification
    const [toastMessage, setToastMessage] = useState<{
        text: string;
        type: 'success' | 'error';
    } | null>(null);
    const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
        setToastMessage({ text, type });
    }, []);

    const loadEmailTemplates = useCallback(async () => {
        setIsEmailLoading(true);
        try {
            const data = await emailService.getTemplates();
            setEmailTemplates(data);
        } catch {
            // silent
        } finally {
            setIsEmailLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeSubTab === 'email') {
            loadEmailTemplates();
        }
    }, [activeSubTab, loadEmailTemplates]);

    const handleSaveTemplate = async (templateData: any) => {
        if (selectedTemplateForEdit) {
            await emailService.updateTemplate(selectedTemplateForEdit.id, templateData);
            showToast(t('email.templateUpdated', 'Șablon actualizat cu succes'), 'success');
        } else {
            await emailService.createTemplate(templateData);
            showToast(t('email.templateCreated', 'Șablon creat cu succes'), 'success');
        }
        setSelectedTemplateForEdit(null);
        setIsTemplateModalOpen(false);
        loadEmailTemplates();
    };

    const handleDeleteTemplate = async () => {
        if (!deletingTemplate) return;
        try {
            await emailService.deleteTemplate(deletingTemplate.id, deletingTemplate.name);
            showToast(t('email.templateDeleted', 'Șablon șters cu succes'), 'success');
            setDeletingTemplate(null);
            loadEmailTemplates();
        } catch (err: any) {
            showToast(err?.message || t('email.deleteError', 'Eroare la ștergerea șablonului'), 'error');
        }
    };

    const handleCopyTemplate = async (template: EmailTemplate) => {
        try {
            await emailService.copyTemplate(template.id);
            showToast(t('email.templateCopied', 'Șablon copiat cu succes'), 'success');
            loadEmailTemplates();
        } catch (err: any) {
            showToast(err?.message || 'Eroare la copierea șablonului', 'error');
        }
    };
    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const fetchedUsers = await adminSettingsService.getUsers();
            setUsers(fetchedUsers);
        }
        catch (err) {
            console.error('Eroare la încărcarea datelor IT:', err);
            showToast(t('it.loadError', 'Eroare la încărcarea datelor IT'), 'error');
        }
        finally {
            setIsLoading(false);
        }
    }, [showToast, t]);
    useEffect(() => {
        loadData();
    }, [loadData]);
    // Keyboard Escape listener
    useEffect(() => {
        if (!userToReject)
            return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setUserToReject(null);
                setRejectReason('');
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [userToReject]);
    // Quick Action: Approve User
    const handleApprove = async (userId: string, userName: string) => {
        try {
            const updated = await adminSettingsService.approveUser(userId);
            setUsers(prev => prev.map(u => u.id === userId ? updated : u));
            showToast(`${t('it.userApprovedSuccess', 'Accesul utilizatorului a fost aprobat cu succes.')} (${userName})`);
        }
        catch (err: any) {
            showToast(err?.message || 'Eroare la aprobarea utilizatorului', 'error');
        }
    };
    // Reject Modal Trigger
    const openRejectModal = (user: PlatformUser) => {
        setUserToReject(user);
        setRejectReason('');
    };
    const handleConfirmReject = async () => {
        if (!userToReject)
            return;
        try {
            const updated = await adminSettingsService.rejectUser(userToReject.id, rejectReason);
            setUsers(prev => prev.map(u => u.id === userToReject.id ? updated : u));
            showToast(`${t('it.userRejectedSuccess', 'Cererea de cont a fost respinsă.')} (${userToReject.fullName})`);
            setUserToReject(null);
        }
        catch (err: any) {
            showToast(err?.message || 'Eroare la respingerea utilizatorului', 'error');
        }
    };
    // Delete User Action
    const [userToDelete, setUserToDelete] = useState<PlatformUser | null>(null);
    const [isDeletingUser, setIsDeletingUser] = useState(false);

    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        setIsDeletingUser(true);
        try {
            await adminSettingsService.deleteUser(userToDelete.id);
            setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
            if (selectedUserForDetail?.id === userToDelete.id) {
                setIsDetailModalOpen(false);
                setSelectedUserForDetail(null);
            }
            showToast(`${t('it.userDeletedSuccess', 'Utilizatorul a fost șters cu succes.')} (${userToDelete.fullName})`);
            setUserToDelete(null);
        }
        catch (err: any) {
            showToast(err?.message || t('it.deleteUserError', 'Eroare la ștergerea utilizatorului.'), 'error');
        }
        finally {
            setIsDeletingUser(false);
        }
    };
    // Save Roles from Modal
    const handleSaveRoles = async (userId: string, primaryRole: SystemRoleType, roles: SystemRoleType[], memberships: UserMembership[]) => {
        try {
            const updated = await adminSettingsService.updateUserRolesAndMemberships(userId, primaryRole, roles, memberships);
            setUsers(prev => prev.map(u => u.id === userId ? updated : u));
            showToast(t('it.rolesUpdatedSuccess', 'Rolurile și permisiunile au fost actualizate.'));
        }
        catch (err: any) {
            showToast(err?.message || 'Eroare la actualizarea rolurilor', 'error');
        }
    };
    // Filtered Users
    const availableRoleOptions = React.useMemo(() => {
        const set = new Set<string>();
        set.add('ADMIN');
        set.add('VOLUNTEER');
        users.forEach(u => {
            if (u.primaryRole) set.add(u.primaryRole);
            if (u.roles && Array.isArray(u.roles)) {
                u.roles.forEach(r => { if (r) set.add(r); });
            }
        });
        return Array.from(set).sort();
    }, [users]);

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (u.organizationType && u.organizationType.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;
        const matchesRole = roleFilter === 'ALL' || u.primaryRole === roleFilter || (u.roles && u.roles.includes(roleFilter as SystemRoleType));
        return matchesSearch && matchesStatus && matchesRole;
    });
    // UI Theme tokens matching Finance standard
    const css = {
        card: isDarkMode ? 'bg-zinc-950 border-zinc-850' : 'bg-white border-zinc-200 shadow-xs',
        tableHeader: isDarkMode ? 'bg-zinc-900/60 text-zinc-400 border-zinc-800' : 'bg-zinc-100/90 text-zinc-600 border-zinc-200',
        tableRow: isDarkMode ? 'border-zinc-850 hover:bg-zinc-900/40' : 'border-zinc-200 hover:bg-zinc-50',
        input: isDarkMode ? 'bg-zinc-950 border-zinc-800 text-white placeholder-zinc-500' : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400',
        textPrimary: isDarkMode ? 'text-zinc-100' : 'text-zinc-900',
        textSecondary: isDarkMode ? 'text-zinc-400' : 'text-zinc-500',
        buttonSubtle: isDarkMode
            ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200'
            : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-800',
    };
    const getStatusBadge = (status: UserPlatformStatus) => {
        switch (status) {
            case 'APPROVED':
                return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><span>{t('status.APPROVED', 'Aprobat')}</span></span>;
            case 'PENDING_APPROVAL':
                return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse"><span>{t('status.PENDING_APPROVAL', 'În Așteptare Aprobare')}</span></span>;
            case 'PENDING_EMAIL':
                return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20"><span>{t('status.PENDING_EMAIL', 'Confirmare Email')}</span></span>;
            case 'REJECTED':
                return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20"><span>{t('status.REJECTED', 'Respins')}</span></span>;
            case 'SUSPENDED':
                return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"><span>{t('status.SUSPENDED', 'Suspendat')}</span></span>;
            default:
                return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">{status}</span>;
        }
    };
    // Audit search & filter state synced with URL search params
    const auditSearchQuery = searchParams.get('search') || '';
    const setAuditSearchQuery = (query: string) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (query)
                next.set('search', query);
            else
                next.delete('search');
            return next;
        }, { replace: true });
    };
    const auditDeptFilter = searchParams.get('dept') || 'ALL';
    const setAuditDeptFilter = (dept: string) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (dept && dept !== 'ALL')
                next.set('dept', dept);
            else
                next.delete('dept');
            return next;
        }, { replace: true });
    };
    const auditActionFilter = searchParams.get('action') || 'ALL';
    const setAuditActionFilter = (action: string) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (action && action !== 'ALL')
                next.set('action', action);
            else
                next.delete('action');
            return next;
        }, { replace: true });
    };

    // Notification search, category & channel filter state
    const notificationSearchQuery = activeSubTab === 'notifications' ? (searchParams.get('search') || '') : '';
    const setNotificationSearchQuery = (query: string) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (query)
                next.set('search', query);
            else
                next.delete('search');
            return next;
        }, { replace: true });
    };
    const notificationCategoryFilter = activeSubTab === 'notifications' ? (searchParams.get('category') || 'ALL') : 'ALL';
    const setNotificationCategoryFilter = (cat: string) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (cat && cat !== 'ALL')
                next.set('category', cat);
            else
                next.delete('category');
            return next;
        }, { replace: true });
    };
    const notificationChannelFilter = activeSubTab === 'notifications' ? (searchParams.get('channel') || 'ALL') : 'ALL';
    const setNotificationChannelFilter = (ch: string) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (ch && ch !== 'ALL')
                next.set('channel', ch);
            else
                next.delete('channel');
            return next;
        }, { replace: true });
    };

    const activeITFilterCount = activeSubTab === 'users'
        ? (statusFilter !== 'ALL' ? 1 : 0) + (roleFilter !== 'ALL' ? 1 : 0)
        : activeSubTab === 'audit'
            ? (auditDeptFilter !== 'ALL' ? 1 : 0) + (auditActionFilter !== 'ALL' ? 1 : 0)
            : activeSubTab === 'notifications'
                ? (notificationCategoryFilter !== 'ALL' ? 1 : 0) + (notificationChannelFilter !== 'ALL' ? 1 : 0)
                : 0;
    const currentITSearchQuery = activeSubTab === 'users' ? searchQuery : activeSubTab === 'audit' ? auditSearchQuery : activeSubTab === 'notifications' ? notificationSearchQuery : '';
    return (<DashboardContainer noScroll>
      
      {/* Toast Notification */}
      <ToastNotification toast={toastMessage} onClose={() => setToastMessage(null)}/>

      {/* Unified Dashboard Sub-Header */}
      <DashboardHeaderSection isDarkMode={isDarkMode} activeTabLabel={activeSubTab === 'users'
            ? t('it.tabUsers', 'Gestiune Utilizatori')
            : activeSubTab === 'permissions'
                ? t('it.tabPermissions', 'Roluri')
                : activeSubTab === 'audit'
                    ? t('it.tabAudit', 'Jurnal Audit & Activitate')
                    : activeSubTab === 'sync'
                        ? t('it.tabSync', 'Sincronizare Google Drive')
                        : activeSubTab === 'config'
                            ? t('it.tabConfig', 'Configurare Sistem')
                            : activeSubTab === 'notifications'
                                ? t('it.tabNotifications', 'Notificări')
                                : activeSubTab === 'email'
                                    ? t('it.tabEmail', 'Email')
                                    : t('common.tabStatistics', 'Statistici')} activeFilterCount={activeITFilterCount} searchQuery={currentITSearchQuery} subTabNav={<SubTabNav<ITSubTab> tabs={[
                { id: 'users', label: t('it.tabUsers', 'Gestiune Utilizatori'), disabled: !isTabAccessible('users') },
                { id: 'permissions', label: t('it.tabPermissions', 'Roluri'), disabled: !isTabAccessible('permissions') },
                ...(isUiConfigEnabled ? [{ id: 'config' as const, label: t('it.tabConfig', 'Configurare Sistem'), disabled: !isTabAccessible('config') }] : []),
                { id: 'audit', label: t('it.tabAudit', 'Jurnal Audit & Activitate'), disabled: !isTabAccessible('audit') },
                { id: 'sync', label: t('it.tabSync', 'Sincronizare Google Drive'), disabled: !isTabAccessible('sync') },
                { id: 'notifications', label: t('it.tabNotifications', 'Notificări'), disabled: !isTabAccessible('notifications') },
                { id: 'email', label: t('it.tabEmail', 'Email'), disabled: !isTabAccessible('email') },
                { id: 'statistics', label: t('common.tabStatistics', 'Statistici'), disabled: !isTabAccessible('statistics') },
            ]} activeTab={activeSubTab} onChange={setActiveSubTab} isDarkMode={isDarkMode}/>} controls={activeSubTab === 'users' ? (<>
              <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder={t('it.searchUsers', 'Caută după nume, email sau organizație...')} isDarkMode={isDarkMode}/>
<div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0">
                {/* Filter Popover for Status & Roles */}
                <FilterPopover activeCount={(statusFilter !== 'ALL' ? 1 : 0) + (roleFilter !== 'ALL' ? 1 : 0)} onReset={() => {
                setStatusFilter('ALL');
                setRoleFilter('ALL');
            }} isDarkMode={isDarkMode}>
                  <div className="space-y-3">
                    {/* Status Selector */}
                    <CustomSelect
                      label={t('table.state', 'Stare Cont')}
                      value={statusFilter}
                      onChange={(val) => setStatusFilter(val)}
                      options={[
                        { value: 'ALL', label: t('it.all', 'Toți') },
                        { value: 'PENDING_APPROVAL', label: t('status.PENDING', 'În Așteptare') },
                        { value: 'APPROVED', label: t('status.APPROVED', 'Aprobați') },
                        { value: 'REJECTED', label: t('status.REJECTED', 'Respinși') },
                        { value: 'PENDING_EMAIL', label: t('status.PENDING_EMAIL', 'Confirmare Email') },
                        { value: 'SUSPENDED', label: t('status.SUSPENDED', 'Suspendat') },
                      ]}
                      isDarkMode={isDarkMode}
                    />

                    {/* Role Dropdown */}
                    <CustomSelect
                      label={t('table.primaryRole', 'Rol Principal')}
                      value={roleFilter}
                      onChange={(val) => setRoleFilter(val)}
                      options={[
                        { value: 'ALL', label: t('it.allRoles', 'Toate Rolurile') },
                        ...availableRoleOptions.map(r => ({ value: r, label: r })),
                      ]}
                      isDarkMode={isDarkMode}
                    />
                  </div>
                </FilterPopover>
              </div>
            </>) : activeSubTab === 'audit' ? (<>
              <SearchInput value={auditSearchQuery} onChange={setAuditSearchQuery} placeholder={t('audit.searchPlaceholder', 'Caută după autor, resursă, acțiune...')} isDarkMode={isDarkMode}/>
<div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0">
                <FilterPopover activeCount={(auditDeptFilter !== 'ALL' ? 1 : 0) + (auditActionFilter !== 'ALL' ? 1 : 0)} onReset={() => {
                setAuditDeptFilter('ALL');
                setAuditActionFilter('ALL');
            }} isDarkMode={isDarkMode}>
                  <div className="space-y-3.5">
                    {/* Department Filter */}
                    <CustomSelect
                      label={t('audit.colDepartment', 'Departament')}
                      value={auditDeptFilter}
                      onChange={(val) => setAuditDeptFilter(val)}
                      options={[
                        { value: 'ALL', label: t('audit.allDepartments', 'Toate Departamentele') },
                        { value: 'LOGISTICS', label: t('nav.logistics', 'Logistică') },
                        { value: 'FINANCE', label: t('nav.finance', 'Finanțe') },
                        { value: 'HR', label: t('nav.hr', 'HR') },
                        { value: 'FUNDRAISING', label: t('nav.fundraising', 'Fundraising') },
                        { value: 'IT_AUTH', label: t('nav.it', 'IT & Securitate') },
                        { value: 'GENERAL', label: t('nav.general', 'General') },
                      ]}
                      isDarkMode={isDarkMode}
                    />

                    {/* Action Type Filter */}
                    <CustomSelect
                      label={t('audit.colAction', 'Tip Acțiune')}
                      value={auditActionFilter}
                      onChange={(val) => setAuditActionFilter(val)}
                      options={[
                        { value: 'ALL', label: t('audit.allActions', 'Toate Tip Acțiuni') },
                        { value: 'CREATE', label: t('audit.actionCreate', 'Creare') },
                        { value: 'UPDATE', label: t('audit.actionUpdate', 'Modificare') },
                        { value: 'DELETE', label: t('audit.actionDelete', 'Ștergere') },
                        { value: 'ADJUSTMENT', label: t('audit.actionAdjustment', 'Ajustare Stoc') },
                        { value: 'TRANSFER', label: t('audit.actionTransfer', 'Transfer') },
                        { value: 'SUBMIT', label: t('audit.actionSubmit', 'Rapoarte / EoD') },
                        { value: 'APPROVE', label: t('audit.actionApprove', 'Aprobare') },
                        { value: 'REJECT', label: t('audit.actionReject', 'Respingere') },
                      ]}
                      isDarkMode={isDarkMode}
                    />
                  </div>
                </FilterPopover>
              </div>
            </>) : activeSubTab === 'notifications' ? (<>
              <SearchInput
                value={notificationSearchQuery}
                onChange={setNotificationSearchQuery}
                placeholder={t('notifications.searchPlaceholder', 'Caută reguli de notificare...')}
                isDarkMode={isDarkMode}
              />
              <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0 flex-wrap sm:flex-nowrap">
                <button
                  type="button"
                  onClick={() => setIsNotificationStatusModalOpen(true)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer flex items-center ${css.buttonSubtle}`}
                >
                  <span>{t('notifications.serviceStatus', 'Status Canale')}</span>
                </button>

                <FilterPopover
                  activeCount={(notificationCategoryFilter !== 'ALL' ? 1 : 0) + (notificationChannelFilter !== 'ALL' ? 1 : 0)}
                  onReset={() => {
                    setNotificationCategoryFilter('ALL');
                    setNotificationChannelFilter('ALL');
                  }}
                  isDarkMode={isDarkMode}
                >
                  <div className="space-y-3">
                    <CustomSelect
                      label={t('notifications.channel', 'Canal')}
                      value={notificationChannelFilter}
                      onChange={(val) => setNotificationChannelFilter(val)}
                      options={[
                        { value: 'ALL', label: t('notifications.allChannels', 'Toate Canalele') },
                        { value: 'WHATSAPP', label: 'WhatsApp' },
                        { value: 'PWA', label: 'PWA Push' },
                      ]}
                      isDarkMode={isDarkMode}
                    />

                    <CustomSelect
                      label={t('pwa.selectCategory', 'Categorie')}
                      value={notificationCategoryFilter}
                      onChange={(val) => setNotificationCategoryFilter(val)}
                      options={[
                        { value: 'ALL', label: t('pwa.filterAll', 'Toate') },
                        { value: 'HR', label: 'HR' },
                        { value: 'LOGISTICS', label: t('nav.logistics', 'Logistică') },
                        { value: 'FINANCE', label: t('nav.finance', 'Finanțe') },
                        { value: 'GENERAL', label: t('nav.general', 'General') },
                      ]}
                      isDarkMode={isDarkMode}
                    />
                  </div>
                </FilterPopover>

                {canWriteIT && (
                  <button
                    type="button"
                    onClick={() => setIsNotificationCreateModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer flex items-center space-x-1.5 shrink-0"
                  >
                    <span>{t('notifications.addRule', 'Adaugă Regulă')}</span>
                  </button>
                )}
              </div>
            </>) : activeSubTab === 'email' ? (<>
              <SearchInput
                value={emailSearchQuery}
                onChange={setEmailSearchQuery}
                placeholder={t('email.searchTemplates', 'Caută șablon, subiect...')}
                isDarkMode={isDarkMode}
              />
              <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0 flex-wrap sm:flex-nowrap">
                <select
                  value={emailDepartmentFilter}
                  onChange={(e) => setEmailDepartmentFilter(e.target.value)}
                  className={`h-[38px] px-3 py-1.5 text-xs rounded-xl border outline-hidden cursor-pointer ${
                    isDarkMode
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-200 hover:border-zinc-700'
                      : 'bg-zinc-100 border-zinc-300 text-zinc-800 hover:border-zinc-400'
                  }`}
                >
                  <option value="ALL">{t('email.allDepartments', 'Toate departamentele')}</option>
                  <option value="fundraising">{t('department.fundraising', 'Fundraising')}</option>
                  <option value="pr">{t('department.pr', 'PR & Marketing')}</option>
                  <option value="legal">{t('department.legal', 'Legal')}</option>
                  <option value="general">{t('department.general', 'General')}</option>
                </select>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedTemplateForSend(null);
                    setIsSendModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer shrink-0"
                >
                  <span>{t('email.dispatch', 'Trimite Email')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedTemplateForEdit(null);
                    setIsTemplateModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer shrink-0"
                >
                  <span>{t('email.createTemplate', 'Creează Șablon')}</span>
                </button>
              </div>
            </>) : undefined
          }
        />

      {/* Main Content Area per Sub-Tab */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Subtab 1: USERS DIRECTORY VIEW */}
        {activeSubTab === 'users' && (
          <div className={`flex-1 min-h-0 rounded-2xl border overflow-hidden flex flex-col ${css.card}`}>
            {/* Mobile Card List View */}
            <div className="block md:hidden divide-y divide-zinc-800/40 overflow-y-auto flex-1">
                  {isLoading ? (<div className="py-12 text-center text-zinc-500">
                      <p className="font-semibold text-xs animate-pulse">{t('general.loading', 'Se încarcă datele...')}</p>
                    </div>) : filteredUsers.length === 0 ? (<div className="py-12 text-center text-zinc-500"><p className="font-semibold text-xs">{t('it.noUsersFound', 'Nu s-au găsit utilizatori conform filtrelor selectate.')}</p>
                    </div>) : (filteredUsers.map((user) => (<div key={user.id} className="p-4 space-y-2.5 text-xs">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm truncate">{user.fullName}</p>
                            <p className="text-[11px] text-zinc-400 font-mono truncate">{user.email}</p>
                          </div>
                          <div className="shrink-0">
                            {getStatusBadge(user.status)}
                          </div>
                        </div>
<div className="pt-1 border-t border-zinc-800/40 space-y-1 text-[11px] text-zinc-400">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">{t('table.primaryRole', 'Rol Principal')}: </span>
                            <span className={`inline-flex items-center space-x-1 font-mono font-bold text-[10px] px-1.5 py-0.5 rounded border ${isDarkMode ? 'bg-zinc-800 text-blue-400 border-zinc-700' : 'bg-blue-50 text-blue-700 border-blue-200'}`}><span>{user.primaryRole}</span>
                            </span>
                          </div>
                          <div className="flex justify-between pt-0.5">
                            <span>Înregistrat: <span className="font-mono text-zinc-300">{new Date(user.createdAt).toLocaleDateString('ro-RO')}</span></span>
                          </div>
                          {user.organizationType && (<div className="text-zinc-300">
                              <span className="text-zinc-400 font-medium">Org: </span>
                              {user.organizationType} {user.organizationDetails ? `(${user.organizationDetails})` : ''}
                            </div>)}
                        </div>

                        {/* Actions Strip */}
                        <div className="flex items-center justify-end space-x-1.5 pt-2 border-t border-zinc-800/40">
                          {canWriteIT && user.status === 'PENDING_APPROVAL' && (
                            <>
                              <button
                                onClick={() => handleApprove(user.id, user.fullName)}
                                title={t('it.approveUserTooltip', 'Aprobă Accesul Utilizatorului')}
                                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{t('it.approve', 'Aprobă')}</span>
                              </button>

                              <button
                                onClick={() => openRejectModal(user)}
                                title={t('it.rejectUserTooltip', 'Respinge Solicitarea')}
                                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>{t('it.reject', 'Respinge')}</span>
                              </button>
                            </>
                          )}

                          {canWriteIT && (
                            <button
                              onClick={() => {
                                setSelectedUserForEdit(user);
                                setIsRoleModalOpen(true);
                              }}
                              title={t('it.editRoleTooltip', 'Editare Roluri & Permisiuni')}
                              className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition cursor-pointer"
                            >
                              <ShieldCheck className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setSelectedUserForDetail(user);
                              setIsDetailModalOpen(true);
                            }}
                            title={t('it.viewUserTooltip', 'Vezi Fișa Utilizatorului')}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {canWriteIT && user.primaryRole !== 'ADMIN' && (
                            <button
                              onClick={() => setUserToDelete(user)}
                              title={t('it.deleteUserTooltip', 'Șterge Contul')}
                              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>)))}
                </div>

            {/* Desktop Table View */}
            <div className="hidden md:flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-auto no-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className={`border-b uppercase font-bold text-[11px] tracking-wider ${css.tableHeader}`}>
                        <th className="py-3 px-4 whitespace-nowrap">{t('table.user', 'Utilizator')}</th>
                        <th className="py-3 px-4 whitespace-nowrap">{t('table.organizationTeam', 'Organizație / Echipa')}</th>
                        <th className="py-3 px-4 whitespace-nowrap">{t('table.primaryRole', 'Rol Principal')}</th>
                        <th className="py-3 px-4 whitespace-nowrap">{t('table.requestDate', 'Data Solicitării')}</th>
                        <th className="py-3 px-4 whitespace-nowrap">{t('table.state', 'Stare')}</th>
                        <th className="py-3 px-4 text-right whitespace-nowrap">{t('table.adminActions', 'Acțiuni Administrare')}</th>
                      </tr>
                    </thead>
<tbody className="divide-y divide-zinc-800/40">
                      {isLoading ? (<tr>
                          <td colSpan={6} className="py-12 text-center text-zinc-500">
                            <p className="font-semibold text-xs animate-pulse">{t('general.loading', 'Se încarcă datele...')}</p>
                          </td>
                        </tr>) : filteredUsers.length === 0 ? (<tr>
                          <td colSpan={6} className="py-12 text-center text-zinc-500"><p className="font-semibold text-xs">{t('it.noUsersFound', 'Nu s-au găsit utilizatori conform filtrelor selectate.')}</p>
                          </td>
                        </tr>) : (filteredUsers.map((user) => (<tr key={user.id} className={`transition-all ${css.tableRow}`}>
                            
                            {/* User Profile */}
                            <td className="py-3.5 px-4">
                              <div className="min-w-0">
                                <p className="font-bold text-xs truncate">{user.fullName}</p>
                                <p className="text-[11px] text-zinc-400 truncate">{user.email}</p>
                              </div>
                            </td>

                            {/* Org / Details */}
                            <td className="py-3.5 px-4">
                              <p className="font-semibold text-xs text-zinc-300">{user.organizationType || t('it.unspecified', 'Nespecificat')}</p>
                              {user.organizationDetails && (<p className="text-[11px] text-zinc-500 truncate">{user.organizationDetails}</p>)}
                            </td>

                            {/* Role */}
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center space-x-1 font-mono font-bold text-[10.5px] px-2 py-0.5 rounded-md border ${isDarkMode
                    ? 'bg-zinc-800 text-blue-400 border-zinc-700'
                    : 'bg-blue-50 text-blue-700 border-blue-200'}`}><span>{user.primaryRole}</span>
                              </span>
                            </td>

                            {/* Created At */}
                            <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-400">
                              {new Date(user.createdAt).toLocaleDateString('ro-RO')}
                            </td>

                            {/* Status Badge */}
                            <td className="py-3.5 px-4">
                              {getStatusBadge(user.status)}
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                
                                {/* If Pending Approval & canWrite: Show Big One-Click Approve / Reject */}
                                {canWriteIT && user.status === 'PENDING_APPROVAL' && (
                                  <>
                                    <button
                                      onClick={() => handleApprove(user.id, user.fullName)}
                                      title={t('it.approveUserTooltip', 'Aprobă Accesul Utilizatorului')}
                                      className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>{t('it.approve', 'Aprobă')}</span>
                                    </button>

                                    <button
                                      onClick={() => openRejectModal(user)}
                                      title={t('it.rejectUserTooltip', 'Respinge Solicitarea')}
                                      className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      <span>{t('it.reject', 'Respinge')}</span>
                                    </button>
                                  </>
                                )}

                                {/* Edit Roles Button (Only for IT write / admin) */}
                                {canWriteIT && (
                                  <button
                                    onClick={() => {
                                      setSelectedUserForEdit(user);
                                      setIsRoleModalOpen(true);
                                    }}
                                    title={t('it.editRoleTooltip', 'Editare Roluri & Permisiuni')}
                                    className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition cursor-pointer"
                                  >
                                    <ShieldCheck className="w-4 h-4" />
                                  </button>
                                )}

                                {/* View Detail Button (Visible for all logged in members) */}
                                <button
                                  onClick={() => {
                                    setSelectedUserForDetail(user);
                                    setIsDetailModalOpen(true);
                                  }}
                                  title={t('it.viewUserTooltip', 'Vezi Fișa Utilizatorului')}
                                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>

                                {/* Delete if not Admin & canWrite */}
                                {canWriteIT && user.primaryRole !== 'ADMIN' && (
                                  <button
                                    onClick={() => setUserToDelete(user)}
                                    title={t('it.deleteUserTooltip', 'Șterge Contul')}
                                    className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}

                              </div>
                            </td>
</tr>)))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
        )}

        {/* Subtab: ROLES & PERMISSIONS CUSTOMIZER */}
        {activeSubTab === 'permissions' && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <RolePermissionsView
              isDarkMode={isDarkMode}
              canWrite={canWriteIT}
              onToast={showToast}
            />
          </div>
        )}

        {/* Subtab: DYNAMIC CONFIGURATION VIEW */}
        {activeSubTab === 'config' && isUiConfigEnabled && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <AdminConfigView
              isDarkMode={isDarkMode}
              onToast={showToast}
            />
          </div>
        )}

        {/* Subtab 2: SYSTEM AUDIT LOG VIEW */}
        {activeSubTab === 'audit' && (
          <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
            <AuditLogsView isDarkMode={isDarkMode} />
          </div>
        )}

        {/* Subtab 3: GOOGLE SHEETS & DRIVE SYNC VIEW */}
        {activeSubTab === 'sync' && (
          <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
            <GoogleSyncDashboardView isDarkMode={isDarkMode} canWrite={canWriteIT} onShowToast={showToast} />
          </div>
        )}

        {/* Subtab 4: UNIFIED NOTIFICATIONS & AUTOMATIONS VIEW */}
        {activeSubTab === 'notifications' && (
          <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
            <NotificationsIntegrationView
              isDarkMode={isDarkMode}
              canWrite={canWriteIT}
              categoryFilter={notificationCategoryFilter}
              channelFilter={notificationChannelFilter}
              searchQuery={notificationSearchQuery}
              isStatusModalOpen={isNotificationStatusModalOpen}
              onCloseStatusModal={() => setIsNotificationStatusModalOpen(false)}
              isCreateModalOpen={isNotificationCreateModalOpen}
              onCloseCreateModal={() => setIsNotificationCreateModalOpen(false)}
              onShowToast={showToast}
            />
          </div>
        )}

        {/* Subtab: EMAIL VIEW */}
        {activeSubTab === 'email' && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <AdminEmailView
              templates={emailTemplates}
              isLoading={isEmailLoading}
              searchQuery={emailSearchQuery}
              departmentFilter={emailDepartmentFilter}
              onEditTemplate={(tmpl) => {
                setSelectedTemplateForEdit(tmpl);
                setIsTemplateModalOpen(true);
              }}
              onCopyTemplate={handleCopyTemplate}
              onDeleteTemplate={(tmpl) => setDeletingTemplate(tmpl)}
              onDispatch={(tmpl) => {
                setSelectedTemplateForSend(tmpl);
                setIsSendModalOpen(true);
              }}
              onCreateTemplate={() => {
                setSelectedTemplateForEdit(null);
                setIsTemplateModalOpen(true);
              }}
              isDarkMode={isDarkMode}
            />
          </div>
        )}

        {/* Subtab 6: STATISTICS VIEW */}
        {activeSubTab === 'statistics' && (
          <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
            <AdminStatisticsView
              users={users}
              isLoading={isLoading}
              isDarkMode={isDarkMode}
            />
          </div>
        )}
      </div>

      {/* Role Edit Modal */}

      <UserRoleEditModal isOpen={isRoleModalOpen} onClose={() => setIsRoleModalOpen(false)} user={selectedUserForEdit} isDarkMode={isDarkMode} onSave={handleSaveRoles}/>

      {/* User Detail Modal */}
      <UserDetailModal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} user={selectedUserForDetail} isDarkMode={isDarkMode}/>

      {/* Email Template Editor Modal */}
      <EmailTemplateEditorModal
        isOpen={isTemplateModalOpen}
        onClose={() => {
          setIsTemplateModalOpen(false);
          setSelectedTemplateForEdit(null);
        }}
        initialTemplate={selectedTemplateForEdit}
        onSave={handleSaveTemplate}
        defaultDepartment="general"
        isDarkMode={isDarkMode}
      />

      {/* Email Composer Modal (Send Email) */}
      <EmailComposerModal
        isOpen={isSendModalOpen}
        onClose={() => {
          setIsSendModalOpen(false);
          setSelectedTemplateForSend(null);
        }}
        templates={emailTemplates}
        initialTemplateId={selectedTemplateForSend?.id}
        onSuccess={() => {
          showToast(t('email.sendSuccess', 'Email trimis cu succes'));
          loadEmailTemplates();
        }}
        isDarkMode={isDarkMode}
      />

      {/* Delete Email Template Confirmation Modal */}
      {deletingTemplate && (
        <ConfirmationModal
          isOpen={Boolean(deletingTemplate)}
          title={t('email.deleteTemplate', 'Șterge Șablon')}
          message={t('email.deleteConfirm', 'Sigur doriți să ștergeți acest șablon de email?')}
          confirmText={t('common.delete', 'Șterge')}
          cancelText={t('common.cancel', 'Anulează')}
          variant="danger"
          onConfirm={handleDeleteTemplate}
          onClose={() => setDeletingTemplate(null)}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Delete User Strong Confirmation Modal */}
      {userToDelete && (
        <ConfirmationModal
          isOpen={Boolean(userToDelete)}
          title={t('it.deleteUserTitle', 'Ștergere Cont Utilizator')}
          message={
            <div className="space-y-2">
              <p>
                {t('it.deleteUserConfirmMessage', 'Sunteți sigur că doriți să ștergeți utilizatorul')} <strong className={isDarkMode ? 'text-white' : 'text-zinc-900'}>{userToDelete.fullName}</strong> ({userToDelete.email})?
              </p>
              <p className="text-zinc-400 text-xs">
                {t('it.deleteUserWarning', 'Contul va fi eliminat complet din sistem, permițându-i utilizatorului să se înregistreze din nou în viitor.')}
              </p>
            </div>
          }
          requireConfirmationText="confirm"
          confirmationPrompt={t('it.deleteConfirmationInstruction', 'Pentru a confirma, introduceți cuvântul "confirm" în căsuța de mai jos:')}
          confirmationPlaceholder={t('it.deleteConfirmationPlaceholder', 'Scrieți "confirm"')}
          confirmText={t('common.delete', 'Șterge')}
          cancelText={t('common.cancel', 'Anulează')}
          variant="danger"
          isLoading={isDeletingUser}
          onConfirm={handleDeleteUser}
          onClose={() => {
            if (!isDeletingUser) {
              setUserToDelete(null);
            }
          }}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Rejection Confirmation Modal */}
      {userToReject && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4" onClick={() => {
                setUserToReject(null);
                setRejectReason('');
            }}>
          <div className={`w-full max-w-md max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl p-4 sm:p-6 space-y-4 ${isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center space-x-3 text-rose-400">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-base">{t('it.confirmRejectTitle', 'Confirmare Respingere Solicitare')}</h3>
            </div>
<p className="text-xs text-zinc-400 leading-relaxed">
              {t('it.confirmRejectMessage', 'Sunteți sigur că doriți să respingeți cererea de cont pentru')} <strong className={isDarkMode ? "text-white" : "text-zinc-900"}>{userToReject.fullName}</strong> ({userToReject.email})?
            </p>
<div>
              <label className="text-[11px] font-bold text-zinc-400 block mb-1">{t('it.rejectionReasonOptional', 'Motiv Respingere (Opțional)')}</label>
              <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder={t('it.rejectionReasonPlaceholder', 'Introdu un motiv pentru respingere...')} rows={3} className={`w-full p-2.5 rounded-xl border text-xs ${css.input}`}/>
            </div>
<div className="flex justify-end space-x-2 pt-2">
              <button onClick={() => setUserToReject(null)} className="px-4 py-2 rounded-xl text-xs font-semibold border border-zinc-800 text-zinc-300 hover:bg-zinc-900 cursor-pointer">
                {t('common.cancel', 'Renunță')}
              </button>
<button onClick={handleConfirmReject} className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md cursor-pointer">
                {t('it.confirmRejectBtn', 'Respinge Solicitarea')}
              </button>
            </div>
          </div>
        </div>)}

    </DashboardContainer>);
};

export const ITSettingsDashboard = AdminSettingsDashboard;

