import React, { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import type { EmailTemplate, EmailBlock, EmailGlobalSettings } from '../../types/email';
import { useLanguage } from '../../context/LanguageContext';
import { useTenant } from '../../context/TenantContext';
import { VisualEmailBuilder } from './VisualEmailBuilder';
import { ManageableSelect, type ManageableOption } from '../common';
import { generalService } from '../../services/generalService';
import type { DepartmentItem } from '../../types/general';

interface TemplateEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (templateData: {
    name: string;
    department: string;
    subject: string;
    blocks: EmailBlock[];
    settings?: EmailGlobalSettings;
  }) => Promise<void>;
  initialData?: EmailTemplate | null;
  defaultDepartment?: string;
  isDarkMode?: boolean;
}

const DEFAULT_DEPARTMENTS: DepartmentItem[] = [
  { id: 'general', name: 'General', key: 'department.general', fallback: 'General' },
  { id: 'fundraising', name: 'Fundraising', key: 'department.fundraising', fallback: 'Fundraising' },
  { id: 'pr', name: 'PR & Marketing', key: 'department.pr', fallback: 'PR & Marketing' },
  { id: 'legal', name: 'Legal', key: 'department.legal', fallback: 'Legal' },
  { id: 'finance', name: 'Finance', key: 'department.finance', fallback: 'Finanțe' },
  { id: 'it', name: 'IT & Digital', key: 'department.it', fallback: 'IT & Digital' },
  { id: 'logistics', name: 'Logistics', key: 'department.logistics', fallback: 'Logistică' },
  { id: 'hr', name: 'HR', key: 'department.hr', fallback: 'HR & Voluntari' },
];

