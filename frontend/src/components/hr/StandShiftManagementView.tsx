import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { HrStand, HrShift, HrShiftAssignment, HrMember, HrStandRole, HrLocation } from '../../types/hr';
import { useLanguage } from '../../context/LanguageContext';
import { AddEditStandModal } from './AddEditStandModal';
import { AddShiftModal } from './AddShiftModal';
import { AssignMemberModal } from './AssignMemberModal';
import { SubmitEoDModal } from './SubmitEoDModal';
import { StandVolunteersModal } from './StandVolunteersModal';
import { StandQrCodeModal } from './StandQrCodeModal';
import { Trash2, Pencil, Copy, ChevronDown, ChevronUp } from 'lucide-react';
interface StandShiftManagementViewProps {
    stands: HrStand[];
    members: HrMember[];
    roles: HrStandRole[];
    locations: HrLocation[];
    isLoading: boolean;
    canWrite: boolean;
    isDarkMode: boolean;
    searchQuery?: string;
    locationFilter?: string;
    dateFilter?: string;
    startDateFilter?: string;
    endDateFilter?: string;
    isAddStandModalOpen?: boolean;
    onCloseAddStandModal?: () => void;
    onSaveStand: (stand: Partial<HrStand>) => void;
    onCopyStand: (id: string) => void;
    onDeleteStand: (id: string) => void;
    onAddShift: (standId: string, shiftName: string, startTime: string, endTime: string, neededVolunteers?: number, neededLogistics?: number, neededFinance?: number) => void;
    onUpdateShift?: (standId: string, shiftId: string, shiftName: string, startTime: string, endTime: string, neededVolunteers?: number, neededLogistics?: number, neededFinance?: number) => void;
    onDeleteShift: (shiftId: string) => void;
    onAssignMember: (shiftId: string, memberId: string, roleId: string) => void;
    onRemoveAssignment: (assignmentId: string) => void;
    onApproveAssignment?: (assignmentId: string) => void;
    onRejectAssignment?: (assignmentId: string) => void;
    onUpdateAttendance: (assignmentId: string, status: string) => void;
    onSubmitEoD: (assignmentId: string, payload: any) => void;
    onDeleteEoD?: (assignmentId: string) => void;
    onCreateLocation?: (name: string) => Promise<HrLocation>;
    onRenameLocation?: (oldName: string, newName: string) => Promise<void>;
    onDeleteLocation?: (locationName: string) => Promise<void>;
    onCreateRole?: (name: string) => Promise<HrStandRole>;
    onRenameRole?: (roleId: string, newName: string) => Promise<void>;
    onDeleteRole?: (roleId: string) => Promise<void>;
}
export const StandShiftManagementView: React.FC<StandShiftManagementViewProps> = ({ stands, members, roles, locations, isLoading, canWrite, isDarkMode, searchQuery = '', locationFilter = 'ALL', dateFilter = '', startDateFilter = '', endDateFilter = '', isAddStandModalOpen = false, onCloseAddStandModal, onSaveStand, onCopyStand, onDeleteStand, onAddShift, onUpdateShift, onDeleteShift, onAssignMember, onRemoveAssignment, onApproveAssignment, onRejectAssignment, onUpdateAttendance: _onUpdateAttendance, onSubmitEoD, onDeleteEoD, onCreateLocation, onRenameLocation, onDeleteLocation, onCreateRole, onRenameRole, onDeleteRole }) => {
    const { t } = useLanguage();
    const [copiedStandId, setCopiedStandId] = useState<string | null>(null);
    // Modals state
    const [internalIsStandModalOpen, setInternalIsStandModalOpen] = useState(false);
    const isStandModalOpen = isAddStandModalOpen || internalIsStandModalOpen;
    const setIsStandModalOpen = (open: boolean) => {
        setInternalIsStandModalOpen(open);
        if (!open && onCloseAddStandModal) {
            onCloseAddStandModal();
        }
    };
    const [standToEdit, setStandToEdit] = useState<HrStand | null>(null);
    const [activeShiftStandId, setActiveShiftStandId] = useState<string | null>(null);
    const [shiftToEdit, setShiftToEdit] = useState<HrShift | null>(null);
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
    const [activeAssignShiftId, setActiveAssignShiftId] = useState<string | null>(null);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [activeEoDAssignment, setActiveEoDAssignment] = useState<{
        assignment: HrShiftAssignment;
        stand: HrStand;
        shift: HrShift;
    } | null>(null);
    const [activeRosterStand, setActiveRosterStand] = useState<{
        stand: HrStand;
        shiftId?: string | null;
    } | null>(null);
    const [activeQrStand, setActiveQrStand] = useState<HrStand | null>(null);
    const [searchParams] = useSearchParams();
    // Expandable stands map
    const [expandedStandIds, setExpandedStandIds] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        stands.forEach(s => { initial[s.id] = true; });
        return initial;
    });
    // Auto-scroll and highlight target stand if standId is in URL query parameters
    useEffect(() => {
        const targetStandId = searchParams.get('standId') || searchParams.get('stand');
        if (targetStandId && stands.length > 0) {
            const cleanTarget = targetStandId.toLowerCase().trim();
            const targetStand = stands.find(s => s.id.toLowerCase() === cleanTarget ||
                s.id.toLowerCase().startsWith(cleanTarget) ||
                s.id.toLowerCase().split('-')[0] === cleanTarget);
            if (targetStand) {
                setExpandedStandIds(prev => ({ ...prev, [targetStand.id]: true }));
                setTimeout(() => {
                    const el = document.getElementById(`stand-card-${targetStand.id}`);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el.classList.add('ring-2', 'ring-blue-500');
                        setTimeout(() => el.classList.remove('ring-2', 'ring-blue-500'), 3000);
                    }
                }, 150);
            }
        }
    }, [searchParams, stands]);
    const toggleExpandStand = (id: string) => {
        setExpandedStandIds(prev => ({ ...prev, [id]: !prev[id] }));
    };
    const handleOpenEditStand = (stand: HrStand) => {
        setStandToEdit(stand);
        setIsStandModalOpen(true);
    };
    const handleOpenAddShift = (standId: string) => {
        setActiveShiftStandId(standId);
        setShiftToEdit(null);
        setIsShiftModalOpen(true);
    };
    const handleOpenEditShift = (standId: string, shift: HrShift) => {
        setActiveShiftStandId(standId);
        setShiftToEdit(shift);
        setIsShiftModalOpen(true);
    };
    const handleOpenAssign = (shiftId: string) => {
        setActiveAssignShiftId(shiftId);
        setIsAssignModalOpen(true);
    };
    const filteredStands = stands.filter(stand => {
        const matchesSearch = !searchQuery ||
            stand.locationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            stand.eventDate.includes(searchQuery) ||
            stand.shifts.some(sh => (sh.shiftName || '').toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesLocation = locationFilter === 'ALL' || stand.locationName === locationFilter;
        const matchesDate = (() => {
            if (startDateFilter || endDateFilter) {
                if (startDateFilter && stand.eventDate < startDateFilter) return false;
                if (endDateFilter && stand.eventDate > endDateFilter) return false;
                return true;
            }
            if (dateFilter) {
                return stand.eventDate === dateFilter;
            }
            return true;
        })();
        return matchesSearch && matchesLocation && matchesDate;
    });
    const cardBg = isDarkMode ? 'bg-zinc-950 border-zinc-850' : 'bg-white border-zinc-200 shadow-sm';
    const textPrimary = isDarkMode ? 'text-white' : 'text-zinc-900';
    const textSecondary = isDarkMode ? 'text-zinc-400' : 'text-zinc-500';
    const innerBg = isDarkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200';
    return (<div className="space-y-4">

      {/* Stand List */}
      {isLoading ? (<div className="py-12 text-center text-xs text-zinc-500 animate-pulse">
          {t('general.loading', 'Se încarcă datele...')}
        </div>) : filteredStands.length === 0 ? (<div className={`p-8 text-center rounded-2xl border ${cardBg}`}><p className={`text-sm font-semibold ${textPrimary}`}>{t('hr.noStands', 'Nu există niciun stand înregistrat.')}</p>
        </div>) : (<div className="space-y-4">
          {filteredStands.map(stand => {
                const isExpanded = expandedStandIds[stand.id] !== false;
                return (<div key={stand.id} id={`stand-card-${stand.id}`} className={`rounded-2xl border transition-all ${cardBg}`}>
                
                {/* Stand Header Strip */}
                <div className={`p-3.5 sm:p-4 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200'}`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Stand Title & Mobile Expand Button */}
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        <h3 className={`font-bold text-sm sm:text-base truncate ${textPrimary}`}>{stand.locationName}</h3>
                        <p className={`text-xs ${textSecondary} mt-0.5 flex items-center space-x-1.5`}>
                          <span className={`font-semibold ${textPrimary}`}>{stand.eventDate}</span>
                        </p>
                      </div>

                      {/* Mobile Expand / Collapse Button (always visible, never clipped) */}
                      <button
                        type="button"
                        onClick={() => toggleExpandStand(stand.id)}
                        aria-label={isExpanded ? t('common.collapse', 'Restrânge') : t('common.expand', 'Extinde')}
                        className={`md:hidden p-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${isDarkMode ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900'}`}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Stand Actions Strip (flex-wrap ensures no horizontal overflow on mobile) */}
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveRosterStand({ stand, shiftId: 'ALL' })}
                        title={t('hr.volunteersRoster', 'Echipă & Voluntari Stand')}
                        className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer inline-flex items-center space-x-1.5 ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'}`}
                      >
                        <span>{t('hr.volunteersRoster', 'Voluntari')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveQrStand(stand)}
                        title={t('hr.standQrModalTitle', 'Cod QR Stand - Check-in')}
                        className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer inline-flex items-center space-x-1.5 ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'}`}
                      >
                        <span>{t('hr.standQrCode', 'Cod QR')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const shortId = stand.id.split('-')[0];
                          const publicUrl = `${window.location.origin}/s/${shortId}`;
                          navigator.clipboard.writeText(publicUrl);
                          setCopiedStandId(stand.id);
                          setTimeout(() => setCopiedStandId(null), 2500);
                        }}
                        title={t('hr.copyLinkTitle', 'Copiază Link Înscriere')}
                        className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer inline-flex items-center space-x-1.5 ${
                          copiedStandId === stand.id
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : (isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100')
                        }`}
                      >
                        {copiedStandId === stand.id ? (
                          <span className="text-emerald-400 font-bold">{t('hr.copied', 'Copiat!')}</span>
                        ) : (
                          <span>{t('hr.copyLink', 'Copiază Link')}</span>
                        )}
                      </button>

                      {canWrite && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenAddShift(stand.id)}
                            className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-all cursor-pointer inline-flex items-center space-x-1.5 shrink-0"
                          >
                            <span>{t('hr.addShiftBtn', 'Adaugă Interval')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditStand(stand)}
                            title={t('common.edit', 'Editează')}
                            className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onCopyStand(stand.id)}
                            title={t('hr.copyStandTitle', 'Copiază structura standului (fără voluntari)')}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 transition cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteStand(stand.id)}
                            title={t('common.delete', 'Șterge')}
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      {/* Desktop Expand / Collapse Button */}
                      <button
                        type="button"
                        onClick={() => toggleExpandStand(stand.id)}
                        aria-label={isExpanded ? t('common.collapse', 'Restrânge') : t('common.expand', 'Extinde')}
                        className={`hidden md:inline-flex p-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${isDarkMode ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900'}`}
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Shifts & Personnel List */}
                {isExpanded && (<div className="p-4 space-y-4">
                    {stand.notes && (<p className={`text-xs p-2.5 rounded-xl border ${isDarkMode ? 'text-zinc-400 bg-zinc-900/50 border-zinc-800/60' : 'text-zinc-600 bg-zinc-50 border-zinc-200'}`}>
                        <span className={`font-bold ${isDarkMode ? 'text-zinc-300' : 'text-zinc-800'}`}>{t('hr.notesLabel', 'Observații')}:</span> {stand.notes}
                      </p>)}

                    {stand.shifts.length === 0 ? (<div className={`p-4 text-center text-xs text-zinc-500 rounded-xl border border-dashed border-zinc-800 ${innerBg}`}>
                        {t('hr.noShifts', 'Nu sunt configurate schimbori orare pentru acest stand.')}
                      </div>) : (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {stand.shifts.map(shift => (<div key={shift.id} className={`p-3.5 rounded-xl border space-y-3 flex flex-col justify-between ${innerBg}`}>
                            <div>
                              <div className={`flex items-center justify-between border-b pb-2 mb-2 ${isDarkMode ? 'border-zinc-800/60' : 'border-zinc-200'}`}>
                                <div className="flex items-center space-x-1.5"><span className={`font-bold text-xs ${textPrimary}`}>{shift.shiftName}</span>
                                </div>
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${isDarkMode ? 'text-zinc-400 bg-zinc-850' : 'text-zinc-700 bg-zinc-200'}`}>

                                  {shift.startTime} - {shift.endTime}
                                </span>
                              </div>

                              {/* Shift Role Requirements & Occupancy Badges */}
                              {(() => {
                                    const neededV = shift.neededVolunteers ?? 1;
                                    const neededL = shift.neededLogistics ?? 1;
                                    const neededF = shift.neededFinance ?? 1;
                                    const totalCap = neededV + neededL + neededF;
                                    const countF = shift.assignments.filter(a => a.roleName && (a.roleName.toLowerCase().includes('finance') || a.roleName.toLowerCase().includes('financiar'))).length;
                                    const countL = shift.assignments.filter(a => a.roleName && a.roleName.toLowerCase().includes('logistic')).length;
                                    const countV = shift.assignments.filter(a => !a.roleName || (!a.roleName.toLowerCase().includes('finance') && !a.roleName.toLowerCase().includes('financiar') && !a.roleName.toLowerCase().includes('logistic'))).length;
                                    const totalAssigned = shift.assignments.length;
                                    return (<div className={`mb-2.5 space-y-1.5 p-2 rounded-lg border ${isDarkMode ? 'bg-zinc-950/40 border-zinc-800/50' : 'bg-zinc-100/70 border-zinc-200'}`}>
                                    <div className={`flex items-center justify-between text-[10px] ${textSecondary} font-semibold`}>
                                      <span>{t('hr.slotsOccupied', 'Locuri Ocupate')}</span>
                                      <span className={totalAssigned >= totalCap ? 'text-emerald-400 font-bold' : 'text-blue-400 font-bold'}>
                                        {totalAssigned} / {totalCap}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                                      <span className={`px-1.5 py-0.5 rounded-md border font-medium ${countF >= neededF && neededF > 0
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            : neededF === 0
                                                ? (isDarkMode ? 'bg-zinc-800/40 text-zinc-500 border-zinc-800' : 'bg-zinc-100 text-zinc-500 border-zinc-200')
                                                : 'bg-amber-500/10 text-amber-300 border-amber-500/20'}`}>
                                        {t('nav.finance', 'Finanțe')}: {countF}/{neededF}
                                      </span>
                                      <span className={`px-1.5 py-0.5 rounded-md border font-medium ${countL >= neededL && neededL > 0
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            : neededL === 0
                                                ? (isDarkMode ? 'bg-zinc-800/40 text-zinc-500 border-zinc-800' : 'bg-zinc-100 text-zinc-500 border-zinc-200')
                                                : 'bg-amber-500/10 text-amber-300 border-amber-500/20'}`}>
                                        {t('nav.logistics', 'Logistică')}: {countL}/{neededL}
                                      </span>
                                      <span className={`px-1.5 py-0.5 rounded-md border font-medium ${countV >= neededV && neededV > 0
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            : neededV === 0
                                                ? (isDarkMode ? 'bg-zinc-800/40 text-zinc-500 border-zinc-800' : 'bg-zinc-100 text-zinc-500 border-zinc-200')
                                                : 'bg-amber-500/10 text-amber-300 border-amber-500/20'}`}>
                                        {t('roles.volunteer', 'Voluntari')}: {countV}/{neededV}
                                      </span>
                                    </div>
                                  </div>);
                                })()}

                              {/* View Volunteers Button */}
                              <button type="button" onClick={() => setActiveRosterStand({ stand, shiftId: shift.id })} className="w-full py-2 text-xs font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/20 rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5"><span>
                                  {t('hr.viewVolunteers', 'Vezi Voluntari')}
                                </span>
                              </button>
                            </div>
<div className={`flex items-center justify-between pt-2 border-t ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200'} gap-1.5`}>
                              {canWrite && (<button type="button" onClick={() => handleOpenAssign(shift.id)} className="flex-1 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md transition-all cursor-pointer inline-flex items-center justify-center space-x-1"><span>{t('hr.assignMember', 'Alocă Personal')}</span>
                                </button>)}
                              {canWrite && (<button type="button" onClick={() => handleOpenEditShift(stand.id, shift)} title={t('hr.editShiftBtn', 'Editează Interval')} className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition cursor-pointer shrink-0">
                                  <Pencil className="w-3.5 h-3.5"/>
                                </button>)}
                              {canWrite && (<button type="button" onClick={() => onDeleteShift(shift.id)} title={t('hr.deleteShift', 'Șterge interval')} className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer shrink-0">
                                  <Trash2 className="w-3.5 h-3.5"/>
                                </button>)}
                            </div>
                          </div>))}
                      </div>)}
                  </div>)}
              </div>);
            })}
        </div>)}

      {/* Modals */}
      <AddEditStandModal isOpen={isStandModalOpen} onClose={() => setIsStandModalOpen(false)} onSave={onSaveStand} locations={locations} onCreateLocation={onCreateLocation} onRenameLocation={onRenameLocation} onDeleteLocation={onDeleteLocation} standToEdit={standToEdit} isDarkMode={isDarkMode}/>
