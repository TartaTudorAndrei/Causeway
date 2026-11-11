import React, { useMemo } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { ContractTemplate } from '../../types/legal';
import { useLanguage } from '../../context/LanguageContext';

interface ContractTemplatesViewProps {
  templates: ContractTemplate[];
  searchQuery?: string;
  selectedCategory?: string;
  onEdit: (template: ContractTemplate) => void;
  onDelete: (id: string) => void;
  onUseTemplate: (template: ContractTemplate) => void;
  onNewTemplate: () => void;
  canWrite: boolean;
  isDarkMode: boolean;
}

export const ContractTemplatesView: React.FC<ContractTemplatesViewProps> = ({
  templates,
  searchQuery = '',
  selectedCategory = 'ALL',
  onEdit,
  onDelete,
  onUseTemplate,
  onNewTemplate,
  canWrite,
  isDarkMode,
}) => {
  const { t } = useLanguage();

  const filteredTemplates = useMemo(() => {
    return templates.filter(tmpl => {
      const matchesSearch = 
        tmpl.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tmpl.description && tmpl.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        tmpl.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'ALL' || tmpl.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [templates, searchQuery, selectedCategory]);

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'sponsorship': return t('legal.categorySponsorship', 'Sponsorizare');
      case 'partnership': return t('legal.categoryPartnership', 'Parteneriat');
      case 'contract': return t('legal.categoryContract', 'Contract');
      case 'volunteer': return t('legal.categoryVolunteer', 'Voluntariat');
      case 'vendor': return t('legal.categoryVendor', 'Prestări Servicii');
      default: return t('legal.categoryGeneral', 'General');
    }
  };

  const getCategoryBadgeClass = (cat: string) => {
    switch (cat) {
      case 'sponsorship':
        return isDarkMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200';
      case 'partnership':
        return isDarkMode ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-purple-50 text-purple-700 border-purple-200';
      case 'contract':
        return isDarkMode ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'volunteer':
        return isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'vendor':
        return isDarkMode ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return isDarkMode ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-100 text-zinc-700 border-zinc-200';
    }
  };

  return (
    <div className="space-y-4">

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className={`p-12 text-center rounded-3xl border ${
          isDarkMode ? 'bg-zinc-950/50 border-zinc-850 text-zinc-400' : 'bg-white border-zinc-200 text-zinc-500 shadow-xs'
        }`}>
          <p className="text-sm font-semibold mb-4">{t('legal.noTemplates', 'Nu există niciun șablon salvat.')}</p>
          {canWrite && (
            <button
              onClick={onNewTemplate}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs inline-flex items-center cursor-pointer shadow-md transition-all"
            >
              <span>{t('legal.newTemplate', 'Creează Primul Șablon')}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(tmpl => {
            const fieldsList = Array.isArray(tmpl.fieldsSchema) 
              ? tmpl.fieldsSchema 
              : (typeof tmpl.fieldsSchema === 'string' ? JSON.parse(tmpl.fieldsSchema || '[]') : []);
            
            return (
              <div 
                key={tmpl.id}
                className={`p-5 rounded-3xl border flex flex-col justify-between transition-all ${
                  isDarkMode ? 'bg-zinc-950/60 border-zinc-850 hover:border-zinc-700' : 'bg-white border-zinc-200 shadow-sm hover:border-zinc-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getCategoryBadgeClass(tmpl.category)}`}>
                        {getCategoryLabel(tmpl.category)}
                      </span>
                    </div>
                  </div>
<h3 className={`text-base font-bold mb-1.5 line-clamp-1 ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
                    {tmpl.title}
                  </h3>

                  {tmpl.description && (
                    <p className={`text-xs mb-4 line-clamp-2 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      {tmpl.description}
                    </p>
                  )}

                  {/* Identifier Pattern & Schema fields tag cloud */}
                  <div className="mb-4 pt-3 border-t border-zinc-800/40 space-y-2">
                    {tmpl.identifierPattern && (
                      <div>
                        <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md">
                          {tmpl.identifierPattern}
                        </span>
                      </div>
                    )}
                    {fieldsList.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">
                          {t('legal.dynamicFields', 'Câmpuri dinamice')}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {fieldsList.slice(0, 4).map((f: any, i: number) => (
                            <span 
                              key={i} 
                              className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400"
                            >
                              {`{{${f.key || f.label || f}}}`}
                            </span>
                          ))}
                          {fieldsList.length > 4 && (
                            <span className="px-1.5 py-0.5 text-[10px] text-zinc-500">
                              +{fieldsList.length - 4}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
<div className="flex items-center justify-between pt-4 border-t border-zinc-800/40 mt-2">
                  <div className="flex items-center space-x-1">
                    {canWrite && (
                      <>
                        <button
                          onClick={() => onEdit(tmpl)}
                          title={t('legal.editTemplate', 'Editează')}
                          className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
<button
                          onClick={() => onDelete(tmpl.id)}
                          title={t('general.delete', 'Șterge')}
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
<button
                    onClick={() => onUseTemplate(tmpl)}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center cursor-pointer shadow-md transition-all shrink-0"
                  >
                    <span>{t('legal.useTemplate', 'Generează')}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