export const TemplateEditorModal: React.FC<TemplateEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultDepartment = 'fundraising',
  isDarkMode = true,
}) => {
  const { t } = useLanguage();
  const { tenant } = useTenant();

  const [name, setName] = useState('');
  const [department, setDepartment] = useState<string>(defaultDepartment);
  const [subject, setSubject] = useState('');
  const [blocks, setBlocks] = useState<EmailBlock[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>(DEFAULT_DEPARTMENTS);
  const [settings, setSettings] = useState<EmailGlobalSettings>({
    emailBgColor: '#ffffff',
    backdropColor: '#f4f4f5',
    canvasWidth: 600,
    sheetBorderRadius: 16,
    sheetBorderWidth: 1,
    sheetBorderColor: '#e4e4e7',
    fontFamily: 'sans',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    generalService
      .getDepartments()
      .then((data) => {
        if (data && data.length > 0) {
          const existingIds = new Set(data.map((d) => d.id.toLowerCase()));
          const merged = [...data];
          DEFAULT_DEPARTMENTS.forEach((def) => {
            if (!existingIds.has(def.id.toLowerCase())) {
              merged.push(def);
            }
          });
          setDepartments(merged);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        setDepartment(initialData.department || defaultDepartment);
        setSubject(initialData.subject || '');
        setBlocks(Array.isArray(initialData.blocks) ? JSON.parse(JSON.stringify(initialData.blocks)) : []);
        setSettings(initialData.settings || {
          emailBgColor: '#ffffff',
          backdropColor: '#f4f4f5',
          canvasWidth: 600,
          sheetBorderRadius: 16,
          sheetBorderWidth: 1,
          sheetBorderColor: '#e4e4e7',
          fontFamily: 'sans',
        });
      } else {
        setName('');
        setDepartment(defaultDepartment);
        setSubject('');
        setSettings({
          emailBgColor: '#ffffff',
          backdropColor: '#f4f4f5',
          canvasWidth: 600,
          sheetBorderRadius: 16,
          sheetBorderWidth: 1,
          sheetBorderColor: '#e4e4e7',
          fontFamily: 'sans',
        });
        setBlocks([]);
      }
      setErrorMessage('');
      setIsSubmitting(false);
    }
  }, [isOpen, initialData, defaultDepartment]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleCreateDepartment = async (nameToAdd: string) => {
    const trimmed = nameToAdd.trim();
    if (!trimmed) return;
    try {
      const created = await generalService.createDepartment({ name: trimmed });
      setDepartments((prev) => [...prev, created]);
      return created.id || created.name;
    } catch {
      const fallbackId = trimmed.toLowerCase().replace(/\s+/g, '_');
      const newDept: DepartmentItem = { id: fallbackId, name: trimmed };
      setDepartments((prev) => [...prev, newDept]);
      return fallbackId;
    }
  };

  const handleRenameDepartment = async (oldValue: string, newValue: string) => {
    const trimmed = newValue.trim();
    if (!trimmed) return;
    const target = departments.find((d) => d.id === oldValue || d.name === oldValue);
    if (target) {
      try {
        await generalService.updateDepartment(target.id, { name: trimmed });
      } catch {
        // ignore
      }
      setDepartments((prev) =>
        prev.map((d) => (d.id === target.id ? { ...d, name: trimmed } : d))
      );
    }
  };

  const handleDeleteDepartment = async (valueToDelete: string) => {
    const target = departments.find((d) => d.id === valueToDelete || d.name === valueToDelete);
    if (target) {
      try {
        await generalService.deleteDepartment(target.id);
      } catch {
        // ignore
      }
      setDepartments((prev) => prev.filter((d) => d.id !== target.id));
    }
  };

  const departmentOptions: ManageableOption[] = useMemo(() => {
    const isSystemDept = (id: string) =>
      ['general', 'fundraising', 'pr', 'legal', 'finance', 'it', 'logistics', 'hr', 'marketing'].includes(
        id.toLowerCase()
      );

    const opts = departments.map((d) => {
      const label = d.key ? t(d.key, d.fallback || d.name) : d.name;
      return {
        value: d.id,
        label,
        isSystem: isSystemDept(d.id),
      };
    });

    if (department && !opts.some((o) => o.value === department || o.label === department)) {
      opts.unshift({
        value: department,
        label: department,
        isSystem: false,
      });
    }

    return opts;
  }, [departments, department, t]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !subject.trim()) {
      setErrorMessage(t('common.fillRequiredFields', 'Completați câmpurile obligatorii marcate.'));
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        department,
        subject: subject.trim(),
        blocks,
        settings,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || t('common.saveError', 'Eroare la salvare'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = isDarkMode
    ? 'w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700 focus:border-zinc-700'
    : 'w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400 focus:border-zinc-400';

  const labelClass = `block text-xs font-semibold mb-1 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className={`w-full h-full sm:h-[92vh] sm:max-h-[95vh] max-w-6xl flex flex-col rounded-none sm:rounded-2xl border-0 sm:border shadow-2xl overflow-hidden transition-all transform scale-100 animate-in zoom-in-95 duration-150 ${
          isDarkMode ? 'bg-black text-white border-zinc-800 shadow-2xl' : 'bg-white text-zinc-900 border-zinc-200 shadow-xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 pt-5 pb-3.5 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-base sm:text-lg tracking-tight">
            {initialData ? t('email.editTemplate', 'Editează Șablon') : t('email.addTemplate', 'Adaugă Șablon')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close', 'Închide')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Divider 1 */}
        <div className={`mx-5 sm:mx-6 border-b ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`} />

        {/* Top Metadata Row & Visual Canvas */}
        <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-4 text-sm flex flex-col">
          <form id="template-editor-modal-form" noValidate onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>{t('email.templateName', 'Nume Șablon')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder={t('email.templateNamePlaceholder', 'Ex: Invitație Sponsorizare Gold')}
                  className={`${inputClass} ${!name.trim() && errorMessage ? 'border-rose-500/80 ring-1 ring-rose-500/40' : ''}`}
                />
              </div>

              <div>
                <ManageableSelect
                  label={t('email.department', 'Departament')}
                  value={department}
                  onChange={(val) => {
                    setDepartment(val);
                    if (errorMessage) setErrorMessage('');
                  }}
                  options={departmentOptions}
                  modalTitle={t('general.manageDepartments', 'Gestionează Departamentele')}
                  onAddItem={handleCreateDepartment}
                  onRenameItem={handleRenameDepartment}
                  onDeleteItem={handleDeleteDepartment}
                  isDarkMode={isDarkMode}
                />
              </div>

              <div>
                <label className={labelClass}>{t('email.subject', 'Subiect Email')}</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder={t('email.subjectPlaceholder', 'Ex: Parteneriat {{event_name}}')}
                  className={`${inputClass} ${!subject.trim() && errorMessage ? 'border-rose-500/80 ring-1 ring-rose-500/40' : ''}`}
                />
              </div>
            </div>
          </form>

          {/* Canvas Area */}
          <div className="flex-1 min-h-[450px] flex flex-col overflow-hidden">
            <VisualEmailBuilder
              blocks={blocks}
              onChange={setBlocks}
              settings={settings}
              onSettingsChange={setSettings}
              isDarkMode={isDarkMode}
              mergeContext={{
                event_name: tenant?.terminology?.campaignSeasonName || 'Campania Anuală',
                event_year: new Date().getFullYear().toString(),
                sponsor_name: 'Acme Corporation SRL',
                contact_person: 'Ion Popescu',
                tier: 'Gold Partner',
                tier_amount: '10.000 RON',
                proposal_url: tenant?.integrations?.socialLinks?.website || 'https://example.org',
              }}
            />
          </div>
        </div>

        {/* Divider 2 */}
        <div className={`mx-5 sm:mx-6 border-t ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`} />

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="min-w-0 pr-3">
            {errorMessage && (
              <p className="text-xs text-rose-400 font-medium truncate">
                {errorMessage}
              </p>
            )}
          </div>

          <button
            type="submit"
            form="template-editor-modal-form"
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50 flex items-center space-x-2 shrink-0"
          >
            {isSubmitting && (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            <span>{t('common.save', 'Salvează')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
