import React, { useState, useMemo } from 'react';
import type { HrStandRole } from '../../types/hr';
import { useLanguage } from '../../context/LanguageContext';
import { AddEditRoleModal } from './AddEditRoleModal';
import { Trash2, Pencil } from 'lucide-react';
import { ConfirmationModal } from '../common/ConfirmationModal';
interface CustomRolesViewProps {
    roles: HrStandRole[];
    isLoading: boolean;
    canWrite: boolean;
    isDarkMode: boolean;
    searchQuery?: string;
    categoryFilter?: string;
    isAddRoleOpen?: boolean;
    onCloseAddRole?: () => void;
    onSaveRole: (role: Partial<HrStandRole>) => void;
    onDeleteRole: (id: string) => void;
}
export const CustomRolesView: React.FC<CustomRolesViewProps> = ({ roles, isLoading, canWrite, isDarkMode, searchQuery = '', categoryFilter = 'ALL', isAddRoleOpen = false, onCloseAddRole, onSaveRole, onDeleteRole }) => {
    const { t } = useLanguage();
    const [internalIsModalOpen, setInternalIsModalOpen] = useState(false);
    const isModalOpen = isAddRoleOpen || internalIsModalOpen;
    const setIsModalOpen = (open: boolean) => {
        setInternalIsModalOpen(open);
        if (!open && onCloseAddRole) {
            onCloseAddRole();
        }
    };
    const [roleToEdit, setRoleToEdit] = useState<HrStandRole | null>(null);
    const [roleToDelete, setRoleToDelete] = useState<HrStandRole | null>(null);
    const handleOpenEdit = (role: HrStandRole) => {
        setRoleToEdit(role);
        setIsModalOpen(true);
    };
    const handleConfirmDeleteRole = () => {
        if (roleToDelete) {
            onDeleteRole(roleToDelete.id);
            setRoleToDelete(null);
        }
    };
    const filteredRoles = useMemo(() => {
        return roles.filter(role => {
            const matchesSearch = !searchQuery ||
                role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (role.description && role.description.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesCat = categoryFilter === 'ALL' || role.category === categoryFilter;
            return matchesSearch && matchesCat;
        });
    }, [roles, searchQuery, categoryFilter]);
    const cardBg = isDarkMode ? 'bg-zinc-950 border-zinc-850' : 'bg-white border-zinc-200 shadow-sm';
    const textPrimary = isDarkMode ? 'text-white' : 'text-zinc-900';
    return (<div className="space-y-4">
      {/* Roles List */}
      {isLoading ? (<div className="py-12 text-center text-xs text-zinc-500 animate-pulse">
          {t('general.loading', 'Se încarcă datele...')}
        </div>) : filteredRoles.length === 0 ? (<div className={`p-8 text-center rounded-2xl border text-xs text-zinc-500 ${cardBg}`}>
          {t('hr.noRolesFound', 'Nu a fost găsit niciun rol conform filtrelor.')}
        </div>) : (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredRoles.map(role => {
            return (<div key={role.id} className={`p-4 rounded-2xl border space-y-3 flex flex-col justify-between transition-all ${cardBg}`}>
                <div>
                  <div className="flex items-start justify-between gap-2 border-b border-zinc-800/40 pb-2.5 mb-2.5">
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5 truncate">
                        <h4 className={`font-bold text-sm truncate ${textPrimary}`}>{role.name}</h4>
                      </div>
                      <p className="text-[11px] text-zinc-400">{role.category}</p>
                    </div>
<span className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border shrink-0 ${role.isSystem ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-zinc-900 text-zinc-300 border-zinc-800'}`}>
                      {role.isSystem ? t('hr.systemRole', 'Sistem') : t('hr.customRole', 'Custom')}
                    </span>
                  </div>

                  {role.description && (<p className="text-xs text-zinc-400 leading-relaxed">
                      {role.description}
                    </p>)}
                </div>

                {canWrite && (<div className="flex items-center justify-end space-x-1 pt-2.5 border-t border-zinc-800/40">
                    <button onClick={() => handleOpenEdit(role)} className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition cursor-pointer" title={t('general.edit', 'Editează')}>
                      <Pencil className="w-3.5 h-3.5"/>
                    </button>
                    {!role.isSystem && (<button onClick={() => setRoleToDelete(role)} className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer" title={t('common.delete', 'Șterge')}>
                        <Trash2 className="w-3.5 h-3.5"/>
                      </button>)}
                  </div>)}
              </div>);
          })}
        </div>)}

      {/* Modal */}
      <AddEditRoleModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={onSaveRole} roleToEdit={roleToEdit} isDarkMode={isDarkMode}/>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!roleToDelete}
        onClose={() => setRoleToDelete(null)}
        onConfirm={handleConfirmDeleteRole}
        title={t('hr.deleteRoleTitle', 'Șterge Rol')}
        message={t('hr.confirmDeleteRole', 'Sigur doriți să ștergeți acest rol?')}
        confirmText={t('common.delete', 'Șterge')}
        cancelText={t('common.cancel', 'Anulează')}
        variant="danger"
        isDarkMode={isDarkMode}
      />
    </div>);
};
