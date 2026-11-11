import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { X } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import type { CalendarEvent, TaskItem } from '../../../services/generalService';
import type { HrStand, HrMember } from '../../../types/hr';
import type { Club } from '../../../types/adminAuth';
import { CalendarMonthView } from './CalendarMonthView';
import { CalendarDayView } from './CalendarDayView';
import { VolunteerSignupModal } from './VolunteerSignupModal';
import { useCalendarItems, isCalendarItemOnDate, formatTagDateInterval, type UnifiedCalendarItem } from './useCalendarItems';
import { ToastNotification } from '../../common';

export interface CalendarViewProps {
    events: CalendarEvent[];
    tasks: TaskItem[];
    stands: HrStand[];
    members?: HrMember[];
    clubs?: Club[];
    isLoading?: boolean;
    isDarkMode?: boolean;
    isAdmin?: boolean;
    canEditDepartment?: (deptId: string) => boolean;
    onAddEventClick?: () => void;
    onAddTaskClick?: () => void;
    onDeleteEvent?: (id: string, dept: string) => void;
    onDeleteTask?: (id: string, dept: string) => void;
    onStandUpdated?: (updatedStand: HrStand) => void;
    onRefreshData?: () => void;
    startDateFilter?: string;
    endDateFilter?: string;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
    events,
    tasks,
    stands,
    members = [],
    clubs = [],
    isLoading = false,
    isDarkMode = true,
    isAdmin = false,
    canEditDepartment,
    onDeleteEvent,
    onDeleteTask,
    onRefreshData,
    startDateFilter,
    endDateFilter,
}) => {
    const { t } = useLanguage();
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedTypeFilter = searchParams.get('type') || 'ALL';
    const selectedDeptFilter = searchParams.get('dept') || 'ALL';
    const searchTerm = searchParams.get('search') || '';

    const effectiveStartDate = startDateFilter !== undefined ? startDateFilter : (searchParams.get('startDate') || '');
    const effectiveEndDate = endDateFilter !== undefined ? endDateFilter : (searchParams.get('endDate') || '');

    const rawDateParam = searchParams.get('date');
    const initialDate = rawDateParam && !isNaN(Date.parse(rawDateParam))
        ? new Date(rawDateParam)
        : (effectiveStartDate && !isNaN(Date.parse(effectiveStartDate))
            ? new Date(effectiveStartDate)
            : new Date());
    const [currentDate, setCurrentDate] = useState<Date>(initialDate);

    useEffect(() => {
        if (effectiveStartDate && !isNaN(Date.parse(effectiveStartDate))) {
            setCurrentDate(new Date(effectiveStartDate));
        }
    }, [effectiveStartDate]);
    
    const selectedDateStr = rawDateParam || (effectiveStartDate && !isNaN(Date.parse(effectiveStartDate)) ? effectiveStartDate : new Date().toISOString().split('T')[0]);
    const setSelectedDateStr = useCallback((dateStr: string) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (dateStr) next.set('date', dateStr);
            else next.delete('date');
            return next;
        }, { replace: true });
    }, [setSearchParams]);

    const filteredItems = useCalendarItems({
        events, tasks, stands, members, clubs, selectedTypeFilter, selectedDeptFilter, searchTerm,
        startDateFilter: effectiveStartDate,
        endDateFilter: effectiveEndDate
    });

    const [isDateAgendaOpen, setIsDateAgendaOpen] = useState<boolean>(false);
    const [activeModalItem, setActiveModalItem] = useState<UnifiedCalendarItem | null>(null);

    const handleSelectDate = useCallback((dateStr: string) => {
        setSelectedDateStr(dateStr);
        setIsDateAgendaOpen(true);
    }, [setSelectedDateStr]);

    // Modal state for stand inspection / volunteer signup
    const [signupModalState, setSignupModalState] = useState<{isOpen: boolean, standId: string, shiftId: string, initialTab: 'shifts' | 'signup'}>({
        isOpen: false, standId: '', shiftId: '', initialTab: 'shifts'
    });

    const handleOpenItemModal = useCallback((item: UnifiedCalendarItem, tab: 'shifts' | 'signup' = 'shifts') => {
        if (item.type === 'stand') {
            const stand = item.raw as HrStand;
            const targetShiftId = stand.shifts && stand.shifts.length > 0 ? stand.shifts[0].id : '';
            setSignupModalState({ isOpen: true, standId: stand.id, shiftId: targetShiftId, initialTab: tab });
        } else {
            setActiveModalItem(item);
        }
    }, []);

    useEffect(() => {
        if (!isDateAgendaOpen && !activeModalItem && !signupModalState.isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsDateAgendaOpen(false);
                setActiveModalItem(null);
                setSignupModalState({ isOpen: false, standId: '', shiftId: '', initialTab: 'shifts' });
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isDateAgendaOpen, activeModalItem, signupModalState.isOpen]);

    const prevMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

    const selectedDateItems = filteredItems.filter(item => isCalendarItemOnDate(item, selectedDateStr));

    const [toast, setToast] = useState<{ text: string; type?: 'success' | 'error' | 'info' } | null>(null);

    return (
        <div className="flex-1 h-full flex flex-col overflow-hidden min-h-0">
            <CalendarMonthView
                currentDate={currentDate}
                filteredItems={filteredItems}
                selectedDateStr={selectedDateStr}
                isDarkMode={isDarkMode}
                startDateFilter={effectiveStartDate}
                endDateFilter={effectiveEndDate}
                onPrevMonth={prevMonth}
                onNextMonth={nextMonth}
                onSelectDate={handleSelectDate}
                onOpenItemModal={handleOpenItemModal}
            />

            {isDateAgendaOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="fixed inset-0" onClick={() => setIsDateAgendaOpen(false)} aria-hidden="true"/>
                    <div className={`relative z-10 w-full h-full sm:h-auto sm:max-h-[90vh] max-w-xl flex flex-col rounded-none sm:rounded-2xl border-0 sm:border p-4 sm:p-6 shadow-2xl overflow-hidden ${isDarkMode ? 'bg-black text-white border-zinc-800' : 'bg-white text-zinc-900 border-zinc-200'}`}>
                        <CalendarDayView
                            selectedDateStr={selectedDateStr}
                            selectedDateItems={selectedDateItems}
                            isLoading={isLoading}
                            isDarkMode={isDarkMode}
                            isAdmin={isAdmin}
                            canEditDepartment={canEditDepartment}
                            onCloseMobile={() => setIsDateAgendaOpen(false)}
                            onOpenItemModal={handleOpenItemModal}
                            onDeleteEvent={onDeleteEvent}
                            onDeleteTask={onDeleteTask}
                        />
                    </div>
                </div>
            )}

            <VolunteerSignupModal
                isOpen={signupModalState.isOpen}
                standId={signupModalState.standId}
                shiftId={signupModalState.shiftId}
                initialTab={signupModalState.initialTab}
                onClose={() => setSignupModalState({ isOpen: false, standId: '', shiftId: '', initialTab: 'shifts' })}
                onSuccess={() => {
                    setToast({ text: t('general.signupSuccess', 'Înscriere realizată cu succes!'), type: 'success' });
                    if (onRefreshData) onRefreshData();
                }}
                isDarkMode={isDarkMode}
                isAdmin={isAdmin}
                onRefreshData={onRefreshData}
            />

            {activeModalItem && activeModalItem.type !== 'stand' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs" onClick={() => setActiveModalItem(null)}>
                    <div className={`relative z-10 w-full h-full sm:h-auto sm:max-h-[90vh] max-w-lg rounded-none sm:rounded-2xl border-0 sm:border shadow-2xl p-4 sm:p-6 flex flex-col overflow-hidden ${isDarkMode ? 'bg-black text-white border-zinc-800' : 'bg-white text-zinc-900 border-zinc-200'}`} onClick={e => e.stopPropagation()}>
                        <div className={`flex justify-between items-start mb-4 shrink-0 pb-2 border-b ${isDarkMode ? 'border-zinc-800/60' : 'border-zinc-200'}`}>

                            <h3 className="text-base sm:text-lg font-bold">{activeModalItem.title}</h3>
                            <button onClick={() => setActiveModalItem(null)} className={`p-1.5 rounded-lg transition cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}>
                                <X className="w-4 h-4"/>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-4 text-sm">
                            {activeModalItem.description && <p className={`leading-relaxed ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>{activeModalItem.description}</p>}
                            <div className="space-y-2 text-xs">
                                <div className="flex items-center justify-between py-1 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200'}">
                                    <span className="${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'} font-medium">
                                        {activeModalItem.endDate && activeModalItem.endDate !== activeModalItem.date
                                            ? t('general.dateInterval', 'Perioadă')
                                             : t('general.date', 'Data')}:
                                    </span>
                                    <span className="font-semibold">
                                        {formatTagDateInterval(activeModalItem.date, activeModalItem.endDate)}
                                    </span>
                                </div>
                                {activeModalItem.time && (
                                    <div className="flex items-center justify-between py-1 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200'}">
                                        <span className="${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'} font-medium">{t('general.time', 'Ora')}:</span>
                                        <span className="font-semibold">{activeModalItem.time}</span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between py-1 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200'}">
                                    <span className="${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'} font-medium">{t('general.department', 'Departament')}:</span>
                                    <span className="font-semibold">{activeModalItem.department}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ToastNotification toast={toast} onClose={() => setToast(null)} />
        </div>
    );
};
