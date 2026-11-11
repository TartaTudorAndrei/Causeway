import React from 'react';
import { Pencil, Trash2, Send, Copy } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { EmptyState } from '../common';
import type { EmailTemplate } from '../../types/email';

interface AdminEmailViewProps {
  templates: EmailTemplate[];
  isLoading?: boolean;
  searchQuery?: string;
  departmentFilter?: string;
  onEditTemplate: (template: EmailTemplate) => void;
  onCopyTemplate?: (template: EmailTemplate) => void;
  onDeleteTemplate: (template: EmailTemplate) => void;
  onDispatch: (template: EmailTemplate) => void;
  onCreateTemplate: () => void;
  isDarkMode?: boolean;
}

export const AdminEmailView: React.FC<AdminEmailViewProps> = ({
  templates = [],
  isLoading = false,
  searchQuery = '',
  departmentFilter = 'ALL',
  onEditTemplate,
  onCopyTemplate,
  onDeleteTemplate,
  onDispatch,
  onCreateTemplate,
  isDarkMode = true,
}) => {
  const { t } = useLanguage();

  const filteredTemplates = templates.filter((tmpl) => {
    const matchesSearch =
      !searchQuery ||
      tmpl.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tmpl.subject?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept =
      departmentFilter === 'ALL' || tmpl.department === departmentFilter;
    return matchesSearch && matchesDept;
  });

  const tCss = {
    card: isDarkMode ? 'bg-zinc-950 border-zinc-850' : 'bg-white border-zinc-200 shadow-xs',
    tableHeader: isDarkMode ? 'bg-zinc-900/60 text-zinc-400 border-zinc-850' : 'bg-zinc-100/90 text-zinc-600 border-zinc-200',
    tableDividers: isDarkMode ? 'divide-zinc-800/40' : 'divide-zinc-200',
    tableRowHover: isDarkMode ? 'hover:bg-zinc-900/40' : 'hover:bg-zinc-50',
    textPrimary: isDarkMode ? 'text-white' : 'text-zinc-900',
    textSecondary: isDarkMode ? 'text-zinc-400' : 'text-zinc-500',
    textBody: isDarkMode ? 'text-zinc-300' : 'text-zinc-700',
    mobileDividers: isDarkMode ? 'divide-zinc-850' : 'divide-zinc-200',
    deptBadge: isDarkMode
      ? 'bg-zinc-800/60 text-zinc-300 border-zinc-700/50'
      : 'bg-zinc-100 text-zinc-700 border-zinc-300',
  };

  if (isLoading) {
    return (
      <div className={`flex-1 min-h-0 rounded-2xl border flex items-center justify-center p-8 ${tCss.card}`}>
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`flex-1 min-h-0 rounded-2xl border flex flex-col overflow-hidden ${tCss.card}`}>
      {filteredTemplates.length === 0 ? (
        <div className="flex-1 min-h-[300px] flex items-center justify-center p-6">
          <EmptyState
            title={t('email.noTemplates', 'Nu există șabloane create')}
            action={
              <button
                type="button"
                onClick={onCreateTemplate}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition cursor-pointer"
              >
                {t('email.createTemplate', 'Creează Șablon')}
              </button>
            }
            isDarkMode={isDarkMode}
            className="border-0 bg-transparent"
          />
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block flex-1 min-h-0 overflow-auto no-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead className={`sticky top-0 z-10 border-b uppercase tracking-wider text-[11px] font-bold ${tCss.tableHeader}`}>
                <tr>
                  <th className="py-3 px-4">{t('email.templateName', 'Nume Șablon')}</th>
                  <th className="py-3 px-4">{t('email.department', 'Departament')}</th>
                  <th className="py-3 px-4">{t('email.subject', 'Subiect')}</th>
                  <th className="py-3 px-4 text-center">{t('email.blocksCount', 'Blocuri')}</th>
                  <th className="py-3 px-4 text-right">{t('common.actions', 'Acțiuni')}</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${tCss.tableDividers}`}>
                {filteredTemplates.map((tmpl) => (
                  <tr key={tmpl.id} className={`transition-colors ${tCss.tableRowHover}`}>
                    <td className={`py-3.5 px-4 font-semibold ${tCss.textPrimary}`}>
                      {tmpl.name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase border ${tCss.deptBadge}`}>
                        {tmpl.department}
                      </span>
                    </td>
                    <td className={`py-3.5 px-4 max-w-xs truncate ${tCss.textBody}`}>
                      {tmpl.subject}
                    </td>
                    <td className={`py-3.5 px-4 text-center font-mono ${tCss.textSecondary}`}>
                      {tmpl.blocks?.length || 0}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          type="button"
                          onClick={() => onDispatch(tmpl)}
                          title={t('email.dispatch', 'Trimite Email')}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center space-x-1"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{t('email.dispatch', 'Trimite')}</span>
                        </button>

                        {onCopyTemplate && (
                          <button
                            type="button"
                            onClick={() => onCopyTemplate(tmpl)}
                            title={t('common.duplicate', 'Clonează')}
                            className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition cursor-pointer"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onEditTemplate(tmpl)}
                          title={t('common.edit', 'Editează')}
                          className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteTemplate(tmpl)}
                          title={t('common.delete', 'Șterge')}
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className={`block md:hidden divide-y ${tCss.mobileDividers} flex-1 min-h-0 overflow-y-auto no-scrollbar`}>
            {filteredTemplates.map((tmpl) => (
              <div key={tmpl.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className={`text-sm font-bold ${tCss.textPrimary}`}>{tmpl.name}</h4>
                    <p className={`text-xs mt-0.5 ${tCss.textBody}`}>{tmpl.subject}</p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border shrink-0 ${tCss.deptBadge}`}>
                    {tmpl.department}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className={`font-mono text-[11px] ${tCss.textSecondary}`}>
                    {tmpl.blocks?.length || 0} {t('email.blocksCount', 'blocuri')}
                  </span>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => onDispatch(tmpl)}
                      className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center space-x-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>{t('email.dispatch', 'Trimite')}</span>
                    </button>

                    {onCopyTemplate && (
                      <button
                        type="button"
                        onClick={() => onCopyTemplate(tmpl)}
                        className="p-1 rounded-lg text-amber-400 hover:bg-amber-500/10 transition cursor-pointer"
                        title={t('common.duplicate', 'Clonează')}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onEditTemplate(tmpl)}
                      className="p-1 rounded-lg text-blue-400 hover:bg-blue-500/10 transition cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteTemplate(tmpl)}
                      className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
