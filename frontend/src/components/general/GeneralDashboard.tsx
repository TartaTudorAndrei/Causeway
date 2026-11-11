import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { usePermission } from '../../hooks/usePermission';
import { generalService, type CalendarEvent, type TaskItem, type LocationItem, type DepartmentItem } from '../../services/generalService';
import { hrService } from '../../services/hrService';
import { adminAuthService } from '../../services/adminAuthService';
import type { HrStand, HrMember } from '../../types/hr';
import type { Club } from '../../types/adminAuth';
import { DEFAULT_DEPARTMENTS } from '../../config/departments';
import { CalendarView } from './CalendarView';
import { MapView } from './MapView';
import { GeneralStatisticsView } from './GeneralStatisticsView';
import { GeneralInfoView, DASHBOARD_SECTIONS, canViewSectionInfo, canEditSectionInfo } from './GeneralInfoView';
import { TaskAssigneeSelector } from './TaskAssigneeSelector';
import { User as UserIcon, X, Trash2, Pencil } from 'lucide-react';
import { DashboardContainer, SubTabNav, FilterPopover, DashboardHeaderSection, SearchInput, DateRangePicker, TimePicker, ToastNotification, CustomSelect, ManageableSelect, ConfirmationModal } from '../common';
import { formatTagDateInterval } from './calendar/useCalendarItems';
import { buildGeneralDeepSearchIndex } from '../../utils/generalDeepSearch';
interface GeneralDashboardProps {
    isDarkMode: boolean;
}
const PRIORITY_WEIGHTS: Record<string, number> = {
    high: 3,
    medium: 2,
    low: 1,
};
const GENERAL_TAB_PERMISSIONS: Record<string, string> = {
    'calendar': 'general:calendar:view',
    'tasks': 'general:tasks:view',
    'map': 'general:map:view',
    'statistics': 'general:statistics:view',
    'info': 'general:info:view',
};

