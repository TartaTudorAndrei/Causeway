import React, { useState, useEffect, useMemo } from 'react';
import type { ContractTemplate, ContractFieldDefinition, ContractStatus } from '../../types/legal';
import { isContractCategory } from '../../types/legal';
import { useLanguage } from '../../context/LanguageContext';
import { DatePicker } from '../common/DatePicker';

interface ContractGeneratorViewProps {
  templates: ContractTemplate[];
  selectedTemplateId?: string | null;
  onGenerate: (contractData: any) => Promise<void>;
  canWrite?: boolean;
  isDarkMode: boolean;
}

export const ContractGeneratorView: React.FC<ContractGeneratorViewProps> = ({
  templates,
  selectedTemplateId: initialTemplateId,
  onGenerate,
  canWrite = true,
  isDarkMode,
}) => {
  const { t } = useLanguage();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(initialTemplateId || (templates[0]?.id || ''));
  const [contractStatus, setContractStatus] = useState<ContractStatus>('not_signed');
  const [notes, setNotes] = useState<string>('');
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Update selected template if initialTemplateId changes
  useEffect(() => {
    if (initialTemplateId) {
      setSelectedTemplateId(initialTemplateId);
    } else if (!selectedTemplateId && templates.length > 0) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [initialTemplateId, templates, selectedTemplateId]);

  const currentTemplate = useMemo(() => {
    return templates.find(t => t.id === selectedTemplateId) || null;
  }, [templates, selectedTemplateId]);

  const isContract = useMemo(() => {
    return isContractCategory(currentTemplate?.category);
  }, [currentTemplate]);

  const templateFields: ContractFieldDefinition[] = useMemo(() => {
    if (!currentTemplate) return [];
    return Array.isArray(currentTemplate.fieldsSchema) 
      ? currentTemplate.fieldsSchema 
      : (typeof currentTemplate.fieldsSchema === 'string' ? JSON.parse(currentTemplate.fieldsSchema || '[]') : []);
  }, [currentTemplate]);

  // Sync initial fields when template changes
  useEffect(() => {
    if (currentTemplate) {
      const defaults: Record<string, any> = {};
      templateFields.forEach(f => {
        if (f.defaultValue) {
          defaults[f.key] = f.defaultValue;
        } else if (f.type === 'date') {
          defaults[f.key] = new Date().toISOString().split('T')[0];
        } else {
          defaults[f.key] = '';
        }
      });
      setFieldValues(defaults);
      setContractStatus('not_signed');
      setMissingFields([]);
      setValidationError(null);
    }
  }, [currentTemplate, templateFields]);

  const handleFieldChange = (key: string, value: any) => {
    setFieldValues(prev => ({
      ...prev,
      [key]: value
    }));

    if (missingFields.includes(key)) {
      const updated = missingFields.filter(k => k !== key);
      setMissingFields(updated);
      if (updated.length === 0) {
        setValidationError(null);
      }
    }
  };

  const handleGenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Custom non-intrusive validation
    const missing: string[] = [];
    templateFields.forEach(f => {
      if (f.required) {
        const val = fieldValues[f.key];
        if (val === undefined || val === null || String(val).trim() === '') {
          missing.push(f.key);
        }
      }
    });

    if (missing.length > 0) {
      setMissingFields(missing);
      setValidationError(t('common.fillRequiredFields', 'Completați câmpurile obligatorii marcate.'));
      return;
    }

    setMissingFields([]);
    setValidationError(null);
    setIsGenerating(true);

    const formatDateToDDMMYYYY = (val: string): string => {
      if (!val) return val;
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        const [y, m, d] = val.split('-');
        return `${d}.${m}.${y}`;
      }
      return val;
    };

    const today = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const todayDDMMYYYY = `${pad(today.getDate())}.${pad(today.getMonth() + 1)}.${today.getFullYear()}`;

    const processedFieldValues: Record<string, any> = {};
    for (const [k, v] of Object.entries(fieldValues)) {
      if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
        processedFieldValues[k] = formatDateToDDMMYYYY(v);
      } else {
        processedFieldValues[k] = v;
      }
    }

    const rawContractDate = fieldValues['DATA_CONTRACT'] || fieldValues['DATA_DOCUMENT'] || fieldValues['DATA'];
    const formattedContractDate = rawContractDate ? formatDateToDDMMYYYY(String(rawContractDate)) : todayDDMMYYYY;

    const rawTitle = currentTemplate?.title || 'Document';
    const cleanedTitle = rawTitle.replace(/^(template|șablon|sablon)\s*[-:_–—]?\s*/i, '').trim() || 'Document';

    try {
      await onGenerate({
        templateId: selectedTemplateId || undefined,
        title: cleanedTitle,
        fieldValues: {
          ...processedFieldValues,
          DATA_CONTRACT: formattedContractDate,
          DATA_DOCUMENT: formattedContractDate,
          DATA_GENERARE: todayDDMMYYYY,
        },
        status: isContract ? contractStatus : 'draft',
        notes: notes.trim() || undefined,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const inputErrorBorder = 'border-rose-500/80 focus:border-rose-500 ring-1 ring-rose-500/40';

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      
      {/* Template Selection Bar */}
      <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 ${
        isDarkMode ? 'bg-zinc-950 border-zinc-850' : 'bg-white border-zinc-200 shadow-xs'
      }`}>
        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <span className="text-xs font-bold shrink-0">{t('legal.step1SelectTemplate', 'Șablon Document')}:</span>
          <select
            value={selectedTemplateId}
            onChange={e => setSelectedTemplateId(e.target.value)}
            className={`flex-1 px-3.5 py-2 text-xs font-bold rounded-xl border focus:outline-hidden focus:ring-1 focus:ring-blue-500 ${
              isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-300 text-zinc-900'
            }`}
          >
            {templates.length === 0 ? (
              <option value="">{t('legal.noTemplates', 'Nu există șabloane')}</option>
            ) : (
              templates.map(tmpl => (
                <option key={tmpl.id} value={tmpl.id}>
                  {tmpl.title}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Main Generation Form */}
      <form noValidate onSubmit={handleGenerateSubmit} className={`p-5 sm:p-6 rounded-2xl border space-y-5 ${
        isDarkMode ? 'bg-zinc-950 border-zinc-850' : 'bg-white border-zinc-200 shadow-xs'
      }`}>
        
        {templateFields.length === 0 ? (
          <div className="py-8 text-center text-zinc-400 text-xs">
            {t('legal.noFieldsDetected', 'Acest șablon nu are câmpuri dinamice definite.')}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-xs font-bold text-amber-500 border-b border-zinc-800/60 pb-2.5">
              <span>{t('legal.fillFields', 'Completează Câmpurile')}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {templateFields.map(field => {
                const val = fieldValues[field.key] ?? '';
                const isFieldMissing = missingFields.includes(field.key);
                
                if (field.type === 'textarea') {
                  return (
                    <div key={field.key} className="sm:col-span-2 space-y-1">
                      <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                        <span>{field.label}</span>
                        <span className="font-mono text-[10px] text-zinc-500">{`{{${field.key}}}`}</span>
                      </label>
                      <textarea
                        rows={3}
                        value={val}
                        onChange={e => handleFieldChange(field.key, e.target.value)}
                        placeholder={field.placeholder || ''}
                        className={`w-full p-3 text-xs rounded-xl border font-medium resize-none leading-relaxed outline-hidden transition ${
                          isFieldMissing ? inputErrorBorder : ''
                        } ${
                          isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-300 text-zinc-900'
                        }`}
                      />
                    </div>
                  );
                }

                if (field.type === 'select' && field.options && field.options.length > 0) {
                  return (
                    <div key={field.key} className="space-y-1">
                      <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                        <span>{field.label}</span>
                        <span className="font-mono text-[10px] text-zinc-500">{`{{${field.key}}}`}</span>
                      </label>
                      <select
                        value={val}
                        onChange={e => handleFieldChange(field.key, e.target.value)}
                        className={`w-full px-3.5 py-2 text-xs rounded-xl border font-medium outline-hidden transition ${
                          isFieldMissing ? inputErrorBorder : ''
                        } ${
                          isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-300 text-zinc-900'
                        }`}
                      >
                        <option value="">-- Selectează --</option>
                        {field.options.map((opt, i) => (
                          <option key={i} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  );
                }

                if (field.type === 'date') {
                  return (
                    <div key={field.key} className="space-y-1">
                      <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                        <span>{field.label}</span>
                        <span className="font-mono text-[10px] text-zinc-500">{`{{${field.key}}}`}</span>
                      </label>
                      <div className={isFieldMissing ? `rounded-xl ${inputErrorBorder}` : ''}>
                        <DatePicker
                          value={val}
                          onChange={date => handleFieldChange(field.key, date)}
                          isDarkMode={isDarkMode}
                          placeholder={field.placeholder || ''}
                        />
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={field.key} className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                      <span>{field.label}</span>
                      <span className="font-mono text-[10px] text-zinc-500">{`{{${field.key}}}`}</span>
                    </label>
                    <input
                      type={field.type === 'number' ? 'number' : 'text'}
                      value={val}
                      onChange={e => handleFieldChange(field.key, e.target.value)}
                      placeholder={field.placeholder || (field.type === 'currency' ? 'ex. 5000 RON' : '')}
                      className={`w-full px-3.5 py-2 text-xs rounded-xl border font-medium outline-hidden transition ${
                        isFieldMissing ? inputErrorBorder : ''
                      } ${
                        isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-300 text-zinc-900'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Contract Specific Status Field */}
        {isContract && (
          <div className="space-y-1 pt-3 border-t border-zinc-800/60">
            <label className="text-xs font-bold text-zinc-300">
              {t('legal.status', 'Stare Contract')}
            </label>
            <div className="flex items-center gap-3">
              <label className="flex items-center space-x-2 text-xs font-semibold cursor-pointer">
                <input
                  type="radio"
                  name="contractStatus"
                  value="not_signed"
                  checked={contractStatus === 'not_signed' || contractStatus === 'draft'}
                  onChange={() => setContractStatus('not_signed')}
                  className="accent-amber-500"
                />
                <span className={isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}>
                  {t('legal.statusNotSigned', 'Nesemnat')}
                </span>
              </label>
              <label className="flex items-center space-x-2 text-xs font-semibold cursor-pointer">
                <input
                  type="radio"
                  name="contractStatus"
                  value="signed"
                  checked={contractStatus === 'signed'}
                  onChange={() => setContractStatus('signed')}
                  className="accent-emerald-500"
                />
                <span className={isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}>
                  {t('legal.statusSigned', 'Semnat')}
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Observații Interne */}
        <div className="space-y-1 pt-3 border-t border-zinc-800/60">
          <label className="text-xs font-bold text-zinc-400">
            {t('legal.notes', 'Observații Interne (opțional)')}
          </label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="ex. Generat pentru campania de primăvară"
            className={`w-full px-3.5 py-2 text-xs rounded-xl border font-medium outline-hidden ${
              isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-300 text-zinc-900'
            }`}
          />
        </div>

        {/* Action Footer */}
        <div className="pt-3 border-t border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-rose-400 font-medium truncate w-full sm:w-auto">
            {validationError && (
              <span>{validationError}</span>
            )}
          </div>
          <button
            type="submit"
            disabled={isGenerating || !canWrite}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2 shrink-0 ml-auto"
          >
            {isGenerating && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            <span>{isGenerating ? t('auth.processing', 'Se generează...') : t('legal.generateContract', 'Generează Document')}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

