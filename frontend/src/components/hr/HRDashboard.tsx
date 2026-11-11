import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { HrStand, HrMember, HrStandRole, HrLocation, HrStats, VolunteerFeedback, HrFeedbackCategory, FeedbackSummary, FeedbackStatus } from '../../types/hr';
import { hrService } from '../../services/hrService';
import { usePermission } from '../../hooks/usePermission';
import { useLanguage } from '../../context/LanguageContext';
import { StandShiftManagementView } from './StandShiftManagementView';
import { HRStatisticsView } from './HRStatisticsView';
import { HRFeedbackView } from './feedback/HRFeedbackView';
import { DashboardContainer, SubTabNav, ToastNotification, DashboardHeaderSection, SearchInput, FilterPopover, DatePicker, DateRangePicker, ConfirmationModal } from '../common';

interface HRDashboardProps {
  isDarkMode: boolean;
}

const HR_TAB_PERMISSIONS: Record<string, string[]> = {
  'stands': ['hr:stands:read', 'hr:stands:view'],
  'statistics': ['hr:statistics:read', 'hr:statistics:view'],
  'feedback': ['hr:feedback:read', 'hr:feedback:view'],
};

const VALID_HR_SUB_TABS = ['stands', 'feedback', 'statistics'];

export const HRDashboard: React.FC<HRDashboardProps> = ({ isDarkMode }) => {
  const { t } = useLanguage();
  const { user, hasPermission, isSuperAdmin } = usePermission();
  const [searchParams, setSearchParams] = useSearchParams();

  // Permissions
  const isTabAccessible = useCallback((tabId: string): boolean => {
    if (isSuperAdmin) return true;
    const codes = HR_TAB_PERMISSIONS[tabId];
    return codes ? codes.some(code => hasPermission(code)) : true;
  }, [isSuperAdmin, hasPermission]);

  // URL-driven Sub-Tab ('stands' | 'feedback' | 'statistics')
  const accessibleTabs = VALID_HR_SUB_TABS.filter(tab => isTabAccessible(tab));
  const rawSubTab = searchParams.get('subtab');
  const requestedTab = (rawSubTab && VALID_HR_SUB_TABS.includes(rawSubTab)) ? rawSubTab : 'stands';
  const activeSubTab = isTabAccessible(requestedTab) ? requestedTab : (accessibleTabs[0] || 'stands');

  const setSubTab = useCallback((subtab: 'stands' | 'feedback' | 'statistics') => {
    if (!isTabAccessible(subtab)) return;
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('subtab', subtab);
      return next;
    });
  }, [isTabAccessible, setSearchParams]);

  useEffect(() => {
    if (rawSubTab && !isTabAccessible(rawSubTab)) {
      setSubTab(activeSubTab as 'stands' | 'feedback' | 'statistics');
    }
  }, [rawSubTab, activeSubTab, isTabAccessible, setSubTab]);
  const isHRRole = user?.role === 'HR_HEAD' ||
                   user?.roles?.includes('HR_HEAD') ||
                   user?.memberships?.some(m => m.roleName === 'HR_HEAD');
  const canWriteHR = isSuperAdmin ||
                     isHRRole ||
                     hasPermission('hr:stand:write') ||
                     hasPermission('hr:stand:create') ||
                     hasPermission('hr:stand:write', 'DEPARTMENT', 'hr-dept-uuid') ||
                     hasPermission('hr:stand:create', 'DEPARTMENT', 'hr-dept-uuid');

  // Search & Filter state
  const [standSearchQuery, setStandSearchQuery] = useState('');
  const [standLocationFilter, setStandLocationFilter] = useState('ALL');
  const [standStartDateFilter, setStandStartDateFilter] = useState('');
  const [standEndDateFilter, setStandEndDateFilter] = useState('');
  const [feedbackSearchQuery, setFeedbackSearchQuery] = useState('');
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState('ALL');
  const [feedbackTypeFilter, setFeedbackTypeFilter] = useState('ALL');
  const [feedbackCategoryFilter, setFeedbackCategoryFilter] = useState('ALL');
  const [feedbackIdentityFilter, setFeedbackIdentityFilter] = useState('ALL');
  const [feedbackSourceFilter, setFeedbackSourceFilter] = useState('ALL');
  const [feedbackDateFilter, setFeedbackDateFilter] = useState('');

  // Data States
  const [stands, setStands] = useState<HrStand[]>([]);
  const [members, setMembers] = useState<HrMember[]>([]);
  const [roles, setRoles] = useState<HrStandRole[]>([]);
  const [locations, setLocations] = useState<HrLocation[]>([]);
  const [stats, setStats] = useState<HrStats | null>(null);
  const [feedbackList, setFeedbackList] = useState<VolunteerFeedback[]>([]);
  const [feedbackCategories, setFeedbackCategories] = useState<HrFeedbackCategory[]>([]);
  const [feedbackSummary, setFeedbackSummary] = useState<FeedbackSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSummaryLoading, setIsSummaryLoading] = useState<boolean>(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
  }, []);

  const loadFeedbackSummary = useCallback(async () => {
    setIsSummaryLoading(true);
    try {
      const summary = await hrService.getFeedbackSummary();
      setFeedbackSummary(summary);
    } catch (err) {
      console.warn('Could not load feedback summary:', err);
    } finally {
      setIsSummaryLoading(false);
    }
  }, []);

  const loadStandsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedStands, fetchedMembers, fetchedRoles, fetchedLocations] = await Promise.all([
        hrService.getStands(),
        hrService.getMembers(),
        hrService.getRoles(),
        hrService.getLocations(),
      ]);
      setStands(fetchedStands);
      setMembers(fetchedMembers);
      setRoles(fetchedRoles);
      setLocations(fetchedLocations);
    } catch (err) {
      console.error('Error loading HR stands data:', err);
      showToast(t('hr.loadError', 'Eroare la încărcarea datelor HR'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast, t]);

  const loadFeedbackData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedFeedback, fetchedCats] = await Promise.all([
        hrService.getFeedbackList().catch(() => []),
        hrService.getFeedbackCategories().catch(() => []),
      ]);
      setFeedbackList(fetchedFeedback);
      setFeedbackCategories(fetchedCats);
    } catch (err) {
      console.error('Error loading HR feedback data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadStatsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedStats, fetchedStands, fetchedMembers, fetchedRoles] = await Promise.all([
        hrService.getStats(),
        hrService.getStands(),
        hrService.getMembers(),
        hrService.getRoles(),
      ]);
      setStats(fetchedStats);
      setStands(fetchedStands);
      setMembers(fetchedMembers);
      setRoles(fetchedRoles);
    } catch (err) {
      console.error('Error loading HR stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAllData = useCallback(async () => {
    if (activeSubTab === 'stands') {
      await loadStandsData();
    } else if (activeSubTab === 'feedback') {
      await loadFeedbackData();
    } else if (activeSubTab === 'statistics') {
      await loadStatsData();
    }
  }, [activeSubTab, loadStandsData, loadFeedbackData, loadStatsData]);

  useEffect(() => {
    if (activeSubTab === 'stands') {
      loadStandsData();
    } else if (activeSubTab === 'feedback') {
      loadFeedbackData();
      loadFeedbackSummary();
    } else if (activeSubTab === 'statistics') {
      loadStatsData();
    }
  }, [activeSubTab, loadStandsData, loadFeedbackData, loadFeedbackSummary, loadStatsData]);

  // Stand Handlers
  const handleSaveStand = async (standData: Partial<HrStand>) => {
    try {
      if (standData.id) {
        await hrService.updateStand(standData.id, standData);
        showToast(t('hr.standSaved', 'Standul a fost actualizat.'));
      } else {
        await hrService.createStand(standData);
        showToast(t('hr.standSaved', 'Standul a fost creat cu succes.'));
      }
      await loadAllData();
    } catch (err: any) {
      showToast(err?.message || 'Eroare la salvarea standului', 'error');
    }
  };

  const handleCopyStand = async (id: string) => {
    try {
      await hrService.copyStand(id);
      showToast(t('hr.standCopied', 'Standul a fost duplicat.'));
      await loadAllData();
    } catch (err: any) {
      showToast(err?.message || 'Eroare la duplicarea standului', 'error');
    }
  };

  // Confirmation Modal State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    message: '',
    onConfirm: () => {},
  });

  const handleDeleteStand = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: t('hr.deleteStandTitle', 'Șterge Stand'),
      message: t('hr.confirmDeleteStand', 'Sigur doriți să ștergeți acest stand?'),
      onConfirm: async () => {
        try {
          await hrService.deleteStand(id);
          showToast(t('hr.standDeleted', 'Standul a fost șters.'));
          await loadAllData();
        } catch (err: any) {
          showToast(err?.message || 'Eroare la ștergerea standului', 'error');
        } finally {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Shift Handlers
  const handleAddShift = async (
    standId: string,
    shiftName: string,
    startTime: string,
    endTime: string,
    neededVolunteers: number = 1,
    neededLogistics: number = 1,
    neededFinance: number = 1
  ) => {
    try {
      await hrService.addShift(standId, shiftName, startTime, endTime, neededVolunteers, neededLogistics, neededFinance);
      showToast(t('hr.shiftAdded', 'Tura a fost adăugată.'));
      await loadAllData();
    } catch (err: any) {
      showToast(err?.message || 'Eroare la adăugarea turei', 'error');
    }
  };

  const handleUpdateShift = async (
    _standId: string,
    shiftId: string,
    shiftName: string,
    startTime: string,
    endTime: string,
    neededVolunteers: number = 1,
    neededLogistics: number = 1,
    neededFinance: number = 1
  ) => {
    try {
      await hrService.updateShift(shiftId, shiftName, startTime, endTime, neededVolunteers, neededLogistics, neededFinance);
      showToast(t('hr.shiftUpdated', 'Intervalul orar a fost actualizat cu succes.'));
      await loadAllData();
    } catch (err: any) {
      showToast(err?.message || 'Eroare la actualizarea intervalului.', 'error');
    }
  };

  const handleDeleteShift = (shiftId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: t('hr.deleteShiftTitle', 'Șterge Tură'),
      message: t('hr.confirmDeleteShift', 'Sigur doriți să ștergeți această tură?'),
      onConfirm: async () => {
        try {
          await hrService.deleteShift(shiftId);
          showToast(t('hr.shiftDeleted', 'Tura a fost ștearsă.'));
          await loadAllData();
        } catch (err: any) {
          showToast(err?.message || 'Eroare la ștergerea turei', 'error');
        } finally {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Assignment Handlers
  const handleAssignMember = async (shiftId: string, memberId: string, roleId: string) => {
    try {
      await hrService.assignMember(shiftId, memberId, roleId);
      showToast(t('hr.memberAssigned', 'Membrul a fost asignat turei.'));
      await loadAllData();
    } catch (err: any) {
      showToast(err?.message || 'Eroare la asignarea membrului', 'error');
    }
  };

  const handleRemoveAssignment = (assignmentId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: t('hr.removeMemberTitle', 'Elimină Membru'),
      message: t('hr.confirmRemoveAssignment', 'Sigur doriți să eliminați acest membru din tură?'),
      onConfirm: async () => {
        try {
          await hrService.removeAssignment(assignmentId);
          showToast(t('hr.assignmentRemoved', 'Membrul a fost eliminat din tură.'));
          await loadAllData();
        } catch (err: any) {
          showToast(err?.message || 'Eroare la eliminarea membrului', 'error');
        } finally {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleUpdateAttendance = async (assignmentId: string, status: string) => {
    try {
      await hrService.updateAttendance(assignmentId, status);
      showToast(t('hr.attendanceUpdated', 'Prezența a fost actualizată.'));
      await loadAllData();
    } catch (err: any) {
      showToast(err?.message || 'Eroare la actualizarea prezenței', 'error');
    }
  };

  // EoD Handlers
  const handleSubmitEoD = async (assignmentId: string, payload: any) => {
    try {
      await hrService.submitStandEoD(assignmentId, payload);
      showToast(t('hr.eodSubmitted', 'Raportul End of Day a fost trimis cu succes.'));
      await loadAllData();
    } catch (err: any) {
      showToast(err?.message || 'Eroare la trimiterea raportului EoD', 'error');
    }
  };

  const handleDeleteEoD = (assignmentId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: t('hr.deleteEoDTitle', 'Șterge Raport EoD'),
      message: t('hr.confirmDeleteEoD', 'Sigur doriți să anulați/ștergeți acest raport End of Day?'),
      onConfirm: async () => {
        try {
          await hrService.deleteStandEoD(assignmentId);
          showToast(t('hr.eodDeleted', 'Raportul End of Day a fost șters.'));
          await loadAllData();
        } catch (err: any) {
          showToast(err?.message || 'Eroare la ștergerea raportului EoD', 'error');
        } finally {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Location Handlers for ManageableSelect
  const handleCreateLocation = async (name: string): Promise<HrLocation> => {
    try {
      const created = await hrService.createLocation(name);
      showToast(t('hr.locationSaved', 'Locația a fost adăugată.'));
      await loadAllData();
      return created;
    } catch (err: any) {
      showToast(err?.message || 'Eroare la salvarea locației', 'error');
      throw err;
    }
  };

  const handleRenameLocationByName = async (oldName: string, newName: string) => {
    try {
      const loc = locations.find(l => l.name.trim().toLowerCase() === oldName.trim().toLowerCase());
      if (loc) {
        await hrService.updateLocation(loc.id, newName);
        showToast(t('hr.locationSaved', 'Locația a fost actualizată.'));
        await loadAllData();
      }
    } catch (err: any) {
      showToast(err?.message || 'Eroare la actualizarea locației', 'error');
      throw err;
    }
  };

  const handleDeleteLocationByName = async (locationName: string) => {
    try {
      const loc = locations.find(l => l.name.trim().toLowerCase() === locationName.trim().toLowerCase());
      if (loc) {
        await hrService.deleteLocation(loc.id);
        showToast(t('hr.locationDeleted', 'Locația a fost ștearsă.'));
        await loadAllData();
      }
    } catch (err: any) {
      showToast(err?.message || 'Eroare la ștergerea locației', 'error');
      throw err;
    }
  };

  // Stand Role Handlers for ManageableSelect
  const handleCreateRole = async (name: string): Promise<HrStandRole> => {
    try {
      const created = await hrService.createRole({ name: name.trim(), isSystem: false, category: 'GENERAL' });
      showToast(t('hr.roleSaved', 'Rolul a fost adăugat.'));
      await loadAllData();
      return created;
    } catch (err: any) {
      showToast(err?.message || 'Eroare la adăugarea rolului', 'error');
      throw err;
    }
  };

  const handleRenameRole = async (roleId: string, newName: string) => {
    try {
      await hrService.updateRole(roleId, { name: newName.trim() });
      showToast(t('hr.roleSaved', 'Rolul a fost actualizat.'));
      await loadAllData();
    } catch (err: any) {
      showToast(err?.message || 'Eroare la actualizarea rolului', 'error');
      throw err;
    }
  };

  const handleDeleteRoleDirect = async (roleId: string) => {
    try {
      await hrService.deleteRole(roleId);
      showToast(t('hr.roleDeleted', 'Rolul a fost șters.'));
      await loadAllData();
    } catch (err: any) {
      showToast(err?.message || 'Eroare la ștergerea rolului', 'error');
      throw err;
    }
  };

  const handleApproveAssignment = async (assignmentId: string) => {
    try {
      await hrService.approveShiftAssignment(assignmentId);
      await loadAllData();
      showToast(t('hr.assignmentApprovedSuccess', 'Rezervarea pe schimb a fost aprobată cu succes.'));
    } catch (err: any) {
      showToast(err?.message || t('hr.assignmentApproveError', 'Eroare la aprobarea rezervării.'), 'error');
    }
  };

  const handleRejectAssignment = (assignmentId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: t('hr.rejectAssignmentTitle', 'Respinge Rezervare'),
      message: t('hr.confirmRejectAssignment', 'Sigur doriți să respingeți această rezervare și să eliberați slotul?'),
      onConfirm: async () => {
        try {
          await hrService.rejectShiftAssignment(assignmentId);
          await loadAllData();
          showToast(t('hr.assignmentRejectedSuccess', 'Rezervarea a fost respinsă și slotul a fost eliberat.'));
        } catch (err: any) {
          showToast(err?.message || t('hr.assignmentRejectError', 'Eroare la respingerea rezervării.'), 'error');
        }
      },
    });
  };

  // Feedback Handlers
  const handleUpdateFeedbackStatus = async (id: string, status?: FeedbackStatus, categoryId?: string, internalNotes?: string) => {
    try {
      await hrService.updateFeedbackStatus(id, status, categoryId, internalNotes);
      showToast(t('hr.feedbackStatusUpdated', 'Feedback-ul a fost actualizat.'));
      await Promise.all([loadAllData(), loadFeedbackSummary()]);
    } catch (err: any) {
      showToast(err?.message || 'Eroare la actualizarea feedback-ului.', 'error');
    }
  };

  const handleDeleteFeedback = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: t('hr.deleteFeedbackTitle', 'Șterge Feedback'),
      message: t('hr.confirmDeleteFeedback', 'Sigur doriți să ștergeți această înregistrare de feedback?'),
      onConfirm: async () => {
        try {
          await hrService.deleteFeedback(id);
          showToast(t('hr.feedbackDeleted', 'Înregistrarea de feedback a fost ștearsă.'));
          await Promise.all([loadAllData(), loadFeedbackSummary()]);
        } catch (err: any) {
          showToast(err?.message || 'Eroare la ștergerea feedback-ului.', 'error');
        } finally {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const [isAddStandOpen, setIsAddStandOpen] = useState(false);

  const activeHRFilterCount =
    activeSubTab === 'stands'
      ? (standLocationFilter !== 'ALL' ? 1 : 0) + (standStartDateFilter || standEndDateFilter ? 1 : 0)
      : activeSubTab === 'feedback'
      ? (feedbackStatusFilter !== 'ALL' ? 1 : 0) +
        (feedbackTypeFilter !== 'ALL' ? 1 : 0) +
        (feedbackCategoryFilter !== 'ALL' ? 1 : 0) +
        (feedbackIdentityFilter !== 'ALL' ? 1 : 0) +
        (feedbackSourceFilter !== 'ALL' ? 1 : 0) +
        (feedbackDateFilter ? 1 : 0)
      : 0;

  const currentHRSearchQuery =
    activeSubTab === 'stands'
      ? standSearchQuery
      : activeSubTab === 'feedback'
      ? feedbackSearchQuery
      : '';

  return (
    <DashboardContainer noScroll>
      {/* Toast Notification */}
      <ToastNotification toast={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Navigation Sub-Tabs Header aligned with Finance standard */}
      <DashboardHeaderSection
        isDarkMode={isDarkMode}
        activeTabLabel={
          activeSubTab === 'stands' ? t('hr.subtabStands', 'Standuri & Schimburi') :
          activeSubTab === 'feedback' ? t('hr.subtabFeedback', 'Feedback') :
          t('common.tabStatistics', 'Statistici')
        }
        activeFilterCount={activeHRFilterCount}
        searchQuery={currentHRSearchQuery}
        subTabNav={
          <SubTabNav<'stands' | 'feedback' | 'statistics'>
            tabs={[
              { id: 'stands', label: t('hr.subtabStands', 'Standuri & Schimburi'), disabled: !isTabAccessible('stands') },
              { id: 'feedback', label: t('hr.subtabFeedback', 'Feedback'), disabled: !isTabAccessible('feedback') },
              { id: 'statistics', label: t('common.tabStatistics', 'Statistici'), disabled: !isTabAccessible('statistics') },
            ]}
            activeTab={activeSubTab as 'stands' | 'feedback' | 'statistics'}
            onChange={(tabId) => setSubTab(tabId)}
            isDarkMode={isDarkMode}
          />
        }
        controls={
          activeSubTab === 'stands' ? (
            <>
              <SearchInput
                value={standSearchQuery}
                onChange={setStandSearchQuery}
                placeholder={t('hr.searchStands', 'Caută după locație, tură, dată...')}
                isDarkMode={isDarkMode}
              />
              <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0">
                <FilterPopover
                  activeCount={(standLocationFilter !== 'ALL' ? 1 : 0) + (standStartDateFilter || standEndDateFilter ? 1 : 0)}
                  onReset={() => {
                    setStandLocationFilter('ALL');
                    setStandStartDateFilter('');
                    setStandEndDateFilter('');
                  }}
                  isDarkMode={isDarkMode}
                >
                  <div className="space-y-3.5">
                    {/* Location Filter */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                        {t('hr.location', 'Locație')}
                      </label>
                      <select
                        value={standLocationFilter}
                        onChange={(e) => setStandLocationFilter(e.target.value)}
                        className={`w-full px-3 py-2 text-xs rounded-xl border outline-hidden ${
                          isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                        }`}
                      >
                        <option value="ALL">{t('hr.allLocations', 'Toate Locațiile')}</option>
                        {locations.map(loc => (
                          <option key={loc.id} value={loc.name}>
                            {loc.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Date Range Filter */}
                    <div>
                      <DateRangePicker
                        label={t('common.period', 'Perioadă')}
                        startDate={standStartDateFilter}
                        endDate={standEndDateFilter}
                        onChange={(range) => {
                          setStandStartDateFilter(range.startDate);
                          setStandEndDateFilter(range.endDate);
                        }}
                        isDarkMode={isDarkMode}
                        clearable
                      />
                    </div>
                  </div>
                </FilterPopover>

                {canWriteHR && (
                  <button
                    onClick={() => setIsAddStandOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer shrink-0"
                  >
                    <span>{t('hr.addStand', 'Adaugă Stand Nou')}</span>
                  </button>
                )}
              </div>
            </>
          ) : activeSubTab === 'feedback' ? (
            <>
              <SearchInput
                value={feedbackSearchQuery}
                onChange={setFeedbackSearchQuery}
                placeholder={t('hr.searchFeedbackPlaceholder', 'Caută în conținut, expeditor, note...')}
                isDarkMode={isDarkMode}
              />
              <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0">
                <FilterPopover
                  activeCount={activeHRFilterCount}
                  onReset={() => {
                    setFeedbackStatusFilter('ALL');
                    setFeedbackTypeFilter('ALL');
                    setFeedbackCategoryFilter('ALL');
                    setFeedbackIdentityFilter('ALL');
                    setFeedbackSourceFilter('ALL');
                    setFeedbackDateFilter('');
                  }}
                  isDarkMode={isDarkMode}
                >
                  <div className="space-y-3">
                    {/* Status Filter */}
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                        {t('hr.feedbackStatus', 'Stare')}
                      </label>
                      <select
                        value={feedbackStatusFilter}
                        onChange={(e) => setFeedbackStatusFilter(e.target.value)}
                        className={`w-full px-3 py-2 text-xs rounded-xl border outline-hidden ${
                          isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                        }`}
                      >
                        <option value="ALL">{t('hr.allFeedbackStatuses', 'Toate Stările')}</option>
                        <option value="NEW">{t('hr.statusNew', 'Nou')}</option>
                        <option value="IN_REVIEW">{t('hr.statusInReview', 'În Analiză')}</option>
                        <option value="RESOLVED">{t('hr.statusResolved', 'Rezolvat')}</option>
                        <option value="ARCHIVED">{t('hr.statusArchived', 'Arhivat')}</option>
                      </select>
                    </div>

                    {/* Type Filter */}
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                        {t('hr.feedbackType', 'Tip')}
                      </label>
                      <select
                        value={feedbackTypeFilter}
                        onChange={(e) => setFeedbackTypeFilter(e.target.value)}
                        className={`w-full px-3 py-2 text-xs rounded-xl border outline-hidden ${
                          isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                        }`}
                      >
                        <option value="ALL">{t('hr.allTypes', 'Toate Tipurile')}</option>
                        <option value="COMPLAINT">{t('hr.typeComplaint', 'Reclamație')}</option>
                        <option value="SUGGESTION">{t('hr.typeSuggestion', 'Sugestie')}</option>
                        <option value="REVIEW">{t('hr.typeReview', 'Recenzie')}</option>
                        <option value="OTHER">{t('hr.typeOther', 'Altele')}</option>
                      </select>
                    </div>

                    {/* Category Filter */}
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                        {t('hr.feedbackCategory', 'Categorie')}
                      </label>
                      <select
                        value={feedbackCategoryFilter}
                        onChange={(e) => setFeedbackCategoryFilter(e.target.value)}
                        className={`w-full px-3 py-2 text-xs rounded-xl border outline-hidden ${
                          isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                        }`}
                      >
                        <option value="ALL">{t('hr.allFeedbackCategories', 'Toate Categoriile')}</option>
                        {feedbackCategories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Identity Filter */}
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                        {t('hr.feedbackIdentityLabel', 'Identitate')}
                      </label>
                      <select
                        value={feedbackIdentityFilter}
                        onChange={(e) => setFeedbackIdentityFilter(e.target.value)}
                        className={`w-full px-3 py-2 text-xs rounded-xl border outline-hidden ${
                          isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                        }`}
                      >
                        <option value="ALL">{t('hr.allIdentities', 'Toate')}</option>
                        <option value="ANONYMOUS">{t('hr.identityAnonymous', 'Anonim')}</option>
                        <option value="IDENTIFIED">{t('hr.identityIdentified', 'Identificat')}</option>
                      </select>
                    </div>

                    {/* Source Filter */}
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                        {t('hr.feedbackSource', 'Sursă')}
                      </label>
                      <select
                        value={feedbackSourceFilter}
                        onChange={(e) => setFeedbackSourceFilter(e.target.value)}
                        className={`w-full px-3 py-2 text-xs rounded-xl border outline-hidden ${
                          isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                        }`}
                      >
                        <option value="ALL">{t('hr.allSources', 'Toate')}</option>
                        <option value="AUTH">{t('hr.sourceAuth', 'Cont Utilizator')}</option>
                        <option value="PUBLIC">{t('hr.sourcePublic', 'Link Public')}</option>
                      </select>
                    </div>

                    {/* Date Filter */}
                    <div>
                      <DatePicker
                        label={t('table.date', 'Dată')}
                        value={feedbackDateFilter}
                        onChange={(val) => setFeedbackDateFilter(val)}
                        isDarkMode={isDarkMode}
                        clearable
                      />
                    </div>
                  </div>
                </FilterPopover>
              </div>
            </>
          ) : undefined
        }
      />

      {/* Main Content Area per Sub-Tab */}
      <div className="flex-1 min-h-0 min-w-0 max-w-full overflow-y-auto overflow-x-hidden no-scrollbar pr-0.5">
        {activeSubTab === 'stands' && (
          <StandShiftManagementView
            stands={stands}
            members={members}
            roles={roles}
            locations={locations}
            isLoading={isLoading}
            canWrite={canWriteHR}
            isDarkMode={isDarkMode}
            searchQuery={standSearchQuery}
            locationFilter={standLocationFilter}
            startDateFilter={standStartDateFilter}
            endDateFilter={standEndDateFilter}
            isAddStandModalOpen={isAddStandOpen}
            onCloseAddStandModal={() => setIsAddStandOpen(false)}
            onSaveStand={handleSaveStand}
            onCopyStand={handleCopyStand}
            onDeleteStand={handleDeleteStand}
            onAddShift={handleAddShift}
            onUpdateShift={handleUpdateShift}
            onDeleteShift={handleDeleteShift}
            onAssignMember={handleAssignMember}
            onRemoveAssignment={handleRemoveAssignment}
            onApproveAssignment={handleApproveAssignment}
            onRejectAssignment={handleRejectAssignment}
            onUpdateAttendance={handleUpdateAttendance}
            onSubmitEoD={handleSubmitEoD}
            onDeleteEoD={handleDeleteEoD}
            onCreateLocation={handleCreateLocation}
            onRenameLocation={handleRenameLocationByName}
            onDeleteLocation={handleDeleteLocationByName}
            onCreateRole={handleCreateRole}
            onRenameRole={handleRenameRole}
            onDeleteRole={handleDeleteRoleDirect}
          />
        )}

        {activeSubTab === 'feedback' && (
          <HRFeedbackView
            feedbackList={feedbackList}
            categories={feedbackCategories}
            summary={feedbackSummary}
            isLoading={isLoading}
            isSummaryLoading={isSummaryLoading}
            canManage={canWriteHR}
            isDarkMode={isDarkMode}
            onUpdateStatus={handleUpdateFeedbackStatus}
            onDeleteFeedback={handleDeleteFeedback}
            onReload={loadAllData}
            onReloadSummary={loadFeedbackSummary}
            searchQuery={feedbackSearchQuery}
            statusFilter={feedbackStatusFilter}
            typeFilter={feedbackTypeFilter}
            categoryFilter={feedbackCategoryFilter}
            identityFilter={feedbackIdentityFilter}
            sourceFilter={feedbackSourceFilter}
            dateFilter={feedbackDateFilter}
          />
        )}

        {activeSubTab === 'statistics' && (
          <HRStatisticsView
            stats={stats}
            stands={stands}
            members={members}
            roles={roles}
            isLoading={isLoading}
            isDarkMode={isDarkMode}
          />
        )}
      </div>

      <ConfirmationModal
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant="danger"
        isDarkMode={isDarkMode}
      />
    </DashboardContainer>
  );
};
