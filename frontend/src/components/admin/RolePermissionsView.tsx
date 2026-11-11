import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { PermissionItem, RoleWithPermissions } from '../../types/adminSettings';
import { adminSettingsService } from '../../services/adminSettingsService';
import { useLanguage } from '../../context/LanguageContext';
import { usePermission } from '../../hooks/usePermission';
import { Check, Lock, Search, Trash2 } from 'lucide-react';
import { AddCustomRoleModal } from './AddCustomRoleModal';
import { ConfirmationModal } from '../common/ConfirmationModal';

interface RolePermissionsViewProps {
  isDarkMode: boolean;
  canWrite: boolean;
  onToast: (message: string, type?: 'success' | 'error') => void;
}

export const RolePermissionsView: React.FC<RolePermissionsViewProps> = ({
  isDarkMode,
  canWrite,
  onToast,
}) => {
  const { t } = useLanguage();
  const { user: currentUser, hasPermission, isSuperAdmin: isCurrentUserSuperAdmin } = usePermission();

  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [assignedPermIds, setAssignedPermIds] = useState<Set<string>>(new Set());
  const [initialPermIds, setInitialPermIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Add custom role modal
  const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);

  // Delete role modal
  const [roleToDelete, setRoleToDelete] = useState<RoleWithPermissions | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canCreateRole = isCurrentUserSuperAdmin || hasPermission('roles:create');
  const canDeleteRole = isCurrentUserSuperAdmin || hasPermission('roles:delete');

  const loadData = useCallback(async (preserveRoleId?: string) => {
    setIsLoading(true);
    try {
      const [fetchedRoles, fetchedPerms] = await Promise.all([
        adminSettingsService.getRolesWithPermissions(),
        adminSettingsService.getAllPermissions(),
      ]);
      setRoles(fetchedRoles);
      setPermissions(fetchedPerms);

      if (fetchedRoles.length > 0) {
        const targetRole = preserveRoleId
          ? fetchedRoles.find(r => r.id === preserveRoleId) || fetchedRoles[0]
          : fetchedRoles.find(r => !r.isSystem && r.name !== 'ADMIN' && r.name !== 'VOLUNTEER') || fetchedRoles[0];
        
        setSelectedRoleId(targetRole.id);
        const permSet = new Set(targetRole.permissionIds);
        setAssignedPermIds(new Set(permSet));
        setInitialPermIds(new Set(permSet));
      }
    } catch (err: any) {
      console.error('Failed to load roles and permissions:', err);
      onToast(err?.message || t('it.loadError', 'Eroare la încărcarea permisiunilor'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [onToast, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedRole = useMemo(() => {
    return roles.find(r => r.id === selectedRoleId) || null;
  }, [roles, selectedRoleId]);

  const isSelectedRoleSystem = selectedRole?.isSystem || selectedRole?.name === 'ADMIN' || selectedRole?.name === 'VOLUNTEER';

  // Role tree hierarchy check: actor can only edit roles that are descendants of the actor's held roles
  const isSelectedRoleDescendant = useMemo(() => {
    if (!selectedRole) return false;
    if (isCurrentUserSuperAdmin) return true;
    
    const userRoleNames: string[] = [
      ...(currentUser?.roles || []),
      ...(currentUser?.role ? [currentUser.role] : []),
      ...(currentUser?.memberships?.map(m => m.roleName) || []),
    ].map(r => r.toUpperCase());

    const userRoles = roles.filter(r => userRoleNames.includes(r.name.toUpperCase()));
    const userRoleIds = new Set(userRoles.map(r => r.id));

    // Traverse parentRoleId upwards from selectedRole
    let currentParentId = selectedRole.parentRoleId;
    const visited = new Set<string>();

    while (currentParentId && !visited.has(currentParentId)) {
      visited.add(currentParentId);
      if (userRoleIds.has(currentParentId)) {
        return true;
      }
      const parent = roles.find(r => r.id === currentParentId);
      currentParentId = parent?.parentRoleId;
    }

    return false;
  }, [selectedRole, isCurrentUserSuperAdmin, currentUser, roles]);

  const isSelectedRoleLocked = useMemo(() => {
    if (!selectedRole) return true;
    if (selectedRole.isSystem || selectedRole.name === 'SUPER_ADMIN' || selectedRole.name === 'ADMIN' || selectedRole.name === 'VOLUNTEER') {
      return true;
    }
    const userRoleNames: string[] = [
      ...(currentUser?.roles || []),
      ...(currentUser?.role ? [currentUser.role] : []),
      ...(currentUser?.memberships?.map(m => m.roleName) || []),
    ].map(r => r.toUpperCase());

    // Cannot modify own role
    if (userRoleNames.includes(selectedRole.name.toUpperCase())) {
      return true;
    }

    // Must be a descendant of user's roles
    if (!isSelectedRoleDescendant) {
      return true;
    }

    return false;
  }, [selectedRole, currentUser, isSelectedRoleDescendant]);

  const systemRoles = useMemo(() => {
    return roles.filter(r => r.name === 'ADMIN' || r.name === 'VOLUNTEER');
  }, [roles]);

  const customRoles = useMemo(() => {
    return roles.filter(r => r.name !== 'ADMIN' && r.name !== 'VOLUNTEER');
  }, [roles]);

  const handleSelectRole = (role: RoleWithPermissions) => {
    setSelectedRoleId(role.id);
    const permSet = new Set(role.permissionIds);
    setAssignedPermIds(new Set(permSet));
    setInitialPermIds(new Set(permSet));
  };

  const isDirty = useMemo(() => {
    if (assignedPermIds.size !== initialPermIds.size) return true;
    for (const id of assignedPermIds) {
      if (!initialPermIds.has(id)) return true;
    }
    return false;
  }, [assignedPermIds, initialPermIds]);

  const canDelegatePermission = (permCode: string) => {
    if (isCurrentUserSuperAdmin) return true;
    return hasPermission(permCode);
  };

  const togglePermission = (permId: string, permCode: string) => {
    if (!canWrite || isSelectedRoleLocked) return;
    if (!canDelegatePermission(permCode)) {
      onToast(t('it.cannotDelegatePermission', 'Nu poți delega o permisiune pe care nu o deții.'), 'error');
      return;
    }
    setAssignedPermIds(prev => {
      const next = new Set(prev);
      if (next.has(permId)) {
        next.delete(permId);
      } else {
        next.add(permId);
      }
      return next;
    });
  };

  const handleSelectAllCategory = (catPerms: PermissionItem[]) => {
    if (!canWrite || isSelectedRoleLocked) return;
    setAssignedPermIds(prev => {
      const next = new Set(prev);
      for (const p of catPerms) {
        if (canDelegatePermission(p.code)) {
          next.add(p.id);
        }
      }
      return next;
    });
  };

  const handleDeselectAllCategory = (catPerms: PermissionItem[]) => {
    if (!canWrite || isSelectedRoleLocked) return;
    setAssignedPermIds(prev => {
      const next = new Set(prev);
      for (const p of catPerms) {
        next.delete(p.id);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedRoleId || !canWrite || isSelectedRoleSystem) return;
    setIsSaving(true);
    try {
      const permIdsArray = Array.from(assignedPermIds);
      await adminSettingsService.updateRolePermissions(selectedRoleId, permIdsArray);
      
      setRoles(prev =>
        prev.map(r =>
          r.id === selectedRoleId
            ? { ...r, permissionIds: permIdsArray }
            : r
        )
      );
      setInitialPermIds(new Set(assignedPermIds));
      onToast(t('it.permissionsSaved', 'Permisiunile au fost actualizate cu succes!'), 'success');
    } catch (err: any) {
      console.error('Failed to save role permissions:', err);
      onToast(err?.message || t('it.permissionsSaveError', 'Eroare la salvarea permisiunilor.'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    setIsDeleting(true);
    try {
      await adminSettingsService.deleteRole(roleToDelete.id);
      onToast(t('it.roleDeletedSuccess', 'Rolul a fost șters cu succes.'), 'success');
      setRoleToDelete(null);
      await loadData();
    } catch (err: any) {
      console.error('Failed to delete role:', err);
      onToast(err?.message || t('it.roleDeleteError', 'Eroare la ștergerea rolului.'), 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Categories list
  const categories = useMemo(() => {
    const cats = new Set<string>();
    permissions.forEach(p => cats.add(p.category || 'GENERAL'));
    return Array.from(cats).sort();
  }, [permissions]);

  // Filtered permissions
  const filteredPermissions = useMemo(() => {
    return permissions.filter(p => {
      const matchesCat = categoryFilter === 'ALL' || p.category === categoryFilter;
      const matchesSearch =
        !searchQuery ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [permissions, categoryFilter, searchQuery]);

  // Group filtered permissions by category
  const groupedPermissions = useMemo(() => {
    const map = new Map<string, PermissionItem[]>();
    filteredPermissions.forEach(p => {
      const cat = p.category || 'GENERAL';
      if (!map.has(cat)) {
        map.set(cat, []);
      }
      map.get(cat)!.push(p);
    });
    return map;
  }, [filteredPermissions]);

  const cardBg = isDarkMode ? 'bg-zinc-950 border-zinc-850' : 'bg-white border-zinc-200 shadow-sm';
  const innerCardBg = isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200';
  const textPrimary = isDarkMode ? 'text-white' : 'text-zinc-900';
  const textSecondary = isDarkMode ? 'text-zinc-400' : 'text-zinc-600';

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-xs text-zinc-500 animate-pulse">
        {t('general.loading', 'Se încarcă datele...')}
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-3 sm:gap-4 overflow-hidden">
      {/* Mobile Role Switcher */}
      <div className="md:hidden shrink-0 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {canCreateRole && (
          <button
            type="button"
            onClick={() => setIsAddRoleModalOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition cursor-pointer shrink-0"
          >
            + {t('it.addRole', 'Adaugă Rol')}
          </button>
        )}
        {roles.map(role => {
          const isSelected = role.id === selectedRoleId;
          return (
            <button
              key={role.id}
              type="button"
              onClick={() => handleSelectRole(role)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer shrink-0 border ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                  : isDarkMode
                  ? 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-white'
                  : 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:text-zinc-900'
              }`}
            >
              {role.name}
            </button>
          );
        })}
      </div>

      {/* Desktop Left Panel: Role List */}
      <div className={`hidden md:flex w-72 shrink-0 rounded-2xl border flex-col overflow-hidden ${cardBg}`}>
        <div className="p-3.5 border-b border-zinc-800/60 flex items-center justify-between shrink-0">
          <h3 className={`font-bold text-xs uppercase tracking-wider ${textSecondary}`}>
            {t('it.tabRoles', 'Roluri')}
          </h3>
          {canCreateRole && (
            <button
              type="button"
              onClick={() => setIsAddRoleModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              + {t('it.addRole', 'Adaugă Rol')}
            </button>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-3 divide-y divide-zinc-800/40">
          {/* System Roles Section */}
          <div className="space-y-1">
            <span className="px-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
              {t('it.systemRoles', 'Roluri Sistem')}
            </span>
            {systemRoles.map(role => {
              const isSelected = role.id === selectedRoleId;

              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => handleSelectRole(role)}
                  className={`w-full text-left px-3 py-2 rounded-xl transition flex items-center justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? isDarkMode
                        ? 'bg-zinc-900 text-white font-bold border border-zinc-800 shadow-xs'
                        : 'bg-zinc-100 text-zinc-900 font-bold border border-zinc-300'
                      : isDarkMode
                      ? 'text-zinc-300 hover:bg-zinc-900/60 hover:text-white'
                      : 'text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900'
                  }`}
                >
                  <span className="text-xs truncate">{role.name}</span>
                  <Lock className="w-3 h-3 text-zinc-600 shrink-0" />
                </button>
              );
            })}
          </div>

          {/* Custom Roles Section */}
          <div className="pt-2 space-y-1">
            <span className="px-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
              {t('it.customRoles', 'Roluri Personalizate')}
            </span>
            {customRoles.length === 0 ? (
              <div className="px-2 py-2 text-[11px] text-zinc-500 italic">
                {t('it.noCustomRoles', 'Nu există roluri personalizate')}
              </div>
            ) : (
              customRoles.map(role => {
                const isSelected = role.id === selectedRoleId;

                return (
                  <div
                    key={role.id}
                    className={`group w-full px-3 py-2 rounded-xl transition flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? isDarkMode
                          ? 'bg-zinc-900 text-white font-bold border border-zinc-800 shadow-xs'
                          : 'bg-zinc-100 text-zinc-900 font-bold border border-zinc-300'
                        : isDarkMode
                        ? 'text-zinc-300 hover:bg-zinc-900/60 hover:text-white'
                        : 'text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900'
                    }`}
                    onClick={() => handleSelectRole(role)}
                  >
                    <span className="text-xs truncate">{role.name}</span>
                    {canDeleteRole && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setRoleToDelete(role);
                        }}
                        className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition opacity-0 group-hover:opacity-100 shrink-0 cursor-pointer"
                        title={t('common.delete', 'Șterge')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Right Panel: Permission Customizer Matrix */}
      <div className={`flex-1 min-h-0 rounded-2xl border flex flex-col overflow-hidden ${cardBg}`}>
        {/* Header Bar */}
        <div className="p-3.5 sm:p-4 border-b border-zinc-800/60 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3">
            <h2 className={`text-sm sm:text-base font-bold tracking-tight ${textPrimary}`}>
              {selectedRole?.name || t('it.selectRole', 'Selectează un rol')}
            </h2>
            {isDirty && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                {t('it.unsavedChanges', 'Modificări nesalvate')}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {isSelectedRoleLocked ? (
              <span className="text-xs text-amber-400 flex items-center space-x-1 font-medium">
                <Lock className="w-3.5 h-3.5 mr-1" />
                {t('it.roleLocked', 'Modificare blocată')}
              </span>
            ) : (
              canWrite && (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!isDirty || isSaving}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5"
                >
                  {isSaving ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1" />
                  ) : null}
                  <span>{t('common.save', 'Salvează')}</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Filter Strip */}
        <div className="px-3.5 py-2.5 border-b border-zinc-800/60 flex flex-wrap items-center justify-between gap-2.5 shrink-0 bg-zinc-900/30">
          <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('it.searchPermissions', 'Caută permisiuni...')}
                className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border outline-hidden transition ${
                  isDarkMode
                    ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700'
                    : 'bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400'
                }`}
              />
            </div>
          </div>

          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setCategoryFilter('ALL')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer shrink-0 ${
                categoryFilter === 'ALL'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : isDarkMode
                  ? 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                  : 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:text-zinc-900'
              }`}
            >
              {t('it.allCategories', 'Toate')}
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer shrink-0 ${
                  categoryFilter === cat
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : isDarkMode
                    ? 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                    : 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:text-zinc-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Permissions Matrix */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          {groupedPermissions.size === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500">
              {t('it.noPermissionsFound', 'Nu a fost găsită nicio permisiune conform căutării.')}
            </div>
          ) : (
            Array.from(groupedPermissions.entries()).map(([cat, perms]) => {
              return (
                <div key={cat} className={`rounded-2xl border p-4 space-y-3 ${innerCardBg}`}>
                  {/* Category Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800/40">
                    <div className="flex items-center space-x-2">
                      <h4 className={`text-xs font-bold uppercase tracking-wider ${textPrimary}`}>
                        {cat}
                      </h4>
                    </div>

                    {!isSelectedRoleSystem && canWrite && (
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleSelectAllCategory(perms)}
                          className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition cursor-pointer"
                        >
                          {t('it.selectAll', 'Selectează Tot')}
                        </button>
                        <span className="text-zinc-600">•</span>
                        <button
                          type="button"
                          onClick={() => handleDeselectAllCategory(perms)}
                          className="text-[11px] font-semibold text-zinc-400 hover:text-zinc-300 transition cursor-pointer"
                        >
                          {t('it.deselectAll', 'Deselectează Tot')}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Permissions Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {perms.map(p => {
                      const isAllowed = canDelegatePermission(p.code);
                      const isChecked = selectedRole?.name === 'ADMIN' || assignedPermIds.has(p.id);

                      return (
                        <div
                          key={p.id}
                          onClick={() => isAllowed && togglePermission(p.id, p.code)}
                          className={`px-3 py-2 rounded-xl border flex items-center space-x-2.5 transition select-none ${
                            !isAllowed
                              ? 'opacity-40 cursor-not-allowed bg-zinc-950/20 border-zinc-800/40'
                              : isChecked
                              ? isDarkMode
                                ? 'bg-zinc-950/80 border-blue-500/30 cursor-pointer'
                                : 'bg-blue-50/50 border-blue-200 cursor-pointer'
                              : isDarkMode
                              ? 'bg-zinc-950/40 border-zinc-800/60 hover:border-zinc-700 cursor-pointer'
                              : 'bg-white border-zinc-200 hover:border-zinc-300 cursor-pointer'
                          } ${isSelectedRoleSystem ? 'opacity-80 cursor-default' : ''}`}
                          title={!isAllowed ? t('it.cannotDelegatePermission', 'Nu poți delega o permisiune pe care nu o deții.') : p.description || p.code}
                        >
                          {/* Checkbox Box */}
                          <div
                            className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border transition ${
                              isChecked
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : isDarkMode
                                ? 'border-zinc-700 bg-zinc-900'
                                : 'border-zinc-300 bg-white'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>

                          {/* Permission Details */}
                          <div className="min-w-0 flex-1">
                            <code className="text-xs font-semibold text-amber-400 font-mono block truncate">
                              {p.code}
                            </code>
                            {p.description && (
                              <p className="text-[11px] text-zinc-400 truncate mt-0.5" title={p.description}>
                                {p.description}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Custom Role Modal */}
      <AddCustomRoleModal
        isOpen={isAddRoleModalOpen}
        onClose={() => setIsAddRoleModalOpen(false)}
        permissions={permissions}
        roles={roles}
        isDarkMode={isDarkMode}
        onSuccess={() => loadData()}
        onToast={onToast}
      />

      {/* Delete Custom Role Confirmation Modal */}
      {roleToDelete && (
        <ConfirmationModal
          isOpen={!!roleToDelete}
          onClose={() => setRoleToDelete(null)}
          onConfirm={handleDeleteRole}
          isLoading={isDeleting}
          isDarkMode={isDarkMode}
          title={t('it.deleteRoleTitle', 'Șterge Rol Personalizat')}
          message={
            <span>
              {t('it.deleteRoleConfirm', 'Sigur doriți să ștergeți rolul')} <strong>{roleToDelete.name}</strong>?
            </span>
          }
          confirmText={t('common.delete', 'Șterge')}
          cancelText={t('common.cancel', 'Anulează')}
          variant="danger"
        />
      )}
    </div>
  );
};

