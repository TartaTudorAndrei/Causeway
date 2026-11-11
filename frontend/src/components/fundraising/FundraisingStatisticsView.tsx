import React, { useMemo } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { MetricCard, DonutChart, SimpleBarChart, type PieDatum, type BarDatum } from '../common';
import type { FundraisingSponsor } from '../../types/fundraising';

interface FundraisingStatisticsViewProps {
  sponsors: FundraisingSponsor[];
  isLoading?: boolean;
  isDarkMode?: boolean;
}

export const FundraisingStatisticsView: React.FC<FundraisingStatisticsViewProps> = ({
  sponsors = [],
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
    const totalPipeline = sponsors.length;
    const signedSponsors = sponsors.filter((s) => s.status === 'CONTRACT_SIGNED' || s.status === 'SPONSORED');
    const signedCount = signedSponsors.length;

    // Monetary received value
    const totalMonetaryValue = signedSponsors
      .filter((s) => s.receivedType === 'MONEY')
      .reduce((acc, s) => acc + (parseFloat(String(s.receivedValue || '0')) || 0), 0);

    // Win rate: Signed / (Signed + Refused)
    const rejectedCount = sponsors.filter((s) => s.status === 'REFUSED').length;
    const closedDeals = signedCount + rejectedCount;
    const winRate = closedDeals > 0 ? Math.round((signedCount / closedDeals) * 100) : 0;

    // Pipeline funnel breakdown
    const stageMap: Record<string, number> = {
      PENDING: 0,
      CONTACTED: 0,
      IN_TALKS: 0,
      CONTRACT_SIGNED: 0,
      SPONSORED: 0,
      REFUSED: 0,
    };

    sponsors.forEach((s) => {
      const st = s.status || 'PENDING';
      if (stageMap[st] !== undefined) stageMap[st]++;
      else stageMap.PENDING++;
    });

    const stageColors: Record<string, string> = {
      PENDING: '#64748b',
      CONTACTED: '#06b6d4',
      IN_TALKS: '#f59e0b',
      CONTRACT_SIGNED: '#3b82f6',
      SPONSORED: '#10b981',
      REFUSED: '#f43f5e',
    };

    const funnelData: PieDatum[] = Object.entries(stageMap).map(([st, count]) => ({
      label: t(`fundraising.status.${st}`, st),
      value: count,
      color: stageColors[st] || '#3b82f6',
    }));

    // Tier distribution
    const tierMap: Record<string, number> = {};
    sponsors.forEach((s) => {
      const tier = s.sponsorshipType || 'Custom';
      tierMap[tier] = (tierMap[tier] || 0) + 1;
    });

    const tierColors = ['#f59e0b', '#94a3b8', '#b45309', '#3b82f6', '#10b981', '#64748b'];
    const tierData: PieDatum[] = Object.entries(tierMap).map(([tier, count], idx) => ({
      label: tier,
      value: count,
      color: tierColors[idx % tierColors.length],
    }));

    // Monetary vs In-Kind (Barter)
    const moneyCount = sponsors.filter((s) => s.receivedType === 'MONEY').length;
    const otherCount = sponsors.filter((s) => s.receivedType === 'OTHER').length;
    const receivedTypeData: PieDatum[] = [
      { label: t('fundraising.money', 'Financiar (Bani)'), value: moneyCount, color: '#10b981' },
      { label: t('fundraising.inKind', 'Barter (Produse/Servicii)'), value: otherCount, color: '#8b5cf6' },
    ];

    // Account Manager Portfolio
    const managerMap: Record<string, { total: number; signed: number }> = {};
    sponsors.forEach((s) => {
      const mgr = s.responsiblePerson || t('common.unassigned', 'Neatribuit');
      if (!managerMap[mgr]) managerMap[mgr] = { total: 0, signed: 0 };
      managerMap[mgr].total++;
      if (s.status === 'CONTRACT_SIGNED' || s.status === 'SPONSORED') managerMap[mgr].signed++;
    });

    const managerBarData: BarDatum[] = Object.entries(managerMap).map(([mgr, stat]) => ({
      label: mgr,
      value: stat.signed,
      secondaryValue: stat.total,
      color: 'bg-emerald-600',
      secondaryColor: 'bg-zinc-700',
    }));

    // Contract fulfillment rate: percentage with contractUrl
    const withContract = signedSponsors.filter((s) => s.contractUrl && s.contractUrl.trim().length > 0).length;
    const contractFulfillmentRate = signedCount > 0 ? Math.round((withContract / signedCount) * 100) : 0;

    return {
      totalPipeline,
      signedCount,
      totalMonetaryValue,
      winRate,
      contractFulfillmentRate,
      funnelData,
      tierData,
      receivedTypeData,
      managerBarData,
    };
  }, [sponsors, t]);

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
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label={t('fundraising.totalPipeline', 'Total Oportunități')}
          value={metrics.totalPipeline}
          subtext={`${metrics.signedCount} ${t('fundraising.signedPartners', 'Semnate')}`}
          isDarkMode={isDarkMode}
        />
        <MetricCard
          label={t('fundraising.realizedValue', 'Valoare Financiară Semnată')}
          value={formatRon(metrics.totalMonetaryValue)}
          subtext={t('fundraising.monetaryGrants', 'Granturi & Sponsorizări')}
          isDarkMode={isDarkMode}
        />
        <MetricCard
          label={t('fundraising.conversionRate', 'Rată Conversie (Win Rate)')}
          value={`${metrics.winRate}%`}
          subtext={t('fundraising.fromClosedDeals', 'din Negocieri Finalizate')}
          isDarkMode={isDarkMode}
        />
        <MetricCard
          label={t('fundraising.contractFulfillment', 'Contracte Aplicate')}
          value={`${metrics.contractFulfillmentRate}%`}
          subtext={`${metrics.signedCount} ${t('fundraising.partnersExecuted', 'Parteneri Semnați')}`}
          isDarkMode={isDarkMode}
        />
      </div>

      {/* Visual Distributions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* CRM Pipeline Funnel */}
        <div className={`p-4 rounded-2xl border ${tCss.card}`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${tCss.textSecondary}`}>
            {t('fundraising.pipelineFunnel', 'Pâlnie de Conversie CRM (Stadii Oportunități)')}
          </h3>
          <DonutChart
            data={metrics.funnelData}
            totalLabel={t('fundraising.leads', 'Lead-uri')}
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Sponsorship Tier Breakdown */}
        <div className={`p-4 rounded-2xl border ${tCss.card}`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${tCss.textSecondary}`}>
            {t('fundraising.tierBreakdown', 'Distribuție Pachete Sponsorizare')}
          </h3>
          <DonutChart
            data={metrics.tierData}
            totalLabel={t('fundraising.tiers', 'Pachete')}
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Account Manager Portfolio */}
        <div className={`p-4 rounded-2xl border ${tCss.card}`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${tCss.textSecondary}`}>
            {t('fundraising.portfolioByManager', 'Performanță Responsabili (Semnate / Portofoliu Total)')}
          </h3>
          <SimpleBarChart
            data={metrics.managerBarData}
            isDarkMode={isDarkMode}
            maxBars={7}
          />
        </div>

        {/* Monetary vs In-Kind */}
        <div className={`p-4 rounded-2xl border ${tCss.card}`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${tCss.textSecondary}`}>
            {t('fundraising.receivedTypeRatio', 'Raport Financiar vs Barter (Bunuri/Servicii)')}
          </h3>
          <DonutChart
            data={metrics.receivedTypeData}
            totalLabel={t('fundraising.sponsors', 'Sponsori')}
            isDarkMode={isDarkMode}
          />
        </div>
      </div>
    </div>
  );
};
