import React, { useState, useEffect, useMemo } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useTenant } from '../../context/TenantContext';
import { VisualEmailBuilder } from './VisualEmailBuilder';
import { ManageableSelect, type ManageableOption } from '../common';
import { generalService } from '../../services/generalService';
import type { DepartmentItem } from '../../types/general';
import type { EmailTemplate, EmailBlock, EmailGlobalSettings } from '../../types/email';

interface EmailTemplateEditorViewProps {
  initialTemplate?: EmailTemplate | null;
  onSave: (templateData: {
    name: string;
    department: string;
    subject: string;
    blocks: EmailBlock[];
    settings?: EmailGlobalSettings;
  }) => Promise<void>;
  onCancel?: () => void;
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

export const EmailTemplateEditorView: React.FC<EmailTemplateEditorViewProps> = ({
  initialTemplate,
  onSave,
  onCancel,
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
    if (initialTemplate) {
      setName(initialTemplate.name || '');
      setDepartment(initialTemplate.department || defaultDepartment);
      setSubject(initialTemplate.subject || '');
      setBlocks(Array.isArray(initialTemplate.blocks) ? JSON.parse(JSON.stringify(initialTemplate.blocks)) : []);
      setSettings(initialTemplate.settings || {
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
  }, [initialTemplate, defaultDepartment]);

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

  const handleSave = async () => {
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
    } catch (err: any) {
      setErrorMessage(err?.message || t('common.saveError', 'Eroare la salvare'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = isDarkMode
    ? 'w-full h-[38px] px-3 py-1.5 text-xs rounded-xl border outline-hidden transition bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700 focus:border-zinc-700'
    : 'w-full h-[38px] px-3 py-1.5 text-xs rounded-xl border outline-hidden transition bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400 focus:border-zinc-400';

  const labelClass = `block text-xs font-semibold mb-1 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`;

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-3">
      {/* Top Metadata & Action Bar */}
      <div
        className={`p-3.5 rounded-2xl border flex flex-col space-y-3 shrink-0 ${
          isDarkMode ? 'bg-zinc-950 border-zinc-850' : 'bg-white border-zinc-200 shadow-xs'
        }`}
      >
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
              placeholder={t('email.subjectPlaceholder', 'Ex: Parteneriat {{event_name}} - {{sponsor_name}}')}
              className={`${inputClass} ${!subject.trim() && errorMessage ? 'border-rose-500/80 ring-1 ring-rose-500/40' : ''}`}
            />
          </div>
        </div>

        {/* Actions strip */}
        <div className="flex items-center justify-between pt-1 border-t border-zinc-800/40">
          <div className="text-xs text-rose-400 font-medium truncate">
            {errorMessage}
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-3.5 py-1.5 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition cursor-pointer flex items-center space-x-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('common.cancel', 'Anulează')}</span>
              </button>
            )}

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSave}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
            >
              {isSubmitting ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{t('common.save', 'Salvează Șablon')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Visual Canvas Builder */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
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
  );
};
