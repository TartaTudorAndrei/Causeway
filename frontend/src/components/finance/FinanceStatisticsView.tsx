import React, { useMemo } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { MetricCard, DonutChart, SimpleBarChart, TimeSeriesAreaChart, type PieDatum, type BarDatum, type TimePoint } from '../common';
import type { FinancialStats, FinanceExpense, FinanceOnlineDonation, FinanceStand, FinanceSponsorship, FinanceOtherIncome } from '../../types/finance';

interface FinanceStatisticsViewProps {
  stats?: FinancialStats;
  expenses?: FinanceExpense[];
  onlineDonations?: FinanceOnlineDonation[];
  stands?: FinanceStand[];
  sponsorships?: FinanceSponsorship[];
  otherIncomes?: FinanceOtherIncome[];
  isLoading?: boolean;
  isDarkMode?: boolean;
}

export const FinanceStatisticsView: React.FC<FinanceStatisticsViewProps> = ({
  stats,
  expenses = [],
  onlineDonations = [],
  stands = [],
  sponsorships = [],
  otherIncomes = [],
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
    // 1. Total revenues & outflows
    const totalExpenses = stats?.totalExpenses ?? expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    const standsRevenue = stats?.standsRevenueTotal ?? stands.reduce((acc, s) => acc + (s.cashCollected || 0) + (s.posCardCollected || 0), 0);
    const onlineDonationsTotal = stats?.onlineDonationsTotal ?? onlineDonations.reduce((acc, d) => acc + (d.amount || 0), 0);
    const sponsorshipsReceived = stats?.sponsorshipsReceivedTotal ?? sponsorships
      .filter((s) => s.paymentStatus === 'Funds Received')
      .reduce((acc, s) => acc + (s.agreedAmount || 0), 0);
    const otherIncomesTotal = stats?.otherIncomesTotal ?? otherIncomes.reduce((acc, o) => acc + (o.amount || 0), 0);

    const totalIncome = stats?.totalIncome ?? (standsRevenue + onlineDonationsTotal + sponsorshipsReceived + otherIncomesTotal);
    const netCashFlow = stats?.netCashFlow ?? (totalIncome - totalExpenses);

    // Operating expense ratio
    const operatingExpenseRatio = totalIncome > 0 ? Math.round((totalExpenses / totalIncome) * 100) : 0;

    // Revenue diversification breakdown
    const revenuePieData: PieDatum[] = [
      { label: t('finance.standRevenue', 'Încasări Standuri'), value: standsRevenue, color: '#10b981' },
      { label: t('finance.onlineDonations', 'Donații Online'), value: onlineDonationsTotal, color: '#3b82f6' },
      { label: t('finance.sponsorshipsReceived', 'Sponsorizări Încasate'), value: sponsorshipsReceived, color: '#f59e0b' },
      { label: t('finance.otherIncomes', 'Alte Venituri'), value: otherIncomesTotal, color: '#8b5cf6' },
    ];

    // Expense breakdown by category
    const expCatMap: Record<string, number> = {};
    expenses.forEach((e) => {
      const cat = e.category || 'Altele';
      expCatMap[cat] = (expCatMap[cat] || 0) + (e.amount || 0);
    });

    const categoryColors = ['#f43f5e', '#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#64748b'];
    const expenseCategoryData: PieDatum[] = Object.entries(expCatMap).map(([cat, amt], idx) => ({
      label: cat,
      value: amt,
      color: categoryColors[idx % categoryColors.length],
    }));

    // Stand collections leaderboard
    const standRevenueMap: Record<string, number> = {};
    stands.forEach((s) => {
      const name = s.standLocation || 'Stand';
      standRevenueMap[name] = (standRevenueMap[name] || 0) + (s.cashCollected || 0) + (s.posCardCollected || 0);
    });

    const standBarData: BarDatum[] = Object.entries(standRevenueMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([name, rev]) => ({
        label: name,
        value: rev,
        color: 'bg-emerald-600',
      }));

    // Cash vs POS card ratio
    const totalCash = stands.reduce((acc, s) => acc + (s.cashCollected || 0), 0);
    const totalPos = stands.reduce((acc, s) => acc + (s.posCardCollected || 0), 0);
    const standPaymentSplit: PieDatum[] = [
      { label: t('finance.cashCollected', 'Numerar (Cash)'), value: totalCash, color: '#10b981' },
      { label: t('finance.posCollected', 'Card (POS)'), value: totalPos, color: '#3b82f6' },
    ];

    // Expense Timeline
    const expDateMap: Record<string, number> = {};
    expenses.forEach((e) => {
      if (e.transactionDate) {
        expDateMap[e.transactionDate] = (expDateMap[e.transactionDate] || 0) + (e.amount || 0);
      }
    });

    const sortedExpDates = Object.keys(expDateMap).sort();
    const expenseTimeline: TimePoint[] = sortedExpDates.slice(0, 10).map((d) => ({
      date: d.substring(5),
      value: expDateMap[d],
    }));

    return {
      totalIncome,
      totalExpenses,
      netCashFlow,
      operatingExpenseRatio,
      revenuePieData,
      expenseCategoryData,
      standBarData,
      standPaymentSplit,
      expenseTimeline,
    };
  }, [stats, expenses, onlineDonations, stands, sponsorships, otherIncomes, t]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const formatRon = (val: number) => `${Math.round(val).toLocaleString()} RON`;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-0.5">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label={t('finance.totalRevenues', 'Venituri Totale')}
          value={formatRon(metrics.totalIncome)}
          subtext={t('finance.grossInflow', 'Toate Sursele')}
          isDarkMode={isDarkMode}
        />
        <MetricCard
          label={t('finance.totalExpenses', 'Total Cheltuieli')}
          value={formatRon(metrics.totalExpenses)}
          subtext={`${metrics.operatingExpenseRatio}% ${t('finance.opexRatio', 'din Venituri')}`}
          isDarkMode={isDarkMode}
        />
        <MetricCard
          label={t('finance.netCashFlow', 'Cash Flow Net')}
          value={formatRon(metrics.netCashFlow)}
          subtext={metrics.netCashFlow >= 0 ? t('finance.surplus', 'Excedent') : t('finance.deficit', 'Deficit')}
          isDarkMode={isDarkMode}
        />
        <MetricCard
          label={t('finance.standRevenueTotal', 'Încasări Standuri')}
          value={formatRon(stats?.standsRevenueTotal ?? 0)}
          subtext={`${stands.length} ${t('finance.standSubmissions', 'Rapoarte Depuse')}`}
          isDarkMode={isDarkMode}
        />
      </div>

      {/* Visual Distributions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Diversification */}
        <div className={`p-4 rounded-2xl border ${tCss.card}`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${tCss.textSecondary}`}>
            {t('finance.revenueDiversification', 'Diversificare Surse de Venit')}
          </h3>
          <DonutChart
            data={metrics.revenuePieData}
            totalLabel="RON"
            valueFormatter={formatRon}
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Expense Category Breakdown */}
        <div className={`p-4 rounded-2xl border ${tCss.card}`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${tCss.textSecondary}`}>
            {t('finance.expenseBreakdown', 'Distribuție Cheltuieli pe Categorii')}
          </h3>
          <DonutChart
            data={metrics.expenseCategoryData}
            totalLabel="RON"
            valueFormatter={formatRon}
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Stand Collections Leaderboard */}
        <div className={`p-4 rounded-2xl border ${tCss.card}`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${tCss.textSecondary}`}>
            {t('finance.standLeaderboard', 'Top Standuri după Încasări (Numerar + Card)')}
          </h3>
          <SimpleBarChart
            data={metrics.standBarData}
            valueFormatter={formatRon}
            isDarkMode={isDarkMode}
            maxBars={7}
          />
        </div>

        {/* Cash vs POS Split or Expense Timeline */}
        <div className={`p-4 rounded-2xl border ${tCss.card}`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${tCss.textSecondary}`}>
            {metrics.expenseTimeline.length > 1
              ? t('finance.expenseCurve', 'Evoluție Cheltuieli în Timp')
              : t('finance.cashVsPosRatio', 'Raport Numerar vs Card (Standuri)')}
          </h3>
          {metrics.expenseTimeline.length > 1 ? (
            <TimeSeriesAreaChart
              points={metrics.expenseTimeline}
              valueFormatter={formatRon}
              isDarkMode={isDarkMode}
              primaryColor="#f43f5e"
            />
          ) : (
            <DonutChart
              data={metrics.standPaymentSplit}
              totalLabel="RON"
              valueFormatter={formatRon}
              isDarkMode={isDarkMode}
            />
          )}
        </div>
      </div>
    </div>
  );
};
