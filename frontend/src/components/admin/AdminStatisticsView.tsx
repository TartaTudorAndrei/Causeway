import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { MetricCard, DonutChart, SimpleBarChart, TimeSeriesAreaChart, type PieDatum, type BarDatum, type TimePoint } from '../common';
import type { PlatformUser } from '../../types/adminSettings';
import { auditService } from '../../services/auditService';
import type { SystemAuditLog } from '../../types/audit';

interface AdminStatisticsViewProps {
  users: PlatformUser[];
  isLoading?: boolean;
  isDarkMode?: boolean;
}

export const AdminStatisticsView: React.FC<AdminStatisticsViewProps> = ({
  users = [],
  isLoading = false,
  isDarkMode = true,
}) => {
  const { t } = useLanguage();
  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingLogs(true);
    auditService
      .getAuditLogs()
      .then((logs) => {
        if (isMounted) setAuditLogs(logs || []);
      })
      .catch(() => {
        if (isMounted) setAuditLogs([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingLogs(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const tCss = {
    card: isDarkMode ? 'bg-zinc-950 border-zinc-850' : 'bg-white border-zinc-200 shadow-xs',
    subCard: isDarkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200',
    textPrimary: isDarkMode ? 'text-white' : 'text-zinc-900',
    textSecondary: isDarkMode ? 'text-zinc-400' : 'text-zinc-500',
  };

  const metrics = useMemo(() => {
    const totalUsers = users.length;
    const approvedUsers = users.filter((u) => u.status === 'APPROVED').length;
    const pendingUsers = users.filter((u) => u.status === 'PENDING_APPROVAL' || u.status === 'PENDING_EMAIL').length;
    const suspendedUsers = users.filter((u) => u.status === 'SUSPENDED').length;
    const rejectedUsers = users.filter((u) => u.status === 'REJECTED').length;

    // Multi-role users count
    const multiRoleCount = users.filter((u) => (u.roles && u.roles.length > 1) || (u.memberships && u.memberships.length > 1)).length;

    // Account status breakdown
    const statusPieData: PieDatum[] = [
      { label: t('it.statusApproved', 'Aprobat'), value: approvedUsers, color: '#10b981' },
      { label: t('it.statusPending', 'În așteptare'), value: pendingUsers, color: '#f59e0b' },
      { label: t('it.statusSuspended', 'Suspendat'), value: suspendedUsers, color: '#f43f5e' },
      { label: t('it.statusRejected', 'Respins'), value: rejectedUsers, color: '#64748b' },
    ];

    // Role breakdown
    const roleMap: Record<string, number> = {};
    users.forEach((u) => {
      const r = u.primaryRole || 'VOLUNTEER';
      roleMap[r] = (roleMap[r] || 0) + 1;
    });

    const roleColors: Record<string, string> = {
      SUPER_ADMIN: '#f43f5e',
      ADMIN: '#f59e0b',
      DEPARTMENT_MANAGER: '#8b5cf6',
      STAFF: '#3b82f6',
      VOLUNTEER: '#10b981',
      MEMBER: '#06b6d4',
    };

    const rolePieData: PieDatum[] = Object.entries(roleMap).map(([role, count]) => ({
      label: role,
      value: count,
      color: roleColors[role] || '#64748b',
    }));

    // Audit action type breakdown
    const actionMap: Record<string, number> = {};
    auditLogs.forEach((l) => {
      const act = l.actionType || 'UPDATE';
      actionMap[act] = (actionMap[act] || 0) + 1;
    });

    const actionColors: Record<string, string> = {
      CREATE: '#10b981',
      UPDATE: '#3b82f6',
      DELETE: '#f43f5e',
      LOGIN: '#f59e0b',
      EXPORT: '#8b5cf6',
    };

    const actionPieData: PieDatum[] = Object.entries(actionMap).map(([act, count]) => ({
      label: act,
      value: count,
      color: actionColors[act] || '#64748b',
    }));

    // Audit events by department
    const deptMap: Record<string, number> = {};
    auditLogs.forEach((l) => {
      const dept = l.department || 'GENERAL';
      deptMap[dept] = (deptMap[dept] || 0) + 1;
    });

    const deptBarData: BarDatum[] = Object.entries(deptMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([dept, count]) => ({
        label: dept,
        value: count,
        color: 'bg-blue-600',
      }));

    // Most active operators
    const operatorMap: Record<string, number> = {};
    auditLogs.forEach((l) => {
      const op = l.actorName || l.actorEmail?.split('@')[0] || 'Sistem';
      operatorMap[op] = (operatorMap[op] || 0) + 1;
    });

    const operatorBarData: BarDatum[] = Object.entries(operatorMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([op, count]) => ({
        label: op,
        value: count,
        color: 'bg-emerald-600',
      }));

    // Audit activity timeline
    const dateMap: Record<string, number> = {};
    auditLogs.forEach((l) => {
      if (l.timestamp) {
        const d = l.timestamp.split('T')[0];
        dateMap[d] = (dateMap[d] || 0) + 1;
      }
    });

    const sortedDates = Object.keys(dateMap).sort();
    const auditTimeline: TimePoint[] = sortedDates.slice(0, 10).map((d) => ({
      date: d.substring(5),
      value: dateMap[d],
    }));

    return {
      totalUsers,
      approvedUsers,
      multiRoleCount,
      totalAuditLogs: auditLogs.length,
      statusPieData,
      rolePieData,
      actionPieData,
      deptBarData,
      operatorBarData,
      auditTimeline,
    };
  }, [users, auditLogs, t]);

  if (isLoading || isLoadingLogs) {
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
          label={t('it.totalUsers', 'Total Utilizatori Platformă')}
          value={metrics.totalUsers}
          subtext={`${metrics.approvedUsers} ${t('it.activeApproved', 'Aprobați')}`}
          isDarkMode={isDarkMode}
        />
        <MetricCard
          label={t('it.multiRoleAccounts', 'Conturi cu Roluri Multiple')}
          value={metrics.multiRoleCount}
          subtext={t('it.rbacOverlap', 'Privilegii Extinse')}
          isDarkMode={isDarkMode}
        />
        <MetricCard
          label={t('it.totalAuditEvents', 'Evenimente Jurnal Audit')}
          value={metrics.totalAuditLogs.toLocaleString()}
          subtext={t('it.mutationLogs', 'Mutații & Operațiuni')}
          isDarkMode={isDarkMode}
        />
        <MetricCard
          label={t('it.activeOperators', 'Operatori Sistem')}
          value={metrics.operatorBarData.length}
          subtext={t('it.administratorsActive', 'Administratori Activi')}
          isDarkMode={isDarkMode}
        />
      </div>

      {/* Visual Distributions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Account Status Breakdown */}
        <div className={`p-4 rounded-2xl border ${tCss.card}`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${tCss.textSecondary}`}>
            {t('it.accountStatusDistribution', 'Distribuție Stare Conturi')}
          </h3>
          <DonutChart
            data={metrics.statusPieData}
            totalLabel={t('it.users', 'Utilizatori')}
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Roles Distribution */}
        <div className={`p-4 rounded-2xl border ${tCss.card}`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${tCss.textSecondary}`}>
            {t('it.rolesBreakdown', 'Distribuție Roluri Principale')}
          </h3>
          <DonutChart
            data={metrics.rolePieData}
            totalLabel={t('it.roles', 'Roluri')}
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Audit Actions by Department */}
        <div className={`p-4 rounded-2xl border ${tCss.card}`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${tCss.textSecondary}`}>
            {t('it.auditByDept', 'Operațiuni Audit pe Departamente')}
          </h3>
          <SimpleBarChart
            data={metrics.deptBarData}
            isDarkMode={isDarkMode}
            maxBars={7}
          />
        </div>

        {/* Audit Velocity Timeline or Action Types */}
        <div className={`p-4 rounded-2xl border ${tCss.card}`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${tCss.textSecondary}`}>
            {metrics.auditTimeline.length > 1
              ? t('it.auditVelocityTimeline', 'Evoluție Activitate Sistem (Jurnal Audit)')
              : t('it.actionTypeDistribution', 'Distribuție Tipuri Operațiuni')}
          </h3>
          {metrics.auditTimeline.length > 1 ? (
            <TimeSeriesAreaChart
              points={metrics.auditTimeline}
              isDarkMode={isDarkMode}
              primaryColor="#3b82f6"
            />
          ) : (
            <DonutChart
              data={metrics.actionPieData}
              totalLabel={t('it.events', 'Acțiuni')}
              isDarkMode={isDarkMode}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export const ITStatisticsView = AdminStatisticsView;

