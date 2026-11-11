import React, { useMemo } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { MetricCard, DonutChart, SimpleBarChart, type PieDatum, type BarDatum } from '../common';
import type { HrStand, HrMember, HrStandRole, HrStats } from '../../types/hr';

interface HRStatisticsViewProps {
  stats?: HrStats | null;
  stands?: HrStand[];
  members?: HrMember[];
  roles?: HrStandRole[];
  isLoading?: boolean;
  isDarkMode?: boolean;
}

export const HRStatisticsView: React.FC<HRStatisticsViewProps> = ({
  stats,
  stands = [],
  members = [],
  roles: _roles = [],
  isLoading = false,
  isDarkMode = true,
}) => {
  const { t } = useLanguage();

  const tCss = {
    card: isDarkMode ? 'bg-zinc-950 border-zinc-850' : 'bg-white border-zinc-200 shadow-xs',
    subCard: isDarkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200',
    textPrimary: isDarkMode ? 'text-white' : 'text-zinc-900',
    textSecondary: isDarkMode ? 'text-zinc-400' : 'text-zinc-500',
  };

  const metrics = useMemo(() => {
    const totalMembers = stats?.totalMembersCount ?? members.length;
    const activeMembers = stats?.activeMembersCount ?? members.filter((m) => m.onboardingStatus === 'Active').length;
    const activationRate = totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0;

    // Shift coverage and volunteer hours
    let totalSlotsNeeded = 0;
    let totalSlotsAssigned = 0;
    let totalVolunteerHours = 0;
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let waitingCount = 0;

    const memberShiftsMap: Record<string, number> = {};

    stands.forEach((s) => {
      s.shifts?.forEach((sh) => {
        const needed = (sh.neededVolunteers || 0) + (sh.neededFinance || 0) + (sh.neededLogistics || 0);
        totalSlotsNeeded += needed > 0 ? needed : (sh.assignments?.length || 1);

        const assignments = sh.assignments || [];
        totalSlotsAssigned += assignments.length;

        // Calculate hours based on shift duration or default 4 hours
        let shiftDuration = 4;
        if (sh.startTime && sh.endTime) {
          const [sh1, sm1] = sh.startTime.split(':').map(Number);
          const [sh2, sm2] = sh.endTime.split(':').map(Number);
          if (!isNaN(sh1) && !isNaN(sh2)) {
            const diff = (sh2 * 60 + (sm2 || 0)) - (sh1 * 60 + (sm1 || 0));
            if (diff > 0) shiftDuration = diff / 60;
          }
        }

        assignments.forEach((a) => {
          if (a.attendanceStatus === 'PRESENT' || a.attendanceStatus === 'LATE') {
            totalVolunteerHours += shiftDuration;
          }

          if (a.attendanceStatus === 'PRESENT') presentCount++;
          else if (a.attendanceStatus === 'ABSENT') absentCount++;
          else if (a.attendanceStatus === 'LATE') lateCount++;
          else waitingCount++;

          const memName = a.memberName || a.memberEmail || 'Voluntar';
          memberShiftsMap[memName] = (memberShiftsMap[memName] || 0) + 1;
        });
      });
    });

    const shiftCoverageRate =
      totalSlotsNeeded > 0
        ? Math.round((totalSlotsAssigned / totalSlotsNeeded) * 100)
        : stats?.shiftCoverageRate ?? 100;

    const totalHoursLogged = totalVolunteerHours > 0 ? Math.round(totalVolunteerHours) : (stats?.totalVolunteerHoursLogged ?? 0);

    // Attendance breakdown
    const totalRecordedAttendance = presentCount + absentCount + lateCount;
    const attendanceRate = totalRecordedAttendance > 0 ? Math.round((presentCount / totalRecordedAttendance) * 100) : 100;

    const attendancePieData: PieDatum[] = [
      { label: t('hr.attendancePresent', 'Prezent'), value: presentCount, color: '#10b981' },
      { label: t('hr.attendanceLate', 'Întârziat'), value: lateCount, color: '#f59e0b' },
      { label: t('hr.attendanceAbsent', 'Absent'), value: absentCount, color: '#f43f5e' },
      { label: t('hr.attendanceWaiting', 'În așteptare'), value: waitingCount, color: '#64748b' },
    ];

    // Onboarding Status breakdown
    const onboardingMap: Record<string, number> = stats?.onboardingStatusBreakdown ?? {};
    if (Object.keys(onboardingMap).length === 0) {
      members.forEach((m) => {
        const st = m.onboardingStatus || 'Pending';
        onboardingMap[st] = (onboardingMap[st] || 0) + 1;
      });
    }

    const onboardingColors: Record<string, string> = {
      Active: '#10b981',
      Onboarding: '#3b82f6',
      Pending: '#f59e0b',
      Inactive: '#64748b',
    };

    const onboardingPieData: PieDatum[] = Object.entries(onboardingMap).map(([status, count]) => ({
      label: status,
      value: count,
      color: onboardingColors[status] || '#8b5cf6',
    }));

    // Top volunteer leaderboard
    const topVolunteers: BarDatum[] = Object.entries(memberShiftsMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([name, shiftsCount]) => ({
        label: name,
        value: shiftsCount,
        color: 'bg-blue-600',
      }));

    // Stand coverage distribution
    const standCoverageData: BarDatum[] = stands.slice(0, 7).map((s) => {
      let standAssigned = 0;
      let standNeeded = 0;
      s.shifts?.forEach((sh) => {
        const n = (sh.neededVolunteers || 0) + (sh.neededFinance || 0) + (sh.neededLogistics || 0);
        standNeeded += n > 0 ? n : (sh.assignments?.length || 1);
        standAssigned += sh.assignments?.length || 0;
      });

      return {
        label: s.locationName || `Stand #${s.id.substring(0, 6)}`,
        value: standAssigned,
        secondaryValue: standNeeded,
        color: 'bg-emerald-600',
        secondaryColor: 'bg-zinc-700',
      };
    });

    return {
      totalMembers,
      activeMembers,
      activationRate,
      shiftCoverageRate,
      totalHoursLogged,
      attendanceRate,
      attendancePieData,
      onboardingPieData,
      topVolunteers,
      standCoverageData,
    };
  }, [stats, stands, members, t]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-0.5">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label={t('hr.totalVolunteers', 'Voluntari Înregistrați')}
          value={metrics.totalMembers}
          subtext={`${metrics.activationRate}% ${t('hr.activeStatus', 'Activi')}`}
          isDarkMode={isDarkMode}
        />
        <MetricCard
          label={t('hr.shiftCoverage', 'Grad de Acoperire Ture')}
          value={`${metrics.shiftCoverageRate}%`}
          subtext={t('hr.confirmedSlots', 'Sloturi Confirmate')}
          isDarkMode={isDarkMode}
        />
        <MetricCard
          label={t('hr.volunteerHours', 'Ore de Voluntariat')}
          value={metrics.totalHoursLogged.toLocaleString()}
          subtext={t('hr.loggedToDate', 'Contribuite în Total')}
          isDarkMode={isDarkMode}
        />
        <MetricCard
          label={t('hr.attendanceRate', 'Rată Prezență')}
          value={`${metrics.attendanceRate}%`}
          subtext={t('hr.punctualityRate', 'Punctualitate & Prezență')}
          isDarkMode={isDarkMode}
        />
      </div>

      {/* Visual Distributions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Attendance Verification Breakdown */}
        <div className={`p-4 rounded-2xl border ${tCss.card}`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${tCss.textSecondary}`}>
            {t('hr.attendanceBreakdown', 'Distribuție Status Prezență Ture')}
          </h3>
          <DonutChart
            data={metrics.attendancePieData}
            totalLabel={t('hr.assignments', 'Alocări')}
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Onboarding Funnel */}
        <div className={`p-4 rounded-2xl border ${tCss.card}`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${tCss.textSecondary}`}>
            {t('hr.onboardingStatus', 'Stadiu Onboarding & Activare Voluntari')}
          </h3>
          <DonutChart
            data={metrics.onboardingPieData}
            totalLabel={t('hr.members', 'Membri')}
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Stand Shift Slot Coverage */}
        <div className={`p-4 rounded-2xl border ${tCss.card}`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${tCss.textSecondary}`}>
            {t('hr.standShiftCoverage', 'Acoperire Ture pe Standuri (Ocupate / Necesare)')}
          </h3>
          <SimpleBarChart
            data={metrics.standCoverageData}
            isDarkMode={isDarkMode}
            maxBars={7}
          />
        </div>

        {/* Top Volunteer Contributors */}
        <div className={`p-4 rounded-2xl border ${tCss.card}`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${tCss.textSecondary}`}>
            {t('hr.topContributors', 'Top Voluntari după Ture Finalizate')}
          </h3>
          <SimpleBarChart
            data={metrics.topVolunteers}
            valueFormatter={(v) => `${v} ${t('hr.shifts', 'ture')}`}
            isDarkMode={isDarkMode}
            maxBars={7}
          />
        </div>
      </div>
    </div>
  );
};
