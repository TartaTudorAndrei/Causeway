import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SystemAuditLog, AuditActionType, AuditDepartment } from '../../types/audit';
import { auditService } from '../../services/auditService';
import { AuditDetailModal } from './AuditDetailModal';
import { useLanguage } from '../../context/LanguageContext';
import { Eye } from 'lucide-react';
import { MetricCard } from '../common';

interface AuditLogsViewProps {
  isDarkMode: boolean;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ isDarkMode }) => {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const [logs, setLogs] = useState<SystemAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const searchQuery = searchParams.get('search') || '';
  const departmentFilter = searchParams.get('dept') || 'ALL';
  const actionFilter = searchParams.get('action') || 'ALL';

  // Modal inspection
  const [selectedLog, setSelectedLog] = useState<SystemAuditLog | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await auditService.getAuditLogs({
        department: departmentFilter,
        action: actionFilter,
        search: searchQuery,
      });
      setLogs(data);
    } catch (err) {
      console.error('Eroare la încărcarea jurnalului de audit:', err);
    } finally {
      setIsLoading(false);
    }
  }, [departmentFilter, actionFilter, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle live search
  const filteredLogs = logs.filter(log => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.actorEmail.toLowerCase().includes(q) ||
      log.actorName.toLowerCase().includes(q) ||
      log.summary.toLowerCase().includes(q) ||
      (log.resourceName && log.resourceName.toLowerCase().includes(q)) ||
      log.resourceType.toLowerCase().includes(q) ||
      (log.details && log.details.toLowerCase().includes(q))
    );
  });

  // Calculate high-level stats
  const totalEvents = logs.length;
  const createEvents = logs.filter(l => l.actionType === 'CREATE').length;
  const updateEvents = logs.filter(l => l.actionType === 'UPDATE' || l.actionType === 'ADJUSTMENT' || l.actionType === 'TRANSFER').length;
  const deleteEvents = logs.filter(l => l.actionType === 'DELETE').length;

  const css = {
    card: isDarkMode ? 'bg-zinc-950 border-zinc-850' : 'bg-white border-zinc-200 shadow-sm',
    tableHeader: isDarkMode ? 'bg-zinc-900 text-zinc-400 border-zinc-800' : 'bg-zinc-100 text-zinc-600 border-zinc-200',
    tableRow: isDarkMode ? 'border-zinc-850 hover:bg-zinc-900/60' : 'border-zinc-200 hover:bg-zinc-50',
    input: isDarkMode ? 'bg-zinc-950 border-zinc-800 text-white placeholder-zinc-500' : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400',
    textPrimary: isDarkMode ? 'text-zinc-100' : 'text-zinc-900',
    textSecondary: isDarkMode ? 'text-zinc-400' : 'text-zinc-500',
    buttonSubtle: isDarkMode 
      ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200' 
      : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-800',
  };

  const getActionBadge = (action: AuditActionType) => {
    switch (action) {
      case 'CREATE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {t('audit.actionCreate', 'CREARE')}
          </span>
        );
      case 'UPDATE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {t('audit.actionUpdate', 'MODIFICARE')}
          </span>
        );
      case 'DELETE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            {t('audit.actionDelete', 'ȘTERGERE')}
          </span>
        );
      case 'ADJUSTMENT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            {t('audit.actionAdjustment', 'AJUSTARE')}
          </span>
        );
      case 'TRANSFER':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            {t('audit.actionTransfer', 'TRANSFER')}
          </span>
        );
      case 'SUBMIT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {t('audit.actionSubmit', 'RAPORT')}
          </span>
        );
      case 'APPROVE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {t('audit.actionApprove', 'APROBAT')}
          </span>
        );
      case 'REJECT':
      case 'SUSPEND':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            {action}
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
            {action}
          </span>
        );
    }
  };

  const getDepartmentBadge = (dept: AuditDepartment) => {
    switch (dept) {
      case 'LOGISTICS':
        return <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">{t('audit.deptLogistics', 'LOGISTICĂ')}</span>;
      case 'FINANCE':
        return <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">{t('audit.deptFinance', 'FINANȚE')}</span>;
      case 'HR':
        return <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">{t('audit.deptHR', 'HR')}</span>;
      case 'FUNDRAISING':
        return <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">{t('audit.deptFundraising', 'FUNDRAISING')}</span>;
      case 'IT_AUTH':
        return <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold">{t('audit.deptIT', 'IT & SEC')}</span>;
      default:
        return <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700 font-bold">{dept}</span>;
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-0.5">
      
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label={t('audit.metricTotal', 'Total Evenimente Audit')}
          value={totalEvents}
          isDarkMode={isDarkMode}
        />
        <MetricCard
          label={t('audit.metricCreations', 'Creări')}
          value={createEvents}
          isDarkMode={isDarkMode}
        />
        <MetricCard
          label={t('audit.metricUpdates', 'Modificări & Ajustări')}
          value={updateEvents}
          isDarkMode={isDarkMode}
        />
        <MetricCard
          label={t('audit.metricDeletions', 'Ștergeri')}
          value={deleteEvents}
          isDarkMode={isDarkMode}
        />
      </div>

      {/* Audit Log Table / Mobile Cards */}
      <div className={`flex-1 min-h-0 rounded-2xl border flex flex-col overflow-hidden ${css.card}`}>
        {/* Mobile Card List View */}
        <div className="block md:hidden divide-y divide-zinc-800/40 flex-1 min-h-0 overflow-y-auto no-scrollbar">
          {isLoading ? (
            <div className="py-12 text-center text-zinc-500 animate-pulse font-semibold text-xs">
              {t('general.loading', 'Se încarcă datele...')}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-zinc-500">
              <p className="font-semibold text-xs">
                {t('audit.noLogsFound', 'Nu există evenimente de audit înregistrate conform filtrelor.')}
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="p-4 space-y-2 text-xs">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center space-x-1.5 flex-wrap gap-y-1 flex-1 min-w-0">
                    {getDepartmentBadge(log.department)}
                    {getActionBadge(log.actionType)}
                  </div>
                  <span className="font-mono text-[10px] text-zinc-500 shrink-0">
                    {new Date(log.timestamp).toLocaleString('ro-RO')}
                  </span>
                </div>
<div>
                  <p className="font-bold text-xs text-zinc-100">{log.summary}</p>
                  {log.resourceName && (
                    <p className="text-[11px] text-zinc-400 font-mono mt-0.5">{log.resourceType}: {log.resourceName}</p>
                  )}
                </div>
<div className="flex items-center justify-between pt-2 border-t border-zinc-800/40 text-[11px] text-zinc-400">
                  <span className="truncate">
                    <span className="font-medium text-zinc-300">{log.actorName}</span>
                    <span className="text-zinc-500 font-mono text-[10px] ml-1">({log.actorEmail})</span>
                  </span>
<button
                    onClick={() => {
                      setSelectedLog(log);
                      setIsDetailModalOpen(true);
                    }}
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer shrink-0 ml-2 ${css.buttonSubtle}`}
                    title={t('audit.inspectLogTooltip', 'Vezi detalii complete & JSON')}
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-400" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block flex-1 min-h-0 overflow-auto no-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className={`border-b uppercase font-bold text-[11px] tracking-wider ${css.tableHeader}`}>
                <th className="py-3 px-4 whitespace-nowrap">{t('audit.colTimestamp', 'Data & Ora')}</th>
                <th className="py-3 px-4 whitespace-nowrap">{t('audit.colDepartment', 'Departament')}</th>
                <th className="py-3 px-4 whitespace-nowrap">{t('audit.colAction', 'Tip Acțiune')}</th>
                <th className="py-3 px-4 whitespace-nowrap">{t('audit.colResource', 'Resursă')}</th>
                <th className="py-3 px-4 whitespace-nowrap">{t('audit.colSummary', 'Descriere / Sumar')}</th>
                <th className="py-3 px-4 whitespace-nowrap">{t('audit.colActor', 'Autor')}</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">{t('audit.colInspect', 'Detalii')}</th>
              </tr>
            </thead>
<tbody className="divide-y divide-zinc-800/40">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    <p className="font-semibold text-xs animate-pulse">{t('general.loading', 'Se încarcă datele...')}</p>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    <p className="font-semibold text-xs">
                      {t('audit.noLogsFound', 'Nu există evenimente de audit înregistrate conform filtrelor.')}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className={`transition-all ${css.tableRow}`}>
                    
                    {/* Timestamp */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('ro-RO')}
                    </td>

                    {/* Department Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getDepartmentBadge(log.department)}
                    </td>

                    {/* Action Type Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getActionBadge(log.actionType)}
                    </td>

                    {/* Resource */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <p className="font-bold text-xs text-zinc-200">{log.resourceType}</p>
                      {log.resourceName && (
                        <p className="text-[11px] text-zinc-400 truncate max-w-[150px]">{log.resourceName}</p>
                      )}
                    </td>

                    {/* Summary */}
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-xs text-zinc-100 max-w-md line-clamp-2">{log.summary}</p>
                      {log.details && (
                        <p className="text-[11px] text-zinc-400 truncate max-w-md mt-0.5">{log.details}</p>
                      )}
                    </td>

                    {/* Actor */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <p className="font-bold text-xs text-zinc-300">{log.actorName}</p>
                      <p className="text-[11px] text-zinc-500 font-mono">{log.actorEmail}</p>
                    </td>

                    {/* Inspection Button */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedLog(log);
                          setIsDetailModalOpen(true);
                        }}
                        title={t('audit.inspectLogTooltip', 'Vezi detalii complete & JSON')}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${css.buttonSubtle}`}
                      >
                        <Eye className="w-4 h-4 text-blue-400" />
                      </button>
                    </td>
</tr>
                ))
              )}
            </tbody>
</table>
        </div>
      </div>

      {/* Event Detail Inspection Modal */}
      <AuditDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        log={selectedLog}
        isDarkMode={isDarkMode}
      />
</div>
  );
};
