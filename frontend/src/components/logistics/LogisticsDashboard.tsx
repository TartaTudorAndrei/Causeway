import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { usePermission } from '../../hooks/usePermission';
import { logisticsService } from '../../services/logisticsService';
import {
  DashboardContainer,
  SubTabNav,
  DashboardHeaderSection,
  SearchInput,
  FilterPopover,
  DatePicker,
  ConfirmationModal,
  ToastNotification,
} from '../common';
import type {
  StockLocation,
  StockItem,
  LocationStock,
  StockTransferRecord,
  StandStatisticsRecord,
} from '../../types/logistics';
import { InventoryView } from './InventoryView';
import { StockPredictorView } from './StockPredictorView';
import { StandStatisticsView } from './StandStatisticsView';
import { TransfersHistoryView } from './TransfersHistoryView';
import { LogisticsStatisticsView } from './LogisticsStatisticsView';
import { AddItemModal } from './AddItemModal';
import { AdjustStockModal } from './AdjustStockModal';
import { LogisticsEoDModal } from './LogisticsEoDModal';
import { StockTransferModal } from './StockTransferModal';

interface LogisticsDashboardProps {
  isDarkMode: boolean;
}

type SubTab = 'inventory' | 'predictor' | 'stand-stats' | 'history' | 'statistics';

const LOGISTICS_TAB_PERMISSIONS: Record<SubTab, string[]> = {
  inventory: ['logistics:inventory:items:read', 'logistics:inventory:view'],
  predictor: ['logistics:predictions:read', 'logistics:predictor:view'],
  'stand-stats': ['logistics:stands:stock:read', 'logistics:standstats:view'],
  history: ['logistics:inventory:transfers:read', 'logistics:history:view'],
  statistics: ['logistics:predictions:read', 'logistics:statistics:view', 'logistics:inventory:view'],
};

const VALID_LOGISTICS_SUB_TABS: SubTab[] = ['inventory', 'predictor', 'stand-stats', 'history', 'statistics'];