<AddShiftModal isOpen={isShiftModalOpen} onClose={() => {
            setIsShiftModalOpen(false);
            setShiftToEdit(null);
        }} shiftToEdit={shiftToEdit} onSave={(shiftName, startTime, endTime, neededVolunteers, neededLogistics, neededFinance, shiftId) => {
            if (activeShiftStandId) {
                if ((shiftToEdit || shiftId) && onUpdateShift) {
                    onUpdateShift(activeShiftStandId, shiftId || shiftToEdit!.id, shiftName, startTime, endTime, neededVolunteers, neededLogistics, neededFinance);
                }
                else {
                    onAddShift(activeShiftStandId, shiftName, startTime, endTime, neededVolunteers, neededLogistics, neededFinance);
                }
            }
        }} isDarkMode={isDarkMode}/>
<AssignMemberModal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} onAssign={(memberId, roleId) => {
            if (activeAssignShiftId) {
                onAssignMember(activeAssignShiftId, memberId, roleId);
            }
        }} members={members} roles={roles} onCreateRole={onCreateRole} onRenameRole={onRenameRole} onDeleteRole={onDeleteRole} isDarkMode={isDarkMode}/>

      {activeEoDAssignment && (<SubmitEoDModal isOpen={!!activeEoDAssignment} onClose={() => setActiveEoDAssignment(null)} onSubmit={onSubmitEoD} onDelete={onDeleteEoD} assignment={activeEoDAssignment.assignment} stand={stands.find(s => s.id === activeEoDAssignment.stand.id) || activeEoDAssignment.stand} shift={activeEoDAssignment.shift} isDarkMode={isDarkMode}/>)}

      {activeRosterStand && (<StandVolunteersModal isOpen={!!activeRosterStand} onClose={() => setActiveRosterStand(null)} stand={stands.find(s => s.id === activeRosterStand.stand.id) || activeRosterStand.stand} initialShiftId={activeRosterStand.shiftId} canWrite={canWrite} isDarkMode={isDarkMode} onRemoveAssignment={onRemoveAssignment} onApproveAssignment={onApproveAssignment} onRejectAssignment={onRejectAssignment} onUpdateAttendance={(assignmentId, status) => {
                if (_onUpdateAttendance)
                    _onUpdateAttendance(assignmentId, status);
            }} onOpenAssignMember={(shiftId) => handleOpenAssign(shiftId)} onOpenQrModal={() => {
                const stand = stands.find(s => s.id === activeRosterStand.stand.id) || activeRosterStand.stand;
                setActiveRosterStand(null);
                setActiveQrStand(stand);
            }}/>)}

      {activeQrStand && (<StandQrCodeModal isOpen={!!activeQrStand} onClose={() => setActiveQrStand(null)} stand={stands.find(s => s.id === activeQrStand.id) || activeQrStand} qrInfo={null} isDarkMode={isDarkMode}/>)}
    </div>);
};
