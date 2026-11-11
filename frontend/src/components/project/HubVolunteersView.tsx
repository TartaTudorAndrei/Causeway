import React, { useState, useEffect, useMemo } from 'react';
import { adminSettingsService } from '../../services/adminSettingsService';
import { useLanguage } from '../../context/LanguageContext';
import { usePermission } from '../../hooks/usePermission';
import { SearchInput, EmptyState, ConfirmationModal } from '../common';
import type { PlatformUser, UserPlatformStatus } from '../../types/adminSettings';
import { buildMembershipsForRoles } from '../../utils/auth';
import { Users, Check, X } from 'lucide-react';

interface HubVolunteersViewProps {
  isDarkMode: boolean;
  onToast: (message: string, type: 'success' | 'error') => void;
  searchQuery?: string;
}

export const HubVolunteersView: React.FC<HubVolunteersViewProps> = ({
  isDarkMode,
  onToast,
  searchQuery: externalSearchQuery,
}) => {
  const { t } = useLanguage();
  const { isSuperAdmin, hasPermission } = usePermission();
  const canManageRoles = isSuperAdmin || hasPermission('it:users:roles:manage') || hasPermission('it:users:write') || hasPermission('admin:write');
  const canManageUsers = isSuperAdmin || hasPermission('it:users:write') || hasPermission('it:users:roles:manage') || hasPermission('admin:write');

  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [userToReject, setUserToReject] = useState<PlatformUser | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);

  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await adminSettingsService.getUsers();
      setUsers(data);
    } catch (err: any) {
      onToast(err.message || t('hub.volunteersLoadError', 'Eroare la încărcarea voluntarilor.'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggleInheritConfig = async (user: PlatformUser) => {
    if (!canManageRoles) return;
    setUpdatingUserId(user.id);
    try {
      const currentRoles = user.roles && user.roles.length > 0 ? [...user.roles] : [user.primaryRole || 'VOLUNTEER'];
      if (currentRoles.includes('ADMIN') || currentRoles.includes('IT_ADMIN')) {
        return;
      }

      const currentlyHas = currentRoles.includes('CONFIG_INHERITOR');
      let newRoles: string[];
      if (currentlyHas) {
        newRoles = currentRoles.filter((r) => r !== 'CONFIG_INHERITOR');
        if (newRoles.length === 0) newRoles = ['VOLUNTEER'];
      } else {
        newRoles = [...currentRoles.filter((r) => r !== 'VOLUNTEER'), 'CONFIG_INHERITOR'];
        if (newRoles.length === 0) newRoles = ['CONFIG_INHERITOR'];
      }

      const memberships = buildMembershipsForRoles(newRoles);
      const primaryRole = (newRoles[0] || 'VOLUNTEER') as any;
      await adminSettingsService.updateUserRolesAndMemberships(user.id, primaryRole, newRoles as any[], memberships);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, roles: newRoles as any[], primaryRole, memberships } : u))
      );
      onToast(t('hub.permUpdated', 'Permisiuni actualizate.'), 'success');
    } catch (err: any) {
      onToast(err.message || t('hub.permUpdateError', 'Eroare la actualizarea permisiunilor.'), 'error');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleApprove = async (user: PlatformUser) => {
    if (!canManageUsers) return;
    setActionUserId(user.id);
    try {
      await adminSettingsService.approveUser(user.id);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, status: 'APPROVED' } : u)));
      onToast(`${t('hub.userApprovedSuccess', 'Utilizatorul a fost aprobat în aplicație.')} (${user.fullName})`, 'success');
    } catch (err: any) {
      onToast(err.message || 'Eroare la aprobarea utilizatorului', 'error');
    } finally {
      setActionUserId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!userToReject || !canManageUsers) return;
    setIsRejecting(true);
    try {
      await adminSettingsService.rejectUser(userToReject.id);
      setUsers((prev) => prev.map((u) => (u.id === userToReject.id ? { ...u, status: 'REJECTED' } : u)));
      onToast(`${t('hub.userRejectedSuccess', 'Solicitarea utilizatorului a fost respinsă.')} (${userToReject.fullName})`, 'success');
      setUserToReject(null);
    } catch (err: any) {
      onToast(err.message || 'Eroare la respingerea utilizatorului', 'error');
    } finally {
      setIsRejecting(false);
    }
  };

  const getStatusBadge = (status: UserPlatformStatus) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {t('status.APPROVED', 'Aprobat')}
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
            {t('status.PENDING_APPROVAL', 'În Așteptare Aprobare')}
          </span>
        );
      case 'PENDING_EMAIL':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {t('status.PENDING_EMAIL', 'Confirmare Email')}
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            {t('status.REJECTED', 'Respins')}
          </span>
        );
      case 'SUSPENDED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
            {t('status.SUSPENDED', 'Suspendat')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-zinc-800/60 text-zinc-400 border border-zinc-700/50">
            {status}
          </span>
        );
    }
  };

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone && u.phone.toLowerCase().includes(q))
    );
  }, [users, searchQuery]);

  const bgCard = isDarkMode ? 'bg-zinc-950 border-zinc-850' : 'bg-white border-zinc-200';
  const tableHeaderBg = isDarkMode ? 'bg-zinc-900/60 border-zinc-850 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-600';
  const rowHover = isDarkMode ? 'hover:bg-zinc-900/40 border-zinc-850' : 'hover:bg-zinc-50 border-zinc-200';

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-3">
      {/* Search Bar Strip (only when external query not supplied) */}
      {externalSearchQuery === undefined && (
        <div className="shrink-0 flex items-center justify-between gap-3">
          <div className="w-full sm:w-72">
            <SearchInput
              value={internalSearchQuery}
              onChange={setInternalSearchQuery}
              placeholder={t('hub.searchVolunteers', 'Caută voluntari...')}
              isDarkMode={isDarkMode}
            />
          </div>
        </div>
      )}

      {/* Main Table / Mobile Card Hybrid */}
      <div className={`flex-1 min-h-0 rounded-2xl border flex flex-col overflow-hidden ${bgCard}`}>
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t('hub.noVolunteersFound', 'Niciun voluntar găsit')}
            description={t('hub.noVolunteersDesc', 'Nu există înregistrări care să corespundă căutării.')}
            isDarkMode={isDarkMode}
          />
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block flex-1 min-h-0 overflow-auto no-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead className={`sticky top-0 z-10 border-b text-[11px] font-bold uppercase tracking-wider ${tableHeaderBg}`}>
                  <tr>
                    <th className="py-3 px-4">{t('common.volunteer', 'Voluntar')}</th>
                    <th className="py-3 px-4">{t('common.email', 'Email')}</th>
                    <th className="py-3 px-4">{t('common.phone', 'Telefon')}</th>
                    <th className="py-3 px-4">{t('common.roles', 'Roluri')}</th>
                    <th className="py-3 px-4 text-center">{t('hub.inheritConfig', 'Moștenire Config')}</th>
                    <th className="py-3 px-4 text-right">{t('hub.statusAndActions', 'Status & Acțiuni')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {filteredUsers.map((u) => {
                    const isSystemAdmin =
                      u.roles?.includes('ADMIN') ||
                      u.roles?.includes('IT_ADMIN') ||
                      u.primaryRole === 'ADMIN' ||
                      u.primaryRole === 'IT_ADMIN';
                    const hasInheritPerm = isSystemAdmin || u.roles?.includes('CONFIG_INHERITOR');

                    return (
                      <tr key={u.id} className={`transition-colors ${rowHover}`}>
                        <td className="py-3.5 px-4 font-medium text-zinc-100">{u.fullName}</td>
                        <td className="py-3.5 px-4 text-zinc-400">{u.email}</td>
                        <td className="py-3.5 px-4 text-zinc-400">{u.phone || '-'}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {(u.roles && u.roles.length > 0 ? u.roles : [u.primaryRole || 'VOLUNTEER']).map((r, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-800/60 text-zinc-300 border border-zinc-700/50"
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {isSystemAdmin ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              {t('hub.adminInherited', 'Admin (automat)')}
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={updatingUserId === u.id || !canManageRoles}
                              onClick={() => handleToggleInheritConfig(u)}
                              title={hasInheritPerm ? t('hub.revokeInherit', 'Revocă Moștenire') : t('hub.allowInherit', 'Permite Moștenire')}
                              className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer disabled:opacity-50 ${
                                hasInheritPerm
                                  ? 'bg-emerald-500/10 text-emerald-400 hover:bg-rose-500/15 hover:text-rose-400 border-emerald-500/20 hover:border-rose-500/30'
                                  : 'bg-zinc-800/60 text-zinc-400 hover:bg-emerald-500/15 hover:text-emerald-400 border-zinc-700/50 hover:border-emerald-500/30'
                              }`}
                            >
                              {hasInheritPerm ? (
                                <>
                                  <Check className="w-3.5 h-3.5 mr-1" />
                                  <span>{t('hub.inheritConfigAllowed', 'Permis')}</span>
                                </>
                              ) : (
                                <span>{t('hub.inheritConfigNotAllowed', 'Nepermis')}</span>
                              )}
                            </button>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {getStatusBadge(u.status)}

                            {canManageUsers && u.status === 'PENDING_APPROVAL' && (
                              <div className="inline-flex items-center space-x-1.5 ml-2">
                                <button
                                  type="button"
                                  disabled={actionUserId === u.id}
                                  onClick={() => handleApprove(u)}
                                  title={t('it.approveUserTooltip', 'Aprobă Accesul Utilizatorului')}
                                  className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>{t('it.approve', 'Aprobă')}</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={actionUserId === u.id}
                                  onClick={() => setUserToReject(u)}
                                  title={t('it.rejectUserTooltip', 'Respinge Solicitarea')}
                                  className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>{t('it.reject', 'Respinge')}</span>
                                </button>
                              </div>
                            )}

                            {canManageUsers && u.status === 'REJECTED' && (
                              <button
                                type="button"
                                disabled={actionUserId === u.id}
                                onClick={() => handleApprove(u)}
                                title={t('it.approveUserTooltip', 'Aprobă Accesul Utilizatorului')}
                                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50 ml-2"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{t('it.approve', 'Aprobă')}</span>
                              </button>
                            )}

                            {canManageUsers && u.status === 'APPROVED' && !isSystemAdmin && (
                              <button
                                type="button"
                                disabled={actionUserId === u.id}
                                onClick={() => setUserToReject(u)}
                                title={t('it.rejectUserTooltip', 'Respinge Solicitarea')}
                                className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer disabled:opacity-50 ml-1"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="block md:hidden divide-y divide-zinc-850 flex-1 min-h-0 overflow-y-auto no-scrollbar">
              {filteredUsers.map((u) => {
                const isSystemAdmin =
                  u.roles?.includes('ADMIN') ||
                  u.roles?.includes('IT_ADMIN') ||
                  u.primaryRole === 'ADMIN' ||
                  u.primaryRole === 'IT_ADMIN';
                const hasInheritPerm = isSystemAdmin || u.roles?.includes('CONFIG_INHERITOR');

                return (
                  <div key={u.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-zinc-100">{u.fullName}</span>
                      {getStatusBadge(u.status)}
                    </div>

                    <div className="text-xs text-zinc-400 space-y-0.5">
                      <p>{u.email}</p>
                      {u.phone && <p>{u.phone}</p>}
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {(u.roles && u.roles.length > 0 ? u.roles : [u.primaryRole || 'VOLUNTEER']).map((r, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-800/60 text-zinc-300 border border-zinc-700/50"
                        >
                          {r}
                        </span>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs">
                      <span className="text-zinc-400">{t('hub.inheritConfig', 'Moștenire Config')}</span>
                      {isSystemAdmin ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {t('hub.adminInherited', 'Admin (automat)')}
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={updatingUserId === u.id || !canManageRoles}
                          onClick={() => handleToggleInheritConfig(u)}
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer disabled:opacity-50 ${
                            hasInheritPerm
                              ? 'bg-emerald-500/10 text-emerald-400 hover:bg-rose-500/15 hover:text-rose-400 border-emerald-500/20 hover:border-rose-500/30'
                              : 'bg-zinc-800/60 text-zinc-400 hover:bg-emerald-500/15 hover:text-emerald-400 border-zinc-700/50 hover:border-emerald-500/30'
                          }`}
                        >
                          {hasInheritPerm ? (
                            <>
                              <Check className="w-3.5 h-3.5 mr-1" />
                              <span>{t('hub.inheritConfigAllowed', 'Permis')}</span>
                            </>
                          ) : (
                            <span>{t('hub.inheritConfigNotAllowed', 'Nepermis')}</span>
                          )}
                        </button>
                      )}
                    </div>

                    {canManageUsers && (u.status === 'PENDING_APPROVAL' || u.status === 'REJECTED') && (
                      <div className="pt-2 flex gap-2">
                        <button
                          type="button"
                          disabled={actionUserId === u.id}
                          onClick={() => handleApprove(u)}
                          className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <Check className="w-4 h-4" />
                          <span>{t('it.approve', 'Aprobă')}</span>
                        </button>
                        {u.status === 'PENDING_APPROVAL' && (
                          <button
                            type="button"
                            disabled={actionUserId === u.id}
                            onClick={() => setUserToReject(u)}
                            className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                            <span>{t('it.reject', 'Respinge')}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Reject Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!userToReject}
        onClose={() => setUserToReject(null)}
        onConfirm={handleConfirmReject}
        title={t('hub.rejectVolunteerTitle', 'Respinge Voluntar')}
        message={
          userToReject ? (
            <span>
              {t('hub.rejectVolunteerConfirm', 'Sigur doriți să respingeți accesul în aplicație pentru acest utilizator?')} (<strong>{userToReject.fullName}</strong>)
            </span>
          ) : ''
        }
        confirmText={t('it.reject', 'Respinge')}
        cancelText={t('common.cancel', 'Anulează')}
        variant="danger"
        isLoading={isRejecting}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};
