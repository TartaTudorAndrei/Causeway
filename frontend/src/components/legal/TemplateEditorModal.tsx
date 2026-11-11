import React, { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import type { ContractTemplate, ContractFieldDefinition } from '../../types/legal';
import { legalService } from '../../services/legalService';
import { useLanguage } from '../../context/LanguageContext';

interface TemplateEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  template?: ContractTemplate | null;
  onSave: (templateData: Partial<ContractTemplate>) => Promise<void>;
  isDarkMode: boolean;
}

export const TemplateEditorModal: React.FC<TemplateEditorModalProps> = ({
  isOpen,
  onClose,
  template,
  onSave,
  isDarkMode,
}) => {
  const { t } = useLanguage();

  const [title, setTitle] = useState<string>(template?.title || '');
  const [description, setDescription] = useState<string>(template?.description || '');
  const [category, setCategory] = useState<string>(template?.category || 'general');
  const [googleDocsUrl, setGoogleDocsUrl] = useState<string>(template?.googleDocsUrl || '');
  const [rawContent, setRawContent] = useState<string>(template?.rawContent || '');
  const [identifierPattern, setIdentifierPattern] = useState<string>(template?.identifierPattern || '{{TEMPLATE}}_{{DATA}}_{{#}}');
  
  const initialFields = Array.isArray(template?.fieldsSchema) 
    ? template.fieldsSchema 
    : (typeof template?.fieldsSchema === 'string' ? JSON.parse(template.fieldsSchema || '[]') : []);
  const [fields, setFields] = useState<ContractFieldDefinition[]>(initialFields);

  const [isFetchingDoc, setIsFetchingDoc] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Hydrate state when opened or template changes
  React.useEffect(() => {
    if (!isOpen) return;
    setTitle(template?.title || '');
    setDescription(template?.description || '');
    setCategory(template?.category || 'general');
    setGoogleDocsUrl(template?.googleDocsUrl || '');
    setRawContent(template?.rawContent || '');
    setIdentifierPattern(template?.identifierPattern || '{{TEMPLATE}}_{{DATA}}_{{#}}');
    const schema = Array.isArray(template?.fieldsSchema)
      ? template.fieldsSchema
      : (typeof template?.fieldsSchema === 'string' ? JSON.parse(template.fieldsSchema || '[]') : []);
    setFields(schema);
    setFetchError(null);
    setFieldErrors({});
  }, [template, isOpen]);

  // Keyboard Escape listener
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFetchGoogleDoc = async () => {
    if (!googleDocsUrl.trim()) return;
    setIsFetchingDoc(true);
    setFetchError(null);
    try {
      const res = await legalService.importGoogleDoc({ url: googleDocsUrl.trim() });
      if (res.content) {
        setRawContent(res.content);
        if (!title && res.title) {
          const cleaned = res.title.replace(/^(template|șablon|sablon)\s*[-:_–—]?\s*/i, '').trim();
          setTitle(cleaned || res.title);
        }
        
        // Auto-merge detected fields
        if (res.detectedFields && res.detectedFields.length > 0) {
          const existingKeys = new Set(fields.map(f => f.key));
          const newFields: ContractFieldDefinition[] = [...fields];
          
          res.detectedFields.forEach(k => {
            if (!existingKeys.has(k)) {
              newFields.push({
                key: k,
                label: formatLabelFromKey(k),
                type: 'text', // default to plain text
                required: true,
              });
              existingKeys.add(k);
            }
          });
          setFields(newFields);
        }
      }
    } catch (err: any) {
      setFetchError(err.message || t('legal.loadError', 'Eroare la preluarea documentului Google Docs.'));
    } finally {
      setIsFetchingDoc(false);
    }
  };

  const formatLabelFromKey = (key: string): string => {
    return key
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleUpdateField = (index: number, patch: Partial<ContractFieldDefinition>) => {
    setFields(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...patch };
      return updated;
    });
  };

  const handleRemoveField = (index: number) => {
    setFields(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!title.trim()) {
      errors.title = t('common.fieldRequired', 'Câmp obligatoriu');
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      await onSave({
        id: template?.id,
        title: title.trim(),
        description: description.trim(),
        category,
        googleDocsUrl: googleDocsUrl.trim(),
        rawContent: rawContent.trim() || title.trim(),
        fieldsSchema: fields.map(f => ({ ...f, required: true, type: f.type || 'text' })),
        identifierPattern: identifierPattern.trim() || '{{TEMPLATE}}_{{DATA}}_{{#}}',
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const modalBorder = isDarkMode ? 'border-zinc-800' : 'border-zinc-200';
  const modalBg = isDarkMode ? 'bg-black text-white border-zinc-800 shadow-2xl' : 'bg-white text-zinc-900 border-zinc-200 shadow-xl';
  const inputBg = isDarkMode
    ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700 focus:border-zinc-700'
    : 'bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400 focus:border-zinc-400';
  const inputErrorBorder = 'border-rose-500/80 focus:border-rose-500 ring-1 ring-rose-500/40';
  const textSub = isDarkMode ? 'text-zinc-400' : 'text-zinc-500';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className={`w-full h-full sm:h-auto sm:max-h-[90vh] max-w-2xl rounded-none sm:rounded-2xl border-0 sm:border shadow-2xl flex flex-col overflow-hidden transition-all transform scale-100 animate-in zoom-in-95 duration-150 ${modalBg}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 pt-5 pb-3.5 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-base sm:text-lg tracking-tight">
            {template ? t('legal.editTemplate', 'Editează Șablon') : t('legal.createTemplate', 'Șablon Nou')}
          </h3>
          <button
            onClick={onClose}
            aria-label={t('common.close', 'Închide')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className={`mx-5 sm:mx-6 border-b ${modalBorder}`} />

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-4 text-sm">
          <form id="template-editor-form" noValidate onSubmit={handleSubmit} className="space-y-4 text-sm">
            
            {/* Title Field */}
            <div>
              <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                {t('legal.templateTitle', 'Titlu Șablon')}
              </label>
              <input
                type="text"
                value={title}
                onChange={e => {
                  setTitle(e.target.value);
                  if (fieldErrors.title) {
                    setFieldErrors(prev => {
                      const next = { ...prev };
                      delete next.title;
                      return next;
                    });
                  }
                }}
                placeholder={t('legal.templateTitlePlaceholder', 'ex. Contract de Sponsorizare 2026')}
                className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputBg} ${
                  fieldErrors.title ? inputErrorBorder : ''
                }`}
              />
            </div>

            {/* Description Field */}
            <div>
              <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                {t('legal.templateDescription', 'Descriere')}
              </label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={t('legal.templateDescriptionPlaceholder', 'ex. Șablon oficial cu clauze standard')}
                className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputBg}`}
              />
            </div>

            {/* Category Field */}
            <div>
              <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                {t('legal.category', 'Categorie')}
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className={`w-full h-[38px] px-3 py-2 text-xs font-medium rounded-xl border outline-hidden transition ${inputBg}`}
              >
                <option value="sponsorship">{t('legal.categorySponsorship', 'Sponsorizare')}</option>
                <option value="volunteer">{t('legal.categoryVolunteer', 'Voluntariat')}</option>
                <option value="partnership">{t('legal.categoryPartnership', 'Parteneriat')}</option>
                <option value="vendor">{t('legal.categoryVendor', 'Furnizor / Prestări Servicii')}</option>
                <option value="general">{t('legal.categoryGeneral', 'General / Altele')}</option>
              </select>
            </div>

            {/* Google Docs URL Importer */}
            <div>
              <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                {t('legal.googleDocUrl', 'Link Google Docs')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={googleDocsUrl}
                  onChange={e => {
                    setGoogleDocsUrl(e.target.value);
                    if (fetchError) setFetchError(null);
                  }}
                  placeholder={t('legal.googleDocUrlPlaceholder', 'https://docs.google.com/document/d/...')}
                  className={`flex-1 h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputBg}`}
                />
                <button
                  type="button"
                  onClick={handleFetchGoogleDoc}
                  disabled={isFetchingDoc || !googleDocsUrl.trim()}
                  className="px-3.5 h-[38px] rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-md cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isFetchingDoc ? t('legal.fetching', 'Se preia...') : t('legal.fetchDoc', 'Preia Document')}
                </button>
              </div>
            </div>

            {/* Document Identifier Configuration */}
            <div>
              <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                {t('legal.identifierPatternLabel', 'Tipar Identificator Document')}
              </label>
              <input
                type="text"
                value={identifierPattern}
                onChange={e => setIdentifierPattern(e.target.value)}
                placeholder="ex. {{DATA}}_{{NUME_SPONSOR}}_{{#}} sau DATE_SPONSOR_NAME_#"
                className={`w-full h-[38px] px-3 py-2 text-xs font-mono rounded-xl border outline-hidden transition ${inputBg}`}
              />
              <div className="flex flex-wrap gap-1.5 pt-1.5">
                {['{{TEMPLATE}}', '{{DATA}}', '{{#}}', ...fields.map(f => `{{${f.key}}}`)].map((tag, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      const trimmed = identifierPattern.trim();
                      if (!trimmed) {
                        setIdentifierPattern(tag);
                      } else {
                        setIdentifierPattern(`${trimmed}_${tag}`);
                      }
                    }}
                    className="px-2 py-0.5 rounded-lg text-[11px] font-mono bg-zinc-800/70 hover:bg-zinc-700 text-blue-400 border border-zinc-700/60 transition cursor-pointer"
                  >
                    +{tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Schema Variable Definitions Header */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    {t('legal.fieldsSchemaTitle', 'Variabile & Marcaje Detectate')}
                  </h4>
                </div>
              </div>

              {fields.length === 0 ? (
                <div className={`p-6 rounded-xl border text-center ${isDarkMode ? 'border-zinc-800 bg-zinc-900/20' : 'border-zinc-200 bg-zinc-50'}`}>
                  <p className={`text-xs ${textSub}`}>
                    {t('legal.noFieldsDetected', 'Nicio variabilă detectată încă. Introduceți un document Google Docs care conține marcaje precum {{nume_partener}}')}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {fields.map((field, idx) => (
                    <div
                      key={field.key}
                      className={`p-3 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center gap-3 transition-colors ${
                        isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                      }`}
                    >
                      <div className="sm:w-1/3 min-w-0">
                        <span className="font-mono text-xs font-bold text-blue-400 truncate block">
                          {'{{'}{field.key}{'}}'}
                        </span>
                      </div>

                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={field.label}
                          onChange={e => handleUpdateField(idx, { label: e.target.value })}
                          placeholder={t('legal.fieldLabelPlaceholder', 'Etichetă formular')}
                          className={`w-full h-[38px] px-3 py-1.5 text-xs rounded-xl border outline-hidden transition ${inputBg}`}
                        />

                        <select
                          value={field.type || 'text'}
                          onChange={e => handleUpdateField(idx, { type: e.target.value as any })}
                          className={`w-full h-[38px] px-3 py-1.5 text-xs font-medium rounded-xl border outline-hidden transition ${inputBg}`}
                        >
                          <option value="text">{t('legal.typeText', 'Text scurt')}</option>
                          <option value="number">{t('legal.typeNumber', 'Număr / Sumă')}</option>
                          <option value="date">{t('legal.typeDate', 'Dată calendaristică')}</option>
                          <option value="textarea">{t('legal.typeTextarea', 'Text lung (multiline)')}</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveField(idx)}
                        title={t('general.delete', 'Șterge')}
                        className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer shrink-0 self-end sm:self-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </form>
        </div>

        <div className={`mx-5 sm:mx-6 border-t ${modalBorder}`} />

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="text-xs font-medium truncate pr-3">
            {fetchError ? (
              <span className="text-rose-400">{fetchError}</span>
            ) : Object.keys(fieldErrors).length > 0 ? (
              <span className="text-rose-400">
                {t('common.fillRequiredFields', 'Completați câmpurile obligatorii marcate.')}
              </span>
            ) : fields.length > 0 ? (
              <span className="text-zinc-500">
                {fields.length} {t('legal.fieldsCount', 'variabile configurate')}
              </span>
            ) : null}
          </div>
          <button
            type="submit"
            form="template-editor-form"
            disabled={isSaving}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50 flex items-center space-x-2 shrink-0"
          >
            <span>{isSaving ? t('auth.processing', 'Se salvează...') : t('general.save', 'Salvează Șablon')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
