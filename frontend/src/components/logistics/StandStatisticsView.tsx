import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Pencil, Trash2, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import type { StandStatisticsRecord, StockLocation } from '../../types/logistics';
interface StandStatisticsViewProps {
    standStats: StandStatisticsRecord[];
    locations?: StockLocation[];
    isDarkMode: boolean;
    onRefresh?: () => void;
    onOpenEoDModal?: (standId?: string) => void;
    onEditEoD?: (stand: StandStatisticsRecord) => void;
    onDeleteEoD?: (stand: StandStatisticsRecord) => void;
    isLoading?: boolean;
}
type SortOption = 'SOLD_DESC' | 'SOLD_ASC' | 'RATE_DESC' | 'RATE_ASC' | 'NAME_ASC' | 'NAME_DESC' | 'DATE_DESC' | 'DATE_ASC' | 'SUPPLIED_DESC' | 'SOLD' | 'RATE' | 'NAME' | 'DATE';
type StatusFilter = 'ALL' | 'ACTIVE' | 'CLOSED';
export const StandStatisticsView: React.FC<StandStatisticsViewProps> = ({ standStats, locations = [], isDarkMode, onOpenEoDModal, onEditEoD, onDeleteEoD, }) => {
    const { t } = useLanguage();
    const [searchParams, setSearchParams] = useSearchParams();
    // Search filter
    const searchTerm = searchParams.get('search') || '';
    // Sort option
    const sortBy = (searchParams.get('sort') as SortOption) || 'SOLD_DESC';
    // Location filter
    const locationFilter = searchParams.get('location') || 'ALL';
    const setLocationFilter = (loc: string) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (loc && loc !== 'ALL')
                next.set('location', loc);
            else
                next.delete('location');
            return next;
        }, { replace: true });
    };
    // Time interval filters
    const startDate = searchParams.get('startDate') || '';
    const setStartDate = (date: string) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (date)
                next.set('startDate', date);
            else
                next.delete('startDate');
            return next;
        }, { replace: true });
    };
    const endDate = searchParams.get('endDate') || '';
    const setEndDate = (date: string) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (date)
                next.set('endDate', date);
            else
                next.delete('endDate');
            return next;
        }, { replace: true });
    };
    // Status filter
    const statusFilter = (searchParams.get('status') as StatusFilter) || 'ALL';
    const setStatusFilter = (stat: StatusFilter) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (stat && stat !== 'ALL')
                next.set('status', stat);
            else
                next.delete('status');
            return next;
        }, { replace: true });
    };
    const handleResetFilters = () => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.delete('search');
            next.delete('sort');
            next.delete('location');
            next.delete('startDate');
            next.delete('endDate');
            next.delete('status');
            return next;
        }, { replace: true });
    };
    const [expandedStandIds, setExpandedStandIds] = useState<Set<string>>(new Set());
    const toggleExpand = (standId: string) => {
        setExpandedStandIds(prev => {
            const next = new Set(prev);
            if (next.has(standId)) {
                next.delete(standId);
            }
            else {
                next.add(standId);
            }
            return next;
        });
    };
    // Build unified location list for the filter
    const availableLocationOptions = useMemo(() => {
        const map = new Map<string, string>();
        locations.forEach(loc => {
            map.set(loc.id, loc.name);
        });
        standStats.forEach(s => {
            if (s.standId && !map.has(s.standId)) {
                map.set(s.standId, s.standName || s.locationName || s.standId);
            }
            if (s.locationName && !Array.from(map.values()).includes(s.locationName)) {
                map.set(s.locationName, s.locationName);
            }
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [locations, standStats]);
    // Date helper
    const getStandDateStrings = (stand: StandStatisticsRecord): string[] => {
        const dates: string[] = [];
        if (stand.eventDate) {
            const d = stand.eventDate.substring(0, 10);
            if (/^\d{4}-\d{2}-\d{2}$/.test(d))
                dates.push(d);
        }
        if (stand.closedAt) {
            const d = stand.closedAt.substring(0, 10);
            if (/^\d{4}-\d{2}-\d{2}$/.test(d))
                dates.push(d);
        }
        if (stand.transfers && stand.transfers.length > 0) {
            stand.transfers.forEach(trf => {
                if (trf.timestamp) {
                    const d = trf.timestamp.substring(0, 10);
                    if (/^\d{4}-\d{2}-\d{2}$/.test(d) && !dates.includes(d)) {
                        dates.push(d);
                    }
                }
            });
        }
        return dates;
    };
    // Filtered & Sorted Stand Statistics
    const filteredStats = useMemo(() => {
        return standStats
            .filter(s => {
            // Search term check
            if (searchTerm.trim()) {
                const q = searchTerm.toLowerCase();
                const matchesSearch = s.standName.toLowerCase().includes(q) ||
                    s.locationName.toLowerCase().includes(q) ||
                    (s.eventName && s.eventName.toLowerCase().includes(q)) ||
                    (s.closingPersonName && s.closingPersonName.toLowerCase().includes(q)) ||
                    (s.closingNotes && s.closingNotes.toLowerCase().includes(q)) ||
                    (s.itemStats && s.itemStats.some(i => i.itemName.toLowerCase().includes(q)));
                if (!matchesSearch)
                    return false;
            }
            // Location filter check
            if (locationFilter !== 'ALL') {
                const locMatch = s.standId === locationFilter ||
                    s.locationName === locationFilter ||
                    s.standName === locationFilter ||
                    locations.some(l => (l.id === locationFilter || l.name === locationFilter) && (s.locationName === l.name || s.standName === l.name));
                if (!locMatch)
                    return false;
            }
            // Status filter check
            if (statusFilter !== 'ALL') {
                if (statusFilter === 'ACTIVE' && s.isClosed)
                    return false;
                if (statusFilter === 'CLOSED' && !s.isClosed)
                    return false;
            }
            // Time interval filter check
            if (startDate || endDate) {
                const dates = getStandDateStrings(s);
                if (dates.length > 0) {
                    const hasMatchingDate = dates.some(d => {
                        if (startDate && d < startDate)
                            return false;
                        if (endDate && d > endDate)
                            return false;
                        return true;
                    });
                    if (!hasMatchingDate)
                        return false;
                }
            }
            return true;
        })
            .sort((a, b) => {
            switch (sortBy) {
                case 'SOLD_ASC':
                    return a.totalMugsSold - b.totalMugsSold;
                case 'RATE_DESC':
                case 'RATE':
                    return b.mugSellThroughRate - a.mugSellThroughRate;
                case 'RATE_ASC':
                    return a.mugSellThroughRate - b.mugSellThroughRate;
                case 'NAME_DESC':
                    return b.standName.localeCompare(a.standName);
                case 'NAME_ASC':
                case 'NAME':
                    return a.standName.localeCompare(b.standName);
                case 'DATE_ASC': {
                    const dateA = a.eventDate || a.closedAt || '';
                    const dateB = b.eventDate || b.closedAt || '';
                    return dateA.localeCompare(dateB);
                }
                case 'DATE_DESC':
                case 'DATE': {
                    const dateA = a.eventDate || a.closedAt || '';
                    const dateB = b.eventDate || b.closedAt || '';
                    return dateB.localeCompare(dateA);
                }
                case 'SUPPLIED_DESC':
                    return b.totalMugsSupplied - a.totalMugsSupplied;
                case 'SOLD_DESC':
                case 'SOLD':
                default:
                    return b.totalMugsSold - a.totalMugsSold;
            }
        });
    }, [standStats, searchTerm, locationFilter, statusFilter, startDate, endDate, sortBy, locations]);
    const tCss = {
        card: isDarkMode ? 'bg-zinc-950 border-zinc-850' : 'bg-white border-zinc-200 shadow-xs',
        subCard: isDarkMode ? 'bg-zinc-900/60 border-zinc-800/80' : 'bg-zinc-50 border-zinc-200',
        input: isDarkMode
            ? 'bg-zinc-900 border-zinc-800 text-white focus:border-blue-500'
            : 'bg-white border-zinc-300 text-zinc-900 focus:border-blue-500',
        textPrimary: isDarkMode ? 'text-white' : 'text-zinc-900',
        textSecondary: isDarkMode ? 'text-zinc-400' : 'text-zinc-500',
        border: isDarkMode ? 'border-zinc-850' : 'border-zinc-200',
        tableHeader: isDarkMode ? 'bg-zinc-900/80 text-zinc-400 border-zinc-800' : 'bg-zinc-100 text-zinc-600 border-zinc-200',
        tableRow: isDarkMode ? 'border-zinc-800/50 hover:bg-zinc-900/40' : 'border-zinc-200 hover:bg-zinc-50',
        tag: isDarkMode
            ? 'bg-zinc-900 border-zinc-800 text-zinc-300'
            : 'bg-zinc-100 border-zinc-200 text-zinc-700',
    };
    const selectedLocationLabel = useMemo(() => {
        if (locationFilter === 'ALL')
            return null;
        const found = availableLocationOptions.find(l => l.id === locationFilter || l.name === locationFilter);
        return found ? found.name : locationFilter;
    }, [locationFilter, availableLocationOptions]);
    return (<div className="space-y-4">
      {/* Active Filter Chips Strip */}
      {(selectedLocationLabel || startDate || endDate || statusFilter !== 'ALL') && (<div className="flex flex-wrap items-center gap-1.5 text-xs">
          {selectedLocationLabel && (<span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${tCss.tag}`}><span>{selectedLocationLabel}</span>
              <button type="button" onClick={() => setLocationFilter('ALL')} className="hover:text-rose-400 transition cursor-pointer ml-1" aria-label="Remove location filter">
                <X className="w-3 h-3"/>
              </button>
            </span>)}

          {(startDate || endDate) && (<span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${tCss.tag}`}><span>
                {startDate && endDate
                    ? `${startDate} → ${endDate}`
                    : startDate
                        ? `≥ ${startDate}`
                        : `≤ ${endDate}`}
              </span>
              <button type="button" onClick={() => {
                    setStartDate('');
                    setEndDate('');
                }} className="hover:text-rose-400 transition cursor-pointer ml-1" aria-label="Remove date range filter">
                <X className="w-3 h-3"/>
              </button>
            </span>)}

          {statusFilter !== 'ALL' && (<span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${tCss.tag}`}>
              <span>
                {statusFilter === 'ACTIVE'
                    ? t('logistics.statusActive', 'Deschis / Activ')
                    : t('logistics.statusCompleted', 'Încheiat (EoD)')}
              </span>
              <button type="button" onClick={() => setStatusFilter('ALL')} className="hover:text-rose-400 transition cursor-pointer ml-1" aria-label="Remove status filter">
                <X className="w-3 h-3"/>
              </button>
            </span>)}

          <button type="button" onClick={handleResetFilters} className="text-[11px] font-semibold text-zinc-400 hover:text-white transition cursor-pointer ml-1 underline decoration-zinc-600 underline-offset-2">
            {t('common.clearFilters', 'Resetează toate')}
          </button>
        </div>)}

      {/* Stand Statistics List */}
      {filteredStats.length === 0 ? (<div className={`p-12 text-center rounded-2xl border ${tCss.card}`}><h4 className={`text-sm font-bold mb-4 ${tCss.textPrimary}`}>
            {searchTerm || locationFilter !== 'ALL' || startDate || endDate || statusFilter !== 'ALL'
                ? t('logistics.noStandsMatchingFilter', 'Niciun stand nu corespunde filtrelor selectate.')
                : t('logistics.noEoDReportsYet', 'Nu există rapoarte End of Day înregistrate încă.')}
          </h4>

          {onOpenEoDModal && !searchTerm && locationFilter === 'ALL' && !startDate && !endDate && (<button onClick={() => onOpenEoDModal()} className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition cursor-pointer">
              <span>{t('logistics.submitEoDNow', 'Completează Raport End of Day')}</span>
            </button>)}
        </div>) : (<div className="space-y-3">
          {filteredStats.map((stand) => {
                const isExpanded = expandedStandIds.has(stand.standId);
                return (<div key={stand.standId || stand.standName} className={`rounded-2xl border transition overflow-hidden ${tCss.card}`}>
                {/* Stand Header & Summary Row */}
                <div onClick={() => toggleExpand(stand.standId)} className="p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-zinc-500/5 transition-colors select-none">
                  {/* Stand Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className={`text-sm font-bold truncate ${tCss.textPrimary}`}>
                        {stand.standName}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${stand.isClosed
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-zinc-800 text-zinc-300 border-zinc-700'}`}>
                        {stand.isClosed
                        ? t('logistics.statusCompleted', 'Încheiat')
                        : t('logistics.statusActive', 'Activ')}
                      </span>
                    </div>
<div className={`flex items-center space-x-2 text-xs mt-0.5 ${tCss.textSecondary}`}>
                      {stand.locationName && stand.locationName !== stand.standName && (<span>{stand.locationName}</span>)}
                      {stand.eventDate && <span>&bull; {stand.eventDate}</span>}
                      {stand.eventName && <span>&bull; {stand.eventName}</span>}
                      {stand.closingPersonName && <span>&bull; {stand.closingPersonName}</span>}
                    </div>
                  </div>

                  {/* Summary Metric Pillars */}
                  <div className="flex items-center justify-between md:justify-end gap-4 sm:gap-6 shrink-0 text-xs">
                    <div>
                      <span className={`block text-[10px] font-bold uppercase tracking-wider ${tCss.textSecondary}`}>
                        {t('logistics.netSupplied', 'Furnizat')}
                      </span>
                      <span className={`font-bold ${tCss.textPrimary}`}>{stand.totalMugsSupplied}</span>
                    </div>
<div>
                      <span className={`block text-[10px] font-bold uppercase tracking-wider text-emerald-400`}>
                        {t('logistics.soldCount', 'Vândut')}
                      </span>
                      <span className="font-bold text-emerald-400">
                        {stand.totalMugsSold} ({stand.mugSellThroughRate}%)
                      </span>
                    </div>
<div>
                      <span className={`block text-[10px] font-bold uppercase tracking-wider ${tCss.textSecondary}`}>
                        {t('logistics.endedWith', 'Rămas')}
                      </span>
                      <span className={`font-bold ${tCss.textPrimary}`}>{stand.totalMugsEnded}</span>
                    </div>

                    {/* Actions & Expand Chevron */}
                    <div className="flex items-center space-x-1 pl-2 border-l border-zinc-800">
                      {stand.isClosed ? ((onEditEoD || onDeleteEoD) && (<div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                            {onEditEoD && (<button type="button" onClick={() => onEditEoD(stand)} title={t('logistics.editEoDBtn', 'Editează Raport EoD')} aria-label={t('logistics.editEoDBtn', 'Editează Raport EoD')} className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition cursor-pointer">
                                <Pencil className="w-3.5 h-3.5"/>
                              </button>)}
                            {onDeleteEoD && (<button type="button" onClick={() => onDeleteEoD(stand)} title={t('logistics.deleteEoDBtn', 'Șterge Raport EoD')} aria-label={t('logistics.deleteEoDBtn', 'Șterge Raport EoD')} className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5"/>
                              </button>)}
                          </div>)) : (onOpenEoDModal && (<button type="button" onClick={(e) => {
                            e.stopPropagation();
                            onOpenEoDModal(stand.standId);
                        }} title={t('logistics.closeStandBtn', 'Încheie Zi (EoD)')} className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition cursor-pointer">
                            {t('logistics.closeStandBtn', 'Încheie Zi (EoD)')}
                          </button>))}
                    </div>
                  </div>
                </div>

                {/* Expanded Section */}
                {isExpanded && (<div className="p-4 border-t border-zinc-800/60 space-y-4 bg-zinc-900/20">
                    {/* Item Breakdown Table */}
                    <div className="overflow-x-auto rounded-xl border border-zinc-800/80">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${tCss.tableHeader}`}>
                            <th className="py-2.5 px-3.5 whitespace-nowrap">{t('logistics.colMugName', 'Articol Vandabil')}</th>
                            <th className="py-2.5 px-3 text-center whitespace-nowrap">{t('logistics.openedWith', 'Deschidere')}</th>
                            <th className="py-2.5 px-3 text-center whitespace-nowrap">{t('logistics.restockedIn', 'Aprovizionat (+)')}</th>
                            <th className="py-2.5 px-3 text-center whitespace-nowrap">{t('logistics.transferredOut', 'Transferat (-)')}</th>
                            <th className="py-2.5 px-3 text-center font-bold text-blue-400 whitespace-nowrap">{t('logistics.netSupplied', 'Total Furnizat')}</th>
                            <th className="py-2.5 px-3 text-center whitespace-nowrap">{t('logistics.endedWith', 'Rămas')}</th>
                            <th className="py-2.5 px-3 text-center font-bold text-emerald-400 whitespace-nowrap">{t('logistics.soldCount', 'Vândute')}</th>
                            <th className="py-2.5 px-3.5 text-right whitespace-nowrap">{t('logistics.sellThrough', 'Rată Vânzare')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/40">
                          {stand.itemStats.map((item) => (<tr key={item.itemId} className={`${tCss.tableRow} transition-colors`}>
                              <td className={`py-2 px-3.5 font-semibold ${tCss.textPrimary}`}>
                                {item.itemName}
                              </td>
                              <td className={`py-2 px-3 text-center font-medium ${tCss.textPrimary}`}>
                                {item.openedCount} {item.unit}
                              </td>
                              <td className={`py-2 px-3 text-center font-medium ${item.restockedCount > 0 ? 'text-blue-400' : tCss.textSecondary}`}>
                                {item.restockedCount > 0 ? `+${item.restockedCount}` : '0'}
                              </td>
                              <td className={`py-2 px-3 text-center font-medium ${item.transferredOut > 0 ? 'text-rose-400' : tCss.textSecondary}`}>
                                {item.transferredOut > 0 ? `-${item.transferredOut}` : '0'}
                              </td>
                              <td className="py-2 px-3 text-center font-bold text-blue-400">
                                {item.netSupplied} {item.unit}
                              </td>
                              <td className={`py-2 px-3 text-center font-semibold ${tCss.textPrimary}`}>
                                {item.endedCount} {item.unit}
                              </td>
                              <td className="py-2 px-3 text-center font-black text-emerald-400">
                                {item.soldCount} {item.unit}
                              </td>
                              <td className="py-2 px-3.5 text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  <span className="font-bold text-emerald-400">{item.sellThroughRate}%</span>
                                  <div className="w-12 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, Math.max(0, item.sellThroughRate))}%` }}/>
                                  </div>
                                </div>
                              </td>
                            </tr>))}
                        </tbody>
                      </table>
                    </div>

                    {/* Transfers summary if present */}
                    {stand.transfers && stand.transfers.length > 0 && (<div className="space-y-1.5 pt-1">
                        <h5 className={`text-[11px] font-bold uppercase tracking-wider ${tCss.textSecondary}`}>
                          {t('logistics.transfersLogForStand', 'Transferuri Înregistrate')} ({stand.transfers.length})
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {stand.transfers.map((trf) => (<div key={trf.transferId} className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${tCss.subCard}`}>
                              <div className="min-w-0">
                                <span className={`font-semibold ${tCss.textPrimary}`}>
                                  {trf.sourceLocationName} &rarr; {trf.destinationLocationName}
                                </span>
                                <div className={`text-[11px] ${tCss.textSecondary}`}>
                                  {trf.items.map(it => `${it.itemName}: ${it.quantity} ${it.unit}`).join(', ')}
                                </div>
                              </div>
                              <span className={`text-[10px] font-mono shrink-0 pl-2 ${tCss.textSecondary}`}>
                                {new Date(trf.timestamp).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>))}
                        </div>
                      </div>)}

                    {/* End of day closing notes if present */}
                    {stand.isClosed && (stand.closingPersonName || stand.closingNotes) && (<div className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${tCss.subCard}`}>
                        <div>
                          <span className={`text-[11px] font-bold ${tCss.textSecondary}`}>
                            {t('logistics.closedBy', 'Încheiat de')}:{' '}
                          </span>
                          <span className={`font-semibold ${tCss.textPrimary}`}>
                            {stand.closingPersonName || 'Operator'}
                          </span>
                          {stand.closingNotes && (<p className={`italic text-zinc-400 mt-0.5`}>"{stand.closingNotes}"</p>)}
                        </div>
                        <div className="flex items-center space-x-2">
                          {stand.closedAt && (<span className={`text-[11px] font-mono shrink-0 ${tCss.textSecondary}`}>
                              {new Date(stand.closedAt).toLocaleString('ro-RO')}
                            </span>)}
                          {(onEditEoD || onDeleteEoD) && (<div className="flex items-center space-x-1 pl-2 border-l border-zinc-800">
                              {onEditEoD && (<button type="button" onClick={() => onEditEoD(stand)} title={t('logistics.editEoDBtn', 'Editează Raport EoD')} aria-label={t('logistics.editEoDBtn', 'Editează Raport EoD')} className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition cursor-pointer">
                                  <Pencil className="w-3.5 h-3.5"/>
                                </button>)}
                              {onDeleteEoD && (<button type="button" onClick={() => onDeleteEoD(stand)} title={t('logistics.deleteEoDBtn', 'Șterge Raport EoD')} aria-label={t('logistics.deleteEoDBtn', 'Șterge Raport EoD')} className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer">
                                  <Trash2 className="w-3.5 h-3.5"/>
                                </button>)}
                            </div>)}
                        </div>
                      </div>)}
                  </div>)}
              </div>);
            })}
        </div>)}
    </div>);
};
