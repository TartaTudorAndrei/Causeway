import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Trash2, Pencil, Eye, SlidersHorizontal } from 'lucide-react';
import { logisticsService } from '../../services/logisticsService';
import type { StockItem, StockLocation, LocationStock } from '../../types/logistics';
import { useLanguage } from '../../context/LanguageContext';
import { ItemPhotoModal } from '../common';

interface InventoryViewProps {
    items: StockItem[];
    locations: StockLocation[];
    stocks: LocationStock[];
    isDarkMode: boolean;
    canWrite?: boolean;
    onOpenAdjustStock?: (itemId?: string, locationId?: string) => void;
    onOpenEditItem?: (item: StockItem) => void;
    onOpenAddItem?: () => void;
    onItemDeleted?: () => void;
    onItemUpdated?: () => void;
}
export const InventoryView: React.FC<InventoryViewProps> = ({ items, locations, stocks, isDarkMode, canWrite = false, onOpenAdjustStock, onOpenEditItem, onOpenAddItem: _onOpenAddItem, onItemDeleted, onItemUpdated, }) => {
    const { t } = useLanguage();
    const [searchParams] = useSearchParams();
    const searchTerm = searchParams.get('search') || '';
    const viewMode = searchParams.get('viewMode') || 'ITEMS';
    const selectedLocation = searchParams.get('location') || 'ALL';
    const selectedLocationType = searchParams.get('locationType') || 'ALL';
    const selectedCategory = searchParams.get('category') || 'ALL';
    const selectedItemType = searchParams.get('itemType') || 'ALL';
    const selectedStockLevel = searchParams.get('stockLevel') || 'ALL';
    const selectedSort = searchParams.get('sort') || 'NAME_ASC';
    const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(new Set());
    const [expandedLocationIds, setExpandedLocationIds] = useState<Set<string>>(new Set());
    const [itemToDelete, setItemToDelete] = useState<StockItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    const [photoModalItem, setPhotoModalItem] = useState<StockItem | null>(null);
    const [togglingItemIds, setTogglingItemIds] = useState<Set<string>>(new Set());
    const handleToggleEoD = async (e: React.MouseEvent, item: StockItem) => {
        e.stopPropagation();
        if (!canWrite || togglingItemIds.has(item.id))
            return;
        const currentSellable = Boolean(item.isSellable || item.isMug || item.sellable || item.mug);
        setTogglingItemIds(prev => new Set(prev).add(item.id));
        try {
            await logisticsService.updateItem(item.id, { isSellable: !currentSellable, isMug: !currentSellable });
            if (onItemUpdated) {
                onItemUpdated();
            }
        }
        catch (err: any) {
            console.error('Failed to toggle EoD status', err);
        }
        finally {
            setTogglingItemIds(prev => {
                const next = new Set(prev);
                next.delete(item.id);
                return next;
            });
        }
    };
    // Keyboard Escape listener
    React.useEffect(() => {
        if (!itemToDelete)
            return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setItemToDelete(null);
                setDeleteError('');
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [itemToDelete]);
    const tCss = {
        card: isDarkMode ? 'bg-zinc-950 border-zinc-850' : 'bg-white border-zinc-200 shadow-sm',
        input: isDarkMode
            ? 'bg-zinc-900 border-zinc-800 text-white focus:border-blue-500'
            : 'bg-white border-zinc-300 text-zinc-900 focus:border-blue-500',
        textPrimary: isDarkMode ? 'text-white' : 'text-zinc-900',
        textSecondary: isDarkMode ? 'text-zinc-400' : 'text-zinc-500',
        tableHeader: isDarkMode ? 'bg-zinc-900/60 text-zinc-400 border-zinc-850' : 'bg-zinc-100 text-zinc-600 border-zinc-200',
        tableRow: isDarkMode ? 'border-zinc-850 hover:bg-zinc-900/40' : 'border-zinc-200 hover:bg-zinc-50',
        expandedArea: isDarkMode ? 'bg-zinc-900/40 border-zinc-800/80' : 'bg-zinc-50/80 border-zinc-200/80',
        locationCard: isDarkMode ? 'bg-zinc-950/80 border-zinc-800/60' : 'bg-white border-zinc-200 shadow-2xs',
    };
    const toggleExpand = (itemId: string) => {
        setExpandedItemIds(prev => {
            const next = new Set(prev);
            if (next.has(itemId)) {
                next.delete(itemId);
            }
            else {
                next.add(itemId);
            }
            return next;
        });
    };
    const toggleExpandLocation = (locId: string) => {
        setExpandedLocationIds(prev => {
            const next = new Set(prev);
            if (next.has(locId)) {
                next.delete(locId);
            }
            else {
                next.add(locId);
            }
            return next;
        });
    };
    const getLocationIcon = (type: string) => {
        switch (type) {
            case 'STAND':
                return null;
            case 'DEPOSIT':
                return null;
            default:
                return null;
        }
    };
    const getItemEffectiveStock = (itemId: string): number => {
        if (selectedLocation !== 'ALL') {
            return logisticsService.getItemStockAtLocation(stocks, itemId, selectedLocation);
        }
        const locsToCount = selectedLocationType === 'ALL'
            ? locations
            : locations.filter(l => l.type === selectedLocationType);
        return locsToCount.reduce((acc, loc) => acc + logisticsService.getItemStockAtLocation(stocks, itemId, loc.id), 0);
    };
    const getLocationTotalStock = (locId: string): number => {
        return items.reduce((acc, itm) => acc + logisticsService.getItemStockAtLocation(stocks, itm.id, locId), 0);
    };
    const filteredItems = items
        .filter(item => {
        // 1. Search query
        const term = searchTerm.trim().toLowerCase();
        if (term) {
            const matchesName = item.name.toLowerCase().includes(term);
            const matchesCat = (item.category || '').toLowerCase().includes(term);
            const matchesSku = (item.sku || '').toLowerCase().includes(term);
            if (!matchesName && !matchesCat && !matchesSku)
                return false;
        }
        // 2. Category filter
        if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
            return false;
        }
        // 3. Item type filter (Sellable vs Standard)
        const isSellable = Boolean(item.isSellable || item.isMug || item.sellable || item.mug);
        if ((selectedItemType === 'SELLABLE' || selectedItemType === 'MUGS') && !isSellable)
            return false;
        if (selectedItemType === 'STANDARD' && isSellable)
            return false;
        // 4. Quantity / Stock level filter
        const effectiveStock = getItemEffectiveStock(item.id);
        if (selectedStockLevel === 'IN_STOCK' && effectiveStock <= 0)
            return false;
        if (selectedStockLevel === 'LOW_STOCK' && (effectiveStock <= 0 || effectiveStock > 10))
            return false;
        if (selectedStockLevel === 'OUT_OF_STOCK' && effectiveStock > 0)
            return false;
        return true;
    })
        .sort((a, b) => {
        switch (selectedSort) {
            case 'NAME_DESC':
                return b.name.localeCompare(a.name);
            case 'STOCK_DESC': {
                const diff = getItemEffectiveStock(b.id) - getItemEffectiveStock(a.id);
                return diff !== 0 ? diff : a.name.localeCompare(b.name);
            }
            case 'STOCK_ASC': {
                const diff = getItemEffectiveStock(a.id) - getItemEffectiveStock(b.id);
                return diff !== 0 ? diff : a.name.localeCompare(b.name);
            }
            case 'CATEGORY_ASC': {
                const catDiff = (a.category || '').localeCompare(b.category || '');
                return catDiff !== 0 ? catDiff : a.name.localeCompare(b.name);
            }
            case 'NAME_ASC':
            default:
                return a.name.localeCompare(b.name);
        }
    });
    const filteredLocations = locations
        .filter(loc => {
        // 1. Location type filter
        if (selectedLocationType !== 'ALL' && loc.type !== selectedLocationType) {
            return false;
        }
        // 2. Specific location filter
        if (selectedLocation !== 'ALL' && loc.id !== selectedLocation) {
            return false;
        }
        // 3. Search term (matches location name, or items stored inside)
        const term = searchTerm.trim().toLowerCase();
        if (term) {
            const matchesLocName = loc.name.toLowerCase().includes(term);
            const matchesAnyItem = items.some(item => {
                const hasStock = logisticsService.getItemStockAtLocation(stocks, item.id, loc.id) > 0;
                if (!hasStock) return false;
                return item.name.toLowerCase().includes(term) || (item.category || '').toLowerCase().includes(term) || (item.sku || '').toLowerCase().includes(term);
            });
            if (!matchesLocName && !matchesAnyItem) return false;
        }
        // 4. Stock level filter on location total
        const locStock = getLocationTotalStock(loc.id);
        if (selectedStockLevel === 'IN_STOCK' && locStock <= 0) return false;
        if (selectedStockLevel === 'LOW_STOCK' && (locStock <= 0 || locStock > 10)) return false;
        if (selectedStockLevel === 'OUT_OF_STOCK' && locStock > 0) return false;
        return true;
    })
        .sort((a, b) => {
        switch (selectedSort) {
            case 'NAME_DESC':
                return b.name.localeCompare(a.name);
            case 'STOCK_DESC': {
                const diff = getLocationTotalStock(b.id) - getLocationTotalStock(a.id);
                return diff !== 0 ? diff : a.name.localeCompare(b.name);
            }
            case 'STOCK_ASC': {
                const diff = getLocationTotalStock(a.id) - getLocationTotalStock(b.id);
                return diff !== 0 ? diff : a.name.localeCompare(b.name);
            }
            case 'NAME_ASC':
            default:
                return a.name.localeCompare(b.name);
        }
    });
    const handleDeleteClick = (e: React.MouseEvent, item: StockItem) => {
        e.stopPropagation();
        setItemToDelete(item);
        setDeleteError('');
    };
    const handleConfirmDelete = async () => {
        if (!itemToDelete)
            return;
        setIsDeleting(true);
        setDeleteError('');
        try {
            await logisticsService.deleteItem(itemToDelete.id);
            setItemToDelete(null);
            if (onItemDeleted) {
                onItemDeleted();
            }
        }
        catch (err: any) {
            setDeleteError(err.message || t('logistics.deleteItemError', 'Eroare la ștergerea articolului.'));
        }
        finally {
            setIsDeleting(false);
        }
    };
    return (<div className="flex-1 min-h-0 flex flex-col space-y-4">
      {/* Sustainable Master-Detail Inventory Table / Mobile Cards */}
      <div className={`flex-1 min-h-0 rounded-2xl border flex flex-col overflow-hidden ${tCss.card}`}>
        {viewMode === 'LOCATIONS' ? (
          <>
            {/* Mobile Card List View - Locations */}
            <div className="block md:hidden divide-y divide-zinc-800/40 flex-1 min-h-0 overflow-y-auto no-scrollbar">
              {filteredLocations.map(loc => {
                const isExpanded = expandedLocationIds.has(loc.id);
                const locItems = items.map(itm => ({
                  item: itm,
                  quantity: logisticsService.getItemStockAtLocation(stocks, itm.id, loc.id),
                }));
                const totalStock = locItems.reduce((acc, curr) => acc + curr.quantity, 0);
                const activeItems = locItems.filter(s => s.quantity > 0);

                return (
                  <div key={loc.id} className="p-4 space-y-3 text-xs">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-1.5 mb-1 flex-wrap gap-y-1">
                          <span className="px-2 py-0.5 rounded-md bg-zinc-800/60 text-zinc-300 text-[10px] border border-zinc-700/50 uppercase">
                            {loc.type}
                          </span>
                        </div>
                        <h4 className={`font-bold text-sm leading-tight ${tCss.textPrimary}`}>{loc.name}</h4>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold text-emerald-400 block">
                          {totalStock}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {activeItems.length} {t('logistics.itemsAtLocationCount', 'articole înregistrate')}
                        </span>
                      </div>
                    </div>

                    {/* Items breakdown toggle button */}
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/40">
                      <button onClick={() => toggleExpandLocation(loc.id)} className={`text-xs font-semibold inline-flex items-center space-x-1 cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-zinc-900'}`}>
                        <span>{isExpanded ? t('logistics.hideItems', 'Ascunde articole') : t('logistics.viewItems', 'Vezi articole în această locație')}</span>
                      </button>

                      {canWrite && onOpenAdjustStock && (
                        <div className="flex items-center space-x-1">
                          <button onClick={() => onOpenAdjustStock(items[0]?.id, loc.id)} className="px-2 py-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold inline-flex items-center space-x-1 transition cursor-pointer">
                            <span>{t('logistics.adjustShort', 'Modifică')}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Expanded mobile items cards */}
                    {isExpanded && (
                      <div className="space-y-2 pt-2 border-t border-zinc-800/60 animate-in fade-in duration-150">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {items.map(itm => {
                            const qty = logisticsService.getItemStockAtLocation(stocks, itm.id, loc.id);
                            const hasStock = qty > 0;
                            return (
                              <div key={itm.id} className={`p-2.5 rounded-xl border flex items-center justify-between ${tCss.locationCard} ${hasStock ? 'border-zinc-700/80' : 'opacity-50'}`}>
                                <div className="flex items-center space-x-2 overflow-hidden">
                                  <div className="truncate">
                                    <div className={`font-semibold text-xs truncate ${tCss.textPrimary}`}>{itm.name}</div>
                                    <div className="text-[10px] text-zinc-500">{itm.category}</div>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-2 shrink-0">
                                  <span className={`text-xs font-bold ${hasStock ? tCss.textPrimary : 'text-zinc-500'}`}>
                                    {qty}
                                  </span>
                                  {canWrite && onOpenAdjustStock && (
                                    <button onClick={() => onOpenAdjustStock(itm.id, loc.id)} className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'}`}>
                                      {t('logistics.adjustShort', 'Modifică')}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredLocations.length === 0 && (
                <div className="p-8 text-center text-zinc-500">
                  <p>{t('logistics.noLocationsFound', 'Nicio locație găsită.')}</p>
                </div>
              )}
            </div>

            {/* Desktop Table View - Locations */}
            <div className="hidden md:block flex-1 min-h-0 overflow-auto no-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${tCss.tableHeader}`}>
                    <th className="py-3 px-3 w-10 text-center whitespace-nowrap"></th>
                    <th className="py-3 px-4 whitespace-nowrap">{t('logistics.colLocationName', 'Locație')}</th>
                    <th className="py-3 px-4 whitespace-nowrap">{t('logistics.colLocationType', 'Tip Locație')}</th>
                    <th className="py-3 px-4 whitespace-nowrap">{t('logistics.colActiveArticles', 'Răspândire Articole')}</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">{t('logistics.colTotalStock', 'Stoc Total')}</th>
                    {canWrite && (<th className="py-3 px-4 text-right whitespace-nowrap"></th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {filteredLocations.map(loc => {
                    const isExpanded = expandedLocationIds.has(loc.id);
                    const locItems = items.map(itm => ({
                      item: itm,
                      quantity: logisticsService.getItemStockAtLocation(stocks, itm.id, loc.id),
                    }));
                    const totalStock = locItems.reduce((acc, curr) => acc + curr.quantity, 0);
                    const activeItems = locItems.filter(s => s.quantity > 0);

                    return (
                      <React.Fragment key={loc.id}>
                        <tr onClick={() => toggleExpandLocation(loc.id)} className={`transition-colors cursor-pointer ${tCss.tableRow} ${isExpanded ? (isDarkMode ? 'bg-zinc-900/30' : 'bg-zinc-50/60') : ''}`}>
                          <td className="py-3 px-3 text-center text-zinc-400 whitespace-nowrap"></td>
                          <td className="py-3 px-4 font-medium">
                            <div className="flex items-center space-x-2">
                              <span className={`font-semibold ${tCss.textPrimary}`}>{loc.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-md bg-zinc-800/60 text-zinc-300 text-[10px] border border-zinc-700/50 uppercase">
                              {loc.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {activeItems.length > 0 ? (
                              <span className="px-2.5 py-1 rounded-lg bg-zinc-800/80 text-zinc-300 border border-zinc-700/60 text-xs font-medium">
                                {activeItems.length} {t('logistics.itemsAtLocationCount', 'articole înregistrate')}
                              </span>
                            ) : (
                              <span className="text-zinc-500 text-xs italic">
                                {t('logistics.noItemsAtLocation', 'Fără articole în această locație')}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-400 text-sm whitespace-nowrap">
                            {totalStock}
                          </td>
                          {canWrite && (
                            <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end space-x-1.5">
                                {onOpenAdjustStock && (
                                  <button onClick={() => onOpenAdjustStock(items[0]?.id, loc.id)} className="px-2 py-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold transition cursor-pointer inline-flex items-center space-x-1" title={t('logistics.adjustStockTooltip', 'Ajustează manual stocul')}>
                                    <span>{t('logistics.adjustShort', 'Modifică')}</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>

                        {isExpanded && (
                          <tr className={tCss.expandedArea}>
                            <td colSpan={canWrite ? 6 : 5} className="p-3.5 sm:p-4 pl-10 border-b border-zinc-800/60">
                              <div className="space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-1.5 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                    <span>{t('logistics.locationItemsBreakdownTitle', 'Articole prezente în această locație')}:</span>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                                  {items.map(itm => {
                                    const qty = logisticsService.getItemStockAtLocation(stocks, itm.id, loc.id);
                                    const hasStock = qty > 0;
                                    return (
                                      <div key={itm.id} className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${tCss.locationCard} ${hasStock ? 'border-zinc-700/80' : 'opacity-50'}`}>
                                        <div className="flex items-center space-x-2 overflow-hidden">
                                          <div className="truncate">
                                            <div className={`font-semibold text-xs truncate ${tCss.textPrimary}`}>{itm.name}</div>
                                            <div className="text-[10px] text-zinc-500">{itm.category}</div>
                                          </div>
                                        </div>
                                        <div className="flex items-center space-x-2 shrink-0">
                                          <span className={`text-xs font-bold ${hasStock ? tCss.textPrimary : 'text-zinc-500'}`}>
                                            {qty}
                                          </span>
                                          {canWrite && onOpenAdjustStock && (
                                            <button onClick={() => onOpenAdjustStock(itm.id, loc.id)} className="px-2 py-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold transition cursor-pointer" title={`${t('logistics.quickAdjust', 'Ajustează')} ${itm.name}`}>
                                              {t('logistics.adjustShort', 'Modifică')}
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}

                  {filteredLocations.length === 0 && (
                    <tr>
                      <td colSpan={canWrite ? 6 : 5} className="p-8 text-center text-zinc-500">
                        {t('logistics.noLocationsFound', 'Nicio locație găsită.')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            {/* Mobile Card List View - Items */}
            <div className="block md:hidden divide-y divide-zinc-800/40 flex-1 min-h-0 overflow-y-auto no-scrollbar">
              {filteredItems.map(item => {
                const isExpanded = expandedItemIds.has(item.id);
                const itemStocks = locations.map(loc => ({
                  location: loc,
                  quantity: logisticsService.getItemStockAtLocation(stocks, item.id, loc.id),
                }));
                const totalStock = itemStocks.reduce((acc, curr) => acc + curr.quantity, 0);
                const activeLocations = itemStocks.filter(s => s.quantity > 0);
                return (<div key={item.id} className="p-4 space-y-3 text-xs">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-1.5 mb-1 flex-wrap gap-y-1">
                          <span className="px-2 py-0.5 rounded-md bg-zinc-800/60 text-zinc-300 text-[10px] border border-zinc-700/50">
                            {item.category}
                          </span>
                          {canWrite ? (<button type="button" disabled={togglingItemIds.has(item.id)} onClick={(e) => handleToggleEoD(e, item)} title={item.isSellable || item.isMug || item.sellable || item.mug ? t('logistics.unmarkAsSellable', 'Elimină marcaj vandabil') : t('logistics.markAsSellable', 'Marchează ca vandabil')} className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer border inline-flex items-center space-x-1 ${item.isSellable || item.isMug || item.sellable || item.mug
                            ? 'bg-blue-600/15 border-blue-500/30 text-blue-400'
                            : 'bg-zinc-800/40 border-zinc-700/40 text-zinc-500 hover:text-zinc-300'} ${togglingItemIds.has(item.id) ? 'opacity-50 cursor-wait' : ''}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${item.isSellable || item.isMug || item.sellable || item.mug ? 'bg-blue-400' : 'bg-zinc-600'}`}/>
                              <span>{t('logistics.badgeSellable', 'Vandabil')}</span>
                            </button>) : ((item.isSellable || item.isMug || item.sellable || item.mug) && (<span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-800/80 text-zinc-300 border border-zinc-700/60">
                                {t('logistics.badgeSellable', 'Vandabil')}
                              </span>))}
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <h4 className={`font-bold text-sm leading-tight ${tCss.textPrimary}`}>{item.name}</h4>
                          {item.photoUrl && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPhotoModalItem(item);
                              }}
                              className={`p-1 rounded-md transition cursor-pointer shrink-0 ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}
                              title={t('logistics.viewPhoto', 'Vezi Poză Articol')}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
    <div className="text-right shrink-0">
                        <span className="text-sm font-bold text-emerald-400 block">
                          {totalStock}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {activeLocations.length} locații
                        </span>
                      </div>
                    </div>

                    {/* Location breakdown toggle button */}
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/40">
                      <button onClick={() => toggleExpand(item.id)} className={`text-xs font-semibold inline-flex items-center space-x-1 cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-zinc-900'}`}>
                        <span>{isExpanded ? t('logistics.hideLocations', 'Ascunde locații') : t('logistics.viewLocations', 'Vezi stoc pe locații')} ({locations.length})</span>
                      </button>

                      {canWrite && (<div className="flex items-center space-x-1">
                          {item.photoUrl && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPhotoModalItem(item);
                              }}
                              className={`p-1.5 rounded-lg transition cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}
                              title={t('logistics.viewPhoto', 'Vezi Poză Articol')}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {onOpenAdjustStock && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenAdjustStock(item.id, selectedLocation !== 'ALL' ? selectedLocation : undefined);
                              }}
                              className="px-2 py-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold transition cursor-pointer inline-flex items-center space-x-1"
                              title={t('logistics.adjustStockTooltip', 'Ajustează manual stocul acestui articol')}
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5" />
                              <span>{t('logistics.adjustShort', 'Modifică')}</span>
                            </button>
                          )}
                          {onOpenEditItem && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenEditItem(item);
                              }}
                              className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition cursor-pointer"
                              title={t('common.edit', 'Editează')}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={(e) => handleDeleteClick(e, item)} className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer" title={t('logistics.deleteItem', 'Șterge Articol')}>
                            <Trash2 className="w-3.5 h-3.5"/>
                          </button>
                        </div>)}
                    </div>

                    {/* Expanded mobile location cards */}
                    {isExpanded && (<div className="space-y-2 pt-2 border-t border-zinc-800/60 animate-in fade-in duration-150">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {locations.map(loc => {
                            const qty = logisticsService.getItemStockAtLocation(stocks, item.id, loc.id);
                            const hasStock = qty > 0;
                            return (<div key={loc.id} className={`p-2.5 rounded-xl border flex items-center justify-between ${tCss.locationCard} ${hasStock ? 'border-zinc-700/80' : 'opacity-50'}`}>
                                <div className="flex items-center space-x-2 overflow-hidden">
                                  <div className="p-1.5 rounded-lg bg-zinc-800 shrink-0">
                                    {getLocationIcon(loc.type)}
                                  </div>
                                  <div className="truncate">
                                    <div className={`font-semibold text-xs truncate ${tCss.textPrimary}`}>{loc.name}</div>
                                    <div className="text-[10px] text-zinc-500 uppercase">{loc.type}</div>
                                  </div>
                                </div>
    <div className="flex items-center space-x-2 shrink-0">
                                  <span className={`text-xs font-bold ${hasStock ? tCss.textPrimary : 'text-zinc-500'}`}>
                                    {qty}
                                  </span>
                                  {canWrite && onOpenAdjustStock && (
                                    <button
                                      onClick={() => onOpenAdjustStock(item.id, loc.id)}
                                      title={`${t('logistics.quickAdjust', 'Ajustează')} ${loc.name}`}
                                      className="px-2 py-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold transition cursor-pointer inline-flex items-center space-x-1"
                                    >
                                      <SlidersHorizontal className="w-3 h-3" />
                                      <span>{t('logistics.adjustShort', 'Modifică')}</span>
                                    </button>
                                  )}
                                </div>
                              </div>);
                        })}
                        </div>
                      </div>)}
                  </div>);
            })}

              {filteredItems.length === 0 && (<div className="p-8 text-center text-zinc-500"><p>{t('logistics.noItemsFound', 'Niciun articol găsit.')}</p>
                </div>)}
            </div>

            {/* Desktop Table View - Items */}
            <div className="hidden md:block flex-1 min-h-0 overflow-auto no-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${tCss.tableHeader}`}>
                    <th className="py-3 px-3 w-10 text-center whitespace-nowrap"></th>
                    <th className="py-3 px-4 whitespace-nowrap">{t('logistics.colArticleName', 'Articol')}</th>
                    <th className="py-3 px-4 whitespace-nowrap">{t('logistics.colCategory', 'Categorie')}</th>
                    {selectedLocation !== 'ALL' ? (<th className="py-3 px-4 text-center whitespace-nowrap">
                        {t('logistics.stockAtLocation', 'Stoc')} ({locations.find(l => l.id === selectedLocation)?.name})
                      </th>) : selectedLocationType !== 'ALL' ? (<th className="py-3 px-4 text-center whitespace-nowrap">
                        {t('logistics.stockAtLocation', 'Stoc')} ({selectedLocationType === 'DEPOSIT' ? t('logistics.filterDepositsOnly', 'Depozite') : t('logistics.filterStandsOnly', 'Standuri')})
                      </th>) : (<th className="py-3 px-4 whitespace-nowrap">{t('logistics.colActiveLocations', 'Răspândire Locații')}</th>)}
                    <th className="py-3 px-4 text-right whitespace-nowrap">{t('logistics.colTotalStock', 'Stoc Total')}</th>
                    {canWrite && (<th className="py-3 px-4 text-right whitespace-nowrap"></th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {filteredItems.map(item => {
                const isExpanded = expandedItemIds.has(item.id);
                const itemStocks = locations.map(loc => ({
                    location: loc,
                    quantity: logisticsService.getItemStockAtLocation(stocks, item.id, loc.id),
                }));
                const totalStock = itemStocks.reduce((acc, curr) => acc + curr.quantity, 0);
                const activeLocations = itemStocks.filter(s => s.quantity > 0);
                return (<React.Fragment key={item.id}>
                        <tr onClick={() => toggleExpand(item.id)} className={`transition-colors cursor-pointer ${tCss.tableRow} ${isExpanded ? (isDarkMode ? 'bg-zinc-900/30' : 'bg-zinc-50/60') : ''}`}>
                          <td className="py-3 px-3 text-center text-zinc-400 whitespace-nowrap">
                          </td>
    <td className="py-3 px-4 font-medium">
                            <div className="flex items-center space-x-2">
                              <span className={`font-semibold ${tCss.textPrimary}`}>{item.name}</span>
                              {item.photoUrl && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPhotoModalItem(item);
                                  }}
                                  className={`p-1 rounded-md transition cursor-pointer shrink-0 ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}
                                  title={t('logistics.viewPhoto', 'Vezi Poză Articol')}
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
    <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-md bg-zinc-800/60 text-zinc-300 text-[10px] border border-zinc-700/50">
                              {item.category}
                            </span>
                          </td>

                          {selectedLocation !== 'ALL' ? (<td className="py-3 px-4 text-center font-bold text-zinc-100 text-sm whitespace-nowrap">
                              {logisticsService.getItemStockAtLocation(stocks, item.id, selectedLocation)}
                            </td>) : selectedLocationType !== 'ALL' ? (<td className="py-3 px-4 text-center font-bold text-zinc-100 text-sm whitespace-nowrap">
                              {getItemEffectiveStock(item.id)}
                            </td>) : (<td className="py-3 px-4 whitespace-nowrap">
                              {activeLocations.length > 0 ? (<span className="px-2.5 py-1 rounded-lg bg-zinc-800/80 text-zinc-300 border border-zinc-700/60 text-xs font-medium">
                                  {activeLocations.length} {t('logistics.activeLocationsCount', 'locații active')}
                                </span>) : (<span className="text-zinc-500 text-xs italic">
                                  {t('logistics.noStockInAnyLocation', 'Fără stoc înregistrat')}
                                </span>)}
                            </td>)}

                          <td className="py-3 px-4 text-right font-bold text-emerald-400 text-sm whitespace-nowrap">
                            {totalStock}
                          </td>

                          {canWrite && (<td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end space-x-1.5">
                                {item.photoUrl && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPhotoModalItem(item);
                                    }}
                                    className={`p-1.5 rounded-lg transition cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}
                                    title={t('logistics.viewPhoto', 'Vezi Poză Articol')}
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button type="button" disabled={togglingItemIds.has(item.id)} onClick={(e) => handleToggleEoD(e, item)} title={item.isSellable || item.isMug || item.sellable || item.mug ? t('logistics.unmarkAsSellable', 'Elimină marcaj vandabil') : t('logistics.markAsSellable', 'Marchează ca vandabil')} className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border inline-flex items-center space-x-1.5 ${item.isSellable || item.isMug || item.sellable || item.mug
                            ? 'bg-blue-600/15 border-blue-500/30 text-blue-400 hover:bg-blue-500/25'
                            : 'bg-zinc-800/40 border-zinc-700/40 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'} ${togglingItemIds.has(item.id) ? 'opacity-50 cursor-wait' : ''}`}>
                                  <span className={`w-2 h-2 rounded-full ${item.isSellable || item.isMug || item.sellable || item.mug ? 'bg-blue-400' : 'bg-zinc-600'}`}/>
                                  <span>{t('logistics.badgeSellable', 'Vandabil')}</span>
                                </button>
                                {onOpenAdjustStock && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onOpenAdjustStock(item.id, selectedLocation !== 'ALL' ? selectedLocation : undefined);
                                    }}
                                    className="px-2 py-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold transition cursor-pointer inline-flex items-center space-x-1"
                                    title={t('logistics.adjustStockTooltip', 'Ajustează manual stocul acestui articol')}
                                  >
                                    <SlidersHorizontal className="w-3.5 h-3.5" />
                                    <span>{t('logistics.adjustShort', 'Modifică')}</span>
                                  </button>
                                )}
                                {onOpenEditItem && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onOpenEditItem(item);
                                    }}
                                    className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition cursor-pointer"
                                    title={t('common.edit', 'Editează')}
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button onClick={(e) => handleDeleteClick(e, item)} className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer" title={t('logistics.deleteItem', 'Șterge Articol')}>
                                  <Trash2 className="w-3.5 h-3.5"/>
                                </button>
                              </div>
                            </td>)}
                        </tr>

                        {isExpanded && (<tr className={tCss.expandedArea}>
                            <td colSpan={canWrite ? 6 : 5} className="p-3.5 sm:p-4 pl-10 border-b border-zinc-800/60">
                              <div className="space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-1.5 text-xs font-bold text-zinc-400 uppercase tracking-wider"><span>{t('logistics.locationBreakdownTitle', 'Defalcare stoc pe standuri și depozite')}:</span>
                                  </div>
                                </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                                  {locations.map(loc => {
                            const qty = logisticsService.getItemStockAtLocation(stocks, item.id, loc.id);
                            const hasStock = qty > 0;
                            return (<div key={loc.id} className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${tCss.locationCard} ${hasStock ? 'border-zinc-700/80' : 'opacity-50'}`}>
                                        <div className="flex items-center space-x-2 overflow-hidden">
                                          <div className="p-1.5 rounded-lg bg-zinc-800 shrink-0">
                                            {getLocationIcon(loc.type)}
                                          </div>
                                          <div className="truncate">
                                            <div className={`font-semibold text-xs truncate ${tCss.textPrimary}`}>{loc.name}</div>
                                            <div className="text-[10px] text-zinc-500 uppercase">{loc.type}</div>
                                          </div>
                                        </div>
    <div className="flex items-center space-x-2 shrink-0">
                                          <span className={`text-xs font-bold ${hasStock ? tCss.textPrimary : 'text-zinc-500'}`}>
                                            {qty}
                                          </span>
                                          {canWrite && onOpenAdjustStock && (
                                            <button
                                              onClick={() => onOpenAdjustStock(item.id, loc.id)}
                                              className="px-2 py-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold transition cursor-pointer inline-flex items-center space-x-1"
                                              title={`${t('logistics.quickAdjust', 'Ajustează')} ${loc.name}`}
                                            >
                                              <SlidersHorizontal className="w-3 h-3" />
                                              <span>{t('logistics.adjustShort', 'Modifică')}</span>
                                            </button>
                                          )}
                                        </div>
                                      </div>);
                        })}
                                </div>
                              </div>
                            </td>
                          </tr>)}
                      </React.Fragment>);
            })}

                  {filteredItems.length === 0 && (<tr>
                      <td colSpan={canWrite ? 6 : 5} className="p-8 text-center text-zinc-500">
                        {t('logistics.noItemsFound', 'Niciun articol găsit.')}
                      </td>
                    </tr>)}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {itemToDelete && (<div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs bg-zinc-950/80" onClick={() => {
                setItemToDelete(null);
                setDeleteError('');
            }}>
          <div className={`w-full max-w-sm max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl p-5 space-y-4 ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                <Trash2 className="w-5 h-5"/>
              </div>
              <div>
                <h4 className="font-bold text-sm">{t('logistics.deleteItem', 'Șterge Articol')}</h4>
              </div>
            </div>
<p className="text-xs text-zinc-300 leading-relaxed">
              {t('logistics.deleteItemConfirm', 'Sigur doriți să ștergeți articolul "{name}"? Toate stocurile și istoricul asociat vor fi șterse definitiv.').replace('{name}', itemToDelete.name)}
            </p>

            {deleteError && (<div className="p-3 text-xs rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center space-x-2"><span>{deleteError}</span>
              </div>)}

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button type="button" onClick={() => {
                setItemToDelete(null);
                setDeleteError('');
            }} disabled={isDeleting} className="px-3.5 py-2 text-xs font-semibold rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer">
                {t('common.cancel', 'Anulează')}
              </button>
              <button type="button" onClick={handleConfirmDelete} disabled={isDeleting} className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition shadow-md cursor-pointer disabled:opacity-50">
                {isDeleting ? t('logistics.deleting', 'Se șterge...') : t('logistics.deleteItem', 'Șterge Articol')}
              </button>
            </div>
          </div>
        </div>)}

      {/* Item Photo Preview Modal */}
      <ItemPhotoModal
        isOpen={Boolean(photoModalItem)}
        onClose={() => setPhotoModalItem(null)}
        itemName={photoModalItem?.name || ''}
        photoUrl={photoModalItem?.photoUrl}
        isDarkMode={isDarkMode}
      />
    </div>);
};
