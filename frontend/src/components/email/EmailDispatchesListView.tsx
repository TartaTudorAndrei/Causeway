import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { SearchInput, EmptyState } from '../common';
import type { EmailLog } from '../../types/email';

interface EmailDispatchesListViewProps {
  logs?: EmailLog[];
  isDarkMode?: boolean;
}

export const EmailDispatchesListView: React.FC<EmailDispatchesListViewProps> = ({
  logs = [],
  isDarkMode = true,
}) => {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');

  const filteredLogs = logs.filter((l) => {
    const matchesSearch =
      !searchQuery ||
      l.recipientEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.recipientName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMethod = methodFilter === 'ALL' || l.dispatchMethod === methodFilter;
    return matchesSearch && matchesMethod;
  });

  const getMethodBadge = (_method: string) => {
    return isDarkMode
      ? 'bg-zinc-800/60 text-zinc-300 border border-zinc-700/50'
      : 'bg-zinc-100 text-zinc-700 border border-zinc-300';
  };

  const tCss = {
    card: isDarkMode ? 'bg-zinc-950 border-zinc-850' : 'bg-white border-zinc-200 shadow-xs',
    input: isDarkMode
      ? 'bg-zinc-900 border-zinc-800 text-zinc-200 hover:border-zinc-700'
      : 'bg-zinc-100 border-zinc-300 text-zinc-800 hover:border-zinc-400',
    tableHeader: isDarkMode ? 'bg-zinc-900/60 text-zinc-400 border-zinc-850' : 'bg-zinc-100/90 text-zinc-600 border-zinc-200',
    tableDividers: isDarkMode ? 'divide-zinc-800/40' : 'divide-zinc-200',
    tableRowHover: isDarkMode ? 'hover:bg-zinc-900/40' : 'hover:bg-zinc-50',
    textPrimary: isDarkMode ? 'text-white' : 'text-zinc-900',
    textSecondary: isDarkMode ? 'text-zinc-400' : 'text-zinc-500',
    textBody: isDarkMode ? 'text-zinc-300' : 'text-zinc-700',
    mobileDividers: isDarkMode ? 'divide-zinc-850' : 'divide-zinc-200',
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-3">
      {/* Search & Filter Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t('email.searchDispatches', 'Caută destinatar, subiect...')}
            isDarkMode={isDarkMode}
          />

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className={`h-[38px] px-3 py-1.5 text-xs rounded-xl border outline-hidden cursor-pointer ${tCss.input}`}
          >
            <option value="ALL">{t('email.allMethods', 'Toate metodele')}</option>
            <option value="API">{t('email.method.api', 'Direct (API)')}</option>
            <option value="EML_DOWNLOAD">{t('email.method.emlDownload', 'Descărcat .eml')}</option>
            <option value="CLIPBOARD_COPY">{t('email.method.clipboardCopy', 'Copiat HTML')}</option>
            <option value="HTML_DOWNLOAD">{t('email.method.htmlDownload', 'Descărcat .html')}</option>
          </select>
        </div>
      </div>

      {/* Main Table / List Container */}
      <div className={`flex-1 min-h-0 rounded-2xl border flex flex-col overflow-hidden ${tCss.card}`}>
        {filteredLogs.length === 0 ? (
          <div className="flex-1 min-h-[300px] flex items-center justify-center p-6">
            <EmptyState
              title={t('email.noLogs', 'Nu există email-uri trimise')}
              isDarkMode={isDarkMode}
            />
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block flex-1 min-h-0 overflow-auto no-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead className={`sticky top-0 z-10 border-b uppercase tracking-wider text-[11px] font-bold ${tCss.tableHeader}`}>
                  <tr>
                    <th className="py-3 px-4">{t('email.recipient', 'Destinatar')}</th>
                    <th className="py-3 px-4">{t('email.subject', 'Subiect')}</th>
                    <th className="py-3 px-4">{t('email.dispatchMethod', 'Metodă')}</th>
                    <th className="py-3 px-4">{t('email.status', 'Status')}</th>
                    <th className="py-3 px-4 text-right">{t('email.sentDate', 'Dată Trimitere')}</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${tCss.tableDividers}`}>
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className={`transition-colors ${tCss.tableRowHover}`}>
                      <td className={`py-3.5 px-4 font-semibold ${tCss.textPrimary}`}>
                        <div>{log.recipientEmail || '-'}</div>
                        {log.recipientName && (
                          <div className={`text-[11px] font-normal ${tCss.textSecondary}`}>
                            {log.recipientName}
                          </div>
                        )}
                      </td>
                      <td className={`py-3.5 px-4 max-w-sm truncate ${tCss.textBody}`}>
                        {log.subject}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${getMethodBadge(log.dispatchMethod)}`}>
                          {log.dispatchMethod}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            log.status === 'SENT'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className={`py-3.5 px-4 text-right ${tCss.textSecondary}`}>
                        {log.sentAt ? new Date(log.sentAt).toLocaleString(language === 'en' ? 'en-US' : 'ro-RO') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className={`block md:hidden divide-y flex-1 min-h-0 overflow-y-auto no-scrollbar ${tCss.mobileDividers}`}>
              {filteredLogs.map((log) => (
                <div key={log.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className={`text-sm font-bold ${tCss.textPrimary}`}>
                        {log.recipientEmail || '-'}
                      </div>
                      {log.recipientName && (
                        <div className={`text-xs ${tCss.textSecondary}`}>{log.recipientName}</div>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        log.status === 'SENT'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>

                  <div className={`text-xs ${tCss.textBody}`}>{log.subject}</div>

                  <div className={`flex items-center justify-between text-[11px] pt-1 ${tCss.textSecondary}`}>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${getMethodBadge(log.dispatchMethod)}`}>
                      {log.dispatchMethod}
                    </span>
                    <span>
                      {log.sentAt ? new Date(log.sentAt).toLocaleString(language === 'en' ? 'en-US' : 'ro-RO') : '-'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
