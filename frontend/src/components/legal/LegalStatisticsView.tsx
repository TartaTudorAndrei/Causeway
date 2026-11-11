import React, { useMemo } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { MetricCard, DonutChart, SimpleBarChart, type PieDatum, type BarDatum } from '../common';
import type { ContractTemplate, GeneratedContract, LegalStats } from '../../types/legal';

interface LegalStatisticsViewProps {
  stats?: LegalStats | null;
  templates: ContractTemplate[];
  contracts: GeneratedContract[];
  isLoading?: boolean;
  isDarkMode?: boolean;
}

export const LegalStatisticsView: React.FC<LegalStatisticsViewProps> = ({
  stats,
  templates = [],
  contracts = [],
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
    const totalTemplates = stats?.totalTemplates ?? templates.length;
    const totalContracts = stats?.totalContracts ?? contracts.length;
    const signedContracts = stats?.signedContracts ?? contracts.filter((c) => c.status === 'signed').length;
    const pendingContracts = stats?.pendingContracts ?? contracts.filter((c) => c.status === 'pending_signature').length;
    const draftContracts = stats?.draftContracts ?? contracts.filter((c) => c.status === 'draft').length;
    const archivedContracts = stats?.archivedContracts ?? contracts.filter((c) => c.status === 'archived').length;

    const executionRate = totalContracts > 0 ? Math.round((signedContracts / totalContracts) * 100) : 0;

    // Google Drive backup sync rate
    const driveBackedUp = contracts.filter((c) => c.driveFileId && c.driveFileId.trim().length > 0).length;
    const driveSyncRate = totalContracts > 0 ? Math.round((driveBackedUp / totalContracts) * 100) : 0;

    // Status lifecycle breakdown
    const statusPieData: PieDatum[] = [
      { label: t('legal.statusSigned', 'Semnat'), value: signedContracts, color: '#10b981' },
      { label: t('legal.statusPending', 'În așteptare'), value: pendingContracts, color: '#f59e0b' },
      { label: t('legal.statusDraft', 'Ciornă'), value: draftContracts, color: '#3b82f6' },
      { label: t('legal.statusArchived', 'Arhivat'), value: archivedContracts, color: '#64748b' },
    ];

    // Templates by Category breakdown
    const templateCategoryMap: Record<string, number> = {};
    templates.forEach((tmpl) => {
      const cat = tmpl.category || 'general';
      templateCategoryMap[cat] = (templateCategoryMap[cat] || 0) + 1;
    });

    const catColors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'];
    const templateCatData: PieDatum[] = Object.entries(templateCategoryMap).map(([cat, count], idx) => ({
      label: t(`legal.cat${cat.charAt(0).toUpperCase() + cat.slice(1)}`, cat.toUpperCase()),
      value: count,
      color: catColors[idx % catColors.length],
    }));

    // Most utilized templates (by contract count)
    const templateUsageMap: Record<string, number> = {};
    contracts.forEach((c) => {
      const tmpl = templates.find((t) => t.id === c.templateId);
      const name = tmpl?.title || c.title || 'General';
      templateUsageMap[name] = (templateUsageMap[name] || 0) + 1;
    });

    const templateUsageBarData: BarDatum[] = Object.entries(templateUsageMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([name, count]) => ({
        label: name,
        value: count,
        color: 'bg-blue-600',
      }));

    // Top counterparties
    const partyBMap: Record<string, number> = {};
    contracts.forEach((c) => {
      if (c.partyBName && c.partyBName.trim()) {
        partyBMap[c.partyBName] = (partyBMap[c.partyBName] || 0) + 1;
      }
    });

    const partyBBarData: BarDatum[] = Object.entries(partyBMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([name, count]) => ({
        label: name,
        value: count,
        color: 'bg-emerald-600',
      }));

    return {
      totalTemplates,
      totalContracts,
      signedContracts,
      executionRate,
      driveSyncRate,
      statusPieData,
      templateCatData,
      templateUsageBarData,
      partyBBarData,
    };
  }, [stats, templates, contracts, t]);

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
          label={t('legal.totalContracts', 'Total Contracte')}
          value={metrics.totalContracts}
          subtext={`${metrics.signedContracts} ${t('legal.signedBinding', 'Semnate & Active')}`}
          isDarkMode={isDarkMode}
        />
        <MetricCard
          label={t('legal.executionRate', 'Rată Executare')}
          value={`${metrics.executionRate}%`}
          subtext={t('legal.fromGenerated', 'din Documente Generate')}
          isDarkMode={isDarkMode}
        />
        <MetricCard
          label={t('legal.totalTemplates', 'Șabloane Active')}
          value={metrics.totalTemplates}
          subtext={t('legal.templateRepository', 'în Registrul Juridic')}
          isDarkMode={isDarkMode}
        />
        <MetricCard
          label={t('legal.driveSyncHealth', 'Sincronizare Google Drive')}
          value={`${metrics.driveSyncRate}%`}
          subtext={t('legal.archivedToDrive', 'PDF-uri Arhivate')}
          isDarkMode={isDarkMode}
        />
      </div>

      {/* Visual Distributions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Lifecycle Status Breakdown */}
        <div className={`p-4 rounded-2xl border ${tCss.card}`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${tCss.textSecondary}`}>
            {t('legal.lifecycleStatus', 'Ciclu de Viață Contracte')}
          </h3>
          <DonutChart
            data={metrics.statusPieData}
            totalLabel={t('legal.contracts', 'Contracte')}
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Templates by Category */}
        <div className={`p-4 rounded-2xl border ${tCss.card}`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${tCss.textSecondary}`}>
            {t('legal.templatesByCategory', 'Șabloane Juridice pe Categorii')}
          </h3>
          <DonutChart
            data={metrics.templateCatData}
            totalLabel={t('legal.templates', 'Șabloane')}
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Most Utilized Templates */}
        <div className={`p-4 rounded-2xl border ${tCss.card}`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${tCss.textSecondary}`}>
            {t('legal.mostUtilizedTemplates', 'Cele Mai Utilizate Șabloane')}
          </h3>
          <SimpleBarChart
            data={metrics.templateUsageBarData}
            isDarkMode={isDarkMode}
            maxBars={7}
          />
        </div>

        {/* Counterparty Exposure */}
        <div className={`p-4 rounded-2xl border ${tCss.card}`}>
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${tCss.textSecondary}`}>
            {t('legal.counterpartyExposure', 'Top Părți Semnatare (Parteneri B)')}
          </h3>
          <SimpleBarChart
            data={metrics.partyBBarData}
            isDarkMode={isDarkMode}
            maxBars={7}
          />
        </div>
      </div>
    </div>
  );
};
