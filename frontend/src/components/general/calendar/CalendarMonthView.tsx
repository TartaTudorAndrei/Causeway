import React from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { type UnifiedCalendarItem, isCalendarItemOnDate } from './useCalendarItems';

interface CalendarMonthViewProps {
    currentDate: Date;
    filteredItems: UnifiedCalendarItem[];
    selectedDateStr: string;
    isDarkMode: boolean;
    startDateFilter?: string;
    endDateFilter?: string;
    onPrevMonth: () => void;
    onNextMonth: () => void;
    onSelectDate: (dateStr: string) => void;
    onOpenItemModal: (item: UnifiedCalendarItem, tab: 'shifts' | 'signup') => void;
}

export const CalendarMonthView: React.FC<CalendarMonthViewProps> = ({
    currentDate,
    filteredItems,
    selectedDateStr,
    isDarkMode,
    startDateFilter,
    endDateFilter,
    onPrevMonth,
    onNextMonth,
    onSelectDate,
    onOpenItemModal
}) => {
    const { t } = useLanguage();
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
    const totalDaysInMonth = lastDayOfMonth.getDate();
    
    const gridCells: { dateStr: string; dayNumber: number; isCurrentMonth: boolean; }[] = [];
    
    const prevMonthLastDate = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
        const d = prevMonthLastDate - i;
        const prevM = month === 0 ? 11 : month - 1;
        const prevY = month === 0 ? year - 1 : year;
        const dateStr = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        gridCells.push({ dateStr, dayNumber: d, isCurrentMonth: false });
    }
    
    for (let d = 1; d <= totalDaysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        gridCells.push({ dateStr, dayNumber: d, isCurrentMonth: true });
    }
    
    const remaining = 42 - gridCells.length;
    for (let d = 1; d <= remaining; d++) {
        const nextM = month === 11 ? 0 : month + 1;
        const nextY = month === 11 ? year + 1 : year;
        const dateStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        gridCells.push({ dateStr, dayNumber: d, isCurrentMonth: false });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const monthNames = [
        t('months.january', 'Ianuarie'), t('months.february', 'Februarie'), t('months.march', 'Martie'),
        t('months.april', 'Aprilie'), t('months.may', 'Mai'), t('months.june', 'Iunie'),
        t('months.july', 'Iulie'), t('months.august', 'August'), t('months.september', 'Septembrie'),
        t('months.october', 'Octombrie'), t('months.november', 'Noiembrie'), t('months.december', 'Decembrie'),
    ];
    const monthName = monthNames[month];

    const tCss = {
        card: isDarkMode ? 'bg-zinc-900/90 border-zinc-800/80 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900 shadow-sm',
        cellActive: isDarkMode ? 'bg-zinc-800/80 border-blue-500/60 ring-1 ring-blue-500/40' : 'bg-blue-50 border-blue-400 ring-1 ring-blue-400',
        cellHover: isDarkMode ? 'hover:bg-zinc-800/40' : 'hover:bg-zinc-100/70',
        cellCurrent: isDarkMode ? 'bg-zinc-900/40 border-zinc-800/60' : 'bg-white border-zinc-200',
        cellOther: isDarkMode ? 'bg-zinc-950/40 border-zinc-900/40 text-zinc-600 opacity-40' : 'bg-zinc-50 border-zinc-100 text-zinc-400 opacity-50',
    };

    return (
        <div className="flex-1 h-full flex flex-col min-h-0 overflow-hidden">
            <div className={`flex-1 h-full flex flex-col rounded-2xl border p-2 sm:p-3 min-h-0 overflow-hidden ${tCss.card}`}>
                <div className={`flex items-center justify-between gap-2 mb-1.5 sm:mb-2 shrink-0 pb-1.5 border-b ${isDarkMode ? 'border-zinc-800/60' : 'border-zinc-200'}`}>
                    <div className="flex items-center gap-2.5 sm:gap-4 flex-wrap min-w-0">
                        <h2 className="font-bold text-sm sm:text-base md:text-lg flex items-center space-x-1.5 sm:space-x-2 shrink-0">
                            <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500"/>
                            <span>{monthName} {year}</span>
                        </h2>
                        <div className={`flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                            <div className="flex items-center gap-1">
                                <span className="w-2.5 h-1 sm:w-3 sm:h-1.5 rounded-full bg-emerald-500"/>
                                <span className="text-[10px] sm:text-[11px] font-medium">{t('general.typeStands', 'Stand')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="w-2.5 h-1 sm:w-3 sm:h-1.5 rounded-full bg-blue-500"/>
                                <span className="text-[10px] sm:text-[11px] font-medium">{t('general.typeEvents', 'Eveniment')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="w-2.5 h-1 sm:w-3 sm:h-1.5 rounded-full bg-amber-500"/>
                                <span className="text-[10px] sm:text-[11px] font-medium">{t('general.typeTasks', 'Sarcină')}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-1 shrink-0">
                        <button onClick={onPrevMonth} aria-label="Previous Month" className={`p-1 sm:p-1.5 rounded-lg border transition-all cursor-pointer ${isDarkMode ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-300' : 'border-zinc-300 hover:bg-zinc-100 text-zinc-700'}`}>
                            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4"/>
                        </button>
                        <button onClick={onNextMonth} aria-label="Next Month" className={`p-1 sm:p-1.5 rounded-lg border transition-all cursor-pointer ${isDarkMode ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-300' : 'border-zinc-300 hover:bg-zinc-100 text-zinc-700'}`}>
                            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4"/>
                        </button>
                    </div>
                </div>

                <div className={`grid grid-cols-7 gap-1 text-center font-bold text-[10px] sm:text-[11px] ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'} pb-1 shrink-0 uppercase tracking-wider`}>
                    <div>{t('general.mon', 'Lun')}</div>
                    <div>{t('general.tue', 'Mar')}</div>
                    <div>{t('general.wed', 'Mie')}</div>
                    <div>{t('general.thu', 'Joi')}</div>
                    <div>{t('general.fri', 'Vin')}</div>
                    <div>{t('general.sat', 'Sâm')}</div>
                    <div>{t('general.sun', 'Dum')}</div>
                </div>

                <div className="flex-1 h-full min-h-0 grid grid-cols-7 grid-rows-6 gap-1 overflow-hidden pr-0 sm:pr-0.5">
                    {gridCells.map((cell, idx) => {
                        const itemsOnDate = filteredItems.filter(item => isCalendarItemOnDate(item, cell.dateStr));
                        const isSelected = cell.dateStr === selectedDateStr;
                        const isToday = cell.dateStr === todayStr;
                        const hasDateFilter = Boolean(startDateFilter || endDateFilter);
                        const isInFilterRange = hasDateFilter &&
                            (!startDateFilter || cell.dateStr >= startDateFilter) &&
                            (!endDateFilter || cell.dateStr <= endDateFilter);
                        const isOutsideFilterRange = hasDateFilter && !isInFilterRange;
                        return (
                            <div key={`${cell.dateStr}-${idx}`} onClick={() => onSelectDate(cell.dateStr)} className={`h-full min-h-0 p-1 sm:p-1.5 rounded-lg sm:rounded-xl border flex flex-col justify-between transition-all cursor-pointer overflow-hidden ${isSelected ? tCss.cellActive : cell.isCurrentMonth ? `${tCss.cellCurrent} ${tCss.cellHover} ${isInFilterRange ? (isDarkMode ? 'ring-1 ring-blue-500/30 bg-blue-500/5' : 'ring-1 ring-blue-400/30 bg-blue-50/40') : ''} ${isOutsideFilterRange ? 'opacity-35' : ''}` : `${tCss.cellOther} ${isOutsideFilterRange ? 'opacity-20' : ''}`}`}>
                                <div className="flex items-center justify-between shrink-0">
                                    <span className={`text-[10px] sm:text-xs font-bold rounded-full w-4 h-4 sm:w-6 sm:h-6 flex items-center justify-center shrink-0 ${isToday ? 'bg-blue-600 text-white font-extrabold shadow-sm' : isSelected ? 'text-blue-400 font-extrabold' : cell.isCurrentMonth ? (isDarkMode ? 'text-zinc-300' : 'text-zinc-800') : (isDarkMode ? 'text-zinc-500' : 'text-zinc-400')}`}>
                                        {cell.dayNumber}
                                    </span>
                                    {itemsOnDate.length > 0 && (
                                        <span className={`text-[8px] sm:text-[10px] font-extrabold px-1 sm:px-1.5 py-0.2 rounded-full shrink-0 ${isDarkMode ? 'bg-zinc-800/80 text-zinc-300 border-zinc-700/60' : 'bg-zinc-200 text-zinc-800 border-zinc-300'}`}>
                                            {itemsOnDate.length}
                                        </span>
                                    )}
                                </div>
                                <div className="flex sm:hidden flex-col gap-0.5 w-full mt-0.5 px-0.5 shrink-0 overflow-hidden">
                                    {itemsOnDate.slice(0, 3).map(item => (
                                        <div key={item.id} className={`h-1 w-full rounded-full shrink-0 ${item.isSpecialDemand ? 'bg-rose-500 shadow-xs' : item.type === 'stand' ? 'bg-emerald-500 shadow-xs' : item.type === 'event' ? 'bg-blue-500 shadow-xs' : 'bg-amber-500 shadow-xs'}`}/>
                                    ))}
                                    {itemsOnDate.length > 3 && (
                                        <div className="text-[7.5px] font-extrabold text-zinc-400 text-center leading-none shrink-0">
                                            +{itemsOnDate.length - 3}
                                        </div>
                                    )}
                                </div>
                                <div className="hidden sm:flex flex-col gap-1 mt-0.5 overflow-hidden min-h-0 flex-1">
                                    {itemsOnDate.slice(0, 2).map(item => {
                                        const badgeBg = item.isSpecialDemand ? (isDarkMode ? 'bg-rose-500/25 text-rose-300 border-rose-500/40 font-bold' : 'bg-rose-50 text-rose-700 border-rose-200 font-bold') : item.type === 'event' ? (isDarkMode ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-blue-50 text-blue-700 border-blue-200') : item.type === 'task' ? (isDarkMode ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-200') : (isDarkMode ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200');
                                        return (
                                            <div key={item.id} onClick={(e) => { e.stopPropagation(); onSelectDate(cell.dateStr); onOpenItemModal(item, 'shifts'); }} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border truncate leading-tight transition-all hover:scale-[1.02] flex items-center gap-1 shrink-0 ${badgeBg}`} title={`${item.title} (${item.type})`}>
                                                <span className="truncate">{item.title}</span>
                                            </div>
                                        );
                                    })}
                                    {itemsOnDate.length > 2 && (
                                        <div className="text-[9px] font-bold text-zinc-400 pl-1 shrink-0">
                                            +{itemsOnDate.length - 2}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
