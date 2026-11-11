import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { logisticsService } from '../../services/logisticsService';
import type { StockItem, StockLocation, LocationStock, AdjustmentReason } from '../../types/logistics';
import { useLanguage } from '../../context/LanguageContext';
import { ManageableSelect } from '../common';
interface AdjustStockModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    items: StockItem[];
    locations: StockLocation[];
    stocks: LocationStock[];
    initialItemId?: string;
    initialLocationId?: string;
    isDarkMode: boolean;
    onAddLocation?: (name: string) => Promise<void>;
    onRenameLocation?: (id: string, newName: string) => Promise<void>;
    onDeleteLocation?: (id: string) => Promise<void>;
    onAddItem?: (name: string) => Promise<void>;
    onRenameItem?: (id: string, newName: string) => Promise<void>;
    onDeleteItem?: (id: string) => Promise<void>;
}
export const AdjustStockModal: React.FC<AdjustStockModalProps> = ({ isOpen, onClose, onSuccess, items, locations, stocks, initialItemId, initialLocationId, isDarkMode, onAddLocation, onRenameLocation, onDeleteLocation, onAddItem, onRenameItem, onDeleteItem, }) => {
    const { t } = useLanguage();
    const [selectedItemId, setSelectedItemId] = useState<string>('');
    const [selectedLocationId, setSelectedLocationId] = useState<string>('');
    const [newQuantity, setNewQuantity] = useState<number | ''>('');
    const [reason, setReason] = useState<AdjustmentReason>('INVENTORY_COUNT');
    const [notes, setNotes] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    useEffect(() => {
        if (isOpen) {
            const itemId = initialItemId || (items.length > 0 ? items[0].id : '');
            const locationId = initialLocationId || (locations.length > 0 ? locations[0].id : '');
            setSelectedItemId(itemId);
            setSelectedLocationId(locationId);
            const currentStock = (itemId && locationId)
                ? logisticsService.getItemStockAtLocation(stocks, itemId, locationId)
                : 0;
            setNewQuantity(currentStock === 0 ? '' : currentStock);
            setReason('INVENTORY_COUNT');
            setNotes('');
            setError('');
        }
    }, [isOpen, initialItemId, initialLocationId, items, locations, stocks]);
    const currentStock = (selectedItemId && selectedLocationId)
        ? logisticsService.getItemStockAtLocation(stocks, selectedItemId, selectedLocationId)
        : 0;
    const currentItem = items.find(i => i.id === selectedItemId);
    const qtyNum = typeof newQuantity === 'number' ? newQuantity : (parseInt(newQuantity, 10) || 0);
    const diff = qtyNum - currentStock;
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItemId) {
            setError(t('logistics.errorItemRequired', 'Selectați un articol.'));
            return;
        }
        if (!selectedLocationId) {
            setError(t('logistics.errorLocationRequired', 'Selectați o locație.'));
            return;
        }
        if (qtyNum < 0) {
            setError(t('logistics.errorQtyNonNegative', 'Cantitatea trebuie să fie cel puțin 0.'));
            return;
        }
        setLoading(true);
        setError('');
        const currentUserName = (() => {
            const stored = localStorage.getItem('adminUser');
            if (stored) {
                try {
                    const u = JSON.parse(stored);
                    return u.name || u.email || 'Admin';
                }
                catch {
                    return 'Admin';
                }
            }
            return 'Admin';
        })();
        try {
            const itm = items.find(i => i.id === selectedItemId);
            const loc = locations.find(l => l.id === selectedLocationId);
            await logisticsService.adjustStock({
                itemId: selectedItemId,
                locationId: selectedLocationId,
                newQuantity: qtyNum,
                reason,
                notes: notes.trim(),
                performedBy: currentUserName,
            }, {
                itemName: itm?.name,
                locationName: loc?.name,
            });
            onSuccess();
            onClose();
        }
        catch (err: any) {
            setError(err.message || t('logistics.errorAdjustStock', 'Eroare la modificarea stocului.'));
        }
        finally {
            setLoading(false);
        }
    };
    // Keyboard Escape listener
    React.useEffect(() => {
        if (!isOpen)
            return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape')
                onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);
    if (!isOpen)
        return null;
    const modalBorder = isDarkMode ? 'border-zinc-800' : 'border-zinc-200';
    const modalBg = isDarkMode ? 'bg-black text-white border-zinc-800 shadow-2xl' : 'bg-white text-zinc-900 border-zinc-200 shadow-xl';
    const inputBg = isDarkMode
        ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700 focus:border-zinc-700'
        : 'bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400 focus:border-zinc-400';
    const textSub = isDarkMode ? 'text-zinc-400' : 'text-zinc-500';
    const innerBox = isDarkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-100 border-zinc-200';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150" onClick={onClose}>
            <div className={`w-full h-full sm:h-auto sm:max-h-[90vh] max-w-md rounded-none sm:rounded-2xl border-0 sm:border shadow-2xl flex flex-col overflow-hidden transition-all transform scale-100 animate-in zoom-in-95 duration-150 ${modalBg}`} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="px-5 sm:px-6 pt-5 pb-3.5 flex items-center justify-between shrink-0">
                    <h3 className="font-bold text-base sm:text-lg tracking-tight">
                        {t('logistics.adjustStockModalTitle', 'Ajustare Manuală Stoc')}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={t('common.close', 'Închide')}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}
                    >
                        <X className="w-5 h-5"/>
                    </button>
                </div>
                <div className={`mx-5 sm:mx-6 border-b ${modalBorder}`} />

                {/* Scrollable Form Body */}
                <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-4 text-sm">
                    <form id="adjust-stock-form" noValidate onSubmit={handleSubmit} className="space-y-4 text-sm">
                        {/* Item Selector */}
                        <div>
                            <ManageableSelect
                                label={t('logistics.colArticleName', 'Articol')}
                                value={selectedItemId}
                                onChange={(id) => {
                                    setSelectedItemId(id);
                                    const cur = selectedLocationId ? logisticsService.getItemStockAtLocation(stocks, id, selectedLocationId) : 0;
                                    setNewQuantity(cur);
                                    setError('');
                                }}
                                options={items.map(item => ({ value: item.id, label: item.name }))}
                                placeholder={t('logistics.selectItem', 'Selectează articol...')}
                                modalTitle={t('logistics.manageItems', 'Gestionează Articole')}
                                isDarkMode={isDarkMode}
                                onAddItem={onAddItem}
                                onRenameItem={onRenameItem}
                                onDeleteItem={onDeleteItem}
                            />
                        </div>

                        {/* Location Selector */}
                        <div>
                            <ManageableSelect
                                label={t('logistics.location', 'Locație')}
                                value={selectedLocationId}
                                onChange={(locId) => {
                                    setSelectedLocationId(locId);
                                    const cur = selectedItemId ? logisticsService.getItemStockAtLocation(stocks, selectedItemId, locId) : 0;
                                    setNewQuantity(cur);
                                    setError('');
                                }}
                                options={locations.map(loc => ({ value: loc.id, label: loc.name }))}
                                placeholder={t('logistics.selectLocation', 'Selectează locație...')}
                                modalTitle={t('logistics.manageLocations', 'Gestionează Locații')}
                                isDarkMode={isDarkMode}
                                onAddItem={onAddLocation}
                                onRenameItem={onRenameLocation}
                                onDeleteItem={onDeleteLocation}
                            />
                        </div>

                        {/* Current Stock vs New Stock Diff Card */}
                        <div className={`p-3 rounded-xl border grid grid-cols-3 gap-2 text-center ${innerBox}`}>
                            <div>
                                <span className={`text-[10px] block uppercase font-semibold ${textSub}`}>
                                    {t('logistics.stockCurrent', 'Stoc Curent')}
                                </span>
                                <span className="text-sm font-bold">{currentStock}</span>
                            </div>
                            <div>
                                <span className={`text-[10px] block uppercase font-semibold ${textSub}`}>
                                    {t('logistics.stockDifference', 'Diferență')}
                                </span>
                                <span className={`text-sm font-bold ${diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-rose-400' : 'text-zinc-400'}`}>
                                    {diff > 0 ? `+${diff}` : diff}
                                </span>
                            </div>
                            <div>
                                <span className={`text-[10px] block uppercase font-semibold ${textSub}`}>
                                    {t('logistics.stockTarget', 'Stoc Nou')}
                                </span>
                                <span className="text-sm font-bold text-amber-400">{newQuantity}</span>
                            </div>
                        </div>

                        {/* New Quantity Input */}
                        <div>
                            <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                                {t('logistics.newQuantityInput', 'Noua Cantitate')} ({currentItem?.unit || 'buc'})
                            </label>
                            <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={newQuantity}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                    const clean = e.target.value.replace(/^0+(?=\d)/, '');
                                    setNewQuantity(clean === '' ? '' : Math.max(0, parseInt(clean, 10) || 0));
                                }}
                                className={`w-full h-[38px] px-3 py-2 rounded-xl border text-xs font-bold outline-hidden transition ${inputBg}`}
                            />
                        </div>

                        {/* Reason Selector */}
                        <div>
                            <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                                {t('logistics.adjustmentReason', 'Motiv Ajustare')}
                            </label>
                            <select
                                value={reason}
                                onChange={(e) => setReason(e.target.value as AdjustmentReason)}
                                className={`w-full h-[38px] px-3 py-2 rounded-xl border text-xs outline-hidden transition ${inputBg}`}
                            >
                                <option value="INVENTORY_COUNT">{t('logistics.reasonInventoryCount', 'Inventariere / Recenzare')}</option>
                                <option value="RESTOCK">{t('logistics.reasonRestock', 'Aprovizionare / Restocare directă')}</option>
                                <option value="CORRECTION">{t('logistics.reasonCorrection', 'Corecție eroare înregistrare')}</option>
                                <option value="DAMAGE">{t('logistics.reasonDamage', 'Deteriorat / Bunuri stricate')}</option>
                                <option value="LOSS">{t('logistics.reasonLoss', 'Pierdere / Lipsă stoc')}</option>
                                <option value="OTHER">{t('logistics.reasonOther', 'Alt motiv')}</option>
                            </select>
                        </div>

                        {/* Notes Input */}
                        <div>
                            <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                                {t('logistics.notes', 'Note / Justificare')}
                            </label>
                            <input
                                type="text"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder={t('logistics.adjustNotesPlaceholder', 'Ex: Numărat la încheierea evenimentului')}
                                className={`w-full h-[38px] px-3 py-2 rounded-xl border text-xs outline-hidden transition ${inputBg}`}
                            />
                        </div>
                    </form>
                </div>

                <div className={`mx-5 sm:mx-6 border-t ${modalBorder}`} />

                {/* Footer */}
                <div className="px-5 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
                    <div className="min-w-0 pr-3">
                        {error && (
                            <p className="text-xs text-rose-400 font-medium truncate">{error}</p>
                        )}
                    </div>
                    <button
                        type="submit"
                        form="adjust-stock-form"
                        disabled={loading}
                        className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50 flex items-center space-x-2 shrink-0"
                    >
                        <span>{loading ? t('general.saving', 'Se salvează...') : t('logistics.saveAdjustmentBtn', 'Confirmă Ajustarea')}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