export const LogisticsDashboard: React.FC<LogisticsDashboardProps> = ({ isDarkMode }) => {
  const { t } = useLanguage();
  const { hasPermission, isSuperAdmin } = usePermission();

  const isTabAccessible = useCallback((tabId: SubTab): boolean => {
    if (isSuperAdmin) return true;
    const codes = LOGISTICS_TAB_PERMISSIONS[tabId];
    return codes ? codes.some(code => hasPermission(code)) : true;
  }, [isSuperAdmin, hasPermission]);

  const [searchParams, setSearchParams] = useSearchParams();
  const accessibleTabs = VALID_LOGISTICS_SUB_TABS.filter(tab => isTabAccessible(tab));
  const rawSubTab = searchParams.get('subtab') as SubTab;
  const requestedTab: SubTab = (rawSubTab && VALID_LOGISTICS_SUB_TABS.includes(rawSubTab)) ? rawSubTab : 'inventory';
  const activeSubTab: SubTab = isTabAccessible(requestedTab) ? requestedTab : (accessibleTabs[0] || 'inventory');

  const setActiveSubTab = useCallback((subtab: SubTab) => {
    if (!isTabAccessible(subtab)) return;
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('subtab', subtab);
      return next;
    });
  }, [isTabAccessible, setSearchParams]);

  // Auto-fallback if requested tab via URL is restricted
  useEffect(() => {
    if (rawSubTab && !isTabAccessible(rawSubTab)) {
      setActiveSubTab(activeSubTab);
    }
  }, [rawSubTab, activeSubTab, isTabAccessible, setActiveSubTab]);

  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [items, setItems] = useState<StockItem[]>([]);
  const [stocks, setStocks] = useState<LocationStock[]>([]);
  const [transfers, setTransfers] = useState<StockTransferRecord[]>([]);
  const [standStats, setStandStats] = useState<StandStatisticsRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Predictor sub-tab local state
  const [predictorSearch, setPredictorSearch] = useState('');
  const [predictorStatus, setPredictorStatus] = useState<'ALL' | 'CRITICAL_WARNING' | 'SELLABLE' | 'MUGS' | 'HEALTHY'>('ALL');

  // History sub-tab local state
  const [historySearch, setHistorySearch] = useState('');
  const [historySourceLoc, setHistorySourceLoc] = useState('ALL');
  const [historyDestLoc, setHistoryDestLoc] = useState('ALL');

  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [editingStockItem, setEditingStockItem] = useState<StockItem | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isEoDModalOpen, setIsEoDModalOpen] = useState(false);
  const [editingEoDReport, setEditingEoDReport] = useState<import('../../types/logistics').LogisticsEoDReport | null>(null);
  const [selectedEoDStandId, setSelectedEoDStandId] = useState<string | undefined>();
  const [isAdjustStockOpen, setIsAdjustStockOpen] = useState(false);
  const [adjustModalInitialItemId, setAdjustModalInitialItemId] = useState<string | undefined>();
  const [adjustModalInitialLocationId, setAdjustModalInitialLocationId] = useState<string | undefined>();

  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const canWrite = hasPermission('logistics:inventory:write', 'DEPARTMENT', 'logistics-dept-uuid') || isSuperAdmin;

  const handleEditEoD = async (stand: StandStatisticsRecord) => {
    try {
      const reports = await logisticsService.getEoDReports();
      const found = reports.find(r => (stand.eodReportId && r.id === stand.eodReportId) || (stand.standId && r.standId === stand.standId));
      if (found) {
        setEditingEoDReport(found);
      } else {
        setEditingEoDReport({
          id: stand.eodReportId || stand.standId,
          standId: stand.standId,
          standName: stand.standName,
          closingPersonName: stand.closingPersonName || '',
          closedAt: stand.closedAt || new Date().toISOString(),
          notes: stand.closingNotes,
          mugCounts: stand.itemStats.map(i => ({
            id: '',
            itemId: i.itemId,
            itemName: i.itemName,
            countRemaining: i.endedCount,
          })),
        });
      }
      setIsEoDModalOpen(true);
    } catch {
      setToast({ message: t('logistics.eodLoadError', 'Eroare la încărcare'), type: 'error' });
    }
  };

  // Confirmation Modal State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    message: '',
    onConfirm: () => {},
  });

  const handleDeleteEoD = (stand: StandStatisticsRecord) => {
    setConfirmDialog({
      isOpen: true,
      title: t('logistics.deleteEoDTitle', 'Șterge Raport EoD'),
      message: t('logistics.deleteEoDConfirm', 'Sigur doriți să ștergeți raportul End of Day pentru acest stand? Standul va fi redeschis ca activ.'),
      onConfirm: async () => {
        try {
          let reportId = stand.eodReportId;
          if (!reportId) {
            const reports = await logisticsService.getEoDReports();
            const found = reports.find(
              r =>
                (stand.standId && r.standId === stand.standId) ||
                (stand.standName && r.standName && (r.standName.includes(stand.standName) || stand.standName.includes(r.standName)))
            );
            if (found) reportId = found.id;
          }
          if (reportId) {
            await logisticsService.deleteEoDReport(reportId, stand.standName);
            setToast({ message: t('logistics.eodDeleted', 'Raportul End of Day a fost șters, iar standul a fost redeschis.'), type: 'success' });
            await loadData();
          } else {
            setToast({ message: t('logistics.eodNotFound', 'Raportul EoD nu a fost găsit.'), type: 'error' });
          }
        } catch (err: any) {
          setToast({ message: err?.message || t('logistics.eodDeleteError', 'Eroare la ștergerea raportului'), type: 'error' });
        } finally {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (activeSubTab === 'inventory') {
        const [locs, itms, stks] = await Promise.all([
          logisticsService.getLocations(),
          logisticsService.getItems(),
          logisticsService.getStocks(),
        ]);
        setLocations(locs);
        setItems(itms);
        setStocks(stks);
      } else if (activeSubTab === 'stand-stats') {
        const [stats, locs, itms] = await Promise.all([
          logisticsService.getStandStatistics(),
          logisticsService.getLocations(),
          logisticsService.getItems(),
        ]);
        setStandStats(stats);
        setLocations(locs);
        setItems(itms);
      } else if (activeSubTab === 'history') {
        const [trfs, locs, itms] = await Promise.all([
          logisticsService.getTransfers(),
          logisticsService.getLocations(),
          logisticsService.getItems(),
        ]);
        setTransfers(trfs);
        setLocations(locs);
        setItems(itms);
      } else {
        const [locs, itms, stks, trfs, stats] = await Promise.all([
          logisticsService.getLocations(),
          logisticsService.getItems(),
          logisticsService.getStocks(),
          logisticsService.getTransfers(),
          logisticsService.getStandStatistics(),
        ]);
        setLocations(locs);
        setItems(itms);
        setStocks(stks);
        setTransfers(trfs);
        setStandStats(stats);
      }
    } finally {
      setIsLoading(false);
    }
  }, [activeSubTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenAdjustModal = (itemId?: string, locationId?: string) => {
    setAdjustModalInitialItemId(itemId);
    setAdjustModalInitialLocationId(locationId);
    setIsAdjustStockOpen(true);
  };

  const handleAddLocation = async (name: string) => {
    const generatedCode = `LOC-${Date.now().toString(36).toUpperCase()}`;
    await logisticsService.addLocation({
      name: name.trim(),
      code: generatedCode,
      type: 'DEPOSIT',
      description: '',
    });
    await loadData();
  };

  const handleRenameLocation = async (idOrOldName: string, newName: string) => {
    const loc = locations.find(l => l.id === idOrOldName || l.name === idOrOldName);
    if (loc) {
      await logisticsService.updateLocation(loc.id, { name: newName.trim() });
    }
    await loadData();
  };

  const handleDeleteLocation = async (idOrName: string) => {
    const loc = locations.find(l => l.id === idOrName || l.name === idOrName);
    if (loc) {
      await logisticsService.deleteLocation(loc.id);
    }
    await loadData();
  };

  const handleAddItem = async (name: string) => {
    const generatedSku = `SKU-${Date.now().toString(36).toUpperCase()}`;
    await logisticsService.addItem({
      name: name.trim(),
      sku: generatedSku,
      category: 'Consumabile',
      unit: 'buc',
      notes: '',
      isSellable: false,
      isMug: false,
    });
    await loadData();
  };

  const handleRenameItem = async (idOrOldName: string, newName: string) => {
    const itm = items.find(i => i.id === idOrOldName || i.name === idOrOldName);
    if (itm) {
      await logisticsService.updateItem(itm.id, { name: newName.trim() });
    }
    await loadData();
  };

  const handleDeleteItem = async (itemIdOrName: string) => {
    const itm = items.find(i => i.id === itemIdOrName || i.name === itemIdOrName);
    if (itm) {
      await logisticsService.deleteItem(itm.id);
    } else {
      await logisticsService.deleteItem(itemIdOrName);
    }
    await loadData();
  };

  // Stand-stats filter helpers via searchParams
  const standStatsSearch = searchParams.get('search') || '';
  const standStatsSort = searchParams.get('sort') || 'SOLD_DESC';
  const standStatsLoc = searchParams.get('location') || 'ALL';
  const standStatsStatus = searchParams.get('status') || 'ALL';
  const standStatsStartDate = searchParams.get('startDate') || '';
  const standStatsEndDate = searchParams.get('endDate') || '';

  const updateStandStatsParams = (updates: Record<string, string | null>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([key, val]) => {
        if (!val || val === 'ALL' || (key === 'sort' && val === 'SOLD_DESC')) {
          next.delete(key);
        } else {
          next.set(key, val);
        }
      });
      return next;
    });
  };

  const standStatsActiveFilterCount =
    (standStatsLoc !== 'ALL' ? 1 : 0) +
    (standStatsStatus !== 'ALL' ? 1 : 0) +
    (standStatsStartDate ? 1 : 0) +
    (standStatsEndDate ? 1 : 0) +
    (standStatsSort !== 'SOLD_DESC' ? 1 : 0);

  // Inventory filter helpers via searchParams
  const inventorySearch = searchParams.get('search') || '';
  const inventoryViewMode = searchParams.get('viewMode') || 'ITEMS';
  const inventoryLoc = searchParams.get('location') || 'ALL';
  const inventoryLocType = searchParams.get('locationType') || 'ALL';
  const inventoryCategory = searchParams.get('category') || 'ALL';
  const inventoryItemType = searchParams.get('itemType') || 'ALL';
  const inventoryStockLevel = searchParams.get('stockLevel') || 'ALL';
  const inventorySort = searchParams.get('sort') || 'NAME_ASC';

  const updateInventoryParams = (updates: Record<string, string | null>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([key, val]) => {
        if (!val || val === 'ALL' || (key === 'sort' && val === 'NAME_ASC') || (key === 'viewMode' && val === 'ITEMS')) {
          next.delete(key);
        } else {
          next.set(key, val);
        }
      });
      return next;
    });
  };

  const inventoryActiveFilterCount =
    (inventoryViewMode !== 'ITEMS' ? 1 : 0) +
    (inventoryLoc !== 'ALL' ? 1 : 0) +
    (inventoryLocType !== 'ALL' ? 1 : 0) +
    (inventoryCategory !== 'ALL' ? 1 : 0) +
    (inventoryItemType !== 'ALL' ? 1 : 0) +
    (inventoryStockLevel !== 'ALL' ? 1 : 0) +
    (inventorySort !== 'NAME_ASC' ? 1 : 0);

  const historyActiveFilterCount =
    (historySourceLoc !== 'ALL' ? 1 : 0) +
    (historyDestLoc !== 'ALL' ? 1 : 0);

  // Active filters and search query for collapsible bar
  const activeLogisticsFilterCount =
    activeSubTab === 'inventory'
      ? inventoryActiveFilterCount
      : activeSubTab === 'predictor'
      ? predictorStatus !== 'ALL'
        ? 1
        : 0
      : activeSubTab === 'stand-stats'
      ? standStatsActiveFilterCount
      : activeSubTab === 'history'
      ? historyActiveFilterCount
      : 0;

  const currentLogisticsSearchQuery =
    activeSubTab === 'inventory'
      ? inventorySearch
      : activeSubTab === 'predictor'
      ? predictorSearch
      : activeSubTab === 'stand-stats'
      ? standStatsSearch
      : activeSubTab === 'history'
      ? historySearch
      : '';

  return (
    <DashboardContainer noScroll>
      {/* Toast Notification */}
      <ToastNotification toast={toast ? { text: toast.message, type: toast.type } : null} onClose={() => setToast(null)} />

      {/* Unified Dashboard Sub-Header */}
      <DashboardHeaderSection
        isDarkMode={isDarkMode}
        activeTabLabel={
          activeSubTab === 'inventory'
            ? t('logistics.tabInventory', 'Stoc & Inventar')
            : activeSubTab === 'predictor'
            ? t('logistics.tabPredictor', 'Predicție Stocuri')
            : activeSubTab === 'stand-stats'
            ? t('logistics.tabStandStats', 'Standuri')
            : activeSubTab === 'history'
            ? t('logistics.tabHistory', 'Istoric Transferuri')
            : t('common.tabStatistics', 'Statistici')
        }
        activeFilterCount={activeLogisticsFilterCount}
        searchQuery={currentLogisticsSearchQuery}
        subTabNav={
          <SubTabNav<SubTab>
            tabs={[
              { id: 'inventory', label: t('logistics.tabInventory', 'Stoc & Inventar'), disabled: !isTabAccessible('inventory') },
              { id: 'predictor', label: t('logistics.tabPredictor', 'Predicție Stocuri'), disabled: !isTabAccessible('predictor') },
              { id: 'stand-stats', label: t('logistics.tabStandStats', 'Standuri'), disabled: !isTabAccessible('stand-stats') },
              { id: 'history', label: t('logistics.tabHistory', 'Istoric Transferuri'), disabled: !isTabAccessible('history') },
              { id: 'statistics', label: t('common.tabStatistics', 'Statistici'), disabled: !isTabAccessible('statistics') },
            ]}
            activeTab={activeSubTab}
            onChange={setActiveSubTab}
            isDarkMode={isDarkMode}
          />
        }
        controls={
          activeSubTab === 'inventory' ? (
            <>
              <SearchInput
                value={inventorySearch}
                onChange={(val) => updateInventoryParams({ search: val || null })}
                placeholder={t('logistics.searchPlaceholder', 'Caută după nume sau categorie...')}
                isDarkMode={isDarkMode}
              />
              <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 w-full sm:w-auto shrink-0">
                <FilterPopover
                  label={t('general.sortAndFilter', 'Filtre & Sortare')}
                  activeCount={inventoryActiveFilterCount}
                  onReset={() =>
                    updateInventoryParams({
                      viewMode: null,
                      location: null,
                      locationType: null,
                      category: null,
                      itemType: null,
                      stockLevel: null,
                      sort: null,
                    })
                  }
                  isDarkMode={isDarkMode}
                >
                  <div className="space-y-4">
                    {/* View Mode Switch: By Item vs By Location */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                        {t('logistics.viewMode', 'Mod Vizualizare')}
                      </label>
                      <select
                        value={inventoryViewMode}
                        onChange={(e) => updateInventoryParams({ viewMode: e.target.value === 'ITEMS' ? null : e.target.value })}
                        className={`w-full px-3 py-2 text-xs rounded-xl border outline-hidden ${
                          isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                        }`}
                      >
                        <option value="ITEMS">{t('logistics.viewModeByItem', 'Articole (Stoc & Locații)')}</option>
                        <option value="LOCATIONS">{t('logistics.viewModeByLocation', 'Locații (Stoc & Articole)')}</option>
                      </select>
                    </div>

                    {/* Sort By */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                        {t('general.sortBy', 'Sortează după')}
                      </label>
                      <select
                        value={inventorySort}
                        onChange={(e) => updateInventoryParams({ sort: e.target.value === 'NAME_ASC' ? null : e.target.value })}
                        className={`w-full px-3 py-2 text-xs rounded-xl border outline-hidden ${
                          isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                        }`}
                      >
                        <option value="NAME_ASC">{t('logistics.sortByNameAsc', 'Nume (A - Z)')}</option>
                        <option value="NAME_DESC">{t('logistics.sortByNameDesc', 'Nume (Z - A)')}</option>
                        <option value="STOCK_DESC">{t('logistics.sortByStockDesc', 'Stoc (Descrescător)')}</option>
                        <option value="STOCK_ASC">{t('logistics.sortByStockAsc', 'Stoc (Crescător)')}</option>
                        <option value="CATEGORY_ASC">{t('logistics.sortByCategory', 'Categorie (A - Z)')}</option>
                      </select>
                    </div>

                    {/* Location Type */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                        {t('logistics.filterLocationType', 'Tip Locație')}
                      </label>
                      <select
                        value={inventoryLocType}
                        onChange={(e) => {
                          const newType = e.target.value;
                          const currentLocObj = locations.find(l => l.id === inventoryLoc);
                          const shouldResetLoc = currentLocObj && newType !== 'ALL' && currentLocObj.type !== newType;
                          updateInventoryParams({
                            locationType: newType === 'ALL' ? null : newType,
                            ...(shouldResetLoc ? { location: null } : {}),
                          });
                        }}
                        className={`w-full px-3 py-2 text-xs rounded-xl border outline-hidden ${
                          isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                        }`}
                      >
                        <option value="ALL">{t('logistics.filterAllTypes', 'Toate Tipurile (Depozite & Standuri)')}</option>
                        <option value="DEPOSIT">{t('logistics.filterDepositsOnly', 'Doar Depozite')}</option>
                        <option value="STAND">{t('logistics.filterStandsOnly', 'Doar Standuri')}</option>
                      </select>
                    </div>

                    {/* Specific Location */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                        {t('logistics.colActiveLocations', 'Locație Specifică')}
                      </label>
                      <select
                        value={inventoryLoc}
                        onChange={(e) => updateInventoryParams({ location: e.target.value === 'ALL' ? null : e.target.value })}
                        className={`w-full px-3 py-2 text-xs rounded-xl border outline-hidden ${
                          isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                        }`}
                      >
                        <option value="ALL">{t('logistics.allLocations', 'Toate Locațiile (Total Global)')}</option>
                        {locations
                          .filter(loc => inventoryLocType === 'ALL' || loc.type === inventoryLocType)
                          .map(loc => (
                            <option key={loc.id} value={loc.id}>
                              {loc.name} ({loc.type})
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Category */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                        {t('logistics.filterCategory', 'Categorie Articol')}
                      </label>
                      <select
                        value={inventoryCategory}
                        onChange={(e) => updateInventoryParams({ category: e.target.value === 'ALL' ? null : e.target.value })}
                        className={`w-full px-3 py-2 text-xs rounded-xl border outline-hidden ${
                          isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                        }`}
                      >
                        <option value="ALL">{t('logistics.allCategories', 'Toate Categoriile')}</option>
                        {Array.from(new Set(items.map(i => i.category).filter(Boolean)))
                          .sort()
                          .map(cat => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Item Type (Mugs / Standard) */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                        {t('logistics.filterItemType', 'Tip Articol')}
                      </label>
                      <select
                        value={inventoryItemType}
                        onChange={(e) => updateInventoryParams({ itemType: e.target.value === 'ALL' ? null : e.target.value })}
                        className={`w-full px-3 py-2 text-xs rounded-xl border outline-hidden ${
                          isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                        }`}
                      >
                        <option value="ALL">{t('logistics.allItemTypes', 'Toate Articolele')}</option>
                        <option value="SELLABLE">{t('logistics.sellableOnlyOption', 'Doar Vandabile')}</option>
                        <option value="STANDARD">{t('logistics.standardItemsOnly', 'Standard (Fără Vandabile)')}</option>
                      </select>
                    </div>

                    {/* Quantity / Stock Level */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                        {t('logistics.filterStockQuantity', 'Cantitate / Nivel Stoc')}
                      </label>
                      <select
                        value={inventoryStockLevel}
                        onChange={(e) => updateInventoryParams({ stockLevel: e.target.value === 'ALL' ? null : e.target.value })}
                        className={`w-full px-3 py-2 text-xs rounded-xl border outline-hidden ${
                          isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                        }`}
                      >
                        <option value="ALL">{t('logistics.allStockLevels', 'Toate Nivelurile de Stoc')}</option>
                        <option value="IN_STOCK">{t('logistics.inStockOnly', 'În Stoc (> 0)')}</option>
                        <option value="LOW_STOCK">{t('logistics.lowStockOnly', 'Stoc Scăzut (≤ 10)')}</option>
                        <option value="OUT_OF_STOCK">{t('logistics.outOfStockOnly', 'Stoc Epuizat (0)')}</option>
                      </select>
                    </div>
                  </div>
                </FilterPopover>

                {canWrite && (
                  <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenAdjustModal()}
                      className={`px-2.5 sm:px-3 py-1.5 rounded-xl border text-[11px] sm:text-xs font-semibold shadow-xs transition cursor-pointer whitespace-nowrap shrink-0 ${
                        isDarkMode
                          ? 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                          : 'border-zinc-300 bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
                      }`}
                      title={t('logistics.adjustStockTooltip', 'Ajustează stocul')}
                    >
                      <span>{t('logistics.adjustStockModalTitle', 'Ajustare Stoc')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingStockItem(null);
                        setIsAddItemOpen(true);
                      }}
                      className="px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] sm:text-xs font-bold shadow-md transition cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <span>{t('logistics.newItemBtn', 'Articol Nou')}</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : activeSubTab === 'predictor' ? (
            <>
              <SearchInput
                value={predictorSearch}
                onChange={setPredictorSearch}
                placeholder={t('logistics.searchPredictions', 'Caută după nume articol, categorie...')}
                isDarkMode={isDarkMode}
              />
              <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 w-full sm:w-auto shrink-0">
                <FilterPopover activeCount={predictorStatus !== 'ALL' ? 1 : 0} onReset={() => setPredictorStatus('ALL')} isDarkMode={isDarkMode}>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                      {t('logistics.stockStatus', 'Stare Stoc & Alertă')}
                    </label>
                    <select
                      value={predictorStatus}
                      onChange={(e) => setPredictorStatus(e.target.value as any)}
                      className={`w-full px-3 py-2 text-xs rounded-xl border outline-hidden ${
                        isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                      }`}
                    >
                      <option value="ALL">{t('logistics.filterAll', 'Toate Articolele')}</option>
                      <option value="SELLABLE">{t('logistics.sellableOnlyOption', 'Doar Vandabile')}</option>
                      <option value="CRITICAL_WARNING">{t('logistics.filterCriticalLow', 'Alerte & Stoc Critic / Scăzut')}</option>
                      <option value="HEALTHY">{t('logistics.filterHealthy', 'Stoc Optim & Suficient')}</option>
                    </select>
                  </div>
                </FilterPopover>
              </div>
            </>
          ) : activeSubTab === 'stand-stats' ? (
            <>
              <SearchInput
                value={standStatsSearch}
                onChange={(val) => updateStandStatsParams({ search: val || null })}
                placeholder={t('logistics.searchStands', 'Caută după nume stand sau eveniment...')}
                isDarkMode={isDarkMode}
              />
              <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 w-full sm:w-auto shrink-0">
                <FilterPopover
                  label={t('general.sortAndFilter', 'Filtre & Sortare')}
                  activeCount={standStatsActiveFilterCount}
                  onReset={() =>
                    updateStandStatsParams({
                      location: null,
                      status: null,
                      startDate: null,
                      endDate: null,
                      sort: null,
                    })
                  }
                  isDarkMode={isDarkMode}
                >
                  <div className="space-y-4">
                    {/* Sort By */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                        {t('general.sortBy', 'Sortează după')}
                      </label>
                      <select
                        value={standStatsSort}
                        onChange={(e) => updateStandStatsParams({ sort: e.target.value })}
                        className={`w-full px-3 py-2 text-xs rounded-xl border font-medium outline-hidden cursor-pointer ${
                          isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                        }`}
                      >
                        <option value="SOLD_DESC">{t('logistics.sortMostSold', 'Cele mai multe vânzări')}</option>
                        <option value="SOLD_ASC">{t('logistics.sortLeastSold', 'Cele mai puține vânzări')}</option>
                        <option value="RATE_DESC">{t('logistics.sortHighestSellThrough', 'Cea mai mare rată (%)')}</option>
                        <option value="RATE_ASC">{t('logistics.sortLowestSellThrough', 'Cea mai mică rată (%)')}</option>
                        <option value="NAME_ASC">{t('logistics.sortName', 'Alfabetic (A-Z)')}</option>
                        <option value="NAME_DESC">{t('logistics.sortNameDesc', 'Alfabetic (Z-A)')}</option>
                        <option value="DATE_DESC">{t('logistics.sortDate', 'Dată recentă')}</option>
                        <option value="DATE_ASC">{t('logistics.sortDateAsc', 'Dată veche')}</option>
                        <option value="SUPPLIED_DESC">{t('logistics.sortMostSupplied', 'Cele mai multe furnizate')}</option>
                      </select>
                    </div>

                    {/* Location Filter */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                        {t('logistics.filterByLocation', 'Locație Stand')}
                      </label>
                      <select
                        value={standStatsLoc}
                        onChange={(e) => updateStandStatsParams({ location: e.target.value })}
                        className={`w-full px-3 py-2 text-xs rounded-xl border font-medium outline-hidden cursor-pointer ${
                          isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                        }`}
                      >
                        <option value="ALL">{t('logistics.allLocations', 'Toate Locațiile')}</option>
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Stand Status Filter */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                        {t('logistics.filterStatus', 'Stare Stand')}
                      </label>
                      <select
                        value={standStatsStatus}
                        onChange={(e) => updateStandStatsParams({ status: e.target.value })}
                        className={`w-full px-3 py-2 text-xs rounded-xl border font-medium outline-hidden cursor-pointer ${
                          isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                        }`}
                      >
                        <option value="ALL">{t('logistics.statusAll', 'Toate Stările')}</option>
                        <option value="ACTIVE">{t('logistics.statusActive', 'Deschis / Activ')}</option>
                        <option value="CLOSED">{t('logistics.statusCompleted', 'Încheiat (EoD)')}</option>
                      </select>
                    </div>

                    {/* Time Interval Filter */}
                    <div className="space-y-2 pt-1 border-t border-zinc-800/80">
                      <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                        {t('logistics.timeInterval', 'Interval Calendaristic')}
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <DatePicker
                          label={t('logistics.startDate', 'De la')}
                          value={standStatsStartDate}
                          onChange={(val) => updateStandStatsParams({ startDate: val || null })}
                          isDarkMode={isDarkMode}
                          clearable
                        />
                        <DatePicker
                          label={t('logistics.endDate', 'Până la')}
                          value={standStatsEndDate}
                          onChange={(val) => updateStandStatsParams({ endDate: val || null })}
                          isDarkMode={isDarkMode}
                          clearable
                        />
                      </div>
                    </div>
                  </div>
                </FilterPopover>

                {canWrite && (
                  <button
                    onClick={() => {
                      setEditingEoDReport(null);
                      setSelectedEoDStandId(undefined);
                      setIsEoDModalOpen(true);
                    }}
                    className="px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <span>{t('logistics.newEoDReport', 'Raport EoD Nou')}</span>
                  </button>
                )}
              </div>
            </>
          ) : activeSubTab === 'history' ? (
            <>
              <SearchInput
                value={historySearch}
                onChange={setHistorySearch}
                placeholder={t('logistics.searchTransfers', 'Caută după nume articol, sursă, destinație...')}
                isDarkMode={isDarkMode}
              />
              <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 w-full sm:w-auto shrink-0">
                <FilterPopover
                  activeCount={historyActiveFilterCount}
                  onReset={() => {
                    setHistorySourceLoc('ALL');
                    setHistoryDestLoc('ALL');
                  }}
                  isDarkMode={isDarkMode}
                >
                  <div className="space-y-3">
                    {/* Source Location */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                        {t('logistics.sourceLocation', 'Locație Sursă')}
                      </label>
                      <select
                        value={historySourceLoc}
                        onChange={(e) => setHistorySourceLoc(e.target.value)}
                        className={`w-full px-3 py-2 text-xs rounded-xl border outline-hidden ${
                          isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                        }`}
                      >
                        <option value="ALL">{t('logistics.allLocations', 'Toate Locațiile')}</option>
                        {locations.map(loc => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name} ({loc.type})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Destination Location */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                        {t('logistics.destLocation', 'Locație Destinație')}
                      </label>
                      <select
                        value={historyDestLoc}
                        onChange={(e) => setHistoryDestLoc(e.target.value)}
                        className={`w-full px-3 py-2 text-xs rounded-xl border outline-hidden ${
                          isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                        }`}
                      >
                        <option value="ALL">{t('logistics.allLocations', 'Toate Locațiile')}</option>
                        {locations.map(loc => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name} ({loc.type})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </FilterPopover>

                {canWrite && (
                  <button
                    type="button"
                    onClick={() => setIsTransferModalOpen(true)}
                    className="px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <span>{t('logistics.stockTransferBtn', 'Transfer Stoc')}</span>
                  </button>
                )}
              </div>
            </>
          ) : undefined
        }
      />

      {/* Active Sub-Tab View Container */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pr-0.5 space-y-4">
        {activeSubTab === 'inventory' && (
          <InventoryView
            items={items}
            locations={locations}
            stocks={stocks}
            isDarkMode={isDarkMode}
            canWrite={canWrite}
            onOpenAdjustStock={handleOpenAdjustModal}
            onOpenEditItem={(item) => {
              setEditingStockItem(item);
              setIsAddItemOpen(true);
            }}
            onOpenAddItem={() => {
              setEditingStockItem(null);
              setIsAddItemOpen(true);
            }}
            onItemDeleted={loadData}
            onItemUpdated={loadData}
          />
        )}

        {activeSubTab === 'predictor' && (
          <StockPredictorView
            items={items}
            isDarkMode={isDarkMode}
            canWrite={canWrite}
            searchTerm={predictorSearch}
            filterStatus={predictorStatus}
            onRefresh={loadData}
          />
        )}

        {activeSubTab === 'stand-stats' && (
          <StandStatisticsView
            standStats={standStats}
            locations={locations}
            isDarkMode={isDarkMode}
            onRefresh={loadData}
            onOpenEoDModal={(standId) => {
              setEditingEoDReport(null);
              setSelectedEoDStandId(standId);
              setIsEoDModalOpen(true);
            }}
            onEditEoD={handleEditEoD}
            onDeleteEoD={handleDeleteEoD}
            isLoading={isLoading}
          />
        )}

        {activeSubTab === 'history' && (
          <TransfersHistoryView
            transfers={transfers}
            locations={locations}
            items={items}
            isDarkMode={isDarkMode}
            searchQuery={historySearch}
            sourceLocationFilter={historySourceLoc}
            destLocationFilter={historyDestLoc}
            canWrite={canWrite}
            onOpenTransferModal={() => setIsTransferModalOpen(true)}
          />
        )}

        {activeSubTab === 'statistics' && (
          <LogisticsStatisticsView
            locations={locations}
            items={items}
            stocks={stocks}
            transfers={transfers}
            standStats={standStats}
            isLoading={isLoading}
            isDarkMode={isDarkMode}
          />
        )}
      </div>

      {/* Modals with role verification */}
      <AddItemModal
        isOpen={isAddItemOpen}
        editingItem={editingStockItem}
        onClose={() => {
          setIsAddItemOpen(false);
          setEditingStockItem(null);
        }}
        onSuccess={() => {
          loadData();
          setIsAddItemOpen(false);
          setEditingStockItem(null);
        }}
        isDarkMode={isDarkMode}
        existingItems={items}
      />
      <AdjustStockModal
        isOpen={isAdjustStockOpen}
        onClose={() => setIsAdjustStockOpen(false)}
        onSuccess={() => {
          loadData();
        }}
        items={items}
        locations={locations}
        stocks={stocks}
        initialItemId={adjustModalInitialItemId}
        initialLocationId={adjustModalInitialLocationId}
        isDarkMode={isDarkMode}
        onAddLocation={handleAddLocation}
        onRenameLocation={handleRenameLocation}
        onDeleteLocation={handleDeleteLocation}
        onAddItem={handleAddItem}
        onRenameItem={handleRenameItem}
        onDeleteItem={handleDeleteItem}
      />

      {/* Stock Transfer Modal */}
      <StockTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onSuccess={async () => {
          setToast({ message: t('logistics.transferSuccess', 'Transferul de stoc a fost efectuat cu succes!'), type: 'success' });
          await loadData();
        }}
        locations={locations}
        items={items}
        stocks={stocks}
        isDarkMode={isDarkMode}
        canWrite={canWrite}
        onAddLocation={handleAddLocation}
        onRenameLocation={handleRenameLocation}
        onDeleteLocation={handleDeleteLocation}
        onAddItem={handleAddItem}
        onRenameItem={handleRenameItem}
        onDeleteItem={handleDeleteItem}
      />

      {/* Logistics End of Day Form Modal */}
      <LogisticsEoDModal
        isOpen={isEoDModalOpen}
        onClose={() => {
          setIsEoDModalOpen(false);
          setEditingEoDReport(null);
          setSelectedEoDStandId(undefined);
        }}
        onSuccess={() => {
          loadData();
          setEditingEoDReport(null);
          setSelectedEoDStandId(undefined);
        }}
        items={items}
        locations={locations}
        stocks={stocks}
        transfers={transfers}
        editingReport={editingEoDReport}
        initialStandId={selectedEoDStandId}
        isDarkMode={isDarkMode}
      />
      <ConfirmationModal
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant="danger"
        isDarkMode={isDarkMode}
      />
    </DashboardContainer>
  );
};
export default LogisticsDashboard;
