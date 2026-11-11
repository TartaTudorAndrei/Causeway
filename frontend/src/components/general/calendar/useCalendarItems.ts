import { useMemo } from 'react';
import type { CalendarEvent, TaskItem } from '../../../services/generalService';
import type { HrStand, HrMember } from '../../../types/hr';
import type { Club } from '../../../types/adminAuth';
import { buildGeneralDeepSearchIndex } from '../../../utils/generalDeepSearch';

export type UnifiedItemType = 'event' | 'task' | 'stand';

export interface UnifiedCalendarItem {
    id: string;
    type: UnifiedItemType;
    title: string;
    description?: string;
    date: string; // YYYY-MM-DD (start date)
    endDate?: string; // YYYY-MM-DD (end date / interval)
    time?: string;
    department: string;
    priority?: string;
    status?: string;
    location?: string;
    assignee?: string;
    shiftsCount?: number;
    assignmentsCount?: number;
    isSpecialDemand?: boolean;
    demandMultiplier?: number;
    demandTag?: string;
    raw: CalendarEvent | TaskItem | HrStand;
}

export function isCalendarItemOnDate(item: UnifiedCalendarItem, dateStr: string): boolean {
    if (!item.date) return false;
    const end = item.endDate || item.date;
    return dateStr >= item.date && dateStr <= end;
}

export function isCalendarItemInDateRange(item: UnifiedCalendarItem, startDate?: string, endDate?: string): boolean {
    if (!startDate && !endDate) return true;
    if (!item.date) return false;
    const itemStart = item.date;
    const itemEnd = item.endDate || item.date;

    if (startDate && itemEnd < startDate) {
        return false;
    }
    if (endDate && itemStart > endDate) {
        return false;
    }
    return true;
}

export function formatTagDate(dateStr?: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        const [y, m, d] = parts;
        return `${d}.${m}.${y}`;
    }
    return dateStr;
}

export function formatTagDateInterval(startDate?: string, endDate?: string): string {
    if (!startDate && !endDate) return '';
    const startFormatted = formatTagDate(startDate);
    const endFormatted = formatTagDate(endDate);
    if (startFormatted && (!endFormatted || startFormatted === endFormatted)) {
        return startFormatted;
    }
    if (startFormatted && endFormatted) {
        return `${startFormatted} ➔ ${endFormatted}`;
    }
    return endFormatted || startFormatted;
}

interface UseCalendarItemsProps {
    events: CalendarEvent[];
    tasks: TaskItem[];
    stands: HrStand[];
    members?: HrMember[];
    clubs?: Club[];
    selectedTypeFilter: string;
    selectedDeptFilter: string;
    searchTerm: string;
    startDateFilter?: string;
    endDateFilter?: string;
}

export function useCalendarItems({
    events,
    tasks,
    stands,
    members = [],
    clubs = [],
    selectedTypeFilter,
    selectedDeptFilter,
    searchTerm,
    startDateFilter,
    endDateFilter
}: UseCalendarItemsProps) {
    const searchIndex = useMemo(() => {
        return buildGeneralDeepSearchIndex({
            query: searchTerm,
            stands,
            tasks,
            events,
            locations: [],
            members,
            clubs,
        });
    }, [searchTerm, stands, tasks, events, members, clubs]);

    return useMemo(() => {
        const unifiedItems: UnifiedCalendarItem[] = [
            ...events.map(e => ({
                id: `evt-${e.id}`,
                type: 'event' as const,
                title: e.title,
                description: e.description,
                date: e.date,
                endDate: e.endDate || e.date,
                time: e.time,
                department: e.department || 'general',
                isSpecialDemand: e.isSpecialDemand,
                demandMultiplier: e.demandMultiplier,
                demandTag: e.demandTag,
                raw: e,
            })),
            ...tasks
                .filter(t => !!t.dueDate || !!t.startDate)
                .map(t => ({
                id: `tsk-${t.id}`,
                type: 'task' as const,
                title: t.title,
                description: t.description,
                date: t.startDate || t.dueDate,
                endDate: t.dueDate || t.startDate,
                department: t.department || 'general',
                priority: t.priority,
                status: t.status,
                assignee: t.assignee,
                raw: t,
            })),
            ...stands
                .filter(s => !!s.eventDate)
                .map(s => {
                const totalAssignments = s.shifts?.reduce((acc, sh) => acc + (sh.assignments?.length || 0), 0) || 0;
                const shiftsTimes = s.shifts && s.shifts.length > 0
                    ? `${s.shifts[0].startTime || ''} - ${s.shifts[s.shifts.length - 1].endTime || ''}`
                    : undefined;
                return {
                    id: `std-${s.id}`,
                    type: 'stand' as const,
                    title: s.locationName || s.eventName || 'Stand',
                    description: s.notes,
                    date: s.eventDate,
                    time: shiftsTimes,
                    department: 'general',
                    status: s.status,
                    location: s.locationName,
                    shiftsCount: s.shifts?.length || 0,
                    assignmentsCount: totalAssignments,
                    raw: s,
                };
            }),
        ];

        return unifiedItems.filter(item => {
            if (selectedTypeFilter !== 'ALL' && item.type !== selectedTypeFilter) return false;
            if (selectedDeptFilter !== 'ALL' && item.department !== selectedDeptFilter) return false;
            if (startDateFilter || endDateFilter) {
                if (!isCalendarItemInDateRange(item, startDateFilter, endDateFilter)) return false;
            }
            if (searchIndex.isSearching) {
                if (item.type === 'event') {
                    return searchIndex.matchesEvent(item.raw as CalendarEvent);
                }
                if (item.type === 'task') {
                    return searchIndex.matchesTask(item.raw as TaskItem);
                }
                if (item.type === 'stand') {
                    return searchIndex.matchesStand(item.raw as HrStand);
                }
            }
            return true;
        });
    }, [events, tasks, stands, selectedTypeFilter, selectedDeptFilter, startDateFilter, endDateFilter, searchIndex]);
}
