import React, { useState, useMemo, useEffect } from 'react';
import type { HrStand, HrShift, HrShiftAssignment, AttendanceStatus } from '../../types/hr';
import { useLanguage } from '../../context/LanguageContext';
import { X, Trash2, Check } from 'lucide-react';
export interface StandVolunteersModalProps {
    isOpen: boolean;
    onClose: () => void;
    stand: HrStand | null;
    initialShiftId?: string | null;
    canWrite?: boolean;
    isDarkMode?: boolean;
    onRemoveAssignment?: (assignmentId: string) => void;
    onApproveAssignment?: (assignmentId: string) => void;
    onRejectAssignment?: (assignmentId: string) => void;
    onUpdateAttendance?: (assignmentId: string, status: AttendanceStatus) => void;
    onOpenAssignMember?: (shiftId: string) => void;
    onOpenQrModal?: () => void;
}
export const StandVolunteersModal: React.FC<StandVolunteersModalProps> = ({ isOpen, onClose, stand, initialShiftId, canWrite = false, isDarkMode = true, onRemoveAssignment, onApproveAssignment, onRejectAssignment, onUpdateAttendance, onOpenAssignMember, onOpenQrModal, }) => {
    const { t } = useLanguage();
    const [selectedShiftId, setSelectedShiftId] = useState<string>('ALL');
    const [roleFilter, setRoleFilter] = useState<string>('ALL');
    const [attendanceFilter, setAttendanceFilter] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState<string>('');
    useEffect(() => {
        if (isOpen) {
            setSelectedShiftId(initialShiftId || 'ALL');
            setRoleFilter('ALL');
            setAttendanceFilter('ALL');
            setSearchQuery('');
        }
    }, [isOpen, initialShiftId]);
    // Keyboard Escape listener
    useEffect(() => {
        if (!isOpen)
            return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape')
                onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);
    // Flattened list of volunteers across shifts
    const allAssignmentsWithShift = useMemo(() => {
        if (!stand || !stand.shifts)
            return [];
        const list: {
            assignment: HrShiftAssignment;
            shift: HrShift;
        }[] = [];
        stand.shifts.forEach(shift => {
            (shift.assignments || []).forEach(assignment => {
                list.push({ assignment, shift });
            });
        });
        return list;
    }, [stand]);
    // Attendance stats counts
    const attendanceCounts = useMemo(() => {
        let present = 0;
        let waiting = 0;
        let late = 0;
        let absent = 0;
        allAssignmentsWithShift.forEach(({ assignment }) => {
            const status = (assignment.attendanceStatus || 'WAITING').toUpperCase();
            if (status === 'PRESENT')
                present++;
            else if (status === 'LATE')
                late++;
            else if (status === 'ABSENT')
                absent++;
            else
                waiting++;
        });
        return { total: allAssignmentsWithShift.length, present, waiting, late, absent };
    }, [allAssignmentsWithShift]);
    const uniqueRoles = useMemo(() => {
        const set = new Set<string>();
        allAssignmentsWithShift.forEach(({ assignment }) => {
            if (assignment.roleName)
                set.add(assignment.roleName);
        });
        return Array.from(set).sort();
    }, [allAssignmentsWithShift]);
    const filteredItems = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        return allAssignmentsWithShift.filter(({ assignment, shift }) => {
            if (selectedShiftId !== 'ALL' && shift.id !== selectedShiftId) {
                return false;
            }
            if (roleFilter !== 'ALL' && assignment.roleName !== roleFilter) {
                return false;
            }
            const attStatus = (assignment.attendanceStatus || 'WAITING').toUpperCase();
            if (attendanceFilter !== 'ALL' && attStatus !== attendanceFilter) {
                return false;
            }
            if (q) {
                const name = (assignment.memberName || '').toLowerCase();
                const club = (assignment.memberClub || '').toLowerCase();
                const phone = (assignment.memberPhone || '').toLowerCase();
                const role = (assignment.roleName || '').toLowerCase();
                return name.includes(q) || club.includes(q) || phone.includes(q) || role.includes(q);
            }
            return true;
        });
    }, [allAssignmentsWithShift, selectedShiftId, roleFilter, attendanceFilter, searchQuery]);
    if (!isOpen || !stand)
        return null;

    const modalBorder = isDarkMode ? 'border-zinc-800' : 'border-zinc-200';
    const modalBg = isDarkMode ? 'bg-black text-white border-zinc-800 shadow-2xl' : 'bg-white text-zinc-900 border-zinc-200 shadow-xl';
    const inputBg = isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-300 text-zinc-900';
    const rowHover = isDarkMode ? 'hover:bg-zinc-900/60' : 'hover:bg-zinc-50';

    const getAttendanceBadge = (status?: string) => {
        const s = (status || 'WAITING').toUpperCase();
        switch (s) {
            case 'PRESENT':
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {t('hr.attendancePresent', 'Prezent')}
                    </span>
                );
            case 'LATE':
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-600/15 text-amber-300 border border-amber-500/30">
                        {t('hr.attendanceLate', 'Întârziat')}
                    </span>
                );
            case 'ABSENT':
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        {t('hr.attendanceAbsent', 'Absent')}
                    </span>
                );
            case 'WAITING':
            default:
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {t('hr.attendanceWaiting', 'În așteptare')}
                    </span>
                );
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150" onClick={onClose}>
            <div className={`w-full h-full sm:h-auto sm:max-h-[90vh] max-w-3xl rounded-none sm:rounded-2xl border-0 sm:border shadow-2xl flex flex-col overflow-hidden transition-all transform scale-100 animate-in zoom-in-95 duration-150 ${modalBg}`} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="px-5 sm:px-6 pt-5 pb-3.5 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="font-bold text-base sm:text-lg tracking-tight text-white">{stand.locationName}</h3>
                        <p className="text-xs text-zinc-400 mt-0.5 flex items-center space-x-2">
                            <span>{stand.eventDate}</span>
                            {stand.eventName && <span>• {stand.eventName}</span>}
                        </p>
                    </div>
                    <div className="flex items-center space-x-2">
                        {onOpenQrModal && (
                            <button
                                type="button"
                                onClick={onOpenQrModal}
                                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-200 transition cursor-pointer"
                                title={t('hr.standQrCode', 'Cod QR Stand')}
                            >
                                <span>{t('hr.standQrCode', 'Cod QR')}</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label={t('common.close', 'Închide')}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}
                        >
                            <X className="w-5 h-5"/>
                        </button>
                    </div>
                </div>
                <div className={`mx-5 sm:mx-6 border-b ${modalBorder}`} />

        {/* Attendance Summary Strip */}
        <div className="px-4 py-2.5 border-b border-zinc-800/60 flex items-center gap-2 overflow-x-auto bg-zinc-900/40 text-xs">
          <button type="button" onClick={() => setAttendanceFilter('ALL')} className={`px-2.5 py-1 rounded-lg font-bold border transition cursor-pointer ${attendanceFilter === 'ALL'
            ? 'bg-blue-600/20 text-blue-400 border-blue-500/40'
            : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-white'}`}>
            {t('hr.allVolunteers', 'Toți')}: {attendanceCounts.total}
          </button>
<button type="button" onClick={() => setAttendanceFilter(attendanceFilter === 'PRESENT' ? 'ALL' : 'PRESENT')} className={`px-2.5 py-1 rounded-lg font-bold border transition cursor-pointer ${attendanceFilter === 'PRESENT'
            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15'}`}>
            {t('hr.attendancePresent', 'Prezenți')}: {attendanceCounts.present}
          </button>
<button type="button" onClick={() => setAttendanceFilter(attendanceFilter === 'WAITING' ? 'ALL' : 'WAITING')} className={`px-2.5 py-1 rounded-lg font-bold border transition cursor-pointer ${attendanceFilter === 'WAITING'
            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
            : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/15'}`}>
            {t('hr.attendanceWaiting', 'În așteptare')}: {attendanceCounts.waiting}
          </button>
<button type="button" onClick={() => setAttendanceFilter(attendanceFilter === 'LATE' ? 'ALL' : 'LATE')} className={`px-2.5 py-1 rounded-lg font-bold border transition cursor-pointer ${attendanceFilter === 'LATE'
            ? 'bg-amber-600/25 text-amber-300 border-amber-500/50'
            : 'bg-amber-600/15 text-amber-300 border-amber-500/30 hover:bg-amber-600/20'}`}>
            {t('hr.attendanceLate', 'Întârziați')}: {attendanceCounts.late}
          </button>
<button type="button" onClick={() => setAttendanceFilter(attendanceFilter === 'ABSENT' ? 'ALL' : 'ABSENT')} className={`px-2.5 py-1 rounded-lg font-bold border transition cursor-pointer ${attendanceFilter === 'ABSENT'
            ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
            : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/15'}`}>
            {t('hr.attendanceAbsent', 'Absenți')}: {attendanceCounts.absent}
          </button>
        </div>

        {/* Filters Strip */}
        <div className="p-3.5 sm:p-4 border-b border-zinc-800/60 space-y-2.5 shrink-0 bg-zinc-900/20">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Search */}
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={t('hr.searchStandVolunteersPlaceholder', 'Căutare nume, club, telefon, rol...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border outline-hidden focus:ring-2 focus:ring-blue-500 ${inputBg}`}
              />
              {searchQuery && (<button type="button" onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 rounded-md cursor-pointer">
                  <X className="w-3.5 h-3.5"/>
                </button>)}
            </div>

            {/* Shift Filter Dropdown */}
            <div className="sm:w-48">
              <select value={selectedShiftId} onChange={(e) => setSelectedShiftId(e.target.value)} className={`w-full px-2.5 py-1.5 text-xs rounded-xl border outline-hidden focus:ring-2 focus:ring-blue-500 ${inputBg}`}>
                <option value="ALL">{t('hr.allShifts', 'Toate Schimburile')}</option>
                {stand.shifts?.map(sh => (<option key={sh.id} value={sh.id}>
                    {sh.shiftName} ({sh.startTime} - {sh.endTime})
                  </option>))}
              </select>
            </div>

            {/* Role Filter Dropdown */}
            {uniqueRoles.length > 1 && (<div className="sm:w-44">
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={`w-full px-2.5 py-1.5 text-xs rounded-xl border outline-hidden focus:ring-2 focus:ring-blue-500 ${inputBg}`}>
                  <option value="ALL">{t('hr.allRoles', 'Toate Rolurile')}</option>
                  {uniqueRoles.map(role => (<option key={role} value={role}>
                      {role}
                    </option>))}
                </select>
              </div>)}
          </div>
        </div>

        {/* Roster List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 divide-y divide-zinc-800/40">
          {filteredItems.length === 0 ? (<div className="py-12 text-center text-zinc-500 text-xs"><p className="font-semibold">{t('hr.noVolunteersInShift', 'Niciun voluntar conform criteriilor selectate.')}</p>
            </div>) : (filteredItems.map(({ assignment }) => {
            const isFinanceRole = Boolean(assignment?.roleName &&
                (assignment.roleName.toLowerCase().includes('finance') || assignment.roleName.toLowerCase().includes('financiar')));
            const isLogisticsRole = Boolean(assignment?.roleName &&
                assignment.roleName.toLowerCase().includes('logistic'));
            const roleBadgeColor = isFinanceRole
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : isLogisticsRole
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            const isPending = assignment.assignmentStatus === 'PENDING_APPROVAL';
            const currentAttendance = (assignment.attendanceStatus || 'WAITING').toUpperCase() as AttendanceStatus;
            return (<div key={assignment.id} className={`pt-2.5 first:pt-0 pb-1 px-2 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${rowHover}`}>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2 truncate flex-wrap gap-y-1">
                        <span className="font-bold text-xs sm:text-sm text-white truncate">
                          {assignment.memberName}
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border shrink-0 ${roleBadgeColor}`}>
                          {assignment.roleName}
                        </span>
                        {isPending && (<span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                            {t('hr.pendingApprovalHold', 'Rezervat')}
                          </span>)}
                        {/* Attendance State Badge */}
                        {!canWrite && getAttendanceBadge(assignment.attendanceStatus)}
                      </div>
                      <div className="flex items-center space-x-2 text-[11px] text-zinc-400 truncate mt-0.5 flex-wrap gap-y-0.5">
                        {assignment.memberClub && <span>{assignment.memberClub}</span>}
                        {assignment.memberClub && assignment.memberPhone && <span>•</span>}
                        {assignment.memberPhone && <span>{assignment.memberPhone}</span>}
                        {assignment.checkinMethod && (
                          <span className="inline-flex items-center space-x-1 text-[10px] text-zinc-500 bg-zinc-800/60 px-1.5 py-0.2 rounded-md">
                            <span>{assignment.checkinMethod}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                    {/* Coordinator Manual Attendance Switcher */}
                    {canWrite && onUpdateAttendance && !isPending && (<div className="flex items-center space-x-1">
                        <select value={currentAttendance} onChange={(e) => onUpdateAttendance(assignment.id, e.target.value as AttendanceStatus)} className={`text-[11px] font-bold py-1 px-2 rounded-lg border outline-hidden transition cursor-pointer ${currentAttendance === 'PRESENT'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : currentAttendance === 'LATE'
                            ? 'bg-amber-600/20 text-amber-300 border-amber-500/40'
                            : currentAttendance === 'ABSENT'
                                ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                : 'bg-zinc-800 text-amber-400 border-zinc-700'}`}>
                          <option value="WAITING">{t('hr.attendanceWaiting', 'În așteptare')}</option>
                          <option value="PRESENT">{t('hr.attendancePresent', 'Prezent')}</option>
                          <option value="LATE">{t('hr.attendanceLate', 'Întârziat')}</option>
                          <option value="ABSENT">{t('hr.attendanceAbsent', 'Absent')}</option>
                        </select>
                      </div>)}

                    {/* Approve trigger for pending hold */}
                    {canWrite && isPending && onApproveAssignment && (
                      <button
                        type="button"
                        onClick={() => onApproveAssignment(assignment.id)}
                        title={t('hr.approveAssignment', 'Aprobă rezervarea')}
                        aria-label={t('hr.approveAssignment', 'Aprobă rezervarea')}
                        className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}

                    {/* Reject / Remove trigger */}
                    {canWrite && (<button type="button" onClick={() => {
                        if (isPending && onRejectAssignment) {
                            onRejectAssignment(assignment.id);
                        }
                        else if (onRemoveAssignment) {
                            onRemoveAssignment(assignment.id);
                        }
                    }} title={isPending ? t('hr.rejectAssignment', 'Respinge') : t('hr.removeMember', 'Elimină alocare')} className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer">
                        <Trash2 className="w-4 h-4"/>
                      </button>)}
                  </div>
                </div>);
        }))}
        </div>

        {/* Footer */}
        {canWrite && onOpenAssignMember && (
          <>
            <div className={`mx-5 sm:mx-6 border-t ${modalBorder}`} />
            <div className="px-5 sm:px-6 py-3.5 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => {
                  const targetShiftId = selectedShiftId !== 'ALL' ? selectedShiftId : (stand.shifts?.[0]?.id || '');
                  onOpenAssignMember(targetShiftId);
                  onClose();
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md transition cursor-pointer flex items-center space-x-1.5"
              >
                <span>{t('hr.assignMember', 'Alocă Personal')}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>);
};
