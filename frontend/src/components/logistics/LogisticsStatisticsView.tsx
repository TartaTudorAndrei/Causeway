import React, { useMemo } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { MetricCard, DonutChart, SimpleBarChart, type PieDatum, type BarDatum } from '../common';
import type { StockLocation, StockItem, LocationStock, StockTransferRecord, StandStatisticsRecord } from '../../types/logistics';

interface LogisticsStatisticsViewProps {
  locations: StockLocation[];
  items: StockItem[];
  stocks: LocationStock[];
  transfers: StockTransferRecord[];
  standStats: StandStatisticsRecord[];
  isLoading?: boolean;
  isDarkMode?: boolean;
}

export const LogisticsStatisticsView: React.FC<LogisticsStatisticsViewProps> = ({
  locations = [],
  items = [],
  stocks = [],
  transfers = [],
  standStats = [],
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
    const totalCatalogItems = items.length;
    const totalUnitsOnHand = stocks.reduce((acc, s) => acc + (s.quantity || 0), 0);

    // Mugs deployed vs sold
    const totalMugsSupplied = standStats.reduce((acc, s) => acc + (s.totalMugsSupplied || 0), 0);
    const totalMugsSold = standStats.reduce((acc, s) => acc + (s.totalMugsSold || 0), 0);
    const avgSellThroughRate =
      totalMugsSupplied > 0 ? Math.round((totalMugsSold / totalMugsSupplied) * 100) : 0;

    // Stock allocation: Central warehouse (DEPOSIT) vs Stands (STAND)
    const depositLocIds = new Set(locations.filter((l) => l.type === 'DEPOSIT').map((l) => l.id));
    const standLocIds = new Set(locations.filter((l) => l.type === 'STAND').map((l) => l.id));

    let depositUnits = 0;
    let standUnits = 0;

    stocks.forEach((st) => {
      if (depositLocIds.has(st.locationId)) depositUnits += st.quantity || 0;
      else if (standLocIds.has(st.locationId)) standUnits += st.quantity || 0;
    });

    const stockAllocationData: PieDatum[] = [
      { label: t('logistics.typeDeposit', 'Depozit Central'), value: depositUnits, color: '#3b82f6' },
      { label: t('logistics.typeStand', 'Standuri Active'), value: standUnits, color: '#10b981' },
    ];

    // Category breakdown
    const catMap: Record<string, number> = {};
    items.forEach((item) => {
      const cat = item.category || 'General';
      catMap[cat] = (catMap[cat] || 0) + 1;
    });

    const categoryColors = ['#3b82f6', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6', '#64748b'];
    const categoryChartData: PieDatum[] = Object.entries(catMap).map(([cat, count], idx) => ({
      label: cat,
      value: count,
      color: categoryColors[idx % categoryColors.length],
    }));

    // Stock Health Classification
    let criticalCount = 0;
    let warningCount = 0;
    let healthyCount = 0;

    // Sum stock by item
    const itemStockSum: Record<string, number> = {};
    stocks.forEach((s) => {
      itemStockSum[s.itemId] = (itemStockSum[s.itemId] || 0) + (s.quantity || 0);
    });

    items.forEach((it) => {
      const q = itemStockSum[it.id] || 0;
      const min = it.minSafetyStock || 20;
      if (q <= min) criticalCount++;
      else if (q <= min * 1.5) warningCount++;
      else healthyCount++;
    });

    const healthChartData: PieDatum[] = [
      { label: t('logistics.statusCritical', 'Stoc Critic'), value: criticalCount, color: '#f43f5e' },
      { label: t('logistics.statusWarning', 'Avertisment'), value: warningCount, color: '#f59e0b' },
      { label: t('logistics.statusHealthy', 'Optim'), value: healthyCount, color: '#10b981' },
    ];

    // Stand Sell-Through Leaderboard
    const standLeaderboard: BarDatum[] = standStats
      .slice()
      .sort((a, b) => (b.totalMugsSold || 0) - (a.totalMugsSold || 0))
      .slice(0, 7)
      .map((st) => ({
        label: st.standName || `Stand #${st.standId?.substring(0, 6)}`,
        value: st.totalMugsSold || 0,
        secondaryValue: st.totalMugsSupplied || 0,
        color: 'bg-emerald-600',
        secondaryColor: 'bg-zinc-700',
      }));

    return {
      totalCatalogItems,
      totalUnitsOnHand,
      totalMugsSold,
      avgSellThroughRate,
      stockAllocationData,
      categoryChartData,
      healthChartData,
      standLeaderboard,
      transfersCount: transfers.length,
    };
  }, [locations, items, stocks, transfers, standStats, t]);

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
          label={t('logistics.totalInventoryUnits', 'Total Unități în Stoc')}
          value={metrics.totalUnitsOnHand.toLocaleString()}
          subtext={`${metrics.totalCatalogItems} ${t('logistics.skus', 'Articole Master')}`}
          isDarkMode={isDarkMode}
        />
        <MetricCard
          label={t('logistics.mugsSold', 'Articole Distribuite')}
          value={metrics.totalMugsSold.toLocaleString()}
          subtext={`${metrics.avgSellThroughRate}% ${t('logistics.sellThrough', 'Rată Distribuire')}`}
          isDarkMode={isDarkMode}
        />
        <MetricCard
          label={t('logistics.activeTransfers', 'Transferuri Înregistrate')}
          value={metrics.transfersCount}
          subtext={t('logistics.movementsAudit', 'Mișcări Stoc')}
          isDarkMode={isDarkMode}
        />
        <MetricCard
          label={t('logistics.managedLocations', 'Locații Active')}
          value={locations.length}
          subtext={`${locations.filter((l) => l.type === 'STAND').length} Standuri / ${locations.filter((l) => l.type === 'DEPOSIT').length} Depozite`}
          isDarkMode={isDarkMode}
        />
      </div>

      {/* Visual Distributions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Stock Allocation: Warehouse vs Stands */}
        <div className={`p-4 rounded-2xl border ${tCss.card}`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${tCss.textSecondary}`}>
            {t('logistics.stockAllocation', 'Alocare Stoc: Depozit Central vs Standuri')}
          </h3>
          <DonutChart
            data={metrics.stockAllocationData}
            totalLabel={t('logistics.units', 'Unități')}
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Stock Health */}
        <div className={`p-4 rounded-2xl border ${tCss.card}`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${tCss.textSecondary}`}>
            {t('logistics.stockHealthStatus', 'Stare Sănătate Stocuri (Articole)')}
          </h3>
          <DonutChart
            data={metrics.healthChartData}
            totalLabel={t('logistics.skus', 'SKU')}
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Stand Sell-Through Leaderboard */}
        <div className={`p-4 rounded-2xl border ${tCss.card}`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${tCss.textSecondary}`}>
            {t('logistics.standSellThroughRank', 'Performanță Standuri (Articole Distribuite / Aprovizionate)')}
          </h3>
          <SimpleBarChart
            data={metrics.standLeaderboard}
            isDarkMode={isDarkMode}
            maxBars={7}
          />
        </div>

        {/* Catalog Categories */}
        <div className={`p-4 rounded-2xl border ${tCss.card}`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${tCss.textSecondary}`}>
            {t('logistics.catalogBreakdown', 'Distribuție Articole pe Categorii')}
          </h3>
          <DonutChart
            data={metrics.categoryChartData}
            totalLabel={t('logistics.categories', 'Categorii')}
            isDarkMode={isDarkMode}
          />
        </div>
      </div>
    </div>
  );
};
