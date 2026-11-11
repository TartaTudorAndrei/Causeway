import React, { useState, useMemo } from 'react';
import type { PermissionItem, RoleWithPermissions } from '../../types/adminSettings';
import { useLanguage } from '../../context/LanguageContext';
import { adminSettingsService } from '../../services/adminSettingsService';
import { usePermission } from '../../hooks/usePermission';
import { X, Check, Search } from 'lucide-react';

interface AddCustomRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  permissions: PermissionItem[];
  roles?: RoleWithPermissions[];
  isDarkMode?: boolean;
  onSuccess: () => void;
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export const AddCustomRoleModal: React.FC<AddCustomRoleModalProps> = ({
  isOpen,
  onClose,
  permissions,
  roles = [],
  isDarkMode = true,
  onSuccess,
  onToast,
}) => {
  const { t } = useLanguage();
  const { user: currentUser, hasPermission, isSuperAdmin } = usePermission();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentRoleId, setParentRoleId] = useState('');
  const [selectedPermCodes, setSelectedPermCodes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Eligible parent roles based on user permissions/roles
  const eligibleParentRoles = useMemo(() => {
    // Standalone VOLUNTEER cannot be a parent
    const validRoles = roles.filter(r => r.name !== 'VOLUNTEER');
    if (isSuperAdmin) return validRoles;

    const userRoleNames: string[] = [
      ...(currentUser?.roles || []),
      ...(currentUser?.role ? [currentUser.role] : []),
      ...(currentUser?.memberships?.map(m => m.roleName) || []),
    ].map(r => r.toUpperCase());

    const userRoleObjects = validRoles.filter(r => userRoleNames.includes(r.name.toUpperCase()));
    const userRoleIds = new Set(userRoleObjects.map(r => r.id));

    // Return roles that user owns OR are descendants of user's roles
    return validRoles.filter(r => {
      if (userRoleIds.has(r.id)) return true;
      let curr = r.parentRoleId;
      const visited = new Set<string>();
      while (curr && !visited.has(curr)) {
        visited.add(curr);
        if (userRoleIds.has(curr)) return true;
        const parent = validRoles.find(p => p.id === curr);
        curr = parent?.parentRoleId;
      }
      return false;
    });
  }, [roles, isSuperAdmin, currentUser]);

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      const defaultParent = eligibleParentRoles.find(r => r.name === 'ADMIN') || eligibleParentRoles[0];
      setParentRoleId(defaultParent?.id || '');
      setSelectedPermCodes(new Set());
      setSearchQuery('');
      setSelectedCategory('ALL');
      setIsSubmitting(false);
      setValidationError('');
    }
  }, [isOpen, eligibleParentRoles]);

  // Escape listener
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Determine which permissions creator can grant (Subset Rule)
  const canDelegatePermission = (permCode: string) => {
    if (isSuperAdmin) return true;
    return hasPermission(permCode);
  };

  const categories = useMemo(() => {
    const cats = new Set<string>();
    permissions.forEach(p => cats.add(p.category || 'GENERAL'));
    return Array.from(cats).sort();
  }, [permissions]);

  const filteredPermissions = useMemo(() => {
    return permissions.filter(p => {
      const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
      const matchesSearch =
        !searchQuery ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  }, [permissions, selectedCategory, searchQuery]);

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

  const togglePermission = (code: string) => {
    if (!canDelegatePermission(code)) return;
    setValidationError('');
    setSelectedPermCodes(prev => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const handleSelectAllCategory = (catPerms: PermissionItem[]) => {
    setSelectedPermCodes(prev => {
      const next = new Set(prev);
      for (const p of catPerms) {
        if (canDelegatePermission(p.code)) {
          next.add(p.code);
        }
      }
      return next;
    });
  };

  const handleDeselectAllCategory = (catPerms: PermissionItem[]) => {
    setSelectedPermCodes(prev => {
      const next = new Set(prev);
      for (const p of catPerms) {
        next.delete(p.code);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setValidationError(t('it.roleNameRequired', 'Numele rolului este obligatoriu.'));
      return;
    }

    setIsSubmitting(true);
    setValidationError('');

    try {
      await adminSettingsService.createCustomRole({
        name: name.trim(),
        description: description.trim() || undefined,
        permissionCodes: Array.from(selectedPermCodes),
        parentRoleId: parentRoleId || undefined,
      });

      onToast(t('it.roleCreatedSuccess', 'Rolul personalizat a fost creat cu succes!'), 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to create role:', err);
      setValidationError(err?.message || t('it.roleCreateError', 'Eroare la crearea rolului.'));
      onToast(err?.message || t('it.roleCreateError', 'Eroare la crearea rolului.'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const modalBorder = isDarkMode ? 'border-zinc-800' : 'border-zinc-200';
  const modalBg = isDarkMode ? 'bg-black text-white border-zinc-800 shadow-2xl' : 'bg-white text-zinc-900 border-zinc-200 shadow-xl';
  const inputBg = isDarkMode
    ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700 focus:border-zinc-700'
    : 'bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400 focus:border-zinc-400';
  const innerCardBg = isDarkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200';
  const textPrimary = isDarkMode ? 'text-white' : 'text-zinc-900';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150" onClick={onClose}>
      <div
        className={`w-full h-full sm:h-auto sm:max-h-[90vh] max-w-2xl rounded-none sm:rounded-2xl border-0 sm:border shadow-2xl flex flex-col overflow-hidden transition-all transform scale-100 animate-in zoom-in-95 duration-150 ${modalBg}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 pt-5 pb-3.5 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-base sm:text-lg tracking-tight">
            {t('it.addRoleModalTitle', 'Adaugă Rol Nou')}
          </h3>
          <button
            onClick={onClose}
            aria-label={t('common.close', 'Închide')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Divider 1 */}
        <div className={`mx-5 sm:mx-6 border-b ${modalBorder}`} />

        {/* Form & Scrollable Body */}
        <form noValidate onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-4 text-sm">
            {/* Role Name */}
            <div>
              <label className="block text-xs font-semibold mb-1 text-zinc-400">
                {t('it.roleName', 'Nume Rol')}
              </label>
              <input
                type="text"
                value={name}
                onChange={e => {
                  setName(e.target.value);
                  setValidationError('');
                }}
                placeholder={t('it.roleNamePlaceholder', 'Ex: Stand Coordinator, Logistics Auditor...')}
                className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputBg} ${
                  validationError && !name.trim() ? 'border-rose-500/80 ring-1 ring-rose-500/40' : ''
                }`}
              />
            </div>

            {/* Parent Role in Hierarchy */}
            {eligibleParentRoles.length > 0 && (
              <div>
                <label className="block text-xs font-semibold mb-1 text-zinc-400">
                  {t('it.parentRole', 'Rol Părinte')}
                </label>
                <select
                  value={parentRoleId}
                  onChange={e => setParentRoleId(e.target.value)}
                  className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputBg}`}
                >
                  {eligibleParentRoles.map(r => (
                    <option key={r.id} value={r.id} className={isDarkMode ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-900'}>
                      {r.name} {r.isSystem ? `(${t('it.systemBadge', 'Sistem')})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold mb-1 text-zinc-400">
                {t('it.roleDescription', 'Descriere Rol (Opțional)')}
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                placeholder={t('it.roleDescriptionPlaceholder', 'Ex: Coordonează voluntarii și materialele la standuri')}
                className={`w-full px-3 py-2 text-xs rounded-xl border outline-hidden transition resize-none ${inputBg}`}
              />
            </div>

            {/* Permission Selector Header & Filter */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-semibold text-zinc-400">
                {t('it.selectRolePermissions', 'Permisiuni Rol')} ({selectedPermCodes.size})
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={t('it.searchPermissions', 'Caută permisiuni...')}
                    className={`w-full h-[38px] pl-8 pr-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputBg}`}
                  />
                </div>

                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('ALL')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer shrink-0 ${
                      selectedCategory === 'ALL'
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
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer shrink-0 ${
                        selectedCategory === cat
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
            </div>

            {/* Permissions Categories Groups */}
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {groupedPermissions.size === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500">
                  {t('it.noPermissionsFound', 'Nu a fost găsită nicio permisiune conform căutării.')}
                </div>
              ) : (
                Array.from(groupedPermissions.entries()).map(([cat, perms]) => (
                  <div key={cat} className={`rounded-xl border p-3 space-y-2.5 ${innerCardBg}`}>
                    <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800/40">
                      <h4 className={`text-xs font-bold uppercase tracking-wider ${textPrimary}`}>
                        {cat}
                      </h4>
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
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {perms.map(p => {
                        const isAllowed = canDelegatePermission(p.code);
                        const isChecked = selectedPermCodes.has(p.code);

                        return (
                          <div
                            key={p.id}
                            onClick={() => togglePermission(p.code)}
                            className={`px-2.5 py-1.5 rounded-lg border flex items-center space-x-2 transition select-none ${
                              !isAllowed
                                ? 'opacity-40 cursor-not-allowed bg-zinc-900/30 border-zinc-800/40'
                                : isChecked
                                ? isDarkMode
                                  ? 'bg-zinc-950 border-blue-500/40 cursor-pointer'
                                  : 'bg-blue-50/50 border-blue-200 cursor-pointer'
                                : isDarkMode
                                ? 'bg-zinc-950/40 border-zinc-800/60 hover:border-zinc-700 cursor-pointer'
                                : 'bg-white border-zinc-200 hover:border-zinc-300 cursor-pointer'
                            }`}
                            title={!isAllowed ? t('it.cannotDelegatePermission', 'Nu poți delega o permisiune pe care nu o deții.') : p.description || p.code}
                          >
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

                            <div className="min-w-0 flex-1">
                              <code className="text-xs font-semibold text-amber-400 font-mono block truncate">
                                {p.code}
                              </code>
                              {p.description && (
                                <p className="text-[10px] text-zinc-400 truncate" title={p.description}>
                                  {p.description}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Divider 2 */}
          <div className={`mx-5 sm:mx-6 border-t ${modalBorder}`} />

          {/* Footer */}
          <div className="px-5 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
            <div className="min-w-0 pr-2">
              {validationError && (
                <span className="text-xs text-rose-400 font-medium truncate block">
                  {validationError}
                </span>
              )}
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50 flex items-center space-x-2 shrink-0"
            >
              {isSubmitting ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1" />
              ) : null}
              <span>{t('it.createRoleBtn', 'Creează Rol')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
