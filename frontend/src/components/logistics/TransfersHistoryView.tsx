import React, { useMemo } from 'react';
import { User } from 'lucide-react';
import type { StockTransferRecord, StockLocation, StockItem } from '../../types/logistics';
import { useLanguage } from '../../context/LanguageContext';
interface TransfersHistoryViewProps {
    transfers: StockTransferRecord[];
    locations?: StockLocation[];
    items?: StockItem[];
    isDarkMode: boolean;
    searchQuery?: string;
    sourceLocationFilter?: string;
    destLocationFilter?: string;
    canWrite?: boolean;
    onOpenTransferModal?: () => void;
}
export const TransfersHistoryView: React.FC<TransfersHistoryViewProps> = ({ transfers = [], locations = [], items = [], isDarkMode, searchQuery = '', sourceLocationFilter = 'ALL', destLocationFilter = 'ALL', canWrite = false, onOpenTransferModal, }) => {
    const { t, language } = useLanguage();
    const locMap = useMemo(() => {
        const map = new Map<string, string>();
        locations.forEach(l => map.set(l.id, l.name));
        return map;
    }, [locations]);
    const itemMap = useMemo(() => {
        const map = new Map<string, {
            name: string;
            unit: string;
        }>();
        items.forEach(i => map.set(i.id, { name: i.name, unit: i.unit }));
        return map;
    }, [items]);
    const tCss = {
        card: isDarkMode ? 'bg-zinc-950 border-zinc-850' : 'bg-white border-zinc-200 shadow-sm',
        innerCard: isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200',
        textPrimary: isDarkMode ? 'text-white' : 'text-zinc-900',
        textSecondary: isDarkMode ? 'text-zinc-400' : 'text-zinc-500',
    };
    const filteredTransfers = useMemo(() => {
        const safeList = Array.isArray(transfers) ? transfers : [];
        return safeList.filter(trf => {
            const srcName = trf.sourceLocationName || locMap.get(trf.sourceLocationId) || '';
            const destName = trf.destinationLocationName || locMap.get(trf.destinationLocationId) || '';
            const operator = trf.performedBy || '';
            const notes = trf.notes || '';
            const itemNames = Array.isArray(trf.items) ? trf.items.map(i => i.itemName || itemMap.get(i.itemId)?.name || '').join(' ') : '';
            const matchSearch = !searchQuery ||
                srcName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                destName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                operator.toLowerCase().includes(searchQuery.toLowerCase()) ||
                notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
                itemNames.toLowerCase().includes(searchQuery.toLowerCase());
            const matchSrc = sourceLocationFilter === 'ALL' || trf.sourceLocationId === sourceLocationFilter || srcName === sourceLocationFilter;
            const matchDest = destLocationFilter === 'ALL' || trf.destinationLocationId === destLocationFilter || destName === destLocationFilter;
            return matchSearch && matchSrc && matchDest;
        });
    }, [transfers, searchQuery, sourceLocationFilter, destLocationFilter, locMap, itemMap]);
    return (<div className="space-y-4">
      <div className="space-y-3">
        {filteredTransfers.length === 0 ? (<div className={`p-8 text-center rounded-2xl border text-xs text-zinc-500 ${tCss.card}`}>
            <p className="mb-3">{t('logistics.noTransfersFound', 'Nu a fost găsit niciun transfer conform filtrelor selectate.')}</p>
            {canWrite && onOpenTransferModal && !searchQuery && sourceLocationFilter === 'ALL' && destLocationFilter === 'ALL' && (
              <button
                type="button"
                onClick={onOpenTransferModal}
                className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition cursor-pointer"
              >
                <span>{t('logistics.stockTransferBtn', 'Transfer Stoc')}</span>
              </button>
            )}
          </div>) : (filteredTransfers.map((trf) => {
            const srcName = trf.sourceLocationName || locMap.get(trf.sourceLocationId) || t('logistics.sourceLocation', 'Sursă');
            const destName = trf.destinationLocationName || locMap.get(trf.destinationLocationId) || t('logistics.destLocation', 'Destinație');
            const trfItems = Array.isArray(trf.items) ? trf.items : [];
            return (<div key={trf.id} className={`p-4 rounded-2xl border ${tCss.card}`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3 pb-3 border-b border-zinc-800/40">
                <div className="flex items-center space-x-2 text-xs font-bold">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {srcName}
                  </span>
                  <span className="text-zinc-500 font-bold">→</span>
                  <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {destName}
                  </span>
                </div>
<div className="flex items-center space-x-4 text-[11px] text-zinc-400">
                  <div className="flex items-center space-x-1"><span>
                      {trf.timestamp
                    ? new Date(trf.timestamp).toLocaleString(language === 'ro' ? 'ro-RO' : 'en-US')
                    : ''}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <User className="w-3.5 h-3.5 text-zinc-500"/>
                    <span>{trf.performedBy || 'Operator'}</span>
                  </div>
                </div>
              </div>

              {trfItems.length > 0 && (<div className="space-y-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    {t('logistics.articlesTransferredList', 'Articole Mutate:')}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {trfItems.map((item, i) => {
                        const lookup = itemMap.get(item.itemId);
                        const itemName = item.itemName || lookup?.name || t('logistics.article', 'Articol');
                        const itemUnit = item.unit || lookup?.unit || 'buc';
                        return (<span key={i} className={`px-2.5 py-1 rounded-xl text-xs font-semibold border ${tCss.innerCard}`}>
                          <span className={tCss.textPrimary}>{itemName}: </span>
                          <span className="text-amber-400 font-bold">{item.quantity} {itemUnit}</span>
                        </span>);
                    })}
                  </div>
                </div>)}

              {trf.notes && (<div className="mt-3 pt-2 border-t border-zinc-800/20 flex items-center space-x-1.5 text-xs text-zinc-400"><span>{trf.notes}</span>
                </div>)}
            </div>);
        }))}
      </div>
    </div>);
};
