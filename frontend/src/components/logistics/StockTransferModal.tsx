import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Trash2 } from 'lucide-react';
import { logisticsService } from '../../services/logisticsService';
import type { StockLocation, StockItem, LocationStock, TransferItemRequest } from '../../types/logistics';
import { useLanguage } from '../../context/LanguageContext';
import { ManageableSelect } from '../common';

interface StockTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  locations: StockLocation[];
  items: StockItem[];
  stocks: LocationStock[];
  isDarkMode: boolean;
  canWrite?: boolean;
  initialSourceLocId?: string;
  initialDestLocId?: string;
  onAddLocation?: (name: string) => Promise<void>;
  onRenameLocation?: (id: string, newName: string) => Promise<void>;
  onDeleteLocation?: (id: string) => Promise<void>;
  onAddItem?: (name: string) => Promise<void>;
  onRenameItem?: (id: string, newName: string) => Promise<void>;
  onDeleteItem?: (id: string) => Promise<void>;
}

export const StockTransferModal: React.FC<StockTransferModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  locations = [],
  items = [],
  stocks = [],
  isDarkMode,
  canWrite = true,
  initialSourceLocId,
  initialDestLocId,
  onAddLocation,
  onRenameLocation,
  onDeleteLocation,
  onAddItem,
  onRenameItem,
  onDeleteItem,
}) => {
  const { t } = useLanguage();
  const [sourceLocId, setSourceLocId] = useState<string>('');
  const [destLocId, setDestLocId] = useState<string>('');
  const [transferRows, setTransferRows] = useState<{ itemId: string; quantity: number | '' }[]>([]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const srcId = initialSourceLocId || (locations.length > 0 ? locations[0].id : '');
      const destId = initialDestLocId || (locations.length > 1 ? locations[1].id : (locations[0]?.id || ''));
      setSourceLocId(srcId);
      setDestLocId(destId);
      setTransferRows(items.length > 0 ? [{ itemId: items[0].id, quantity: 10 }] : []);
      setNotes('');
      setError('');
      setIsSubmitting(false);
    }
  }, [isOpen, initialSourceLocId, initialDestLocId, locations, items]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalBorder = isDarkMode ? 'border-zinc-800' : 'border-zinc-200';
  const modalBg = isDarkMode ? 'bg-black text-white border-zinc-800 shadow-2xl' : 'bg-white text-zinc-900 border-zinc-200 shadow-xl';
  const inputBg = isDarkMode
    ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700 focus:border-zinc-700'
    : 'bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400 focus:border-zinc-400';
  const textSub = isDarkMode ? 'text-zinc-400' : 'text-zinc-500';
  const innerCard = isDarkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-100 border-zinc-200';

  const handleAddRow = () => {
    const unusedItem = items.find(i => !transferRows.some(r => r.itemId === i.id)) || items[0];
    setTransferRows([...transferRows, { itemId: unusedItem?.id || '', quantity: 10 }]);
  };

  const handleRemoveRow = (index: number) => {
    if (transferRows.length <= 1) return;
    setTransferRows(transferRows.filter((_, i) => i !== index));
  };

  const handleRowChange = (index: number, field: 'itemId' | 'quantity', value: any) => {
    const updated = [...transferRows];
    if (field === 'quantity') {
      const clean = typeof value === 'string' ? value.replace(/^0+(?=\d)/, '') : String(value);
      if (clean === '') {
        updated[index] = { ...updated[index], quantity: '' };
      } else {
        const num = parseInt(clean, 10);
        updated[index] = { ...updated[index], quantity: isNaN(num) ? '' : Math.max(1, num) };
      }
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setTransferRows(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!canWrite) {
      setError(t('logistics.noWritePermission', 'Nu aveți permisiunea de a efectua transferuri de stoc.'));
      return;
    }
    if (!sourceLocId) {
      setError(t('logistics.selectSource', 'Selectați locația sursă.'));
      return;
    }
    if (!destLocId) {
      setError(t('logistics.selectDest', 'Selectați locația destinație.'));
      return;
    }
    if (sourceLocId === destLocId) {
      setError(t('logistics.sameLocationError', 'Locația sursă și destinația trebuie să fie diferite.'));
      return;
    }

    const validRows: TransferItemRequest[] = transferRows
      .filter(r => r.itemId && typeof r.quantity === 'number' && r.quantity > 0)
      .map(r => ({
        itemId: r.itemId,
        quantity: r.quantity as number,
      }));

    if (validRows.length === 0) {
      setError(t('logistics.noItemsSelected', 'Introduceți o cantitate mai mare ca 0 pentru cel puțin un articol.'));
      return;
    }

    setIsSubmitting(true);
    const currentUserName = (() => {
      const stored = localStorage.getItem('adminUser');
      if (stored) {
        try {
          const u = JSON.parse(stored);
          return u.name || u.fullName || u.email || 'Admin';
        } catch {
          return 'Admin';
        }
      }
      return 'Admin';
    })();

    try {
      await logisticsService.executeTransfer(sourceLocId, destLocId, validRows, currentUserName, notes.trim());
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || t('logistics.transferFailed', 'A apărut o eroare la efectuarea transferului.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const srcLocation = locations.find(l => l.id === sourceLocId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150" onClick={onClose}>
      <div className={`w-full h-full sm:h-auto sm:max-h-[90vh] max-w-xl rounded-none sm:rounded-2xl border-0 sm:border shadow-2xl flex flex-col overflow-hidden transition-all transform scale-100 animate-in zoom-in-95 duration-150 ${modalBg}`} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 sm:px-6 pt-5 pb-3.5 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-base sm:text-lg tracking-tight">
            {t('logistics.stockTransferTitle', 'Transfer Stoc Între Locații')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close', 'Închide')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className={`mx-5 sm:mx-6 border-b ${modalBorder}`} />

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-4 text-sm">
          <form id="stock-transfer-form" noValidate onSubmit={handleSubmit} className="space-y-4 text-sm">
            {/* Source & Destination Route */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-center">
              <div className="sm:col-span-2">
                <ManageableSelect
                  label={t('logistics.sourceLocation', 'Locație Sursă')}
                  value={sourceLocId}
                  onChange={(val) => {
                    setSourceLocId(val);
                    setError('');
                  }}
                  options={locations.map(l => ({ value: l.id, label: l.name }))}
                  placeholder={t('logistics.selectSource', 'Selectează sursa...')}
                  modalTitle={t('logistics.manageLocations', 'Gestionează Locații')}
                  isDarkMode={isDarkMode}
                  onAddItem={onAddLocation}
                  onRenameItem={onRenameLocation}
                  onDeleteItem={onDeleteLocation}
                />
              </div>

              <div className="flex items-center justify-center pt-1 sm:pt-4">
                <div className={`p-2 rounded-full border ${isDarkMode ? 'bg-zinc-900 text-zinc-400 border-zinc-800' : 'bg-zinc-100 text-zinc-500 border-zinc-200'}`}>
                  <ArrowRight className="w-4 h-4 rotate-90 sm:rotate-0 transition-transform" />
                </div>
              </div>

              <div className="sm:col-span-2">
                <ManageableSelect
                  label={t('logistics.destLocation', 'Locație Destinație')}
                  value={destLocId}
                  onChange={(val) => {
                    setDestLocId(val);
                    setError('');
                  }}
                  options={locations.map(l => ({ value: l.id, label: l.name }))}
                  placeholder={t('logistics.selectDest', 'Selectează destinația...')}
                  modalTitle={t('logistics.manageLocations', 'Gestionează Locații')}
                  isDarkMode={isDarkMode}
                  onAddItem={onAddLocation}
                  onRenameItem={onRenameLocation}
                  onDeleteItem={onDeleteLocation}
                />
              </div>
            </div>

            {/* Transfer Items Rows */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className={`text-xs font-semibold ${textSub}`}>
                  {t('logistics.selectItemsTitle', 'Articole de Transferat')}
                </label>
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition cursor-pointer"
                >
                  {t('logistics.addRow', 'Adaugă Articol')}
                </button>
              </div>

              {transferRows.length === 0 ? (
                <div className={`p-4 rounded-xl border text-center ${innerCard}`}>
                  <p className="text-xs text-zinc-400 font-medium">
                    {t('logistics.noItemsSelected', 'Nu există articole adăugate.')}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {transferRows.map((row, index) => {
                    const availableStock = row.itemId && sourceLocId
                      ? logisticsService.getItemStockAtLocation(stocks, row.itemId, sourceLocId)
                      : 0;
                    const isStockLow = typeof row.quantity === 'number' && row.quantity > availableStock;

                    return (
                      <div key={index} className={`p-3 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 ${innerCard}`}>
                        <div className="flex-1 min-w-0">
                          <ManageableSelect
                            label={`${t('logistics.article', 'Articol')} #${index + 1}`}
                            value={row.itemId}
                            onChange={(val) => handleRowChange(index, 'itemId', val)}
                            options={items.map(i => ({ value: i.id, label: i.name }))}
                            placeholder={t('logistics.selectItem', 'Selectează articol...')}
                            modalTitle={t('logistics.manageItems', 'Gestionează Articole')}
                            isDarkMode={isDarkMode}
                            onAddItem={onAddItem}
                            onRenameItem={onRenameItem}
                            onDeleteItem={onDeleteItem}
                          />
                        </div>

                        <div className="w-full sm:w-28">
                          <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                            {t('logistics.quantity', 'Cantitate')}
                          </label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={row.quantity}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => handleRowChange(index, 'quantity', e.target.value)}
                            placeholder="1"
                            className={`w-full h-[38px] px-3 py-2 rounded-xl border text-xs font-bold outline-hidden transition ${isStockLow ? 'border-rose-500/80 text-rose-400 focus:border-rose-500 ring-1 ring-rose-500/40' : inputBg}`}
                          />
                        </div>

                        <div className="w-full sm:w-28 flex flex-col justify-center">
                          <span className="text-[10px] text-zinc-500 truncate">
                            {t('logistics.availableAtSource', 'Stoc')} {srcLocation?.name || 'sursă'}:
                          </span>
                          <span className={`text-xs font-bold ${isStockLow ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {availableStock}
                          </span>
                        </div>

                        <div className="flex items-center justify-end pt-1 sm:pt-5">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(index)}
                            disabled={transferRows.length <= 1}
                            aria-label={t('common.delete', 'Șterge')}
                            className={`p-1.5 rounded-lg transition-colors ${transferRows.length > 1 ? 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer' : 'text-zinc-600 opacity-30 cursor-not-allowed'}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Transfer Notes */}
            <div>
              <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                {t('logistics.transferNotes', 'Note Transfer (Opțional)')}
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('logistics.transferNotesPlaceholder', 'Ex: Mutare articole la standul 1 pentru schimbul 2')}
                className={`w-full px-3 py-2 rounded-xl border text-xs outline-hidden transition resize-none ${inputBg}`}
              />
            </div>
          </form>
        </div>

        <div className={`mx-5 sm:mx-6 border-t ${modalBorder}`} />

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="min-w-0 pr-3">
            {error && <p className="text-xs text-rose-400 font-medium truncate">{error}</p>}
          </div>

          <button
            form="stock-transfer-form"
            type="submit"
            disabled={isSubmitting || !canWrite}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50 flex items-center space-x-2 shrink-0"
          >
            {isSubmitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            <span>{t('logistics.executeTransferBtn', 'Efectuează Transferul')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};