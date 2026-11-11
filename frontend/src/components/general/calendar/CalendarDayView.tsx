import React from 'react';
import { Calendar as CalendarIcon, Clock, X } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { CalendarItemCard } from './CalendarItemCard';
import type { UnifiedCalendarItem } from './useCalendarItems';

interface CalendarDayViewProps {
    selectedDateStr: string;
    selectedDateItems: UnifiedCalendarItem[];
    isLoading: boolean;
    isDarkMode: boolean;
    isAdmin: boolean;
    canEditDepartment?: (deptId: string) => boolean;
    onCloseMobile?: () => void;
    onOpenItemModal: (item: UnifiedCalendarItem, tab: 'shifts' | 'signup') => void;
    onDeleteEvent?: (id: string, dept: string) => void;
    onDeleteTask?: (id: string, dept: string) => void;
}

export const CalendarDayView: React.FC<CalendarDayViewProps> = ({
    selectedDateStr,
    selectedDateItems,
    isLoading,
    isDarkMode,
    isAdmin,
    canEditDepartment,
    onCloseMobile,
    onOpenItemModal,
    onDeleteEvent,
    onDeleteTask
}) => {
    const { t } = useLanguage();
    const todayStr = new Date().toISOString().split('T')[0];

    return (
        <>
            <div className="flex items-center justify-between mb-3 shrink-0 pb-2 border-b ${isDarkMode ? 'border-zinc-800/60' : 'border-zinc-200'}">
                <div>
                    <span className="text-[10px] uppercase tracking-wider ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'} font-bold">
                        {t('general.selectedDate', 'Data Selectată')}
                    </span>
                    <h3 className="font-bold text-sm sm:text-base flex items-center space-x-1.5">
                        <span>{selectedDateStr}</span>
                        {selectedDateStr === todayStr && (
                            <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                {t('general.today', 'Azi')}
                            </span>
                        )}
                    </h3>
                </div>
                <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 text-xs font-bold rounded-full ${isDarkMode ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-200 text-zinc-800 border-zinc-300'}">
                        {selectedDateItems.length}
                    </span>
                    {onCloseMobile && (
                        <button type="button" onClick={onCloseMobile} className="p-1.5 rounded-xl transition cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}" title={t('general.close', 'Închide')}>
                            <X className="w-4 h-4"/>
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {isLoading ? (
                    <div className="h-48 flex flex-col items-center justify-center text-center text-zinc-500 text-xs">
                        <Clock className="w-8 h-8 opacity-40 mb-2 animate-spin"/>
                        <p>{t('general.loading', 'Se încarcă datele...')}</p>
                    </div>
                ) : selectedDateItems.length === 0 ? (
                    <div className="h-48 flex flex-col items-center justify-center text-center text-zinc-500 text-xs px-4">
                        <CalendarIcon className="w-8 h-8 opacity-40 mb-2"/>
                        <p>{t('general.noItemsOnDate', 'Nu există evenimente, sarcini sau standuri în această zi.')}</p>
                    </div>
                ) : (
                    selectedDateItems.map(item => {
                        const canEditThis = canEditDepartment ? canEditDepartment(item.department) : false;
                        return (
                            <CalendarItemCard
                                key={item.id}
                                item={item}
                                isDarkMode={isDarkMode}
                                isAdmin={isAdmin}
                                canEditThis={canEditThis}
                                onOpenModal={onOpenItemModal}
                                onDeleteEvent={onDeleteEvent}
                                onDeleteTask={onDeleteTask}
                            />
                        );
                    })
                )}
            </div>
        </>
    );
};
