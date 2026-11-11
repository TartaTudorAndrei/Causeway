import React, { useMemo } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { MetricCard, DonutChart, SimpleBarChart, TimeSeriesAreaChart, type PieDatum, type BarDatum, type TimePoint } from '../common';
import type { CalendarEvent, TaskItem, LocationItem } from '../../types/general';

interface GeneralStatisticsViewProps {
  events: CalendarEvent[];
  tasks: TaskItem[];
  locations: LocationItem[];
  isLoading?: boolean;
  isDarkMode?: boolean;
}

export const GeneralStatisticsView: React.FC<GeneralStatisticsViewProps> = ({
  events = [],
  tasks = [],
  locations = [],
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
    const totalEvents = events.length;
    const specialDemandEvents = events.filter((e) => e.isSpecialDemand);
    const surgeRatio = totalEvents > 0 ? Math.round((specialDemandEvents.length / totalEvents) * 100) : 0;

    const avgDemandMultiplier =
      totalEvents > 0
        ? (events.reduce((acc, e) => acc + (e.demandMultiplier || 1.0), 0) / totalEvents).toFixed(2)
        : '1.00';

    const totalTasks = tasks.length;
    const doneTasks = tasks.filter((t) => t.status === 'done').length;
    const taskCompletionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    const todayStr = new Date().toISOString().split('T')[0];
    const overdueTasks = tasks.filter((t) => t.status !== 'done' && t.dueDate && t.dueDate < todayStr).length;

    const totalLocations = locations.length;
    const standLocations = locations.filter((l) => l.type === 'STAND').length;
    const depositLocations = locations.filter((l) => l.type === 'DEPOSIT').length;

    // Events by department
    const deptCount: Record<string, number> = {};
    events.forEach((e) => {
      const d = e.department || 'general';
      deptCount[d] = (deptCount[d] || 0) + 1;
    });

    const eventDeptColors: Record<string, string> = {
      general: '#3b82f6',
      finance: '#10b981',
      logistics: '#f59e0b',
      hr: '#8b5cf6',
      it: '#06b6d4',
      fundraising: '#ec4899',
      legal: '#64748b',
    };

    const eventDeptChartData: PieDatum[] = Object.entries(deptCount).map(([dept, count]) => ({
      label: t(`general.dept${dept.charAt(0).toUpperCase() + dept.slice(1)}`, dept.toUpperCase()),
      value: count,
      color: eventDeptColors[dept] || '#3b82f6',
    }));

    // Tasks backlog by priority
    const priorityCount: Record<string, number> = { high: 0, medium: 0, low: 0 };
    tasks
      .filter((t) => t.status !== 'done')
      .forEach((t) => {
        const p = t.priority || 'medium';
        if (priorityCount[p] !== undefined) priorityCount[p]++;
        else priorityCount.medium++;
      });

    const taskPriorityChartData: PieDatum[] = [
      { label: t('general.priorityHigh', 'Ridicată'), value: priorityCount.high, color: '#f43f5e' },
      { label: t('general.priorityMedium', 'Medie'), value: priorityCount.medium, color: '#f59e0b' },
      { label: t('general.priorityLow', 'Scăzută'), value: priorityCount.low, color: '#3b82f6' },
    ];

    // Departmental workload distribution (Tasks)
    const taskDeptCount: Record<string, { total: number; done: number }> = {};
    tasks.forEach((t) => {
      const d = t.department || 'general';
      if (!taskDeptCount[d]) taskDeptCount[d] = { total: 0, done: 0 };
      taskDeptCount[d].total++;
      if (t.status === 'done') taskDeptCount[d].done++;
    });

    const taskDeptBarData: BarDatum[] = Object.entries(taskDeptCount).map(([dept, stats]) => ({
      label: t(`general.dept${dept.charAt(0).toUpperCase() + dept.slice(1)}`, dept.toUpperCase()),
      value: stats.done,
      secondaryValue: stats.total,
      color: 'bg-emerald-600',
      secondaryColor: 'bg-zinc-700',
    }));

    // Special event tag breakdown
    const tagCount: Record<string, number> = {};
    specialDemandEvents.forEach((e) => {
      const tag = e.demandTag || 'OTHER';
      tagCount[tag] = (tagCount[tag] || 0) + 1;
    });

    const tagChartData: BarDatum[] = Object.entries(tagCount).map(([tag, count]) => ({
      label: tag,
      value: count,
      color: 'bg-amber-500',
    }));

    // Chronological event timeline
    const dateCountMap: Record<string, number> = {};
    events.forEach((e) => {
      if (e.date) {
        dateCountMap[e.date] = (dateCountMap[e.date] || 0) + 1;
      }
    });

    const sortedDates = Object.keys(dateCountMap).sort();
    const eventTimeline: TimePoint[] = sortedDates.slice(0, 10).map((date) => ({
      date: date.substring(5), // MM-DD
      value: dateCountMap[date],
    }));

    return {
      totalEvents,
      surgeRatio,
      avgDemandMultiplier,
      taskCompletionRate,
      overdueTasks,
      totalLocations,
      standLocations,
      depositLocations,
      eventDeptChartData,
      taskPriorityChartData,
      taskDeptBarData,
      tagChartData,
      eventTimeline,
    };
  }, [events, tasks, locations, t]);

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
          label={t('general.totalEvents', 'Total Evenimente')}
          value={metrics.totalEvents}
          subtext={`${metrics.surgeRatio}% ${t('general.surgeShare', 'Zile cu Vârf')}`}
          isDarkMode={isDarkMode}
        />
        <MetricCard
          label={t('general.taskCompletion', 'Rată Finalizare Sarcini')}
          value={`${metrics.taskCompletionRate}%`}
          subtext={`${tasks.filter((t) => t.status === 'done').length}/${tasks.length} ${t('general.tasks', 'Sarcini')}`}
          isDarkMode={isDarkMode}
        />
        <MetricCard
          label={t('general.overdueTasks', 'Sarcini Depășite')}
          value={metrics.overdueTasks}
          subtext={t('general.requireAttention', 'Necesită Atenție')}
          isDarkMode={isDarkMode}
        />
        <MetricCard
          label={t('general.activeLocations', 'Noduri Active')}
          value={metrics.totalLocations}
          subtext={`${metrics.standLocations} Standuri / ${metrics.depositLocations} Depozite`}
          isDarkMode={isDarkMode}
        />
      </div>

      {/* Grid of Visual Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Event Distribution by Department */}
        <div className={`p-4 rounded-2xl border ${tCss.card}`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${tCss.textSecondary}`}>
            {t('general.eventsByDept', 'Distribuție Evenimente pe Departamente')}
          </h3>
          <DonutChart
            data={metrics.eventDeptChartData}
            totalLabel={t('general.events', 'Evenimente')}
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Task Backlog by Priority */}
        <div className={`p-4 rounded-2xl border ${tCss.card}`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${tCss.textSecondary}`}>
            {t('general.tasksBacklog', 'Sarcini Active după Prioritate')}
          </h3>
          <DonutChart
            data={metrics.taskPriorityChartData}
            totalLabel={t('general.activeTasks', 'Active')}
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Department Workload (Tasks Done vs Total) */}
        <div className={`p-4 rounded-2xl border ${tCss.card}`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${tCss.textSecondary}`}>
            {t('general.deptWorkload', 'Volum Sarcini pe Departamente (Finalizate / Total)')}
          </h3>
          <SimpleBarChart
            data={metrics.taskDeptBarData}
            isDarkMode={isDarkMode}
            maxBars={7}
          />
        </div>

        {/* Special Demand Tags or Timeline */}
        <div className={`p-4 rounded-2xl border ${tCss.card}`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${tCss.textSecondary}`}>
            {t('general.eventTimeline', 'Densitate Evenimente')}
          </h3>
          {metrics.eventTimeline.length > 1 ? (
            <TimeSeriesAreaChart
              points={metrics.eventTimeline}
              isDarkMode={isDarkMode}
              primaryColor="#3b82f6"
            />
          ) : (
            <SimpleBarChart
              data={metrics.tagChartData}
              isDarkMode={isDarkMode}
              maxBars={5}
            />
          )}
        </div>
      </div>
    </div>
  );
};
