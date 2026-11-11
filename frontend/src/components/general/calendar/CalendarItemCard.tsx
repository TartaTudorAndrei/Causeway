import React from 'react';
import { Calendar as CalendarIcon, Clock, Trash2 } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { DEPARTMENTS } from '../../../config/departments';
import type { UnifiedCalendarItem, UnifiedItemType } from './useCalendarItems';
import { formatTagDateInterval } from './useCalendarItems';

interface CalendarItemCardProps {
    item: UnifiedCalendarItem;
    isDarkMode: boolean;
    isAdmin: boolean;
    canEditThis: boolean;
    onOpenModal: (item: UnifiedCalendarItem, tab: 'shifts' | 'signup') => void;
    onDeleteEvent?: (id: string, dept: string) => void;
    onDeleteTask?: (id: string, dept: string) => void;
}

export const CalendarItemCard: React.FC<CalendarItemCardProps> = ({
    item,
    isDarkMode,
    isAdmin,
    canEditThis,
    onOpenModal,
    onDeleteEvent,
    onDeleteTask
}) => {
    const { t } = useLanguage();
    const deptObj = DEPARTMENTS.find(d => d.id === item.department);

    const getTypeBadge = (type: UnifiedItemType) => {
        switch (type) {
            case 'event':
                return (
                    <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/30 uppercase tracking-wider flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3"/>
                        {t('general.typeEvents', 'Eveniment')}
                    </span>
                );
            case 'task':
                return (
                    <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                        {t('general.typeTasks', 'Sarcină')}
                    </span>
                );
            case 'stand':
                return (
                    <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                        {t('general.typeStands', 'Stand')}
                    </span>
                );
        }
    };

    return (
        <div 
            onClick={() => onOpenModal(item, 'shifts')} 
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                isDarkMode
                ? 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850/60'
                : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100/80'
            }`}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        {getTypeBadge(item.type)}
                        <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md border uppercase tracking-wider ${isDarkMode ? 'bg-zinc-800/60 text-zinc-300 border-zinc-700/50' : 'bg-zinc-200 text-zinc-700 border-zinc-300'}">
                            {t(deptObj?.key || '', deptObj?.fallback || item.department)}
                        </span>
                        {item.isSpecialDemand && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                                <span>{item.demandMultiplier || 1.5}x {t('general.demandSurge', 'Cerere')}</span>
                            </span>
                        )}
                        {item.priority && (
                            <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md border ${
                                item.priority === 'high' ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' :
                                item.priority === 'medium' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                                'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'
                            }`}>
                                {t(`general.${item.priority}`, item.priority)}
                            </span>
                        )}
                    </div>
                    
                    <h4 className={`font-bold text-xs sm:text-sm leading-snug break-words ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>{item.title}</h4>
                    {item.description && (
                        <p className="text-xs line-clamp-2 leading-relaxed break-words ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}">{item.description}</p>
                    )}

                    <div className="flex items-center gap-2.5 text-[11px] flex-wrap ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'} pt-1">
                        {item.endDate && item.endDate !== item.date && (
                            <span className="flex items-center font-medium text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-md border border-blue-500/20 text-[10px]">
                                <CalendarIcon className="w-3 h-3 mr-1 shrink-0"/>
                                <span>{formatTagDateInterval(item.date, item.endDate)}</span>
                            </span>
                        )}
                        {item.time && (
                            <span className="flex items-center">
                                <Clock className="w-3 h-3 mr-1 text-zinc-500 shrink-0"/>
                                <span>{item.time}</span>
                            </span>
                        )}
                        {item.location && item.location !== item.title && (
                            <span className="flex items-center text-emerald-400 truncate max-w-[180px]">
                                {item.location}
                            </span>
                        )}
                        {item.assignee && (
                            <span className="flex items-center truncate max-w-[140px]">
                                {item.assignee}
                            </span>
                        )}
                        {item.shiftsCount !== undefined && item.shiftsCount > 0 && (
                            <span className="flex items-center text-zinc-400 font-medium">
                                {item.shiftsCount} {t('general.shifts', 'schimburi')}
                            </span>
                        )}
                        {item.type === 'stand' && item.assignmentsCount !== undefined && (
                            <span className="flex items-center text-zinc-400 font-medium">
                                {item.assignmentsCount} {t('publicStand.volunteers', 'voluntari')}
                            </span>
                        )}
                    </div>

                    {item.type === 'stand' && (
                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenModal(item, 'shifts');
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-900 border-zinc-300'}`}
                            >
                                <span>{t('general.standViewDetails', 'Detalii Stand')}</span>
                            </button>
                        </div>
                    )}
                </div>

                {isAdmin && item.type !== 'stand' && (
                    <div className="flex items-center space-x-1 shrink-0">
                        {canEditThis && (
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (item.type === 'event' && onDeleteEvent) {
                                        onDeleteEvent(item.raw.id, item.department);
                                    } else if (item.type === 'task' && onDeleteTask) {
                                        onDeleteTask(item.raw.id, item.department);
                                    }
                                }} 
                                className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer" 
                                title={t('general.delete', 'Șterge')}
                            >
                                <Trash2 className="w-3.5 h-3.5"/>
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
