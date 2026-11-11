import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Eye } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { usePermission } from '../../hooks/usePermission';
import { logisticsService } from '../../services/logisticsService';
import { hrService, isStandStartedClient } from '../../services/hrService';
import type { StockItem, StockLocation, LocationStock, StockTransferRecord, LogisticsEoDReport } from '../../types/logistics';
import type { HrStand } from '../../types/hr';
import { ConfirmationModal, ItemPhotoModal } from '../common';
const getAccountName = (): string => {
    try {
        const raw = localStorage.getItem('adminUser');
        if (raw) {
            const u = JSON.parse(raw);
            return u?.name || u?.fullName || '';
        }
    }
    catch { }
    return '';
};
interface LogisticsEoDModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (report?: LogisticsEoDReport) => void;
    items?: StockItem[];
    locations?: StockLocation[];
    stocks?: LocationStock[];
    transfers?: StockTransferRecord[];
    isDarkMode: boolean;
    editingReport?: LogisticsEoDReport | null;
    initialStandId?: string;
}
export const LogisticsEoDModal: React.FC<LogisticsEoDModalProps> = ({ isOpen, onClose, onSuccess, items: propsItems, locations: propsLocations = [], stocks: propsStocks = [], transfers: propsTransfers = [], isDarkMode, editingReport = null, initialStandId, }) => {
    const { t } = useLanguage();
    const { user } = usePermission();
    const [stands, setStands] = useState<HrStand[]>([]);
    const [loadingStands, setLoadingStands] = useState(false);
    const [fetchedItems, setFetchedItems] = useState<StockItem[]>([]);
    const [fetchedLocations, setFetchedLocations] = useState<StockLocation[]>([]);
    const [fetchedStocks, setFetchedStocks] = useState<LocationStock[]>([]);
    const [fetchedTransfers, setFetchedTransfers] = useState<StockTransferRecord[]>([]);
    const items = propsItems && propsItems.length > 0 ? propsItems : fetchedItems;
    const locations = propsLocations.length > 0 ? propsLocations : fetchedLocations;
    const stocks = propsStocks.length > 0 ? propsStocks : fetchedStocks;
    const transfers = propsTransfers.length > 0 ? propsTransfers : fetchedTransfers;
    const [selectedStandId, setSelectedStandId] = useState('');
    const [mugCounts, setMugCounts] = useState<{
        [itemId: string]: number | '';
    }>({});
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [photoPreviewMug, setPhotoPreviewMug] = useState<StockItem | null>(null);
    // Keyboard Escape listener
    useEffect(() => {
        if (!isOpen)
            return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape')
                onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);
    // Filter sellable / EoD items
    const hasExplicitSellables = useMemo(() => items.some(i => i.isSellable || i.isMug || i.sellable || i.mug), [items]);
    const mugItems = useMemo(() => {
        if (hasExplicitSellables) {
            return items.filter(item => Boolean(item.isSellable || item.isMug || item.sellable || item.mug));
        }
        return items;
    }, [items, hasExplicitSellables]);
    const loadStands = useCallback(async () => {
        setLoadingStands(true);
        setError('');
        try {
            const needItems = !propsItems || propsItems.length === 0;
            const needLocations = propsLocations.length === 0;
            const needStocks = propsStocks.length === 0;
            const needTransfers = propsTransfers.length === 0;

            const [standsRes, reportsRes, itemsRes, locsRes, stocksRes, transfersRes] = await Promise.allSettled([
                hrService.getStands(),
                logisticsService.getEoDReports(),
                needItems ? logisticsService.getItems() : Promise.resolve(null),
                needLocations ? logisticsService.getLocations() : Promise.resolve(null),
                needStocks ? logisticsService.getStocks() : Promise.resolve(null),
                needTransfers ? logisticsService.getTransfers() : Promise.resolve(null),
            ]);

            const allStands: HrStand[] = standsRes.status === 'fulfilled' && Array.isArray(standsRes.value)
                ? standsRes.value
                : [];
            const reports: LogisticsEoDReport[] = reportsRes.status === 'fulfilled' && Array.isArray(reportsRes.value)
                ? reportsRes.value
                : [];
            const itms: StockItem[] | null = itemsRes.status === 'fulfilled' && Array.isArray(itemsRes.value)
                ? itemsRes.value
                : null;
            const locs: StockLocation[] | null = locsRes.status === 'fulfilled' && Array.isArray(locsRes.value)
                ? locsRes.value
                : null;
            const stks: LocationStock[] | null = stocksRes.status === 'fulfilled' && Array.isArray(stocksRes.value)
                ? stocksRes.value
                : null;
            const trfs: StockTransferRecord[] | null = transfersRes.status === 'fulfilled' && Array.isArray(transfersRes.value)
                ? transfersRes.value
                : null;

            setStands(allStands);
            if (itms) setFetchedItems(itms);
            if (locs) setFetchedLocations(locs);
            if (stks) setFetchedStocks(stks);
            if (trfs) setFetchedTransfers(trfs);

            const activeItemsList = (propsItems && propsItems.length > 0) ? propsItems : (itms || []);
            const hasSellablesExplicit = activeItemsList.some(i => i && (i.isSellable || i.isMug || i.sellable || i.mug));
            const activeMugs = hasSellablesExplicit
                ? activeItemsList.filter(i => i && Boolean(i.isSellable || i.isMug || i.sellable || i.mug))
                : activeItemsList;

            if (editingReport) {
                setSelectedStandId(editingReport.standId || '');
                setNotes(editingReport.notes || '');
                const initialCounts: { [itemId: string]: number | '' } = {};
                activeMugs.forEach(itm => {
                    if (itm) {
                        const found = editingReport.mugCounts?.find(mc => mc && mc.itemId === itm.id);
                        initialCounts[itm.id] = found && found.countRemaining !== 0 ? found.countRemaining : '';
                    }
                });
                setMugCounts(initialCounts);
            } else {
                setNotes('');
                const closedStandIds = new Set(reports.map(r => r && r.standId).filter(Boolean));
                const available = allStands.filter(s => {
                    if (!s || s.status !== 'ACTIVE') return false;
                    if (closedStandIds.has(s.id)) return false;
                    if (!isStandStartedClient(s)) return false;
                    return true;
                });
                if (initialStandId && allStands.some(s => s && s.id === initialStandId)) {
                    setSelectedStandId(initialStandId);
                } else if (available.length > 0) {
                    setSelectedStandId(available[0].id);
                } else {
                    setSelectedStandId('');
                }
                const initialCounts: { [itemId: string]: number | '' } = {};
                activeMugs.forEach(itm => {
                    if (itm) initialCounts[itm.id] = '';
                });
                setMugCounts(initialCounts);
            }
        } catch {
            setError(t('logistics.eodLoadError', 'Eroare la încărcarea standurilor active.'));
        } finally {
            setLoadingStands(false);
        }
    }, [editingReport, initialStandId, propsItems, propsLocations.length, propsStocks.length, propsTransfers.length, t]);

    useEffect(() => {
        if (isOpen) {
            loadStands();
        }
    }, [isOpen, editingReport?.id, initialStandId, loadStands]);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const handleDeleteReport = async () => {
        if (!editingReport)
            return;
        try {
            await logisticsService.deleteEoDReport(editingReport.id, editingReport.standName);
            setIsDeleteConfirmOpen(false);
            onSuccess();
            onClose();
        }
        catch (err: any) {
            setIsDeleteConfirmOpen(false);
            setError(err?.message || t('logistics.eodDeleteError', 'Eroare la ștergerea raportului.'));
        }
    };
    // Calculate supplied quantities for the active stand
    const maxSuppliedMap = useMemo(() => {
        const activeStandId = selectedStandId || editingReport?.standId;
        if (!activeStandId && !editingReport)
            return {};
        const selectedStand = stands.find(s => s.id === activeStandId);
        const locationName = selectedStand?.locationName || editingReport?.standName || '';
        const targetLocIds = new Set<string>();
        if (activeStandId)
            targetLocIds.add(activeStandId);
        locations.forEach(loc => {
            if (loc.id === activeStandId ||
                (locationName && loc.name && loc.name.trim().toLowerCase() === locationName.trim().toLowerCase()) ||
                (locationName && loc.name && loc.name.toLowerCase().includes(locationName.toLowerCase())) ||
                (locationName && loc.name && locationName.toLowerCase().includes(loc.name.toLowerCase()))) {
                targetLocIds.add(loc.id);
            }
        });
        const totalInMap: {
            [itemId: string]: number;
        } = {};
        const totalOutMap: {
            [itemId: string]: number;
        } = {};
        transfers.forEach(trf => {
            if (targetLocIds.has(trf.destinationLocationId)) {
                (trf.items || []).forEach(ti => {
                    totalInMap[ti.itemId] = (totalInMap[ti.itemId] || 0) + ti.quantity;
                });
            }
            if (targetLocIds.has(trf.sourceLocationId)) {
                (trf.items || []).forEach(ti => {
                    totalOutMap[ti.itemId] = (totalOutMap[ti.itemId] || 0) + ti.quantity;
                });
            }
        });
        const directStockMap: {
            [itemId: string]: number;
        } = {};
        stocks.forEach(s => {
            if (targetLocIds.has(s.locationId)) {
                directStockMap[s.itemId] = (directStockMap[s.itemId] || 0) + s.quantity;
            }
        });
        const result: {
            [itemId: string]: number;
        } = {};
        items.forEach(itm => {
            const netTransferred = Math.max(0, (totalInMap[itm.id] || 0) - (totalOutMap[itm.id] || 0));
            const direct = directStockMap[itm.id] || 0;
            result[itm.id] = Math.max(netTransferred, direct);
        });
        return result;
    }, [selectedStandId, editingReport, stands, locations, transfers, stocks, items]);
    if (!isOpen)
        return null;
    const isEditMode = Boolean(editingReport);
    const selectedStand = stands.find(s => s.id === selectedStandId);
    // Valid selectable stands
    const validStands = stands.filter(s => (s.status === 'ACTIVE' && isStandStartedClient(s)) ||
        (initialStandId && s.id === initialStandId) ||
        (editingReport && s.id === editingReport.standId));
    const handleMugCountChange = (itemId: string, val: string) => {
        const clean = val.replace(/^0+(?=\d)/, '');
        if (clean === '') {
            setMugCounts(prev => ({ ...prev, [itemId]: '' }));
        }
        else {
            const num = parseInt(clean, 10);
            setMugCounts(prev => ({ ...prev, [itemId]: isNaN(num) ? '' : Math.max(0, num) }));
        }
    };
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!selectedStandId && !editingReport) {
            setError(t('logistics.errorSelectStand', 'Vă rugăm să selectați un stand valid deschis.'));
            return;
        }
        if (!editingReport && selectedStand && !isStandStartedClient(selectedStand)) {
            setError(t('logistics.errorStandNotStarted', 'Standul nu a început încă. Încheierea poate avea loc doar după primul moment al primului schimb.'));
            return;
        }
        const fallbackResponsible = t('logistics.logisticsResponsibleFallback', 'Responsabil Logistică');
        const accountName = user?.name || getAccountName() || fallbackResponsible;
        const closingPersonName = editingReport?.closingPersonName || accountName;
        const defaultStandLabel = t('logistics.standFallback', 'Stand');
        const standName = editingReport?.standName
            ? editingReport.standName
            : selectedStand
                ? `${selectedStand.locationName} (${selectedStand.eventDate})`
                : defaultStandLabel;
        const mugList = mugItems.map(m => ({
            itemId: m.id,
            itemName: m.name,
            countRemaining: typeof mugCounts[m.id] === 'number' ? (mugCounts[m.id] as number) : 0,
        }));
        setIsSubmitting(true);
        try {
            let report: LogisticsEoDReport;
            if (editingReport) {
                report = await logisticsService.updateEoDReport(editingReport.id, {
                    standId: selectedStandId || editingReport.standId,
                    standName,
                    closingPersonName,
                    notes: notes.trim(),
                    mugCounts: mugList,
                }, selectedStand?.locationName || editingReport.standName);
            }
            else {
                report = await logisticsService.submitEoDReport({
                    standId: selectedStandId,
                    standName,
                    closingPersonName,
                    notes: notes.trim(),
                    mugCounts: mugList,
                }, selectedStand?.locationName);
            }
            onSuccess(report);
            onClose();
            setNotes('');
        }
        catch (err: any) {
            setError(err.message || t('logistics.errorSubmitEoD', 'Eroare la trimiterea raportului End of Day.'));
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const modalBorder = isDarkMode ? 'border-zinc-800' : 'border-zinc-200';
    const modalBg = isDarkMode ? 'bg-black text-white border-zinc-800 shadow-2xl' : 'bg-white text-zinc-900 border-zinc-200 shadow-xl';
    const inputBg = isDarkMode
        ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700 focus:border-zinc-700'
        : 'bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400 focus:border-zinc-400';
    const textSub = isDarkMode ? 'text-zinc-400' : 'text-zinc-500';
    const innerBox = isDarkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-100 border-zinc-200';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150" onClick={onClose}>
            <div className={`w-full h-full sm:h-auto sm:max-h-[90vh] max-w-lg rounded-none sm:rounded-2xl border-0 sm:border shadow-2xl flex flex-col overflow-hidden transition-all transform scale-100 animate-in zoom-in-95 duration-150 ${modalBg}`} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="px-5 sm:px-6 pt-5 pb-3.5 flex items-center justify-between shrink-0">
                    <h3 className="font-bold text-base sm:text-lg tracking-tight">
                        {isEditMode
                            ? t('logistics.editEoDModalTitle', 'Editează Raport End of Day (Logistică)')
                            : t('logistics.eodModalTitle', 'Raport End of Day (Logistică)')}
                    </h3>
                    <button type="button" onClick={onClose} aria-label={t('common.close', 'Închide')} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}>
                        <X className="w-5 h-5"/>
                    </button>
                </div>
                <div className={`mx-5 sm:mx-6 border-b ${modalBorder}`} />

                {/* Scrollable Form Body */}
                <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-4 text-sm">
                    <form id="logistics-eod-form" noValidate onSubmit={handleSubmit} className="space-y-4 text-sm">
                        {/* Stand Picker */}
                        <div>
                            <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                                {isEditMode ? t('logistics.editingStand', 'Standul editat') : t('logistics.selectStandToClose', 'Selectează Standul de Închis')}
                            </label>
                            {isEditMode && editingReport ? (
                                <div className={`p-3 rounded-xl border font-bold text-xs ${innerBox}`}>
                                    <span className={isDarkMode ? 'text-white' : 'text-zinc-900'}>
                                        {editingReport.standName}
                                    </span>
                                </div>
                            ) : loadingStands ? (
                                <div className="text-xs text-zinc-500 py-2 animate-pulse">
                                    {t('general.loading', 'Se încarcă standurile...')}
                                </div>
                            ) : validStands.length === 0 ? (
                                <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs">
                                    {t('logistics.noStandsAvailableToClose', 'Nu există standuri active disponibile pentru închidere (toate standurile sunt fie deja încheiate, fie programate în viitor).')}
                                </div>
                            ) : (
                                <select
                                    value={selectedStandId}
                                    onChange={(e) => setSelectedStandId(e.target.value)}
                                    className={`w-full h-[38px] px-3 py-2 rounded-xl border text-xs outline-hidden transition ${inputBg}`}
                                >
                                    {validStands.map((stand) => (
                                        <option key={stand.id} value={stand.id}>
                                            {stand.locationName} &bull; {stand.eventDate} ({stand.eventName || t('logistics.defaultEventName', 'Eveniment')})
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Sellable Remaining Breakdown */}
                        <div className="space-y-2 pt-1">
                            <div className="flex items-center justify-between">
                                <label className={`text-xs font-semibold ${textSub}`}>
                                    {t('logistics.sellableRemainingTitle', 'Articole Vandabile Rămase la Stand')}
                                </label>
                                <span className="text-[11px] text-amber-400 font-semibold">
                                    {mugItems.length} {t('logistics.sellableTypesCount', 'articole definite')}
                                </span>
                            </div>

                            {mugItems.length === 0 ? (
                                <div className={`p-4 rounded-xl border text-center ${innerBox}`}>
                                    <p className="text-xs text-zinc-400 font-medium">
                                        {t('logistics.noSellableItemsConfigured', 'Nu există articole vandabile configurate în lista de produse.')}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                    {mugItems.map((mug) => {
                                        const maxSupplied = maxSuppliedMap[mug.id] !== undefined ? maxSuppliedMap[mug.id] : 0;
                                        const currentVal = mugCounts[mug.id];
                                        return (
                                            <div key={mug.id} className={`p-2.5 rounded-xl border flex items-center justify-between ${innerBox}`}>
                                                <div>
                                                    <div className="flex items-center space-x-1.5">
                                                        <p className="text-xs font-semibold">{mug.name}</p>
                                                        {mug.photoUrl && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setPhotoPreviewMug(mug)}
                                                                title={t('logistics.viewPhoto', 'Vezi Poză Articol')}
                                                                className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer shrink-0"
                                                            >
                                                                <Eye className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center space-x-1.5 text-[10px] text-zinc-400">
                                                        <span>{mug.unit}</span>
                                                        {maxSupplied > 0 && (
                                                            <>
                                                                <span>&bull;</span>
                                                                <span className="text-amber-500 font-semibold">
                                                                    {t('logistics.suppliedShort', 'aprovizionate:')} {maxSupplied}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-xs text-zinc-400">{t('logistics.remainingShort', 'rămase:')}</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="1"
                                                        value={currentVal !== undefined ? currentVal : ''}
                                                        onFocus={(e) => e.target.select()}
                                                        onChange={(e) => handleMugCountChange(mug.id, e.target.value)}
                                                        placeholder="0"
                                                        className={`w-20 h-[34px] px-2.5 py-1 text-xs text-right font-bold rounded-lg border outline-hidden transition ${inputBg}`}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Closing Notes */}
                        <div>
                            <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                                {t('logistics.eodNotes', 'Observații / Mențiuni Încheiere')}
                            </label>
                            <textarea
                                rows={2}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder={t('logistics.eodNotesPlaceholder', 'Ex: S-au returnat articolele deteriorate, stoc predat la depozitul central...')}
                                className={`w-full px-3 py-2 rounded-xl border text-xs outline-hidden transition resize-none ${inputBg}`}
                            />
                        </div>
                    </form>
                </div>

                <div className={`mx-5 sm:mx-6 border-t ${modalBorder}`} />

                {/* Footer */}
                <div className="px-5 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
                    <div className="min-w-0 pr-3">
                        {error ? (
                            <p className="text-xs text-rose-400 font-medium truncate">{error}</p>
                        ) : isEditMode && editingReport ? (
                            <button
                                type="button"
                                onClick={() => setIsDeleteConfirmOpen(true)}
                                disabled={isSubmitting}
                                className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-md transition cursor-pointer disabled:opacity-50"
                            >
                                {t('logistics.deleteEoDBtn', 'Șterge Raport')}
                            </button>
                        ) : null}
                    </div>

                    <button
                        form="logistics-eod-form"
                        type="submit"
                        disabled={isSubmitting || (!isEditMode && validStands.length === 0)}
                        className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50 flex items-center space-x-2 shrink-0"
                    >
                        {isSubmitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/>}
                        <span>
                            {isEditMode
                                ? t('common.saveChanges', 'Salvează Modificările')
                                : t('logistics.submitEoDBtn', 'Finalizează & Închide Stand')}
                        </span>
                    </button>
                </div>
            </div>

            <ConfirmationModal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={handleDeleteReport}
                title={t('logistics.deleteEoDBtn', 'Șterge Raport')}
                message={t('logistics.deleteEoDConfirm', 'Sigur doriți să ștergeți raportul End of Day pentru acest stand? Standul va fi redeschis ca activ.')}
                variant="danger"
                isDarkMode={isDarkMode}
                zIndex="z-60"
            />

            <ItemPhotoModal
                isOpen={Boolean(photoPreviewMug)}
                onClose={() => setPhotoPreviewMug(null)}
                itemName={photoPreviewMug?.name || ''}
                photoUrl={photoPreviewMug?.photoUrl}
                isDarkMode={isDarkMode}
            />
        </div>
    );
};
