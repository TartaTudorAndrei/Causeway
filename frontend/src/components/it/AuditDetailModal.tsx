import React from 'react';
import type { SystemAuditLog } from '../../types/audit';
import { useLanguage } from '../../context/LanguageContext';
import { User } from 'lucide-react';
import { Modal } from '../common';
interface AuditDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    log: SystemAuditLog | null;
    isDarkMode: boolean;
}
export const AuditDetailModal: React.FC<AuditDetailModalProps> = ({ isOpen, onClose, log, isDarkMode, }) => {
    const { t } = useLanguage();
    const [copied, setCopied] = React.useState(false);
    if (!log)
        return null;
    const handleCopy = () => {
        navigator.clipboard.writeText(JSON.stringify(log, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    const css = {
        card: isDarkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-100/70 border-zinc-200',
        label: isDarkMode ? 'text-zinc-400' : 'text-zinc-500',
        value: isDarkMode ? 'text-zinc-200' : 'text-zinc-800',
        codeBlock: isDarkMode ? 'bg-zinc-900 border-zinc-800 text-emerald-400' : 'bg-zinc-950 text-emerald-300 border-zinc-800',
    };
    const getActionBadgeClass = (action: string) => {
        switch (action) {
            case 'CREATE':
                return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'UPDATE':
                return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'DELETE':
                return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
            case 'ADJUSTMENT':
                return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            case 'TRANSFER':
                return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
            case 'SUBMIT':
                return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            case 'APPROVE':
                return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'REJECT':
            case 'SUSPEND':
                return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
            default:
                return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
        }
    };
    return (<Modal isOpen={isOpen} onClose={onClose} title={t('audit.modalTitle', 'Detalii Înregistrare Audit & Activitate')} subtitle={<>
          ID: <span className="font-mono">{log.id}</span>
        </>} maxWidth="2xl" isDarkMode={isDarkMode} footer={<button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-xs cursor-pointer transition-all">
          {t('common.close', 'Închide')}
        </button>}>
      <div className="space-y-4">
          
          {/* Summary Box */}
          <div className={`p-4 rounded-xl border ${css.card}`}>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-1">
              {t('audit.summary', 'Sumar Acțiune')}
            </p>
            <p className="text-sm font-semibold leading-relaxed">
              {log.summary}
            </p>
            {log.details && (<p className={`text-xs mt-2 ${css.label}`}>
                {log.details}
              </p>)}
          </div>

          {/* Key Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            
            {/* Timestamp */}
            <div className={`p-3 rounded-xl border flex items-center space-x-3 ${css.card}`}><div>
                <p className={`text-[11px] ${css.label}`}>{t('audit.timestamp', 'Data & Ora')}</p>
                <p className="font-mono font-bold">{new Date(log.timestamp).toLocaleString('ro-RO')}</p>
              </div>
            </div>

            {/* Actor */}
            <div className={`p-3 rounded-xl border flex items-center space-x-3 ${css.card}`}>
              <User className="w-4 h-4 text-zinc-400 shrink-0"/>
              <div>
                <p className={`text-[11px] ${css.label}`}>{t('audit.actor', 'Autor / Efectuat De')}</p>
                <p className="font-bold">{log.actorName}</p>
                <p className={`text-[11px] font-mono ${css.label}`}>{log.actorEmail}</p>
              </div>
            </div>

            {/* Department & Action */}
            <div className={`p-3 rounded-xl border flex items-center space-x-3 ${css.card}`}><div>
                <p className={`text-[11px] ${css.label}`}>{t('audit.department', 'Departament & Tip')}</p>
                <div className="flex items-center space-x-1.5 mt-1">
                  <span className="font-bold text-[11px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-200 border border-zinc-700">
                    {log.department}
                  </span>
                  <span className={`font-bold text-[11px] px-2 py-0.5 rounded-md border ${getActionBadgeClass(log.actionType)}`}>
                    {log.actionType}
                  </span>
                </div>
              </div>
            </div>

            {/* Resource */}
            <div className={`p-3 rounded-xl border flex items-center space-x-3 ${css.card}`}><div>
                <p className={`text-[11px] ${css.label}`}>{t('audit.resource', 'Resursă / Țintă')}</p>
                <p className="font-bold">{log.resourceType}</p>
                {log.resourceName && (<p className={`text-[11px] ${css.label}`}>{log.resourceName}</p>)}
              </div>
            </div>
</div>

          {/* Client Network Metadata if available */}
          {(log.ipAddress || log.userAgent) && (<div className={`p-3 rounded-xl border flex items-center space-x-3 text-xs ${css.card}`}><div className="min-w-0 flex-1">
                <p className={`text-[11px] ${css.label}`}>{t('audit.clientInfo', 'Client & Conexiune')}</p>
                <p className="font-mono text-[11px] truncate">
                  IP: {log.ipAddress || 'N/A'} {log.userAgent ? `• UA: ${log.userAgent}` : ''}
                </p>
              </div>
            </div>)}

          {/* State Changes / Payload */}
          {log.stateChanges && log.stateChanges !== '{}' && (<div>
              <div className="flex items-center justify-between mb-1.5">
                <p className={`text-xs font-bold uppercase tracking-wider ${css.label}`}>
                  {t('audit.stateChanges', 'Modificări Stare / Date Tehnice')}
                </p>
                <button onClick={handleCopy} className="flex items-center space-x-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 cursor-pointer">
                  <span>{copied ? t('general.copied', 'Copiat!') : t('general.copyJson', 'Copiază JSON')}</span>
                </button>
              </div>
              <pre className={`p-3.5 rounded-xl border text-xs font-mono overflow-x-auto max-h-48 leading-relaxed ${css.codeBlock}`}>
                {typeof log.stateChanges === 'string'
                ? (() => {
                    try {
                        return JSON.stringify(JSON.parse(log.stateChanges), null, 2);
                    }
                    catch {
                        return log.stateChanges;
                    }
                })()
                : JSON.stringify(log.stateChanges, null, 2)}
              </pre>
            </div>)}

      </div>
    </Modal>);
};
