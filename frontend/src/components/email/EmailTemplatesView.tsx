import React, { useState } from 'react';
import { Pencil, Trash2, Send, Plus, Copy } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { SearchInput, EmptyState } from '../common';
import type { EmailTemplate } from '../../types/email';

interface EmailTemplatesViewProps {
  templates?: EmailTemplate[];
  onSelectTemplate?: (template: EmailTemplate) => void;
  onEditTemplate?: (template: EmailTemplate) => void;
  onCopyTemplate?: (template: EmailTemplate) => void;
  onDeleteTemplate?: (template: EmailTemplate) => void;
  onCreateNew?: () => void;
  onDispatch?: (template: EmailTemplate) => void;
  isDarkMode?: boolean;
}

export const EmailTemplatesView: React.FC<EmailTemplatesViewProps> = ({
  templates = [],
  onEditTemplate,
  onCopyTemplate,
  onDeleteTemplate,
  onCreateNew,
  onDispatch,
  isDarkMode = true,
}) => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');

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
    deptBadge: isDarkMode
      ? 'bg-zinc-800/60 text-zinc-300 border-zinc-700/50'
      : 'bg-zinc-100 text-zinc-700 border-zinc-300',
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-3">
      {/* Control Filter Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t('email.searchTemplates', 'Caută șablon, subiect...')}
            isDarkMode={isDarkMode}
          />

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className={`h-[38px] px-3 py-1.5 text-xs rounded-xl border outline-hidden cursor-pointer ${tCss.input}`}
          >
            <option value="ALL">{t('email.allDepartments', 'Toate departamentele')}</option>
            <option value="fundraising">{t('department.fundraising', 'Fundraising')}</option>
            <option value="pr">{t('department.pr', 'PR & Marketing')}</option>
            <option value="legal">{t('department.legal', 'Legal')}</option>
            <option value="general">{t('department.general', 'General')}</option>
          </select>
        </div>

        {onCreateNew && (
          <button
            type="button"
            onClick={onCreateNew}
            className="px-3.5 py-1.5 text-xs rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md transition cursor-pointer flex items-center space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('email.addTemplate', 'Adaugă Șablon')}</span>
          </button>
        )}
      </div>

      {/* Main Table / List Container */}
      <div className={`flex-1 min-h-0 rounded-2xl border flex flex-col overflow-hidden ${tCss.card}`}>
        {filteredTemplates.length === 0 ? (
          <div className="flex-1 min-h-[300px] flex items-center justify-center p-6">
            <EmptyState
              title={t('email.noTemplates', 'Nu există șabloane create')}
              action={
                onCreateNew ? (
                  <button
                    type="button"
                    onClick={onCreateNew}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition cursor-pointer"
                  >
                    {t('email.addTemplate', 'Adaugă Șablon')}
                  </button>
                ) : undefined
              }
              isDarkMode={isDarkMode}
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
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase ${tCss.deptBadge}`}>
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
                          {onDispatch && (
                            <button
                              type="button"
                              onClick={() => onDispatch(tmpl)}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center space-x-1"
                            >
                              <Send className="w-3 h-3" />
                              <span>{t('email.dispatch', 'Trimite')}</span>
                            </button>
                          )}

                          {onCopyTemplate && (
                            <button
                              type="button"
                              onClick={() => onCopyTemplate(tmpl)}
                              className={`p-1.5 rounded-lg transition cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'}`}
                              title={t('email.copyTemplate', 'Fă o Copie')}
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          )}

                          {onEditTemplate && (
                            <button
                              type="button"
                              onClick={() => onEditTemplate(tmpl)}
                              className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition cursor-pointer"
                              title={t('email.editTemplate', 'Editează Șablon')}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}

                          {onDeleteTemplate && (
                            <button
                              type="button"
                              onClick={() => onDeleteTemplate(tmpl)}
                              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
                              title={t('email.deleteTemplate', 'Șterge Șablon')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className={`block md:hidden divide-y flex-1 min-h-0 overflow-y-auto no-scrollbar ${tCss.mobileDividers}`}>
              {filteredTemplates.map((tmpl) => (
                <div key={tmpl.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className={`text-sm font-bold ${tCss.textPrimary}`}>{tmpl.name}</div>
                      <div className={`text-xs line-clamp-1 ${tCss.textSecondary}`}>{tmpl.subject}</div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase ${tCss.deptBadge}`}>
                      {tmpl.department}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className={`text-[11px] font-mono ${tCss.textSecondary}`}>
                      {tmpl.blocks?.length || 0} {t('email.blocksCount', 'blocuri')}
                    </span>

                    <div className="flex items-center space-x-1.5">
                      {onDispatch && (
                        <button
                          type="button"
                          onClick={() => onDispatch(tmpl)}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                        >
                          {t('email.dispatch', 'Trimite')}
                        </button>
                      )}
                      {onCopyTemplate && (
                        <button
                          type="button"
                          onClick={() => onCopyTemplate(tmpl)}
                          title={t('email.copyTemplate', 'Fă o Copie')}
                          className={`p-1.5 rounded-lg transition cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'}`}
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      )}
                      {onEditTemplate && (
                        <button
                          type="button"
                          onClick={() => onEditTemplate(tmpl)}
                          title={t('email.editTemplate', 'Editează Șablon')}
                          className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      {onDeleteTemplate && (
                        <button
                          type="button"
                          onClick={() => onDeleteTemplate(tmpl)}
                          title={t('email.deleteTemplate', 'Șterge Șablon')}
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
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
