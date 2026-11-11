import React, { useState, useEffect, useCallback } from 'react';
import { ExternalLink, Pencil, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { logisticsService } from '../../services/logisticsService';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { ToastNotification } from '../common/ToastNotification';
import type {
  StockPredictionResponse,
  ItemPredictionDetail,
  StockItem,
  StockLocation,
  StandDispatchPrepResponse,
  RefillOptimizerResponse,
  RefillOptionDTO,
} from '../../types/logistics';

interface StockPredictorViewProps {
  items: StockItem[];
  locations?: StockLocation[];
  isDarkMode: boolean;
  canWrite?: boolean;
  searchTerm?: string;
  filterStatus?: 'ALL' | 'CRITICAL_WARNING' | 'SELLABLE' | 'MUGS' | 'HEALTHY';
  refreshTrigger?: number;
  onRefresh?: () => void;
}

type PredictorMode = 'PROCUREMENT' | 'STAND_PREP' | 'EMERGENCY_REFILL';

export const StockPredictorView: React.FC<StockPredictorViewProps> = ({
  items,
  isDarkMode,
  canWrite = false,
  searchTerm = '',
  filterStatus = 'ALL',
  refreshTrigger,
  onRefresh,
}) => {
  const { t } = useLanguage();

  const [activeMode, setActiveMode] = useState<PredictorMode>('PROCUREMENT');

  // Mode 1: Deposit Procurement
  const [data, setData] = useState<StockPredictionResponse | null>(null);
  const [isLoadingProcurement, setIsLoadingProcurement] = useState(true);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Edit Thresholds Modal State
  const [editingItem, setEditingItem] = useState<ItemPredictionDetail | null>(null);
  const [editMinSafety, setEditMinSafety] = useState<number | ''>(30);
  const [editLeadTime, setEditLeadTime] = useState<number | ''>(2);
  const [editTargetStock, setEditTargetStock] = useState<number | ''>(150);
  const [editBurnRate, setEditBurnRate] = useState<string>('');
  const [isSavingThresholds, setIsSavingThresholds] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Mode 2: Stand Dispatch Prep
  const [standPrepData, setStandPrepData] = useState<StandDispatchPrepResponse | null>(null);
  const [selectedStandId, setSelectedStandId] = useState<string>('');
  const [isLoadingStandPrep, setIsLoadingStandPrep] = useState(false);

  // Mode 3: Smart Emergency Refill
  const [locationsList, setLocationsList] = useState<StockLocation[]>([]);
  const [refillDestLocId, setRefillDestLocId] = useState<string>('');
  const [refillItemId, setRefillItemId] = useState<string>('');
  const [refillQuantity, setRefillQuantity] = useState<number>(50);
  const [refillResult, setRefillResult] = useState<RefillOptimizerResponse | null>(null);
  const [isLoadingRefill, setIsLoadingRefill] = useState(false);

  // Direct Transfer Execution state
  const [isTransferring, setIsTransferring] = useState(false);
  const [toast, setToast] = useState<{ text: string; type?: 'success' | 'error' } | null>(null);
  const [pendingTransfer, setPendingTransfer] = useState<{
    sourceLocationId: string;
    destinationLocationId: string;
    itemId: string;
    quantity: number;
    title: string;
    message: string;
  } | null>(null);

  const tCss = {
    card: isDarkMode ? 'bg-zinc-950 border-zinc-850' : 'bg-white border-zinc-200 shadow-xs',
    itemCard: isDarkMode ? 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700' : 'bg-white border-zinc-200 shadow-xs hover:border-zinc-300',
    innerCard: isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900',
    input: isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700 focus:border-zinc-700' : 'bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400 focus:border-zinc-400',
    textPrimary: isDarkMode ? 'text-white' : 'text-zinc-900',
    textSecondary: isDarkMode ? 'text-zinc-400' : 'text-zinc-500',
  };

  const fetchProcurementData = useCallback(async () => {
    setIsLoadingProcurement(true);
    try {
      const res = await logisticsService.getPredictions();
      setData(res);
      const firstImportant = res.predictions.find(p => p.status === 'CRITICAL_RUNOUT' || p.isSellable || p.isMug);
      if (firstImportant && !expandedItemId) {
        setExpandedItemId(firstImportant.itemId);
      }
    } finally {
      setIsLoadingProcurement(false);
    }
  }, [expandedItemId]);

  const fetchStandPrep = useCallback(async (standId?: string) => {
    setIsLoadingStandPrep(true);
    try {
      const res = await logisticsService.getStandDispatchPrep(standId || undefined);
      setStandPrepData(res);
      if (res.standId) {
        setSelectedStandId(res.standId);
      }
    } finally {
      setIsLoadingStandPrep(false);
    }
  }, []);

  const fetchLocations = useCallback(async () => {
    try {
      const locs = await logisticsService.getLocations();
      setLocationsList(locs);
      if (locs.length > 0 && !refillDestLocId) {
        const firstStand = locs.find(l => l.type === 'STAND') || locs[0];
        setRefillDestLocId(firstStand.id);
      }
      if (items.length > 0 && !refillItemId) {
        const firstSellable = items.find(i => i.isSellable || i.isMug) || items[0];
        setRefillItemId(firstSellable.id);
      }
    } catch {}
  }, [items, refillDestLocId, refillItemId]);

  useEffect(() => {
    fetchProcurementData();
    fetchLocations();
  }, [fetchProcurementData, fetchLocations, refreshTrigger]);

  useEffect(() => {
    if (activeMode === 'STAND_PREP' && !standPrepData) {
      fetchStandPrep();
    }
  }, [activeMode, standPrepData, fetchStandPrep]);

  const handleCalculateRefill = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!refillDestLocId || !refillItemId || refillQuantity <= 0) return;
    setIsLoadingRefill(true);
    try {
      const res = await logisticsService.calculateRefillOptions(refillDestLocId, refillItemId, refillQuantity);
      setRefillResult(res);
    } catch {
      setToast({ text: t('common.error', 'Eroare la calcularea rutelor'), type: 'error' });
    } finally {
      setIsLoadingRefill(false);
    }
  };

  const handleOpenEditThresholds = (item: ItemPredictionDetail) => {
    setEditingItem(item);
    setEditMinSafety(item.minSafetyStock);
    setEditLeadTime(item.leadTimeDays);
    setEditTargetStock(item.targetStock);
    setEditBurnRate(item.baseDailyBurnRate ? item.baseDailyBurnRate.toString() : '');
    setSaveError(null);
  };

  const handleSaveThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setIsSavingThresholds(true);
    setSaveError(null);
    try {
      await logisticsService.updateItemThresholds(editingItem.itemId, {
        minSafetyStock: typeof editMinSafety === 'number' ? editMinSafety : (parseInt(String(editMinSafety), 10) || 0),
        leadTimeDays: typeof editLeadTime === 'number' ? editLeadTime : (parseInt(String(editLeadTime), 10) || 1),
        targetStock: typeof editTargetStock === 'number' ? editTargetStock : (parseInt(String(editTargetStock), 10) || 1),
        dailyBurnRate: editBurnRate ? parseFloat(editBurnRate) : undefined,
      });
      setEditingItem(null);
      await fetchProcurementData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setSaveError(err.message || 'Eroare la salvare');
    } finally {
      setIsSavingThresholds(false);
    }
  };

  const handleExecuteTransfer = async () => {
    if (!pendingTransfer) return;
    setIsTransferring(true);
    try {
      await logisticsService.executeTransfer(
        pendingTransfer.sourceLocationId,
        pendingTransfer.destinationLocationId,
        [{ itemId: pendingTransfer.itemId, quantity: pendingTransfer.quantity }],
        'Operator',
        `Refill automat: ${pendingTransfer.quantity} buc`
      );
      setToast({ text: t('logistics.directTransferSuccess', 'Transfer inițiat cu succes!'), type: 'success' });
      setPendingTransfer(null);
      if (activeMode === 'EMERGENCY_REFILL') {
        await handleCalculateRefill();
      }
      if (activeMode === 'STAND_PREP' && selectedStandId) {
        await fetchStandPrep(selectedStandId);
      }
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setToast({ text: err.message || 'Eroare la efectuarea transferului', type: 'error' });
    } finally {
      setIsTransferring(false);
    }
  };

  const predictions = data?.predictions || [];
  const filteredPredictions = predictions.filter(item => {
    const matchesSearch =
      item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'SELLABLE') return item.isSellable || item.isMug;
    if (filterStatus === 'CRITICAL_WARNING') return item.status === 'CRITICAL_RUNOUT' || item.status === 'DEPLETED' || item.status === 'WARNING_LOW';
    if (filterStatus === 'HEALTHY') return item.status === 'HEALTHY';
    return true;
  });

  return (
    <div className="space-y-4">
      {toast && <ToastNotification toast={toast} onClose={() => setToast(null)} />}

      {/* Subsystem Mode Switcher */}
      <div className={`p-1.5 rounded-2xl border flex items-center justify-between gap-2 flex-wrap ${tCss.card}`}>
        <div className={`flex items-center gap-1.5 p-1 rounded-xl ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-300'}`}>

          <button
            type="button"
            onClick={() => setActiveMode('PROCUREMENT')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeMode === 'PROCUREMENT'
                ? 'bg-amber-500 text-black shadow-sm'
                : (isDarkMode ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-zinc-900')
            }`}
          >
            {t('logistics.predictorModeProcurement', 'Reaprovizionare Depozite')}
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('STAND_PREP')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeMode === 'STAND_PREP'
                ? 'bg-amber-500 text-black shadow-sm'
                : (isDarkMode ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-zinc-900')
            }`}
          >
            {t('logistics.predictorModeStandPrep', 'Pregătire Standuri')}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveMode('EMERGENCY_REFILL');
              if (!refillResult && refillDestLocId && refillItemId) {
                handleCalculateRefill();
              }
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeMode === 'EMERGENCY_REFILL'
                ? 'bg-amber-500 text-black shadow-sm'
                : (isDarkMode ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-zinc-900')
            }`}
          >
            {t('logistics.predictorModeRefill', 'Reaprovizionare Rapidă')}
          </button>
        </div>
      </div>

      {/* MODE 1: DEPOSIT PROCUREMENT */}
      {activeMode === 'PROCUREMENT' && (
        <div className="space-y-3">
          {data && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className={`p-3 rounded-2xl border ${data.criticalItemsCount > 0 ? 'bg-rose-500/10 border-rose-500/30' : tCss.card}`}>
                <span className="text-xs font-semibold text-zinc-400 block">{t('logistics.criticalItems', 'Articole Critice')}</span>
                <span className={`text-xl font-bold ${data.criticalItemsCount > 0 ? 'text-rose-400' : tCss.textPrimary}`}>
                  {data.criticalItemsCount}
                </span>
              </div>
              <div className={`p-3 rounded-2xl border ${data.warningItemsCount > 0 ? 'bg-amber-500/10 border-amber-500/30' : tCss.card}`}>
                <span className="text-xs font-semibold text-zinc-400 block">{t('logistics.warningItems', 'Avertisment Stoc Redus')}</span>
                <span className={`text-xl font-bold ${data.warningItemsCount > 0 ? 'text-amber-400' : tCss.textPrimary}`}>
                  {data.warningItemsCount}
                </span>
              </div>
              <div className={`p-3 rounded-2xl border ${tCss.card}`}>
                <span className="text-xs font-semibold text-zinc-400 block">{t('logistics.healthyItems', 'Stoc Optim')}</span>
                <span className="text-xl font-bold text-emerald-400">
                  {data.healthyItemsCount}
                </span>
              </div>
            </div>
          )}

          {isLoadingProcurement ? (
            <div className={`p-12 text-center rounded-2xl border ${tCss.card}`}>
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mb-2"></div>
              <p className="text-xs text-zinc-400">{t('general.loading', 'Se încarcă prognoza...')}</p>
            </div>
          ) : filteredPredictions.length === 0 ? (
            <div className={`p-8 text-center rounded-2xl border ${tCss.card}`}>
              <p className="text-xs text-zinc-400">{t('logistics.noPredictionsFound', 'Niciun articol găsit conform filtrelor.')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPredictions.map(item => {
                const isExpanded = expandedItemId === item.itemId;
                const statusBadge = {
                  DEPLETED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                  CRITICAL_RUNOUT: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                  WARNING_LOW: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                  HEALTHY: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                }[item.status] || 'bg-zinc-800 text-zinc-300 border-zinc-700';

                return (
                  <div key={item.itemId} className={`rounded-2xl border transition-all ${tCss.itemCard} overflow-hidden`}>
                    <div
                      onClick={() => setExpandedItemId(isExpanded ? null : item.itemId)}
                      className="p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm truncate">{item.itemName}</span>
                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${statusBadge}`}>
                              {t(`logistics.status_${item.status}`, item.status)}
                            </span>
                            {(item.isSellable || item.isMug) && (
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                Vandabil
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-zinc-400 mt-0.5 font-medium">
                            <span>SKU: {item.sku}</span>
                            <span>•</span>
                            <span>{item.category}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="text-xs text-zinc-400 block">Stoc Total</span>
                          <span className="text-sm font-bold text-amber-400">
                            {item.totalCurrentStock} {item.unit}
                          </span>
                        </div>

                        {canWrite && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditThresholds(item);
                            }}
                            className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition cursor-pointer"
                            title="Configurare Parametri"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {isExpanded && item.dailyForecast && (
                      <div className="px-3.5 pb-3.5 pt-2 border-t border-zinc-800/60 space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div className={`p-2 rounded-xl border ${tCss.innerCard}`}>
                            <span className="text-[11px] text-zinc-400 block">Consum Zilnic Mediu</span>
                            <span className="font-bold">{item.baseDailyBurnRate} {item.unit}/zi</span>
                          </div>
                          <div className={`p-2 rounded-xl border ${tCss.innerCard}`}>
                            <span className="text-[11px] text-zinc-400 block">Stoc Siguranță</span>
                            <span className="font-bold">{item.minSafetyStock} {item.unit}</span>
                          </div>
                          <div className={`p-2 rounded-xl border ${tCss.innerCard}`}>
                            <span className="text-[11px] text-zinc-400 block">Autonomie Estimată</span>
                            <span className="font-bold text-amber-400">{item.daysRemaining} zile</span>
                          </div>
                          <div className={`p-2 rounded-xl border ${tCss.innerCard}`}>
                            <span className="text-[11px] text-zinc-400 block">Punct de Comandă</span>
                            <span className="font-bold">{item.reorderPoint} {item.unit}</span>
                          </div>
                        </div>

                        <div className="overflow-x-auto no-scrollbar pb-1">
                          <div className="flex gap-1.5 min-w-[700px]">
                            {item.dailyForecast.map((day, idx) => {
                              const isDepleted = day.isRunoutDay || day.projectedStockRemaining <= 0;
                              const isWeekend = day.dayOfWeek === 'FRI' || day.dayOfWeek === 'SAT' || day.dayOfWeek === 'SUN';
                              const hasWeatherSurge = (day.weatherMultiplier || 1.0) > 1.1;

                              return (
                                <div
                                  key={idx}
                                  className={`flex-1 p-2 rounded-xl border text-center space-y-1 ${
                                    isDepleted
                                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                                      : isWeekend
                                      ? 'bg-zinc-900/90 border-blue-500/30'
                                      : tCss.innerCard
                                  }`}
                                >
                                  <span className="text-[10px] font-mono text-zinc-400 block">{day.date.substring(5)}</span>
                                  <strong className="text-xs font-bold block">{day.dayOfWeek}</strong>

                                  <div className="h-4 flex items-center justify-center">
                                    {hasWeatherSurge ? (
                                      <span className="px-1 rounded-sm text-[9px] font-bold bg-blue-500/20 text-blue-300">
                                        {day.weatherCondition === 'FREEZING' ? 'Ger' : day.weatherCondition === 'SNOW' ? 'Zăpadă' : 'Meteo'}
                                      </span>
                                    ) : (
                                      <span className="text-[9px] text-zinc-500">{day.dayWeight}x</span>
                                    )}
                                  </div>

                                  <div className="pt-1 border-t border-zinc-800/50">
                                    <span className="text-[9px] uppercase font-bold text-zinc-400 block">Cerere</span>
                                    <span className="text-xs font-extrabold">{day.projectedDemand}</span>
                                  </div>

                                  <div className={`p-1 rounded-lg text-[10px] font-mono font-bold ${isDepleted ? 'bg-rose-500/30 text-rose-200' : 'bg-zinc-800 text-zinc-200'}`}>
                                    {isDepleted ? '0' : day.projectedStockRemaining}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {item.recommendedRestockQuantity > 0 && (
                          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-400 flex items-center justify-between">
                            <span>Recomandare reaprovizionare depozite:</span>
                            <span>{item.recommendedRestockQuantity} {item.unit}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODE 2: STAND DISPATCH PREPARATION */}
      {activeMode === 'STAND_PREP' && (
        <div className="space-y-3">
          <div className={`p-4 rounded-2xl border space-y-3 ${tCss.card}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1 text-zinc-400">
                  {t('logistics.standSelector', 'Stand & Schimburi Programate')}
                </label>
                <select
                  value={selectedStandId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedStandId(id);
                    fetchStandPrep(id);
                  }}
                  className={`w-full px-3 py-2 text-xs rounded-xl border outline-hidden ${tCss.input}`}
                >
                  {standPrepData?.allCampaignStands.map(stand => (
                    <option key={stand.id} value={stand.id}>
                      {stand.name} ({stand.eventDate}) - {stand.cadenceLabel}
                    </option>
                  ))}
                </select>
              </div>

              {standPrepData?.weather && (
                <div>
                  <label className="block text-xs font-semibold mb-1 text-zinc-400">
                    {t('logistics.weatherForecastLabel', 'Prognoză Meteo')}
                  </label>
                  <div className={`h-[38px] px-3 py-2 text-xs rounded-xl border flex items-center justify-between ${tCss.innerCard}`}>
                    <span>{standPrepData.weather.conditionLabel} ({standPrepData.weather.tempMax}°C / {standPrepData.weather.tempMin}°C)</span>
                    <span className="font-bold text-amber-400">Factor: {standPrepData.weather.multiplier}x</span>
                  </div>
                </div>
              )}
            </div>

            {standPrepData && (
              <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{standPrepData.standName}</span>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {standPrepData.cadenceLabel}
                  </span>
                </div>
                <div className="text-zinc-400">
                  <span>{standPrepData.activeShiftsCount} {t('logistics.shiftCountFormatted', 'schimburi programate')}</span>
                  {standPrepData.shifts.length > 0 && (
                    <span className="ml-1.5 font-mono">
                      ({standPrepData.shifts.map(s => `${s.shiftName}: ${s.startTime}-${s.endTime}`).join(', ')})
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {isLoadingStandPrep ? (
            <div className={`p-12 text-center rounded-2xl border ${tCss.card}`}>
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mb-2"></div>
              <p className="text-xs text-zinc-400">{t('general.loading', 'Se calculează necesarul...')}</p>
            </div>
          ) : !standPrepData || standPrepData.items.length === 0 ? (
            <div className={`p-8 text-center rounded-2xl border ${tCss.card}`}>
              <p className="text-xs text-zinc-400">{t('logistics.noStandsFound', 'Nu s-au găsit date pentru standul selectat.')}</p>
            </div>
          ) : (
            <div className={`rounded-2xl border overflow-hidden ${tCss.card}`}>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto no-scrollbar">
                <table className="w-full text-xs text-left">
                  <thead className="bg-zinc-900/80 border-b border-zinc-800 text-[11px] font-bold uppercase tracking-wider text-zinc-400 sticky top-0 z-10">
                    <tr>
                      <th className="py-3 px-4">Articol</th>
                      <th className="py-3 px-4">Stoc pe Teren</th>
                      <th className="py-3 px-4">Rată / Schimb</th>
                      <th className="py-3 px-4">Necesar Estimativ</th>
                      <th className="py-3 px-4">Tampon Siguranță</th>
                      <th className="py-3 px-4">De Împachetat / Trimis</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {standPrepData.items.map(item => {
                      const needsDispatch = item.suggestedPackQuantity > 0;
                      return (
                        <tr key={item.itemId} className="hover:bg-zinc-900/40 transition-colors">
                          <td className="py-3 px-4 font-bold">
                            <div className="flex items-center gap-1.5">
                              <span>{item.itemName}</span>
                              {item.isSellable && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                  Vandabil
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-zinc-500 font-mono">{item.sku}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold">{item.currentStandStock}</span> {item.unit}
                          </td>
                          <td className="py-3 px-4">
                            {item.baseBurnRatePerShift} {item.unit}
                          </td>
                          <td className="py-3 px-4 font-bold text-amber-400">
                            {item.forecastedDemand} {item.unit}
                          </td>
                          <td className="py-3 px-4 text-zinc-400">
                            +{item.safetyBuffer} {item.unit}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-1 rounded-lg font-bold inline-block ${
                              needsDispatch
                                ? 'bg-amber-500 text-black shadow-xs'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                              {needsDispatch ? `${item.suggestedPackQuantity} ${item.unit}` : 'Stoc Suficient'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List */}
              <div className="block md:hidden divide-y divide-zinc-850">
                {standPrepData.items.map(item => {
                  const needsDispatch = item.suggestedPackQuantity > 0;
                  return (
                    <div key={item.itemId} className="p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-sm block">{item.itemName}</span>
                          <span className="text-xs text-zinc-500 font-mono">{item.sku}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                          needsDispatch ? 'bg-amber-500 text-black' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {needsDispatch ? `De trimis: ${item.suggestedPackQuantity} ${item.unit}` : 'Suficient'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className={`p-2 rounded-xl border ${tCss.innerCard}`}>
                          <span className="text-[10px] text-zinc-400 block">Stoc Teren</span>
                          <span className="font-bold">{item.currentStandStock} {item.unit}</span>
                        </div>
                        <div className={`p-2 rounded-xl border ${tCss.innerCard}`}>
                          <span className="text-[10px] text-zinc-400 block">Cerere Estimată</span>
                          <span className="font-bold text-amber-400">{item.forecastedDemand} {item.unit}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 3: SMART MID-DAY EMERGENCY REFILL OPTIMIZER */}
      {activeMode === 'EMERGENCY_REFILL' && (
        <div className="space-y-4">
          <form onSubmit={handleCalculateRefill} className={`p-4 rounded-2xl border space-y-3 ${tCss.card}`}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1 text-zinc-400">
                  {t('logistics.refillDestination', 'Stand / Locație Destinație')}
                </label>
                <select
                  value={refillDestLocId}
                  onChange={(e) => setRefillDestLocId(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-xl border outline-hidden ${tCss.input}`}
                >
                  {locationsList.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-zinc-400">
                  {t('logistics.refillItem', 'Articol Solicitat')}
                </label>
                <select
                  value={refillItemId}
                  onChange={(e) => setRefillItemId(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-xl border outline-hidden ${tCss.input}`}
                >
                  {items.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-zinc-400">
                  {t('logistics.refillQuantity', 'Cantitate Solicitată')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    required
                    value={refillQuantity}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/^0+(?=\d)/, '');
                      setRefillQuantity(clean === '' ? ('' as any) : Math.max(1, parseInt(clean, 10) || 1));
                    }}
                    className={`flex-1 px-3 py-2 text-xs rounded-xl border outline-hidden ${tCss.input}`}
                  />
                  <button
                    type="submit"
                    disabled={isLoadingRefill}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {isLoadingRefill ? t('logistics.calculatingRefill', 'Calcul...') : t('logistics.calculateRefillBtn', 'Calculează')}
                  </button>
                </div>
              </div>
            </div>
          </form>

          {isLoadingRefill ? (
            <div className={`p-12 text-center rounded-2xl border ${tCss.card}`}>
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mb-2"></div>
              <p className="text-xs text-zinc-400">{t('logistics.calculatingRefill', 'Se calculează rutele optime...')}</p>
            </div>
          ) : refillResult ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {renderRefillOptionCard(
                refillResult.option1Express,
                'border-blue-500/40',
                t('logistics.refillOptionExpressBadge', '100% într-o singură cursă')
              )}

              {renderRefillOptionCard(
                refillResult.option2WalkingEmergency,
                'border-emerald-500/40',
                t('logistics.refillOptionWalkingBadge', 'Cea mai rapidă deplasare')
              )}

              {renderRefillOptionCard(
                refillResult.option3MultiStop,
                'border-amber-500/40',
                t('logistics.refillOptionMultiBadge', 'Traseu optimizat')
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* MODAL: EDIT ITEM THRESHOLDS */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs">
          <div className={`w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-md rounded-none sm:rounded-2xl border-0 sm:border flex flex-col overflow-hidden shadow-2xl ${isDarkMode ? 'bg-black text-white border-zinc-800' : 'bg-white text-zinc-900 border-zinc-200'}`}>

            <div className="px-5 sm:px-6 pt-5 pb-3.5 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-base sm:text-lg tracking-tight">
                {t('logistics.editThresholdsTitle', 'Configurare Parametri')}: {editingItem.itemName}
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className={`p-1.5 rounded-lg cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className={`mx-5 sm:mx-6 border-b ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`} />

            <form onSubmit={handleSaveThresholds} noValidate className="flex-1 flex flex-col min-h-0">
              <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-4 text-sm">
                {saveError && (
                  <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs">
                    {saveError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold mb-1 text-zinc-400">
                    {t('logistics.minSafetyStockField', 'Stoc Minim de Siguranță')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editMinSafety}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/^0+(?=\d)/, '');
                      setEditMinSafety(clean === '' ? '' : Math.max(0, parseInt(clean, 10) || 0));
                    }}
                    className={`w-full px-3 py-2 text-xs rounded-xl border outline-hidden ${tCss.input}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-zinc-400">
                      {t('logistics.leadTimeField', 'Timp Reaprovizionare (Zile)')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={editLeadTime}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/^0+(?=\d)/, '');
                        setEditLeadTime(clean === '' ? '' : Math.max(1, parseInt(clean, 10) || 1));
                      }}
                      className={`w-full px-3 py-2 text-xs rounded-xl border outline-hidden ${tCss.input}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-zinc-400">
                      {t('logistics.targetStockField', 'Stoc Țintă')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={editTargetStock}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/^0+(?=\d)/, '');
                        setEditTargetStock(clean === '' ? '' : Math.max(1, parseInt(clean, 10) || 1));
                      }}
                      className={`w-full px-3 py-2 text-xs rounded-xl border outline-hidden ${tCss.input}`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-zinc-400">
                    {t('logistics.dailyBurnRateField', 'Rată Zilnică de Consum (Opțional)')}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={editBurnRate}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setEditBurnRate(e.target.value.replace(/^0+(?=\d)/, ''))}
                    placeholder="Calculat automat din comenzi & EoD"
                    className={`w-full px-3 py-2 text-xs rounded-xl border outline-hidden ${tCss.input}`}
                  />
                </div>
              </div>

              <div className="mx-5 sm:mx-6 border-t border-zinc-800" />

              <div className="px-5 sm:px-6 py-3.5 flex items-center justify-end space-x-2 shrink-0">
                <button
                  type="submit"
                  disabled={isSavingThresholds}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {isSavingThresholds ? t('general.loading', 'Se salvează...') : t('general.save', 'Salvează')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL FOR DIRECT TRANSFERS */}
      {pendingTransfer && (
        <ConfirmationModal
          isOpen={true}
          onClose={() => setPendingTransfer(null)}
          onConfirm={handleExecuteTransfer}
          title={pendingTransfer.title}
          message={pendingTransfer.message}
          variant="primary"
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );

  function renderRefillOptionCard(option: RefillOptionDTO, borderHighlight: string, subBadge: string) {
    if (!option || option.totalFulfilledQuantity <= 0) {
      return (
        <div className={`p-4 rounded-2xl border ${tCss.card} space-y-2 opacity-60`}>
          <h4 className="font-bold text-sm">{option?.strategyName || 'Opțiune'}</h4>
          <p className="text-xs text-zinc-500">{option?.summaryNotes || t('logistics.noRefillSources', 'Nicio sursă disponibilă.')}</p>
        </div>
      );
    }

    const firstStep = option.steps[0];

    return (
      <div className={`p-4 rounded-2xl border flex flex-col justify-between ${tCss.card} ${borderHighlight} space-y-4`}>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="font-bold text-sm">{option.strategyName}</h4>
              <span className="text-[11px] text-zinc-400 block font-medium">{subBadge}</span>
            </div>
            <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
              option.isFullFulfillment
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              {option.totalFulfilledQuantity}/{option.requestedQuantity} buc ({option.fulfillmentPercentage}%)
            </span>
          </div>

          <div className={`p-2.5 rounded-xl border ${tCss.innerCard} flex items-center justify-between`}>
            <span className="text-xs font-bold text-amber-400">{option.totalTimeFormatted}</span>
            <span className="text-[11px] text-zinc-400">{option.totalDistanceFormatted}</span>
          </div>

          <div className="space-y-1.5 text-xs">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              {t('logistics.pickupFrom', 'Puncte de Ridicare')}:
            </span>
            {option.steps.map((step, sIdx) => (
              <div key={sIdx} className={`flex items-center justify-between p-2 rounded-lg border ${isDarkMode ? 'bg-zinc-900/60 border-zinc-800/80' : 'bg-zinc-50 border-zinc-200'}`}>

                <div>
                  <span className="font-bold block">{step.sourceLocationName}</span>
                  <span className="text-[10px] ${tCss.textSecondary}">{step.distanceFormatted} • {step.stockAvailableAtLocation} buc în stoc</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-amber-400">+{step.quantityToPickup} buc</span>
                  {step.navigationUrl && (
                    <a
                      href={step.navigationUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={`p-1 rounded ${isDarkMode ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
                      title="Deschide Google Maps"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {canWrite && firstStep && (
          <button
            type="button"
            disabled={isTransferring}
            onClick={() => {
              setPendingTransfer({
                sourceLocationId: firstStep.sourceLocationId,
                destinationLocationId: refillDestLocId,
                itemId: refillItemId,
                quantity: option.totalFulfilledQuantity,
                title: 'Confirmare Transfer Rapid',
                message: `Doriți să efectuați transferul a ${option.totalFulfilledQuantity} bucăți din ${firstStep.sourceLocationName}?`,
              });
            }}
            className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50 text-center block"
          >
            {t('logistics.generateTransferBtn', 'Generează Transfer')} ({option.totalFulfilledQuantity} buc)
          </button>
        )}
      </div>
    );
  }
};

export default StockPredictorView;
