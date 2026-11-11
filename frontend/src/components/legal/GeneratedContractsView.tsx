import React, { useMemo, useState } from 'react';
import { Trash2, Pencil, X, ExternalLink } from 'lucide-react';
import type { GeneratedContract, ContractStatus } from '../../types/legal';
import { useLanguage } from '../../context/LanguageContext';

interface GeneratedContractsViewProps {
  contracts: GeneratedContract[];
  searchQuery?: string;
  statusFilter?: string;
  onStatusChange: (id: string, newStatus: ContractStatus) => Promise<void>;
  onDelete: (id: string) => void;
  onNewContractClick: () => void;
  canWrite: boolean;
  isDarkMode: boolean;
}

export const GeneratedContractsView: React.FC<GeneratedContractsViewProps> = ({
  contracts,
  searchQuery = '',
  statusFilter = 'ALL',
  onStatusChange,
  onDelete,
  onNewContractClick,
  canWrite,
  isDarkMode,
}) => {
  const { t } = useLanguage();
  const [editingStatusContract, setEditingStatusContract] = useState<GeneratedContract | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<ContractStatus>('draft');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  const filteredContracts = useMemo(() => {
    return contracts.filter(c => {
      const matchesSearch = 
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.contractNumber && c.contractNumber.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [contracts, searchQuery, statusFilter]);

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'signed':
        return isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'not_signed':
        return isDarkMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200';
      case 'pending_signature':
        return isDarkMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200';
      case 'archived':
        return isDarkMode ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-zinc-100 text-zinc-600 border-zinc-200';
      default:
        return isDarkMode ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const getStatusLabel = (st: string) => {
    switch (st) {
      case 'signed': return t('legal.statusSigned', 'Semnat');
      case 'not_signed': return t('legal.statusNotSigned', 'Nesemnat');
      case 'pending_signature': return t('legal.statusPending', 'Așteaptă Semnare');
      case 'archived': return t('legal.statusArchived', 'Arhivat');
      default: return t('legal.statusDraft', 'Ciornă');
    }
  };

  const getDriveLink = (driveFileId?: string, contractNumber?: string, title?: string) => {
    if (driveFileId && driveFileId.trim()) {
      const cleanId = driveFileId.trim();
      if (cleanId.startsWith('http')) return cleanId;
      return `https://docs.google.com/document/d/${cleanId}/edit`;
    }
    const query = encodeURIComponent(contractNumber || title || 'Document');
    return `https://drive.google.com/drive/search?q=${query}`;
  };

  const openStatusModal = (contract: GeneratedContract) => {
    setEditingStatusContract(contract);
    setSelectedStatus(contract.status as ContractStatus);
  };

  const handleSaveStatus = async () => {
    if (!editingStatusContract) return;
    setIsUpdatingStatus(true);
    try {
      await onStatusChange(editingStatusContract.id, selectedStatus);
      setEditingStatusContract(null);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const modalBorder = isDarkMode ? 'border-zinc-800' : 'border-zinc-200';
  const modalBg = isDarkMode ? 'bg-black text-white border-zinc-800 shadow-2xl' : 'bg-white text-zinc-900 border-zinc-200 shadow-xl';

  return (
    <div className="space-y-4">

      {/* Documents Table / List */}
      {filteredContracts.length === 0 ? (
        <div className={`p-12 text-center rounded-3xl border ${
          isDarkMode ? 'bg-zinc-950/50 border-zinc-850 text-zinc-400' : 'bg-white border-zinc-200 text-zinc-500 shadow-xs'
        }`}>
          <p className="text-sm font-semibold mb-4">{t('legal.noContracts', 'Nu există niciun document generat încă.')}</p>
          {canWrite && (
            <button
              onClick={onNewContractClick}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs inline-flex items-center cursor-pointer shadow-md transition-all"
            >
              <span>{t('legal.generateContract', 'Generează Primul Document')}</span>
            </button>
          )}
        </div>
      ) : (
        <div className={`flex-1 min-h-0 rounded-2xl border flex flex-col overflow-hidden ${
          isDarkMode ? 'bg-zinc-950 border-zinc-850' : 'bg-white border-zinc-200 shadow-xs'
        }`}>
          {/* Mobile Card List View */}
          <div className="block md:hidden divide-y divide-zinc-800/40 flex-1 min-h-0 overflow-y-auto no-scrollbar">
            {filteredContracts.map(c => {
              const driveUrl = getDriveLink(c.driveFileId, c.contractNumber, c.title);
              return (
                <div key={c.id} className="p-4 space-y-2 text-xs">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border inline-block ${getStatusBadge(c.status)}`}>
                          {getStatusLabel(c.status)}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-zinc-100">{c.title}</h4>
                      {c.contractNumber && (
                        <p className="text-[11px] text-zinc-400 font-mono mt-0.5">{c.contractNumber}</p>
                      )}
                    </div>
                  </div>

                  {c.notes && (
                    <div className="text-[11px] text-zinc-400 pt-1 line-clamp-2">
                      <span className="font-semibold text-zinc-500 mr-1">{t('legal.internalNotes', 'Note')}:</span>
                      <span className="text-zinc-300">{c.notes}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end space-x-2 pt-2 border-t border-zinc-800/40">
                    <a
                      href={driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 font-semibold text-xs inline-flex items-center space-x-1.5 transition cursor-pointer"
                    >
                      <span>{t('legal.openInGoogleDocs', 'Deschide în Google Docs')}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    {canWrite && (
                      <button
                        onClick={() => openStatusModal(c)}
                        title={t('legal.editStatus', 'Modifică Stare')}
                        className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {canWrite && (
                      <button
                        onClick={() => onDelete(c.id)}
                        title={t('general.delete', 'Șterge')}
                        className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block flex-1 min-h-0 overflow-auto no-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className={`border-b text-[11px] font-bold text-zinc-400 uppercase tracking-wider ${
                isDarkMode ? 'border-zinc-850 bg-zinc-900/40' : 'border-zinc-200 bg-zinc-50'
              }`}>
                <tr>
                  <th className="py-3 px-4 whitespace-nowrap">{t('legal.templateTitle', 'Titlu')}</th>
                  <th className="py-3 px-4 whitespace-nowrap">{t('legal.documentIdentifier', 'Identificator Document')}</th>
                  <th className="py-3 px-4 whitespace-nowrap">{t('legal.status', 'Stare')}</th>
                  <th className="py-3 px-4 whitespace-nowrap">{t('legal.internalNotes', 'Note Interne')}</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">{t('general.actions', 'Acțiuni')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {filteredContracts.map(c => {
                  const driveUrl = getDriveLink(c.driveFileId, c.contractNumber, c.title);
                  return (
                    <tr 
                      key={c.id}
                      className={`transition-colors ${
                        isDarkMode ? 'hover:bg-zinc-900/60' : 'hover:bg-zinc-50'
                      }`}
                    >
                      <td className="py-3 px-4 font-semibold text-zinc-200">
                        {c.title}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-zinc-400">
                        {c.contractNumber || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border inline-block ${getStatusBadge(c.status)}`}>
                          {getStatusLabel(c.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-400 text-xs max-w-xs truncate" title={c.notes || ''}>
                        {c.notes || '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <a
                            href={driveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 font-semibold text-xs flex items-center space-x-1 transition cursor-pointer"
                          >
                            <span>{t('legal.openInGoogleDocs', 'Deschide în Google Docs')}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>

                          {canWrite && (
                            <button
                              onClick={() => openStatusModal(c)}
                              title={t('legal.editStatus', 'Modifică Stare')}
                              className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canWrite && (
                            <button
                              onClick={() => onDelete(c.id)}
                              title={t('general.delete', 'Șterge')}
                              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Status Modal */}
      {editingStatusContract && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setEditingStatusContract(null)}
        >
          <div
            className={`w-full h-full sm:h-auto sm:max-h-[90vh] max-w-md rounded-none sm:rounded-2xl border-0 sm:border shadow-2xl flex flex-col overflow-hidden transition-all transform scale-100 animate-in zoom-in-95 duration-150 ${modalBg}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 sm:px-6 pt-5 pb-3.5 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-base sm:text-lg tracking-tight truncate">
                {t('legal.editStatus', 'Modifică Stare Document')}
              </h3>
              <button
                onClick={() => setEditingStatusContract(null)}
                aria-label={t('common.close', 'Închide')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className={`mx-5 sm:mx-6 border-b ${modalBorder}`} />

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold text-zinc-400 mb-1">{editingStatusContract.title}</p>
                {editingStatusContract.contractNumber && (
                  <p className="text-xs font-mono text-zinc-500">{editingStatusContract.contractNumber}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-400">
                  {t('legal.status', 'Stare')}
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as ContractStatus)}
                  className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${
                    isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-100 border-zinc-300 text-zinc-900'
                  }`}
                >
                  <option value="not_signed">{t('legal.statusNotSigned', 'Nesemnat')}</option>
                  <option value="signed">{t('legal.statusSigned', 'Semnat')}</option>
                  <option value="draft">{t('legal.statusDraft', 'Ciornă')}</option>
                  <option value="pending_signature">{t('legal.statusPending', 'Așteaptă Semnare')}</option>
                  <option value="archived">{t('legal.statusArchived', 'Arhivat')}</option>
                </select>
              </div>
            </div>

            <div className={`mx-5 sm:mx-6 border-t ${modalBorder}`} />

            {/* Footer */}
            <div className="px-5 sm:px-6 py-3.5 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={handleSaveStatus}
                disabled={isUpdatingStatus}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50 flex items-center space-x-2"
              >
                <span>{isUpdatingStatus ? t('auth.processing', 'Se salvează...') : t('general.save', 'Salvează')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

