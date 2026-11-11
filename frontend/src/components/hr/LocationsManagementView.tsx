import React, { useState, useCallback } from 'react';
import type { HrLocation, HrStand } from '../../types/hr';
import { useLanguage } from '../../context/LanguageContext';
import { Trash2, Pencil, X } from 'lucide-react';
import { ConfirmationModal } from '../common';
interface LocationsManagementViewProps {
    locations: HrLocation[];
    stands: HrStand[];
    isLoading: boolean;
    canWrite: boolean;
    isDarkMode: boolean;
    searchQuery?: string;
    isAddLocationOpen?: boolean;
    onCloseAddLocation?: () => void;
    onSaveLocation: (name: string, id?: string) => Promise<void> | void;
    onDeleteLocation: (id: string) => Promise<void> | void;
}
export const LocationsManagementView: React.FC<LocationsManagementViewProps> = ({ locations, stands, isLoading, canWrite, isDarkMode, searchQuery = '', isAddLocationOpen = false, onCloseAddLocation, onSaveLocation, onDeleteLocation }) => {
    const { t } = useLanguage();
    const [internalIsAddModalOpen, setInternalIsAddModalOpen] = useState(false);
    const isAddModalOpen = isAddLocationOpen || internalIsAddModalOpen;
    const setIsAddModalOpen = useCallback((open: boolean) => {
        setInternalIsAddModalOpen(open);
        if (!open && onCloseAddLocation) {
            onCloseAddLocation();
        }
    }, [onCloseAddLocation]);
    const [newLocationName, setNewLocationName] = useState('');
    const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
    const [editingLocationName, setEditingLocationName] = useState('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [locationToDelete, setLocationToDelete] = useState<HrLocation | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLocationName.trim())
            return;
        try {
            await onSaveLocation(newLocationName.trim());
            setNewLocationName('');
            setIsAddModalOpen(false);
            setErrorMessage(null);
        }
        catch (err: any) {
            setErrorMessage(err?.message || 'Eroare la salvarea locației');
        }
    };
    // Keyboard Escape listener
    React.useEffect(() => {
        if (!isAddModalOpen && !locationToDelete)
            return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsAddModalOpen(false);
                setLocationToDelete(null);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isAddModalOpen, setIsAddModalOpen, locationToDelete]);
    const handleEditStart = (loc: HrLocation) => {
        setEditingLocationId(loc.id);
        setEditingLocationName(loc.name);
    };
    const handleEditSave = async (id: string) => {
        if (!editingLocationName.trim())
            return;
        try {
            await onSaveLocation(editingLocationName.trim(), id);
            setEditingLocationId(null);
            setEditingLocationName('');
            setErrorMessage(null);
        }
        catch (err: any) {
            setErrorMessage(err?.message || 'Eroare la actualizarea locației');
        }
    };
    const handleConfirmDeleteLocation = async () => {
        if (!locationToDelete) return;
        setIsDeleting(true);
        setErrorMessage(null);
        try {
            await onDeleteLocation(locationToDelete.id);
            setLocationToDelete(null);
        }
        catch (err: any) {
            setErrorMessage(err?.message || t('hr.cannotDeleteLocation', 'Nu se poate șterge locația.'));
        }
        finally {
            setIsDeleting(false);
        }
    };
    const cardBg = isDarkMode ? 'bg-zinc-950 border-zinc-850' : 'bg-white border-zinc-200 shadow-sm';
    const textPrimary = isDarkMode ? 'text-white' : 'text-zinc-900';
    const textSecondary = isDarkMode ? 'text-zinc-400' : 'text-zinc-500';
    const inputBg = isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-100 border-zinc-300 text-zinc-900';
    const filteredLocations = locations.filter(loc => !searchQuery || loc.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return (<div className="space-y-4">

      {/* Error notification banner */}
      {errorMessage && (<div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center space-x-2"><span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="p-1 hover:text-white cursor-pointer">
            <X className="w-4 h-4"/>
          </button>
        </div>)}

      {/* Locations List */}
      {isLoading ? (<div className="py-12 text-center text-xs text-zinc-500 animate-pulse">
          {t('general.loading', 'Se încarcă datele...')}
        </div>) : filteredLocations.length === 0 ? (<div className={`p-8 text-center rounded-2xl border ${cardBg}`}><p className={`text-sm font-semibold ${textPrimary}`}>{t('hr.noLocations', 'Nu există nicio locație înregistrată.')}</p>
        </div>) : (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredLocations.map(loc => {
                const isEditing = editingLocationId === loc.id;
                const assignedStandsCount = stands.filter(s => s.locationName && s.locationName.trim().toLowerCase() === loc.name.trim().toLowerCase()).length;
                return (<div key={loc.id} className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 transition-all ${cardBg}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0"></div>

                    {isEditing ? (<div className="flex items-center space-x-1.5 flex-1">
                        <input type="text" value={editingLocationName} onChange={(e) => setEditingLocationName(e.target.value)} className={`w-full px-2.5 py-1 text-xs rounded-lg border outline-hidden focus:ring-1 focus:ring-blue-500 ${inputBg}`} autoFocus/>
                        <button onClick={() => handleEditSave(loc.id)} className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer"></button>
                        <button onClick={() => setEditingLocationId(null)} className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer">
                          <X className="w-3.5 h-3.5"/>
                        </button>
                      </div>) : (<div className="min-w-0">
                        <h3 className={`font-bold text-sm truncate ${textPrimary}`}>{loc.name}</h3>
                        <p className={`text-[11px] ${textSecondary} mt-0.5`}>
                          {t('hr.standsAssignedCount', 'Standuri asociate')}: <span className="font-bold text-blue-400">{assignedStandsCount}</span>
                        </p>
                      </div>)}
                  </div>

                  {canWrite && !isEditing && (<div className="flex items-center space-x-1 shrink-0">
                      <button onClick={() => handleEditStart(loc)} title={t('common.edit', 'Editează')} className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition cursor-pointer">
                        <Pencil className="w-3.5 h-3.5"/>
                      </button>
                      <button onClick={() => setLocationToDelete(loc)} disabled={assignedStandsCount > 0} title={assignedStandsCount > 0
                            ? t('hr.cannotDeleteLocation', 'Nu se poate șterge: locația este atribuită la standuri existent')
                            : t('common.delete', 'Șterge')} className={`p-1.5 rounded-lg transition-all ${assignedStandsCount > 0
                            ? 'opacity-40 cursor-not-allowed text-zinc-600'
                            : 'hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 cursor-pointer'}`}>
                        <Trash2 className="w-3.5 h-3.5"/>
                      </button>
                    </div>)}
                </div>
              </div>);
            })}
        </div>)}

      {/* Modal for adding new location */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150" onClick={() => setIsAddModalOpen(false)}>
          <div className={`w-full h-full sm:h-auto sm:max-h-[90vh] max-w-md rounded-none sm:rounded-2xl border-0 sm:border shadow-2xl flex flex-col overflow-hidden transition-all transform scale-100 animate-in zoom-in-95 duration-150 ${isDarkMode ? 'bg-black text-white border-zinc-800 shadow-2xl' : 'bg-white text-zinc-900 border-zinc-200 shadow-xl'}`} onClick={(e) => e.stopPropagation()}>
            <div className="px-5 sm:px-6 pt-5 pb-3.5 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-base sm:text-lg tracking-tight">{t('hr.addLocationTitle', 'Adăugare Locație Nouă')}</h3>
              <button onClick={() => setIsAddModalOpen(false)} aria-label={t('common.close', 'Închide')} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}>
                <X className="w-5 h-5"/>
              </button>
            </div>
            <div className={`mx-5 sm:mx-6 border-b ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`} />

            <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-4 text-sm">
              <form id="add-location-form" onSubmit={handleAddSubmit} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-zinc-400">
                    {t('hr.locationNameLabel', 'Nume Locație')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t('hr.locationPlaceholder', 'ex. Piața Unirii - Stand Central')}
                    value={newLocationName}
                    onChange={(e) => setNewLocationName(e.target.value)}
                    className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputBg}`}
                    autoFocus
                  />
                </div>
              </form>
            </div>

            <div className={`mx-5 sm:mx-6 border-t ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`} />

            <div className="px-5 sm:px-6 py-3.5 flex items-center justify-end shrink-0">
              <button
                form="add-location-form"
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer shrink-0"
              >
                {t('general.save', 'Salvează')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Location Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!locationToDelete}
        onClose={() => setLocationToDelete(null)}
        onConfirm={handleConfirmDeleteLocation}
        title={t('hr.deleteLocationTitle', 'Șterge Locație')}
        message={t('hr.confirmDeleteLocation', 'Sigur doriți să ștergeți această locație?')}
        confirmText={t('common.delete', 'Șterge')}
        cancelText={t('common.cancel', 'Anulează')}
        variant="danger"
        isLoading={isDeleting}
        isDarkMode={isDarkMode}
      />
    </div>);
};