export const GeneralDashboard: React.FC<GeneralDashboardProps> = ({ isDarkMode }) => {
    const { t } = useLanguage();
    const { user, hasPermission, isSuperAdmin } = usePermission();

    const isTabAccessible = useCallback((tabId: string): boolean => {
        if (isSuperAdmin) return true;
        const code = GENERAL_TAB_PERMISSIONS[tabId];
        return code ? hasPermission(code) : true;
    }, [isSuperAdmin, hasPermission]);

    const [searchParams, setSearchParams] = useSearchParams();
    const validSubTabs = ['calendar', 'tasks', 'map', 'statistics', 'info'];
    const accessibleTabs = validSubTabs.filter(tab => isTabAccessible(tab));
    const rawSubTab = searchParams.get('subtab');
    const requestedTab = (rawSubTab && validSubTabs.includes(rawSubTab)) ? rawSubTab : 'calendar';
    const activeSubTab: 'calendar' | 'tasks' | 'map' | 'statistics' | 'info' = (isTabAccessible(requestedTab) ? requestedTab : (accessibleTabs[0] || 'calendar')) as any;

    const setSubTab = useCallback((subtab: 'calendar' | 'tasks' | 'map' | 'statistics' | 'info') => {
        if (!isTabAccessible(subtab)) return;
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('subtab', subtab);
            return next;
        });
    }, [isTabAccessible, setSearchParams]);

    useEffect(() => {
        if (rawSubTab && !isTabAccessible(rawSubTab)) {
            setSubTab(activeSubTab);
        }
    }, [rawSubTab, activeSubTab, isTabAccessible, setSubTab]);
    const canEditDepartment = (deptId: string): boolean => {
        if (isSuperAdmin)
            return true;
        switch (deptId) {
            case 'finance':
                return hasPermission('finance:expense:write', 'DEPARTMENT', 'finance-dept-uuid') ||
                    hasPermission('finance:expense:create', 'DEPARTMENT', 'finance-dept-uuid');
            case 'it':
                return hasPermission('it:settings:write', 'DEPARTMENT', 'it-dept-uuid');
            case 'fundraising':
                return hasPermission('fundraising:sponsor:write', 'DEPARTMENT', 'fundraising-dept-uuid');
            case 'logistics':
                return hasPermission('logistics:inventory:write', 'DEPARTMENT', 'logistics-dept-uuid');
            case 'hr':
                return hasPermission('hr:stand:write', 'DEPARTMENT', 'hr-dept-uuid');
            case 'legal':
                return hasPermission('legal:contract:write', 'DEPARTMENT', 'legal-dept-uuid');
            case 'marketing':
                return hasPermission('marketing:resource:write', 'DEPARTMENT', 'marketing-dept-uuid') || hasPermission('marketing:write');
            case 'general':
                return isSuperAdmin ||
                    hasPermission('general:task:write') ||
                    hasPermission('general:event:write') ||
                    hasPermission('general:write') ||
                    hasPermission('finance:expense:write', 'DEPARTMENT', 'finance-dept-uuid') ||
                    hasPermission('it:settings:write', 'DEPARTMENT', 'it-dept-uuid') ||
                    hasPermission('fundraising:sponsor:write', 'DEPARTMENT', 'fundraising-dept-uuid') ||
                    hasPermission('logistics:inventory:write', 'DEPARTMENT', 'logistics-dept-uuid') ||
                    hasPermission('hr:stand:write', 'DEPARTMENT', 'hr-dept-uuid') ||
                    hasPermission('legal:contract:write', 'DEPARTMENT', 'legal-dept-uuid') ||
                    hasPermission('marketing:resource:write', 'DEPARTMENT', 'marketing-dept-uuid') ||
                    hasPermission('marketing:write');
            default:
                return hasPermission('general:task:write') || hasPermission('general:write');
        }
    };
    const [departments, setDepartments] = useState<DepartmentItem[]>(DEFAULT_DEPARTMENTS);
    const canEditAnyDept = departments.some(d => canEditDepartment(d.id));
    const canWriteLocations = isSuperAdmin || canEditDepartment('hr') || canEditDepartment('logistics') || canEditDepartment('it') || canEditDepartment('general');
    // Database Data States
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [tasks, setTasks] = useState<TaskItem[]>([]);
    const [stands, setStands] = useState<HrStand[]>([]);
    const [locations, setLocations] = useState<LocationItem[]>([]);
    const [members, setMembers] = useState<HrMember[]>([]);
    const [clubs, setClubs] = useState<Club[]>([]);
    const [isAddLocationModalOpen, setIsAddLocationModalOpen] = useState(false);
    const [isLocationsModalOpen, setIsLocationsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    // General Info Tab State
    const [selectedInfoSection, setSelectedInfoSection] = useState<string>(() => {
        const param = searchParams.get('section');
        return (param && DASHBOARD_SECTIONS.some(s => s.value === param)) ? param : 'general';
    });
    const [isEditInfoModalOpen, setIsEditInfoModalOpen] = useState<boolean>(false);

    const accessibleInfoSections = useMemo(() => {
        return DASHBOARD_SECTIONS.filter((sec) => canViewSectionInfo(sec.value, isSuperAdmin, hasPermission));
    }, [isSuperAdmin, hasPermission]);

    useEffect(() => {
        if (accessibleInfoSections.length > 0 && !accessibleInfoSections.some(s => s.value === selectedInfoSection)) {
            const fallback = accessibleInfoSections[0].value;
            setSelectedInfoSection(fallback);
            setSearchParams(prev => {
                const next = new URLSearchParams(prev);
                if (fallback !== 'general') next.set('section', fallback);
                else next.delete('section');
                return next;
            }, { replace: true });
        }
    }, [accessibleInfoSections, selectedInfoSection, setSearchParams]);

    const sectionParam = searchParams.get('section');
    useEffect(() => {
        if (sectionParam && sectionParam !== selectedInfoSection && DASHBOARD_SECTIONS.some(s => s.value === sectionParam)) {
            setSelectedInfoSection(sectionParam);
        }
    }, [sectionParam, selectedInfoSection]);

    const handleSelectInfoSection = (sec: string) => {
        setSelectedInfoSection(sec);
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (sec && sec !== 'general') next.set('section', sec);
            else next.delete('section');
            return next;
        }, { replace: true });
    };

    const infoSectionOptions = useMemo(() => {
        return accessibleInfoSections.map((sec) => ({
            value: sec.value,
            label: t(sec.key, sec.fallback),
        }));
    }, [accessibleInfoSections, t]);

    const canEditCurrentInfoSection = useMemo(() => {
        return canEditSectionInfo(selectedInfoSection, isSuperAdmin, hasPermission);
    }, [selectedInfoSection, isSuperAdmin, hasPermission]);
    // Confirmation Modal State
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title?: string;
        message: string;
        onConfirm: () => Promise<void> | void;
        isLoading?: boolean;
    }>({
        isOpen: false,
        message: '',
        onConfirm: () => {},
        isLoading: false,
    });
    // Toast
    const [toastMessage, setToastMessage] = useState<{
        text: string;
        type: 'success' | 'error';
    } | null>(null);
    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        setToastMessage({ text, type });
    };
    // Load from backend database
    const fetchData = useCallback(async () => {
        try {
            const [evts, tsks, stnds, locs, mems, clbs, depts] = await Promise.all([
                generalService.getEvents().catch(() => []),
                generalService.getTasks().catch(() => []),
                hrService.getStands().catch(() => []),
                generalService.getLocations().catch(() => []),
                hrService.getMembers().catch(() => []),
                adminAuthService.getClubs().catch(() => []),
                generalService.getDepartments().catch(() => []),
            ]);
            setEvents(evts);
            setTasks(tsks);
            setStands(stnds);
            setLocations(locs);
            setMembers(mems || []);
            setClubs(clbs || []);
            if (depts && depts.length > 0) {
                setDepartments(depts);
            }
        }
        catch (err) {
            console.error('Failed to load general data from DB', err);
        }
        finally {
            setIsLoading(false);
        }
    }, []);
    const canManageDepartments = isSuperAdmin || hasPermission('general:task:write') || hasPermission('general:write');

    const handleCreateDepartment = async (name: string) => {
        try {
            const created = await generalService.createDepartment({ name });
            setDepartments(prev => [...prev, created]);
            showToast(t('general.departmentAdded', 'Departamentul a fost adăugat.'), 'success');
            return created.id;
        } catch (err: any) {
            showToast(err?.message || t('common.errorSave', 'Eroare la salvare'), 'error');
            throw err;
        }
    };

    const handleRenameDepartment = async (id: string, newName: string) => {
        try {
            await generalService.updateDepartment(id, { name: newName });
            setDepartments(prev => prev.map(d => d.id === id ? { ...d, name: newName, fallback: newName } : d));
            showToast(t('general.departmentUpdated', 'Departamentul a fost actualizat.'), 'success');
        } catch (err: any) {
            showToast(err?.message || t('common.errorUpdate', 'Eroare la actualizare'), 'error');
            throw err;
        }
    };

    const handleDeleteDepartment = async (id: string) => {
        try {
            await generalService.deleteDepartment(id);
            setDepartments(prev => prev.filter(d => d.id !== id));
            showToast(t('general.departmentDeleted', 'Departamentul a fost șters.'), 'success');
        } catch (err: any) {
            showToast(err?.message || t('general.departmentDeleteError', 'Nu se poate șterge departamentul. Este protejat sau în uz.'), 'error');
            throw err;
        }
    };

    const handleSaveLocation = async (locData: Partial<LocationItem>, id?: string) => {
        if (id) {
            const updated = await generalService.updateLocation(id, locData);
            setLocations(prev => prev.map(l => l.id === id ? updated : l));
        }
        else {
            const created = await generalService.createLocation(locData);
            setLocations(prev => [created, ...prev]);
        }
    };
    const handleDeleteLocation = async (id: string) => {
        try {
            await generalService.deleteLocation(id);
            setLocations(prev => prev.filter(l => l.id !== id));
            showToast(t('general.locationDeleted', 'Locația a fost ștearsă.'), 'success');
        }
        catch (err: any) {
            showToast(err?.message || t('general.locationDeleteError', 'Nu se poate șterge locația. Aceasta este în uz sau protejată.'), 'error');
            throw err;
        }
    };
    useEffect(() => {
        fetchData();
    }, [fetchData]);
    // Filters & Search
    const selectedDeptFilter = searchParams.get('dept') || 'ALL';
    const setSelectedDeptFilter = (dept: string) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (dept && dept !== 'ALL')
                next.set('dept', dept);
            else
                next.delete('dept');
            return next;
        }, { replace: true });
    };
    const searchTerm = searchParams.get('search') || '';
    const handleSearchChange = (term: string) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (term)
                next.set('search', term);
            else
                next.delete('search');
            return next;
        }, { replace: true });
    };

    const deepSearchIndex = useMemo(() => {
        return buildGeneralDeepSearchIndex({
            query: searchTerm,
            stands,
            tasks,
            events,
            locations,
            members,
            clubs,
        });
    }, [searchTerm, stands, tasks, events, locations, members, clubs]);
    const selectedStatusFilter = searchParams.get('status') || 'ALL';
    const setSelectedStatusFilter = (status: string) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (status && status !== 'ALL')
                next.set('status', status);
            else
                next.delete('status');
            return next;
        }, { replace: true });
    };
    const selectedPriorityFilter = searchParams.get('priority') || 'ALL';
    const setSelectedPriorityFilter = (priority: string) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (priority && priority !== 'ALL')
                next.set('priority', priority);
            else
                next.delete('priority');
            return next;
        }, { replace: true });
    };
    const taskSortBy = searchParams.get('sort') || 'deadline_asc';
    const setTaskSortBy = (sort: string) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (sort && sort !== 'deadline_asc')
                next.set('sort', sort);
            else
                next.delete('sort');
            return next;
        }, { replace: true });
    };
    const calStartDate = searchParams.get('startDate') || '';
    const calEndDate = searchParams.get('endDate') || '';
    const taskStartDateFilter = searchParams.get('taskStartDate') || '';
    const taskEndDateFilter = searchParams.get('taskEndDate') || '';
    // Modals
    const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
    const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
    // New Event Form State
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventDesc, setNewEventDesc] = useState('');
    const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split('T')[0]);
    const [newEventEndDate, setNewEventEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [newEventTime, setNewEventTime] = useState('12:00');
    const [newEventDept, setNewEventDept] = useState('general');
    const [newEventIsSpecialDemand, setNewEventIsSpecialDemand] = useState(false);
    const [newEventDemandMultiplier, setNewEventDemandMultiplier] = useState(2.0);
    const [newEventDemandTag, setNewEventDemandTag] = useState('CONCERT');
    const [eventFormError, setEventFormError] = useState<string | null>(null);
    // New Task Form State
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [newTaskDept, setNewTaskDept] = useState('general');
    const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [newTaskStatus, setNewTaskStatus] = useState<'todo' | 'in_progress' | 'done'>('todo');
    const [newTaskReminderCount, setNewTaskReminderCount] = useState<number | ''>(3);
    const [newTaskAssignee, setNewTaskAssignee] = useState('');
    const [selectedTaskAssigneeIds, setSelectedTaskAssigneeIds] = useState<string[]>([]);
    const [selectedTaskAssigneeNames, setSelectedTaskAssigneeNames] = useState<string[]>([]);
    const [newTaskStartDate, setNewTaskStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [newTaskDueDate, setNewTaskDueDate] = useState(new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]);
    const [taskFormError, setTaskFormError] = useState<string | null>(null);
    const [isSubmittingTask, setIsSubmittingTask] = useState(false);
    const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
    // Keyboard Escape listener
    useEffect(() => {
        if (!isAddEventModalOpen && !isAddTaskModalOpen)
            return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsAddEventModalOpen(false);
                setIsAddTaskModalOpen(false);
                setEditingTaskId(null);
                setSelectedTaskAssigneeIds([]);
                setSelectedTaskAssigneeNames([]);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isAddEventModalOpen, isAddTaskModalOpen]);
    // Department Badges Color Map
    const getDeptColor = (deptId: string) => {
        switch (deptId) {
            case 'finance': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'it': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'fundraising': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
            case 'logistics': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            case 'hr': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
            case 'legal': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
            case 'marketing': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
        }
    };
    const handleAddEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmittingEvent) return;
        if (!newEventTitle.trim())
            return;
        if (!canEditDepartment(newEventDept)) {
            setEventFormError(t('general.noPermissionDept', 'Nu aveți permisiuni de editare pentru departamentul selectat.'));
            return;
        }
        setIsSubmittingEvent(true);
        try {
            const created = await generalService.createEvent({
                title: newEventTitle,
                description: newEventDesc,
                date: newEventDate,
                endDate: newEventEndDate || newEventDate,
                time: newEventTime,
                department: newEventDept,
                createdBy: user?.email || 'user',
                isSpecialDemand: newEventIsSpecialDemand,
                demandMultiplier: newEventIsSpecialDemand ? newEventDemandMultiplier : 1.0,
                demandTag: newEventIsSpecialDemand ? newEventDemandTag : undefined,
            });
            setEvents(prev => [created, ...prev]);
            setIsAddEventModalOpen(false);
            setNewEventTitle('');
            setNewEventDesc('');
            setNewEventDate(new Date().toISOString().split('T')[0]);
            setNewEventEndDate(new Date().toISOString().split('T')[0]);
            setNewEventIsSpecialDemand(false);
            setNewEventDemandMultiplier(2.0);
            setNewEventDemandTag('CONCERT');
            setEventFormError(null);
        }
        catch (err: any) {
            setEventFormError(err.message || 'Eroare la salvarea evenimentului');
        }
        finally {
            setIsSubmittingEvent(false);
        }
    };
    const handleOpenEditTask = (task: TaskItem) => {
        if (!canEditDepartment(task.department)) {
            showToast(t('general.noPermissionDept', 'Nu aveți permisiuni de editare pentru departamentul selectat.'), 'error');
            return;
        }
        setEditingTaskId(task.id);
        setNewTaskTitle(task.title);
        setNewTaskDesc(task.description || '');
        setNewTaskDept(task.department);
        setNewTaskPriority(task.priority);
        setNewTaskStatus(task.status);
        setNewTaskReminderCount(task.reminderCount !== undefined && task.reminderCount !== null ? task.reminderCount : 3);
        const rawAssignee = task.assignee === 'Unassigned' ? '' : (task.assignee || '');
        setNewTaskAssignee(rawAssignee);
        const parsedNames = rawAssignee ? rawAssignee.split(',').map(s => s.trim()).filter(Boolean) : [];
        let parsedIds: string[] = [];
        if (task.assigneeIds && Array.isArray(task.assigneeIds)) {
            parsedIds = task.assigneeIds;
        } else if (typeof (task as any).assigneeIds === 'string' && (task as any).assigneeIds.trim()) {
            parsedIds = (task as any).assigneeIds.replace(/[[\]"]/g, '').split(',').map((s: string) => s.trim()).filter(Boolean);
        }
        setSelectedTaskAssigneeIds(parsedIds);
        setSelectedTaskAssigneeNames(parsedNames);
        setNewTaskStartDate(task.startDate || task.dueDate || new Date().toISOString().split('T')[0]);
        setNewTaskDueDate(task.dueDate || new Date().toISOString().split('T')[0]);
        setTaskFormError(null);
        setIsAddTaskModalOpen(true);
    };
    const handleCreateOrUpdateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmittingTask) return;
        if (!newTaskTitle.trim()) {
            setTaskFormError(t('general.enterTaskTitle', 'Introduceți un titlu pentru sarcină.'));
            return;
        }
        if (!canEditDepartment(newTaskDept)) {
            setTaskFormError(t('general.noPermissionDept', 'Nu aveți permisiuni de editare pentru departamentul selectat.'));
            return;
        }
        const finalAssigneeNames = selectedTaskAssigneeNames.length > 0
            ? selectedTaskAssigneeNames.join(', ')
            : (newTaskAssignee.trim() || 'Unassigned');

        setIsSubmittingTask(true);
        try {
            if (editingTaskId) {
                const updated = await generalService.updateTask(editingTaskId, {
                    title: newTaskTitle.trim(),
                    description: newTaskDesc.trim(),
                    department: newTaskDept,
                    priority: newTaskPriority,
                    status: newTaskStatus,
                    reminderCount: typeof newTaskReminderCount === 'number' ? newTaskReminderCount : 0,
                    assignee: finalAssigneeNames,
                    assigneeIds: selectedTaskAssigneeIds,
                    startDate: newTaskStartDate || undefined,
                    dueDate: newTaskDueDate || undefined,
                });
                setTasks(prev => prev.map(item => item.id === editingTaskId ? updated : item));
            }
            else {
                const created = await generalService.createTask({
                    title: newTaskTitle.trim(),
                    description: newTaskDesc.trim(),
                    department: newTaskDept,
                    priority: newTaskPriority,
                    status: newTaskStatus,
                    reminderCount: typeof newTaskReminderCount === 'number' ? newTaskReminderCount : 0,
                    assignee: finalAssigneeNames,
                    assigneeIds: selectedTaskAssigneeIds,
                    startDate: newTaskStartDate || undefined,
                    dueDate: newTaskDueDate || undefined,
                });
                setTasks(prev => [created, ...prev]);
            }
            setIsAddTaskModalOpen(false);
            setEditingTaskId(null);
            setNewTaskTitle('');
            setNewTaskDesc('');
            setNewTaskAssignee('');
            setSelectedTaskAssigneeIds([]);
            setSelectedTaskAssigneeNames([]);
            setNewTaskReminderCount(3);
            setNewTaskStartDate(new Date().toISOString().split('T')[0]);
            setNewTaskDueDate(new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]);
            setTaskFormError(null);
        }
        catch (err: any) {
            setTaskFormError(err.message || 'Eroare la salvarea sarcinii');
        }
        finally {
            setIsSubmittingTask(false);
        }
    };
    const handleStatusChange = async (taskId: string, newStatus: 'todo' | 'in_progress' | 'done') => {
        const targetTask = tasks.find(t => t.id === taskId);
        if (!targetTask)
            return;
        if (!canEditDepartment(targetTask.department)) {
            showToast(t('general.noPermissionDept', 'Nu aveți permisiuni de editare pentru departamentul selectat.'), 'error');
            return;
        }
        try {
            const updated = await generalService.updateTask(taskId, { ...targetTask, status: newStatus });
            setTasks(prev => prev.map(item => item.id === taskId ? updated : item));
        }
        catch (err) {
            console.error('Failed to update task status in DB', err);
        }
    };
    const handleDeleteEvent = (eventId: string, dept: string) => {
        if (!canEditDepartment(dept)) {
            showToast(t('general.noPermissionDept', 'Nu aveți permisiuni de editare pentru departamentul selectat.'), 'error');
            return;
        }
        setConfirmDialog({
            isOpen: true,
            title: t('general.deleteEventTitle', 'Șterge Eveniment'),
            message: t('general.deleteEventConfirm', 'Sigur doriți să ștergeți acest eveniment?'),
            onConfirm: async () => {
                try {
                    await generalService.deleteEvent(eventId);
                    setEvents(prev => prev.filter(e => e.id !== eventId));
                    showToast(t('general.eventDeleted', 'Evenimentul a fost șters.'));
                } catch (err: any) {
                    console.error('Failed to delete event from DB', err);
                    showToast(err?.message || t('common.errorDelete', 'Eroare la ștergere'), 'error');
                } finally {
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };
    const handleDeleteTask = (taskId: string, dept: string) => {
        if (!canEditDepartment(dept)) {
            showToast(t('general.noPermissionDept', 'Nu aveți permisiuni de editare pentru departamentul selectat.'), 'error');
            return;
        }
        setConfirmDialog({
            isOpen: true,
            title: t('general.deleteTaskTitle', 'Șterge Sarcină'),
            message: t('general.deleteTaskConfirm', 'Sigur doriți să ștergeți această sarcină?'),
            onConfirm: async () => {
                try {
                    await generalService.deleteTask(taskId);
                    setTasks(prev => prev.filter(t => t.id !== taskId));
                    showToast(t('general.taskDeleted', 'Sarcina a fost ștearsă.'));
                } catch (err: any) {
                    console.error('Failed to delete task from DB', err);
                    showToast(err?.message || t('common.errorDelete', 'Eroare la ștergere'), 'error');
                } finally {
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };
    // Filtered Tasks for Tasks Kanban View
    const filteredTasks = tasks
        .filter(tItem => {
        const matchesDept = selectedDeptFilter === 'ALL' || tItem.department === selectedDeptFilter;
        const matchesStatus = selectedStatusFilter === 'ALL' || tItem.status === selectedStatusFilter;
        const matchesPriority = selectedPriorityFilter === 'ALL' || tItem.priority === selectedPriorityFilter;
        const matchesSearch = deepSearchIndex.matchesTask(tItem);
        const matchesDate = (() => {
            if (!taskStartDateFilter && !taskEndDateFilter) return true;
            const tStart = tItem.startDate || tItem.dueDate;
            const tEnd = tItem.dueDate || tItem.startDate;
            if (!tStart && !tEnd) return false;
            if (taskStartDateFilter && (tEnd || tStart)! < taskStartDateFilter) return false;
            if (taskEndDateFilter && (tStart || tEnd)! > taskEndDateFilter) return false;
            return true;
        })();
        return matchesDept && matchesStatus && matchesPriority && matchesSearch && matchesDate;
    })
        .sort((a, b) => {
        if (taskSortBy === 'deadline_asc') {
            if (!a.dueDate && !b.dueDate)
                return 0;
            if (!a.dueDate)
                return 1;
            if (!b.dueDate)
                return -1;
            return a.dueDate.localeCompare(b.dueDate);
        }
        if (taskSortBy === 'deadline_desc') {
            if (!a.dueDate && !b.dueDate)
                return 0;
            if (!a.dueDate)
                return 1;
            if (!b.dueDate)
                return -1;
            return b.dueDate.localeCompare(a.dueDate);
        }
        if (taskSortBy === 'priority_desc') {
            return (PRIORITY_WEIGHTS[b.priority] || 0) - (PRIORITY_WEIGHTS[a.priority] || 0);
        }
        if (taskSortBy === 'priority_low') {
            return (PRIORITY_WEIGHTS[a.priority] || 0) - (PRIORITY_WEIGHTS[b.priority] || 0);
        }
        if (taskSortBy === 'newest') {
            return b.id.localeCompare(a.id);
        }
        if (taskSortBy === 'oldest') {
            return a.id.localeCompare(b.id);
        }
        return 0;
    });
    // Dark / Light CSS helpers
    const tCss = {
        card: isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900 shadow-sm',
        border: isDarkMode ? 'border-zinc-800' : 'border-zinc-200',
        input: isDarkMode
            ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 focus:border-blue-500'
            : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-blue-500',
        subtabActive: isDarkMode ? 'bg-zinc-800 text-white shadow-xs border-zinc-700' : 'bg-white text-zinc-900 shadow-xs border-zinc-300',
        subtabInactive: isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100',
    };
    // Helper render for task cards
    const renderTaskCard = (task: TaskItem) => {
        const deptObj = departments.find(d => d.id === task.department);
        const canEditThis = canEditDepartment(task.department);
        const getPriorityBadge = (p: 'low' | 'medium' | 'high') => {
            switch (p) {
                case 'high': return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase">{t('general.high', 'Ridicată')}</span>;
                case 'medium': return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">{t('general.medium', 'Medie')}</span>;
                case 'low': return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 uppercase">{t('general.low', 'Scăzută')}</span>;
            }
        };
        const todayStr = new Date().toISOString().split('T')[0];
        const isOverdue = Boolean(task.dueDate && task.dueDate < todayStr && task.status !== 'done');
        const isDueToday = Boolean(task.dueDate && task.dueDate === todayStr && task.status !== 'done');
        return (<div key={task.id} className={`p-3.5 rounded-xl border space-y-2.5 transition-all ${isDarkMode ? 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700' : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
            <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md border uppercase tracking-wider ${getDeptColor(task.department)}`}>
              {t(deptObj?.key || '', deptObj?.fallback || task.department)}
            </span>
            {getPriorityBadge(task.priority)}
          </div>

          {canEditThis ? (<div className="flex items-center space-x-1 shrink-0">
              <button onClick={() => handleOpenEditTask(task)} title={t('general.edit', 'Editează')} className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition cursor-pointer">
                <Pencil className="w-3.5 h-3.5"/>
              </button>
              <button onClick={() => handleDeleteTask(task.id, task.department)} title={t('general.delete', 'Șterge')} className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer">
                <Trash2 className="w-3.5 h-3.5"/>
              </button>
            </div>) : (<span title={t('general.noPermissionDept', 'Fără permisiune')}></span>)}
        </div>
<div>
          <h4 className="font-bold text-xs sm:text-sm">{task.title}</h4>
          {task.description && (<p className="text-xs text-zinc-400 mt-1 leading-relaxed">{task.description}</p>)}
        </div>

        {/* Due Date & Assignees */}
        <div className="pt-2 border-t border-zinc-800/40 flex items-center justify-between text-[11px] text-zinc-400 flex-wrap gap-1.5">
          <div className="flex items-center space-x-1.5 min-w-0 max-w-[220px] flex-wrap gap-y-1">
            <UserIcon className="w-3 h-3 text-zinc-500 shrink-0"/>
            <div className="flex items-center flex-wrap gap-1 min-w-0">
              {task.assignee && task.assignee !== 'Unassigned' ? (
                task.assignee.split(',').map((name, idx) => (
                  <span
                    key={idx}
                    className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium border truncate max-w-[110px] ${
                      isDarkMode
                        ? 'bg-zinc-800/80 text-zinc-300 border-zinc-700/60'
                        : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                    }`}
                  >
                    {name.trim()}
                  </span>
                ))
              ) : (
                <span className="text-zinc-500 italic text-[10px]">{t('general.noAssignees', 'Neasignat')}</span>
              )}
            </div>
          </div>

          {task.dueDate && (<span className={`flex items-center space-x-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${isOverdue
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 font-bold'
                    : isDueToday
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 font-bold'
                        : isDarkMode ? 'bg-zinc-800/60 text-zinc-400 border-zinc-700/60' : 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}><span>
                {formatTagDateInterval(task.startDate, task.dueDate)}
                {isOverdue && ` (${t('general.overdue', 'Depășit')})`}
                {isDueToday && ` (${t('general.dueToday', 'Scadență Azi')})`}
              </span>
            </span>)}
        </div>

        {/* Status Change Selector */}
        <div className="pt-1.5 flex items-center justify-between text-[11px]">
          <span className="text-[10px] text-zinc-500 font-medium">{t('general.status', 'Stare')}:</span>
          {canEditThis ? (<select value={task.status} onChange={(e) => handleStatusChange(task.id, e.target.value as any)} className={`px-2 py-0.5 text-[11px] font-semibold rounded-lg border outline-none cursor-pointer ${tCss.input}`}>
              <option value="todo">{t('general.todo', 'De făcut')}</option>
              <option value="in_progress">{t('general.inProgress', 'În lucru')}</option>
              <option value="done">{t('general.done', 'Finalizat')}</option>
            </select>) : (<span className="px-2 py-0.5 text-[11px] font-semibold rounded-lg bg-zinc-800 text-zinc-400 border border-zinc-700">
              {task.status === 'todo' && t('general.todo', 'De făcut')}
              {task.status === 'in_progress' && t('general.inProgress', 'În lucru')}
              {task.status === 'done' && t('general.done', 'Finalizat')}
            </span>)}
        </div>
      </div>);
    };
    return (<DashboardContainer noScroll={activeSubTab !== 'tasks'} className={activeSubTab === 'tasks' ? 'overflow-y-auto md:overflow-hidden' : undefined}>

      {/* Unified Dashboard Sub-Header + Filter & Action Controls */}
      <DashboardHeaderSection isDarkMode={isDarkMode} activeTabLabel={activeSubTab === 'calendar'
            ? t('general.calendar', 'Calendar')
            : activeSubTab === 'tasks'
                ? t('general.tasks', 'Sarcini')
                : activeSubTab === 'map'
                    ? t('general.map', 'Hartă')
                    : activeSubTab === 'info' ? t('general.info', 'Info') : t('common.tabStatistics', 'Statistici')} activeFilterCount={activeSubTab === 'tasks'
            ? (selectedDeptFilter !== 'ALL' ? 1 : 0) +
                (selectedStatusFilter !== 'ALL' ? 1 : 0) +
                (selectedPriorityFilter !== 'ALL' ? 1 : 0) +
                (taskSortBy !== 'deadline_asc' ? 1 : 0) +
                (taskStartDateFilter || taskEndDateFilter ? 1 : 0)
            : activeSubTab === 'map'
                ? (searchParams.get('type') && searchParams.get('type') !== 'ALL' ? 1 : 0)
                : activeSubTab === 'calendar' ? ((searchParams.get('type') && searchParams.get('type') !== 'ALL' ? 1 : 0) +
                    (searchParams.get('dept') && searchParams.get('dept') !== 'ALL' ? 1 : 0) +
                    (calStartDate || calEndDate ? 1 : 0)) : 0} searchQuery={searchTerm} subTabNav={<SubTabNav<'calendar' | 'tasks' | 'map' | 'statistics' | 'info'> tabs={[
                { id: 'calendar', label: t('general.calendar', 'Calendar'), disabled: !isTabAccessible('calendar') },
                { id: 'tasks', label: t('general.tasks', 'Sarcini'), disabled: !isTabAccessible('tasks') },
                { id: 'map', label: t('general.map', 'Hartă'), disabled: !isTabAccessible('map') },
                { id: 'statistics', label: t('common.tabStatistics', 'Statistici'), disabled: !isTabAccessible('statistics') },
                { id: 'info', label: t('general.info', 'Info'), disabled: !isTabAccessible('info') },
            ]} activeTab={activeSubTab} onChange={(tabId) => setSubTab(tabId)} isDarkMode={isDarkMode}/>} controls={activeSubTab === 'calendar' ? (
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full">
                <SearchInput
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder={t('general.searchPlaceholder', 'Caută...')}
                  isDarkMode={isDarkMode}
                  className="flex-1 min-w-0 sm:w-64 md:w-80 sm:flex-initial order-1"
                />
                <div className="order-2 sm:order-2 sm:ml-auto shrink-0">
                  <FilterPopover activeCount={(searchParams.get('type') && searchParams.get('type') !== 'ALL' ? 1 : 0) +
                    (searchParams.get('dept') && searchParams.get('dept') !== 'ALL' ? 1 : 0) +
                    (calStartDate || calEndDate ? 1 : 0)} onReset={() => {
                    setSearchParams(prev => {
                        const next = new URLSearchParams(prev);
                        next.delete('type');
                        next.delete('dept');
                        next.delete('startDate');
                        next.delete('endDate');
                        return next;
                    }, { replace: true });
                  }} isDarkMode={isDarkMode}>
                    <div className="space-y-3.5">
                      {/* Type Filter */}
                      <CustomSelect
                        label={t('general.type', 'Tip Element')}
                        value={searchParams.get('type') || 'ALL'}
                        onChange={(val) => {
                          setSearchParams(prev => {
                            const next = new URLSearchParams(prev);
                            if (val && val !== 'ALL') next.set('type', val);
                            else next.delete('type');
                            return next;
                          });
                        }}
                        options={[
                          { value: 'ALL', label: t('general.allTypes', 'Toate Tipurile') },
                          { value: 'event', label: t('general.typeEvents', 'Evenimente') },
                          { value: 'task', label: t('general.typeTasks', 'Sarcini') },
                          { value: 'stand', label: t('general.typeStands', 'Standuri') },
                        ]}
                        isDarkMode={isDarkMode}
                      />

                      {/* Department Filter */}
                      <CustomSelect
                        label={t('general.allDepts', 'Departament')}
                        value={searchParams.get('dept') || 'ALL'}
                        onChange={(val) => {
                          setSearchParams(prev => {
                            const next = new URLSearchParams(prev);
                            if (val && val !== 'ALL') next.set('dept', val);
                            else next.delete('dept');
                            return next;
                          });
                        }}
                        options={[
                          { value: 'ALL', label: t('general.allDepts', 'Toate Departamentele') },
                          ...departments.map(d => ({
                            value: d.id,
                            label: d.key ? t(d.key, d.fallback || d.name) : d.name,
                          })),
                        ]}
                        isDarkMode={isDarkMode}
                      />

                      {/* Date Range Filter */}
                      <div>
                        <DateRangePicker
                          label={t('general.dateInterval', 'Perioadă')}
                          startDate={calStartDate}
                          endDate={calEndDate}
                          onChange={(range) => {
                            setSearchParams(prev => {
                              const next = new URLSearchParams(prev);
                              if (range.startDate) next.set('startDate', range.startDate);
                              else next.delete('startDate');
                              if (range.endDate) next.set('endDate', range.endDate);
                              else next.delete('endDate');
                              return next;
                            }, { replace: true });
                          }}
                          isDarkMode={isDarkMode}
                          clearable
                        />
                      </div>
                    </div>
                  </FilterPopover>
                </div>

                {canEditAnyDept && (
                  <div className="order-3 w-full sm:w-auto flex items-center justify-end shrink-0">
                    <button onClick={() => {
                        setEventFormError(null);
                        setIsAddEventModalOpen(true);
                    }} className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer shrink-0">
                      <span>{t('general.addEvent', 'Adaugă Eveniment')}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : activeSubTab === 'map' ? (
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full">
                <SearchInput
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder={t('general.searchLocations', 'Caută locații...')}
                  isDarkMode={isDarkMode}
                  className="flex-1 min-w-0 sm:w-64 md:w-80 sm:flex-initial order-1"
                />

                <div className="order-2 sm:order-2 sm:ml-auto shrink-0">
                  <FilterPopover activeCount={searchParams.get('type') && searchParams.get('type') !== 'ALL' ? 1 : 0} onReset={() => {
                    setSearchParams(prev => {
                        const next = new URLSearchParams(prev);
                        next.delete('type');
                        return next;
                    });
                  }} isDarkMode={isDarkMode}>
                    <CustomSelect
                      label={t('general.locationType', 'Tip Locație')}
                      value={searchParams.get('type') || 'ALL'}
                      onChange={(val) => {
                        setSearchParams(prev => {
                          const next = new URLSearchParams(prev);
                          if (val && val !== 'ALL') next.set('type', val);
                          else next.delete('type');
                          return next;
                        });
                      }}
                      options={[
                        { value: 'ALL', label: t('general.allTypes', 'Toate Tipurile') },
                        { value: 'STAND', label: t('general.typeStand', 'Standuri') },
                        { value: 'DEPOSIT', label: t('general.typeDeposit', 'Depozite') },
                      ]}
                      isDarkMode={isDarkMode}
                    />
                  </FilterPopover>
                </div>

                <div className="order-3 w-full sm:w-auto flex items-center justify-end gap-2 shrink-0">
                  <button onClick={() => setIsLocationsModalOpen(true)} className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 border ${isDarkMode ? 'bg-zinc-800/80 hover:bg-zinc-800 text-zinc-200 border-zinc-700/60' : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-300 shadow-2xs'}`}>
                    <span>{t('general.locationsList', 'Listă Locații')}</span>
                  </button>

                  {canWriteLocations && (
                    <button onClick={() => {
                        setIsAddLocationModalOpen(true);
                    }} className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer shrink-0">
                      <span>{t('general.addLocation', 'Adaugă Locație')}</span>
                    </button>
                  )}
                </div>
              </div>
            ) : activeSubTab === 'tasks' ? (
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full">
                <SearchInput
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder={t('general.searchTasks', 'Caută sarcini...')}
                  isDarkMode={isDarkMode}
                  className="flex-1 min-w-0 sm:w-64 md:w-80 sm:flex-initial order-1"
                />

                <div className="order-2 sm:order-2 sm:ml-auto shrink-0">
                  <FilterPopover activeCount={(selectedDeptFilter !== 'ALL' ? 1 : 0) +
                    (selectedStatusFilter !== 'ALL' ? 1 : 0) +
                    (selectedPriorityFilter !== 'ALL' ? 1 : 0) +
                    (taskSortBy !== 'deadline_asc' ? 1 : 0) +
                    (taskStartDateFilter || taskEndDateFilter ? 1 : 0)} onReset={() => {
                    setSelectedDeptFilter('ALL');
                    setSelectedStatusFilter('ALL');
                    setSelectedPriorityFilter('ALL');
                    setTaskSortBy('deadline_asc');
                    setSearchParams(prev => {
                        const next = new URLSearchParams(prev);
                        next.delete('taskStartDate');
                        next.delete('taskEndDate');
                        return next;
                    }, { replace: true });
                  }} isDarkMode={isDarkMode}>
                    <div className="space-y-3.5">
                      {/* Department Filter */}
                      <CustomSelect
                        label={t('general.allDepts', 'Departament')}
                        value={selectedDeptFilter}
                        onChange={(val) => setSelectedDeptFilter(val)}
                        options={[
                          { value: 'ALL', label: t('general.allDepts', 'Toate Departamentele') },
                          ...departments.map(d => ({
                            value: d.id,
                            label: d.key ? t(d.key, d.fallback || d.name) : d.name,
                          })),
                        ]}
                        isDarkMode={isDarkMode}
                      />

                      {/* Status Filter */}
                      <CustomSelect
                        label={t('general.allStatuses', 'Stare')}
                        value={selectedStatusFilter}
                        onChange={(val) => setSelectedStatusFilter(val)}
                        options={[
                          { value: 'ALL', label: t('general.allStatuses', 'Toate Stările') },
                          { value: 'todo', label: t('general.todo', 'De făcut') },
                          { value: 'in_progress', label: t('general.inProgress', 'În lucru') },
                          { value: 'done', label: t('general.done', 'Finalizat') },
                        ]}
                        isDarkMode={isDarkMode}
                      />

                      {/* Priority Filter */}
                      <CustomSelect
                        label={t('general.allPriorities', 'Prioritate')}
                        value={selectedPriorityFilter}
                        onChange={(val) => setSelectedPriorityFilter(val)}
                        options={[
                          { value: 'ALL', label: t('general.allPriorities', 'Toate Prioritățile') },
                          { value: 'high', label: t('general.high', 'Ridicată') },
                          { value: 'medium', label: t('general.medium', 'Medie') },
                          { value: 'low', label: t('general.low', 'Scăzută') },
                        ]}
                        isDarkMode={isDarkMode}
                      />

                      {/* Sort By Selector */}
                      <CustomSelect
                        label={t('general.sortBy', 'Sortează după')}
                        value={taskSortBy}
                        onChange={(val) => setTaskSortBy(val)}
                        options={[
                          { value: 'deadline_asc', label: t('general.sortDeadlineClosest', 'Termen limită (apropiat)') },
                          { value: 'deadline_desc', label: t('general.sortDeadlineFurthest', 'Termen limită (îndepărtat)') },
                          { value: 'priority_desc', label: t('general.sortPriorityHigh', 'Prioritate (Mare ➔ Mică)') },
                          { value: 'priority_low', label: t('general.sortPriorityLow', 'Prioritate (Mică ➔ Mare)') },
                          { value: 'newest', label: t('general.sortNewest', 'Cele mai noi') },
                          { value: 'oldest', label: t('general.sortOldest', 'Cele mai vechi') },
                        ]}
                        isDarkMode={isDarkMode}
                      />

                      {/* Date Range Filter */}
                      <div>
                        <DateRangePicker
                          label={t('general.dateInterval', 'Perioadă')}
                          startDate={taskStartDateFilter}
                          endDate={taskEndDateFilter}
                          onChange={(range) => {
                            setSearchParams(prev => {
                              const next = new URLSearchParams(prev);
                              if (range.startDate) next.set('taskStartDate', range.startDate);
                              else next.delete('taskStartDate');
                              if (range.endDate) next.set('taskEndDate', range.endDate);
                              else next.delete('taskEndDate');
                              return next;
                            }, { replace: true });
                          }}
                          isDarkMode={isDarkMode}
                          clearable
                        />
                      </div>
                    </div>
                  </FilterPopover>
                </div>

                {canEditAnyDept && (
                  <div className="order-3 w-full sm:w-auto flex items-center justify-end shrink-0">
                    <button onClick={() => {
                        setEditingTaskId(null);
                        setNewTaskTitle('');
                        setNewTaskDesc('');
                        setNewTaskDept('general');
                        setNewTaskPriority('medium');
                        setNewTaskStatus('todo');
                        setNewTaskReminderCount(3);
                        setNewTaskAssignee('');
                        setSelectedTaskAssigneeIds([]);
                        setSelectedTaskAssigneeNames([]);
                        setNewTaskStartDate(new Date().toISOString().split('T')[0]);
                        setNewTaskDueDate(new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]);
                        setTaskFormError(null);
                        setIsAddTaskModalOpen(true);
                    }} className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer shrink-0">
                        <span>{t('general.addTask', 'Adaugă Sarcină')}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : activeSubTab === 'info' ? (<>
              <div className="w-full sm:w-64 shrink-0">
                <CustomSelect
                  value={selectedInfoSection}
                  onChange={handleSelectInfoSection}
                  options={infoSectionOptions}
                  placeholder={t('general.selectSection', 'Selectează secțiunea')}
                  isDarkMode={isDarkMode}
                />
              </div>

              <div className="flex items-center justify-end gap-2 w-full sm:w-auto shrink-0">
                {canEditCurrentInfoSection && (
                  <button
                    type="button"
                    onClick={() => setIsEditInfoModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition cursor-pointer shrink-0"
                  >
                    {t('common.edit', 'Editează')}
                  </button>
                )}
              </div>
            </>) : undefined}/>

      {/* Read-Only Notice Banner if User Lacks Edit Permissions */}
      {!canEditAnyDept && (<div className="flex items-center space-x-2 px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-xs shrink-0"><span>{t('general.readOnlyNotice', 'Mod Vizualizare: Doar utilizatorii autorizați ai departamentului pot efectua modificări.')}</span>
        </div>)}

      {/* MAIN VIEW: CALENDAR TAB */}
      {activeSubTab === 'calendar' && (<CalendarView events={events} tasks={tasks} stands={stands} members={members} clubs={clubs} isLoading={isLoading} isDarkMode={isDarkMode} isAdmin={true} canEditDepartment={canEditDepartment} startDateFilter={calStartDate} endDateFilter={calEndDate} onAddEventClick={() => {
                setEventFormError(null);
                setIsAddEventModalOpen(true);
            }} onAddTaskClick={() => {
                setEditingTaskId(null);
                setNewTaskTitle('');
                setNewTaskDesc('');
                setNewTaskDept('general');
                setNewTaskPriority('medium');
                setNewTaskStatus('todo');
                setNewTaskReminderCount(3);
                setNewTaskAssignee('');
                setSelectedTaskAssigneeIds([]);
                setSelectedTaskAssigneeNames([]);
                setNewTaskStartDate(new Date().toISOString().split('T')[0]);
                setNewTaskDueDate(new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]);
                setTaskFormError(null);
                setIsAddTaskModalOpen(true);
            }} onDeleteEvent={handleDeleteEvent} onDeleteTask={handleDeleteTask} onStandUpdated={(updated) => setStands(prev => prev.map(s => s.id === updated.id ? updated : s))} onRefreshData={fetchData}/>)}

      {/* MAIN VIEW: TASKS TAB */}
      {activeSubTab === 'tasks' && (
        <div className="flex-1 min-h-0 flex flex-col md:overflow-hidden overflow-visible">
          {/* Tasks Board Columns */}
          <div className={`flex-1 min-h-0 grid gap-4 md:gap-4 overflow-visible md:overflow-hidden pb-8 md:pb-0 ${selectedStatusFilter === 'ALL' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1'}`}>
            
            {/* COLUMN 1: TO DO */}
            {(selectedStatusFilter === 'ALL' || selectedStatusFilter === 'todo') && (
              <div className={`p-4 rounded-2xl border flex flex-col min-h-[480px] md:min-h-0 md:h-full overflow-hidden ${tCss.card}`}>
                <div className="flex items-center justify-between mb-3 shrink-0 pb-2.5 border-b border-zinc-800/60">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs uppercase tracking-wider">{t('general.todo', 'De făcut')}</span>
                  </div>
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {isLoading ? '...' : filteredTasks.filter(t => t.status === 'todo').length}
                  </span>
                </div>
                <div className="space-y-3 flex-1 min-h-0 overflow-y-auto no-scrollbar pr-0.5">
                  {isLoading ? (
                    <p className="text-center text-xs text-zinc-500 py-12 opacity-60">{t('general.loading', 'Se încarcă datele...')}</p>
                  ) : (
                    <>
                      {filteredTasks.filter(t => t.status === 'todo').map(task => renderTaskCard(task))}
                      {filteredTasks.filter(t => t.status === 'todo').length === 0 && (
                        <p className="text-center text-xs text-zinc-500 py-12 opacity-60">{t('general.noTasks', 'Fără sarcini.')}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* COLUMN 2: IN PROGRESS */}
            {(selectedStatusFilter === 'ALL' || selectedStatusFilter === 'in_progress') && (
              <div className={`p-4 rounded-2xl border flex flex-col min-h-[480px] md:min-h-0 md:h-full overflow-hidden ${tCss.card}`}>
                <div className="flex items-center justify-between mb-3 shrink-0 pb-2.5 border-b border-zinc-800/60">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs uppercase tracking-wider">{t('general.inProgress', 'În lucru')}</span>
                  </div>
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {isLoading ? '...' : filteredTasks.filter(t => t.status === 'in_progress').length}
                  </span>
                </div>
                <div className="space-y-3 flex-1 min-h-0 overflow-y-auto no-scrollbar pr-0.5">
                  {isLoading ? (
                    <p className="text-center text-xs text-zinc-500 py-12 opacity-60">{t('general.loading', 'Se încarcă datele...')}</p>
                  ) : (
                    <>
                      {filteredTasks.filter(t => t.status === 'in_progress').map(task => renderTaskCard(task))}
                      {filteredTasks.filter(t => t.status === 'in_progress').length === 0 && (
                        <p className="text-center text-xs text-zinc-500 py-12 opacity-60">{t('general.noTasks', 'Fără sarcini.')}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* COLUMN 3: DONE */}
            {(selectedStatusFilter === 'ALL' || selectedStatusFilter === 'done') && (
              <div className={`p-4 rounded-2xl border flex flex-col min-h-[480px] md:min-h-0 md:h-full overflow-hidden ${tCss.card}`}>
                <div className="flex items-center justify-between mb-3 shrink-0 pb-2.5 border-b border-zinc-800/60">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs uppercase tracking-wider">{t('general.done', 'Finalizat')}</span>
                  </div>
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {isLoading ? '...' : filteredTasks.filter(t => t.status === 'done').length}
                  </span>
                </div>
                <div className="space-y-3 flex-1 min-h-0 overflow-y-auto no-scrollbar pr-0.5">
                  {isLoading ? (
                    <p className="text-center text-xs text-zinc-500 py-12 opacity-60">{t('general.loading', 'Se încarcă datele...')}</p>
                  ) : (
                    <>
                      {filteredTasks.filter(t => t.status === 'done').map(task => renderTaskCard(task))}
                      {filteredTasks.filter(t => t.status === 'done').length === 0 && (
                        <p className="text-center text-xs text-zinc-500 py-12 opacity-60">{t('general.noTasks', 'Fără sarcini.')}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* MAIN VIEW: MAP TAB */}
      {activeSubTab === 'map' && (<MapView locations={locations} stands={stands} members={members} clubs={clubs} isLoading={isLoading} canWrite={canWriteLocations} isDarkMode={isDarkMode} searchQuery={searchTerm} typeFilter={searchParams.get('type') || 'ALL'} onSaveLocation={handleSaveLocation} onDeleteLocation={handleDeleteLocation} isAddLocationModalOpen={isAddLocationModalOpen} setIsAddLocationModalOpen={setIsAddLocationModalOpen} isLocationsModalOpen={isLocationsModalOpen} setIsLocationsModalOpen={setIsLocationsModalOpen} showToast={showToast}/>)}

      {/* MAIN VIEW: STATISTICS TAB */}
      {activeSubTab === 'statistics' && (
        <GeneralStatisticsView
          events={events}
          tasks={tasks}
          locations={locations}
          isLoading={isLoading}
          isDarkMode={isDarkMode}
        />
      )}

      {/* MAIN VIEW: INFO TAB */}
      {activeSubTab === 'info' && (
        <GeneralInfoView
          isDarkMode={isDarkMode}
          selectedSection={selectedInfoSection}
          onSelectSection={handleSelectInfoSection}
          isEditModalOpen={isEditInfoModalOpen}
          setIsEditModalOpen={setIsEditInfoModalOpen}
        />
      )}

      {/* MODAL: ADD EVENT */}
      {isAddEventModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsAddEventModalOpen(false)}
        >
          <div
            className={`w-full h-full sm:h-auto sm:max-h-[90vh] max-w-md rounded-none sm:rounded-2xl border-0 sm:border shadow-2xl flex flex-col overflow-hidden transition-all transform scale-100 animate-in zoom-in-95 duration-150 ${
              isDarkMode ? 'bg-black text-white border-zinc-800 shadow-2xl' : 'bg-white text-zinc-900 border-zinc-200 shadow-xl'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 sm:px-6 pt-5 pb-3.5 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-base sm:text-lg tracking-tight">
                {t('general.addEvent', 'Adaugă Eveniment')}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddEventModalOpen(false)}
                aria-label={t('common.close', 'Închide')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className={`mx-5 sm:mx-6 border-b ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`} />

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-4 text-sm">
              <form id="add-event-form" noValidate onSubmit={handleAddEvent} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-zinc-400">
                    {t('general.title', 'Titlu')}
                  </label>
                  <input
                    type="text"
                    value={newEventTitle}
                    onChange={(e) => {
                      setNewEventTitle(e.target.value);
                      if (eventFormError) setEventFormError(null);
                    }}
                    className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${
                      isDarkMode
                        ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700 focus:border-zinc-700'
                        : 'bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400 focus:border-zinc-400'
                    } ${!newEventTitle.trim() && eventFormError ? 'border-rose-500/80 focus:border-rose-500 ring-1 ring-rose-500/40' : ''}`}
                    placeholder="Titlu eveniment..."
                  />
                </div>

                <ManageableSelect
                  label={t('general.department', 'Departament')}
                  value={newEventDept}
                  onChange={(val) => {
                    setNewEventDept(val);
                    setEventFormError(null);
                  }}
                  options={departments.map(d => {
                    const hasPerm = canEditDepartment(d.id);
                    const name = d.key ? t(d.key, d.fallback || d.name) : d.name;
                    return {
                      value: d.id,
                      label: !hasPerm ? `${name} (${t('general.noPermissionDept', 'Fără editare')})` : name,
                      isSystem: ['general', 'finance', 'it', 'fundraising', 'logistics', 'hr', 'legal', 'marketing'].includes(d.id),
                    };
                  })}
                  modalTitle={t('general.manageDepartments', 'Gestionează Departamentele')}
                  onAddItem={canManageDepartments ? handleCreateDepartment : undefined}
                  onRenameItem={canManageDepartments ? handleRenameDepartment : undefined}
                  onDeleteItem={canManageDepartments ? handleDeleteDepartment : undefined}
                  isDarkMode={isDarkMode}
                />

                <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-3">
                  <div>
                    <DateRangePicker
                      label={t('general.date', 'Dată')}
                      startDate={newEventDate}
                      endDate={newEventEndDate}
                      onChange={(range) => {
                        setNewEventDate(range.startDate);
                        setNewEventEndDate(range.endDate);
                      }}
                      isDarkMode={isDarkMode}
                    />
                  </div>
                  <div>
                    <TimePicker label={t('general.time', 'Ora')} value={newEventTime} onChange={(val) => setNewEventTime(val)} isDarkMode={isDarkMode} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-zinc-400">
                    {t('general.description', 'Descriere')}
                  </label>
                  <textarea
                    rows={3}
                    value={newEventDesc}
                    onChange={(e) => setNewEventDesc(e.target.value)}
                    className={`w-full px-3 py-2 text-xs rounded-xl border outline-hidden transition resize-none ${
                      isDarkMode
                        ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700 focus:border-zinc-700'
                        : 'bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400 focus:border-zinc-400'
                    }`}
                    placeholder="Detalii suplimentare..."
                  />
                </div>

                {/* Special Logistics Demand Toggle */}
                <div className={`p-3 rounded-xl border space-y-2.5 ${isDarkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`}>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newEventIsSpecialDemand}
                      onChange={(e) => setNewEventIsSpecialDemand(e.target.checked)}
                      className="w-4 h-4 rounded-md accent-rose-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-zinc-200">
                      {t('general.markSpecialDemand', 'Zi cu Cerere Ridicată (Impact Logistică / Stocuri)')}
                    </span>
                  </label>

                  {newEventIsSpecialDemand && (
                    <div className={`grid grid-cols-2 gap-2 pt-2 border-t ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                          {t('general.demandTagLabel', 'Tip Eveniment')}
                        </label>
                        <select
                          value={newEventDemandTag}
                          onChange={(e) => setNewEventDemandTag(e.target.value)}
                          className={`w-full h-[38px] px-2.5 py-1.5 text-xs rounded-xl border outline-hidden transition cursor-pointer ${
                            isDarkMode
                              ? 'bg-zinc-900 border-zinc-800 text-white hover:border-zinc-700 focus:border-zinc-700'
                              : 'bg-zinc-100 border-zinc-300 text-zinc-900 hover:border-zinc-400 focus:border-zinc-400'
                          }`}
                        >
                          <option value="CONCERT">{t('general.tagConcert', 'Concert / Scenă Principală')}</option>
                          <option value="HOLIDAY">{t('general.tagHoliday', 'Sărbătoare Legală')}</option>
                          <option value="MARKET_PEAK">{t('general.tagMarketPeak', 'Vârf Târg de Crăciun')}</option>
                          <option value="SPECIAL_EVENT">{t('general.tagSpecialEvent', 'Eveniment Comunitar / Special')}</option>
                          <option value="OTHER">{t('general.tagOther', 'Alt Eveniment Special')}</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                          {t('general.demandMultiplierLabel', 'Multiplicator Cerere')}
                        </label>
                        <select
                          value={newEventDemandMultiplier}
                          onChange={(e) => setNewEventDemandMultiplier(parseFloat(e.target.value))}
                          className={`w-full h-[38px] px-2.5 py-1.5 text-xs rounded-xl border outline-hidden transition cursor-pointer ${
                            isDarkMode
                              ? 'bg-zinc-900 border-zinc-800 text-white hover:border-zinc-700 focus:border-zinc-700'
                              : 'bg-zinc-100 border-zinc-300 text-zinc-900 hover:border-zinc-400 focus:border-zinc-400'
                          }`}
                        >
                          <option value="1.5">1.5x ({t('general.multModerate', 'Creștere Moderată')})</option>
                          <option value="2.0">2.0x ({t('general.multHigh', 'Concert / Aflux Mare')})</option>
                          <option value="2.5">2.5x ({t('general.multVeryHigh', 'Sărbătoare / Vârf Major')})</option>
                          <option value="3.0">3.0x ({t('general.multExtreme', 'Vârf Extrem / Eveniment Major')})</option>
                          <option value="0.5">0.5x ({t('general.multLow', 'Vreme Nefavorabilă / Scăzut')})</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </div>

            <div className={`mx-5 sm:mx-6 border-t ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`} />

            {/* Footer */}
            <div className="px-5 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
              <div className="min-w-0 pr-3">
                {eventFormError && (
                  <p className="text-xs text-rose-400 font-medium truncate">{eventFormError}</p>
                )}
              </div>
              <button
                type="submit"
                form="add-event-form"
                disabled={isSubmittingEvent}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center space-x-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{t('general.save', 'Salvează')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT TASK */}
      {isAddTaskModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => {
            setIsAddTaskModalOpen(false);
            setEditingTaskId(null);
            setSelectedTaskAssigneeIds([]);
            setSelectedTaskAssigneeNames([]);
          }}
        >
          <div
            className={`w-full h-full sm:h-auto sm:max-h-[90vh] max-w-xl rounded-none sm:rounded-2xl border-0 sm:border shadow-2xl flex flex-col overflow-hidden transition-all transform scale-100 animate-in zoom-in-95 duration-150 ${
              isDarkMode ? 'bg-black text-white border-zinc-800 shadow-2xl' : 'bg-white text-zinc-900 border-zinc-200 shadow-xl'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 sm:px-6 pt-5 pb-3.5 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-base sm:text-lg tracking-tight">
                {t(editingTaskId ? 'general.editTask' : 'general.addTask', editingTaskId ? 'Editează Sarcină' : 'Adaugă Sarcină')}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddTaskModalOpen(false);
                  setEditingTaskId(null);
                  setSelectedTaskAssigneeIds([]);
                  setSelectedTaskAssigneeNames([]);
                }}
                aria-label={t('common.close', 'Închide')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className={`mx-5 sm:mx-6 border-b ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`} />

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-4 text-sm">
              <form id="task-form" noValidate onSubmit={handleCreateOrUpdateTask} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-zinc-400">
                    {t('general.title', 'Titlu')}
                  </label>
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => {
                      setNewTaskTitle(e.target.value);
                      if (taskFormError) setTaskFormError(null);
                    }}
                    className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${
                      isDarkMode
                        ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700 focus:border-zinc-700'
                        : 'bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400 focus:border-zinc-400'
                    } ${!newTaskTitle.trim() && taskFormError ? 'border-rose-500/80 focus:border-rose-500 ring-1 ring-rose-500/40' : ''}`}
                    placeholder="Titlu sarcină..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ManageableSelect
                    label={t('general.department', 'Departament')}
                    value={newTaskDept}
                    onChange={(val) => {
                      setNewTaskDept(val);
                      setTaskFormError(null);
                    }}
                    options={departments.map(d => {
                      const hasPerm = canEditDepartment(d.id);
                      const name = d.key ? t(d.key, d.fallback || d.name) : d.name;
                      return {
                        value: d.id,
                        label: !hasPerm ? `${name} (${t('general.noPermissionDept', 'Fără editare')})` : name,
                        isSystem: ['general', 'finance', 'it', 'fundraising', 'logistics', 'hr', 'legal', 'marketing'].includes(d.id),
                      };
                    })}
                    modalTitle={t('general.manageDepartments', 'Gestionează Departamentele')}
                    onAddItem={canManageDepartments ? handleCreateDepartment : undefined}
                    onRenameItem={canManageDepartments ? handleRenameDepartment : undefined}
                    onDeleteItem={canManageDepartments ? handleDeleteDepartment : undefined}
                    isDarkMode={isDarkMode}
                  />

                  <CustomSelect
                    label={t('general.priority', 'Prioritate')}
                    value={newTaskPriority}
                    onChange={(val) => setNewTaskPriority(val as any)}
                    options={[
                      { value: 'low', label: t('general.low', 'Scăzută') },
                      { value: 'medium', label: t('general.medium', 'Medie') },
                      { value: 'high', label: t('general.high', 'Ridicată') },
                    ]}
                    isDarkMode={isDarkMode}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <CustomSelect
                    label={t('general.status', 'Stare')}
                    value={newTaskStatus}
                    onChange={(val) => setNewTaskStatus(val as any)}
                    options={[
                      { value: 'todo', label: t('general.todo', 'De făcut') },
                      { value: 'in_progress', label: t('general.inProgress', 'În lucru') },
                      { value: 'done', label: t('general.done', 'Finalizat') },
                    ]}
                    isDarkMode={isDarkMode}
                  />

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-zinc-400">
                      {t('general.reminderCount', 'Număr Memento-uri')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newTaskReminderCount}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/^0+(?=\d)/, '');
                        if (clean === '') {
                          setNewTaskReminderCount('');
                        } else {
                          const val = parseInt(clean, 10);
                          setNewTaskReminderCount(isNaN(val) || val < 0 ? 0 : val);
                        }
                      }}
                      className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${
                        isDarkMode
                          ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700 focus:border-zinc-700'
                          : 'bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400 focus:border-zinc-400'
                      }`}
                      placeholder="3"
                    />
                  </div>
                </div>

                <div>
                  <DateRangePicker
                    label={t('general.dueDate', 'Dată Limită')}
                    startDate={newTaskStartDate}
                    endDate={newTaskDueDate}
                    onChange={(range) => {
                      setNewTaskStartDate(range.startDate);
                      setNewTaskDueDate(range.endDate);
                    }}
                    isDarkMode={isDarkMode}
                  />
                </div>

                {/* Assignee Multi-Selection from Users List */}
                <TaskAssigneeSelector
                  selectedMemberIds={selectedTaskAssigneeIds}
                  selectedMemberNames={selectedTaskAssigneeNames}
                  onChange={(ids, names) => {
                    setSelectedTaskAssigneeIds(ids);
                    setSelectedTaskAssigneeNames(names);
                  }}
                  members={members}
                  clubs={clubs}
                  isDarkMode={isDarkMode}
                />

                <div>
                  <label className="block text-xs font-semibold mb-1 text-zinc-400">
                    {t('general.description', 'Descriere')}
                  </label>
                  <textarea
                    rows={3}
                    value={newTaskDesc}
                    onChange={(e) => setNewTaskDesc(e.target.value)}
                    className={`w-full px-3 py-2 text-xs rounded-xl border outline-hidden transition resize-none ${
                      isDarkMode
                        ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700 focus:border-zinc-700'
                        : 'bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400 focus:border-zinc-400'
                    }`}
                    placeholder="Detalii sarcină..."
                  />
                </div>
              </form>
            </div>

            <div className={`mx-5 sm:mx-6 border-t ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`} />

            {/* Footer */}
            <div className="px-5 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
              <div className="min-w-0 pr-3">
                {taskFormError && (
                  <p className="text-xs text-rose-400 font-medium truncate">{taskFormError}</p>
                )}
              </div>
              <button
                type="submit"
                form="task-form"
                disabled={isSubmittingTask}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center space-x-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{t('general.save', 'Salvează')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant="danger"
        isDarkMode={isDarkMode}
      />

      {/* Toast Notification */}
      <ToastNotification toast={toastMessage} onClose={() => setToastMessage(null)}/>
    </DashboardContainer>);
};
export default GeneralDashboard;
