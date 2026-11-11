import React, { useState, useEffect } from 'react';
import { DEFAULT_PWA_TRIGGERS } from '../../types/pwa';
import type {
  PwaNotificationRule,
  PwaCategory,
  PwaTriggerDefinition,
} from '../../types/pwa';
import { useLanguage } from '../../context/LanguageContext';
import { useTenant } from '../../context/TenantContext';
import { getTriggerName, getPlaceholderDescription } from '../../utils/notificationHelpers';
import { Trash2, X } from 'lucide-react';

interface PwaNotificationRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  rule: PwaNotificationRule | null;
  triggers: PwaTriggerDefinition[];
  users?: Array<{ id: string; fullName: string; email: string }>;
  roles?: Array<{ id: string; label: string }>;
  activeStands?: Array<{ id: string; locationName: string; eventName: string; eventDate: string; status: string; volunteersCount?: number }>;
  isDarkMode: boolean;
  onSave: (ruleData: Partial<PwaNotificationRule>, id?: string) => Promise<void>;
}

export const PwaNotificationRuleModal: React.FC<PwaNotificationRuleModalProps> = ({
  isOpen,
  onClose,
  rule,
  triggers,
  users = [],
  roles = [],
  activeStands = [],
  isDarkMode,
  onSave,
}) => {
  const { t } = useLanguage();
  const { tenant } = useTenant();
  const isEditMode = !!rule;
  const allTriggers = triggers && triggers.length > 0 ? triggers : DEFAULT_PWA_TRIGGERS;

  const normalizeRecipientType = (type?: string, trigDef?: PwaTriggerDefinition): string => {
    const activeDef = trigDef || selectedTriggerDef;
    const allowed = activeDef?.allowedRecipientTypes || ['SPECIFIC_USER', 'ALL_USERS', 'SPECIFIC_ROLE', 'SPECIFIC_STAND'];
    let norm = 'ALL_USERS';
    if (type === 'VOLUNTEER_DIRECT' || type === 'USER_DIRECT' || type === 'SPECIFIC_USER' || type === 'VOLUNTEERS') {
      norm = allowed.includes('SPECIFIC_USER') ? 'SPECIFIC_USER' : (allowed.includes('SPECIFIC_ROLE') ? 'SPECIFIC_ROLE' : allowed[0] || 'ALL_USERS');
    } else if (type === 'ADMINS' || type === 'COORDINATORS' || type === 'SPECIFIC_ROLE') {
      norm = allowed.includes('SPECIFIC_ROLE') ? 'SPECIFIC_ROLE' : (allowed.includes('ALL_USERS') ? 'ALL_USERS' : allowed[0] || 'SPECIFIC_USER');
    } else if (type === 'STAND' || type === 'STAND_MEMBERS' || type === 'SPECIFIC_STAND') {
      norm = allowed.includes('SPECIFIC_STAND') ? 'SPECIFIC_STAND' : (allowed.includes('SPECIFIC_ROLE') ? 'SPECIFIC_ROLE' : allowed[0] || 'ALL_USERS');
    } else if (type === 'ALL_USERS' || type === 'ALL') {
      norm = allowed.includes('ALL_USERS') ? 'ALL_USERS' : (allowed.includes('SPECIFIC_ROLE') ? 'SPECIFIC_ROLE' : allowed[0] || 'SPECIFIC_USER');
    } else {
      norm = allowed.includes(type as any) ? (type as string) : (allowed[0] || 'ALL_USERS');
    }
    return norm;
  };

  // Form State
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<PwaCategory>('HR');
  const [ruleType, setRuleType] = useState<string>('PWA_SHIFT_REMINDER');
  const [active, setActive] = useState<boolean>(true);
  const [triggerTimingMinutes, setTriggerTimingMinutes] = useState<number | ''>(120);
  const [minCapacityThreshold, setMinCapacityThreshold] = useState<number | ''>(1);
  const [targetRecipientType, setTargetRecipientType] = useState<string>('SPECIFIC_USER');
  const [customRecipient, setCustomRecipient] = useState<string>('');
  const [actionUrl, setActionUrl] = useState<string>('/dashboard/general');
  const [titleTemplate, setTitleTemplate] = useState<string>('');
  const [cooldownMinutes, setCooldownMinutes] = useState<number | ''>(60);
  const [templates, setTemplates] = useState<string[]>([]);
  const [activeTemplateIndex, setActiveTemplateIndex] = useState<number>(0);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Field errors
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const filteredTriggers = allTriggers.filter(tr => tr.category === category);
  const selectedTriggerDef = allTriggers.find(tr => tr.ruleType === ruleType) || filteredTriggers[0] || allTriggers[0];

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setFieldErrors({});

    if (rule) {
      setName(rule.name || '');
      setCategory(rule.category || 'HR');
      const targetRuleType = rule.ruleType || 'PWA_SHIFT_REMINDER';
      setRuleType(targetRuleType);
      setActive(rule.active !== false);
      setTriggerTimingMinutes(rule.triggerTimingMinutes ?? 120);
      setMinCapacityThreshold(rule.minCapacityThreshold ?? 1);
      const activeTrig = allTriggers.find(t => t.ruleType === targetRuleType);
      const normType = normalizeRecipientType(rule.targetRecipientType, activeTrig);
      setTargetRecipientType(normType);
      setCustomRecipient(rule.customRecipient || rule.customRecipientJid || '');
      setActionUrl(rule.actionUrl || '/dashboard/general');
      setTitleTemplate(rule.titleTemplate || '');
      setCooldownMinutes(rule.cooldownMinutes ?? 60);
      setTemplates(rule.templates && rule.templates.length > 0 ? [...rule.templates] : ['']);
      setActiveTemplateIndex(0);
    } else {
      const defaultTrigger = allTriggers.find(t => t.ruleType === 'PWA_SHIFT_REMINDER') || allTriggers[0];
      if (defaultTrigger) {
        setCategory(defaultTrigger.category);
        setRuleType(defaultTrigger.ruleType);
        setName(getTriggerName(t, defaultTrigger.ruleType, defaultTrigger.name));
        setTriggerTimingMinutes(defaultTrigger.defaultTimingMinutes ?? 120);
        setMinCapacityThreshold(defaultTrigger.defaultMinCapacity ?? 1);
        const normType = normalizeRecipientType(defaultTrigger.defaultRecipientType, defaultTrigger);
        setTargetRecipientType(normType);
        setCustomRecipient(
          normType === 'SPECIFIC_USER' ? users[0]?.id || '' :
          normType === 'SPECIFIC_ROLE' ? roles[0]?.id || '' :
          normType === 'SPECIFIC_STAND' ? activeStands[0]?.id || '' : ''
        );
        setActionUrl(defaultTrigger.defaultActionUrl || '/dashboard/general');
        setTitleTemplate(defaultTrigger.defaultTitle || '');
        setCooldownMinutes(defaultTrigger.defaultCooldownMinutes ?? 60);
        setTemplates(defaultTrigger.defaultTemplates && defaultTrigger.defaultTemplates.length > 0 ? [...defaultTrigger.defaultTemplates] : ['']);
      }
      setActive(true);
      setActiveTemplateIndex(0);
    }
  }, [rule, isOpen, allTriggers, t]);

  // Handle category switch
  const handleCategoryChange = (newCat: PwaCategory) => {
    setCategory(newCat);
    const catTriggers = allTriggers.filter(tr => tr.category === newCat);
    const first = catTriggers[0];
    if (first) {
      setRuleType(first.ruleType);
      const norm = normalizeRecipientType(isEditMode ? targetRecipientType : first.defaultRecipientType, first);
      setTargetRecipientType(norm);
      if (!isEditMode) {
        setName(getTriggerName(t, first.ruleType, first.name));
        setTriggerTimingMinutes(first.defaultTimingMinutes ?? 120);
        setMinCapacityThreshold(first.defaultMinCapacity ?? 1);
        setCustomRecipient(
          norm === 'SPECIFIC_USER' ? users[0]?.id || '' :
          norm === 'SPECIFIC_ROLE' ? roles[0]?.id || '' :
          norm === 'SPECIFIC_STAND' ? activeStands[0]?.id || '' : ''
        );
        setActionUrl(first.defaultActionUrl);
        setTitleTemplate(first.defaultTitle);
        setCooldownMinutes(first.defaultCooldownMinutes ?? 60);
        setTemplates(first.defaultTemplates.length > 0 ? [...first.defaultTemplates] : ['']);
      } else {
        if (norm === 'SPECIFIC_USER' && (!customRecipient || !users.some(u => u.id === customRecipient))) {
          setCustomRecipient(users[0]?.id || '');
        } else if (norm === 'SPECIFIC_ROLE' && (!customRecipient || !roles.some(r => r.id === customRecipient))) {
          setCustomRecipient(roles[0]?.id || '');
        } else if (norm === 'SPECIFIC_STAND' && (!customRecipient || !activeStands.some(s => s.id === customRecipient))) {
          setCustomRecipient(activeStands[0]?.id || '');
        } else if (norm === 'ALL_USERS') {
          setCustomRecipient('');
        }
      }
    }
  };

  // Handle trigger event switch
  const handleTriggerChange = (newRuleType: string) => {
    setRuleType(newRuleType);
    const trig = allTriggers.find(t => t.ruleType === newRuleType);
    if (trig) {
      setCategory(trig.category);
      const norm = normalizeRecipientType(isEditMode ? targetRecipientType : trig.defaultRecipientType, trig);
      setTargetRecipientType(norm);
      if (!isEditMode) {
        setName(getTriggerName(t, trig.ruleType, trig.name));
        setTriggerTimingMinutes(trig.defaultTimingMinutes ?? 120);
        setMinCapacityThreshold(trig.defaultMinCapacity ?? 1);
        setCustomRecipient(
          norm === 'SPECIFIC_USER' ? users[0]?.id || '' :
          norm === 'SPECIFIC_ROLE' ? roles[0]?.id || '' :
          norm === 'SPECIFIC_STAND' ? activeStands[0]?.id || '' : ''
        );
        setActionUrl(trig.defaultActionUrl || '/dashboard/general');
        setTitleTemplate(trig.defaultTitle || '');
        setCooldownMinutes(trig.defaultCooldownMinutes ?? 60);
        setTemplates(trig.defaultTemplates && trig.defaultTemplates.length > 0 ? [...trig.defaultTemplates] : ['']);
      } else {
        if (norm === 'SPECIFIC_USER' && (!customRecipient || !users.some(u => u.id === customRecipient))) {
          setCustomRecipient(users[0]?.id || '');
        } else if (norm === 'SPECIFIC_ROLE' && (!customRecipient || !roles.some(r => r.id === customRecipient))) {
          setCustomRecipient(roles[0]?.id || '');
        } else if (norm === 'SPECIFIC_STAND' && (!customRecipient || !activeStands.some(s => s.id === customRecipient))) {
          setCustomRecipient(activeStands[0]?.id || '');
        } else if (norm === 'ALL_USERS' || norm === 'TASK_ASSIGNEES') {
          setCustomRecipient('');
        }
      }
    }
  };

  const currentPlaceholders = selectedTriggerDef?.placeholders || [];

  const handleInsertPlaceholder = (placeholderKey: string) => {
    if (templates.length === 0) return;
    const currentText = templates[activeTemplateIndex] || '';
    const newText = currentText ? `${currentText} ${placeholderKey}` : placeholderKey;
    const updated = [...templates];
    updated[activeTemplateIndex] = newText;
    setTemplates(updated);
    if (fieldErrors.templates) {
      setFieldErrors(prev => ({ ...prev, templates: '' }));
    }
  };

  const handleInsertTitlePlaceholder = (placeholderKey: string) => {
    setTitleTemplate(prev => prev ? `${prev} ${placeholderKey}` : placeholderKey);
  };

  const handleTemplateChange = (index: number, val: string) => {
    const updated = [...templates];
    updated[index] = val;
    setTemplates(updated);
    if (fieldErrors.templates) {
      setFieldErrors(prev => ({ ...prev, templates: '' }));
    }
  };

  const handleAddTemplate = () => {
    setTemplates(prev => [...prev, '']);
    setActiveTemplateIndex(templates.length);
  };

  const handleDeleteTemplate = (index: number) => {
    if (templates.length <= 1) return;
    const updated = templates.filter((_, i) => i !== index);
    setTemplates(updated);
    if (activeTemplateIndex >= updated.length) {
      setActiveTemplateIndex(Math.max(0, updated.length - 1));
    }
  };

  // Keyboard Escape listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!name || !name.trim()) {
      errors.name = t('pwa.nameRequired', 'Introduceți numele regulii.');
    }
    if (!ruleType) {
      errors.ruleType = t('pwa.triggerRequired', 'Selectați evenimentul declanșator.');
    }
    if (targetRecipientType === 'SPECIFIC_USER' && !customRecipient) {
      errors.customRecipient = t('pwa.selectUserPlaceholder', 'Selectați un voluntar...');
    }
    if (targetRecipientType === 'SPECIFIC_ROLE' && !customRecipient) {
      errors.customRecipient = t('pwa.selectRolePlaceholder', 'Selectați un rol...');
    }
    if (targetRecipientType === 'SPECIFIC_STAND' && !customRecipient) {
      errors.customRecipient = t('pwa.selectStandPlaceholder', 'Selectați un stand...');
    }
    const hasValidTemplate = (templates || []).some(t => typeof t === 'string' && t.trim().length > 0);
    if (!hasValidTemplate) {
      errors.templates = t('pwa.templateRequired', 'Introduceți cel puțin un șablon de mesaj.');
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError(t('common.fillRequiredFields', 'Completați câmpurile obligatorii marcate.'));
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      const payload: Partial<PwaNotificationRule> = {
        name: (name || '').trim(),
        category,
        ruleType,
        active,
        triggerTimingMinutes: Number(triggerTimingMinutes) || 0,
        minCapacityThreshold: Number(minCapacityThreshold) || 0,
        targetRecipientType,
        customRecipient: (targetRecipientType === 'ALL_USERS' || targetRecipientType === 'TASK_ASSIGNEES') ? '' : (customRecipient || ''),
        actionUrl: (actionUrl || '').trim() || '/dashboard/general',
        titleTemplate: (titleTemplate || '').trim(),
        cooldownMinutes: Number(cooldownMinutes) || 0,
        templates: (templates || []).filter(t => t != null && typeof t === 'string' && t.trim().length > 0).map(t => t.trim()),
      };
      await onSave(payload, rule?.id);
      onClose();
    } catch (err: any) {
      setError(err?.message || t('pwa.ruleSaveError', 'Eroare la salvarea regulii'));
    } finally {
      setIsSaving(false);
    }
  };

  const categories: {
    id: PwaCategory;
    label: string;
  }[] = [
    { id: 'HR', label: t('pwa.categoryHr', 'HR') },
    { id: 'LOGISTICS', label: t('pwa.categoryLogistics', 'Logistică') },
    { id: 'FINANCE', label: t('pwa.categoryFinance', 'Finanțe') },
    { id: 'GENERAL', label: t('pwa.categoryGeneral', 'General') },
  ];

  const modalBorder = isDarkMode ? 'border-zinc-800' : 'border-zinc-200';
  const modalBg = isDarkMode ? 'bg-black text-white border-zinc-800 shadow-2xl' : 'bg-white text-zinc-900 border-zinc-200 shadow-xl';
  const inputBg = isDarkMode
    ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700 focus:border-zinc-700'
    : 'bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400 focus:border-zinc-400';
  const inputErrorBorder = 'border-rose-500/80 focus:border-rose-500 ring-1 ring-rose-500/40';
  const textSub = isDarkMode ? 'text-zinc-400' : 'text-zinc-500';
  const boxBg = isDarkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-100 border-zinc-200';
  const badgeCss = isDarkMode ? 'bg-zinc-800 text-blue-400 border-zinc-700 hover:bg-blue-500/10' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150" onClick={onClose}>
      <div className={`w-full h-full sm:h-auto sm:max-h-[90vh] max-w-lg rounded-none sm:rounded-2xl border-0 sm:border shadow-2xl flex flex-col overflow-hidden transition-all transform scale-100 animate-in zoom-in-95 duration-150 ${modalBg}`} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-5 sm:px-6 pt-5 pb-3.5 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-base sm:text-lg tracking-tight">
            {isEditMode ? t('pwa.editRule', 'Editare Regulă PWA') : t('pwa.newRule', 'Regulă Nouă PWA')}
          </h3>
          <button onClick={onClose} aria-label={t('common.close', 'Închide')} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className={`mx-5 sm:mx-6 border-b ${modalBorder}`} />

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-4 text-sm">
          <form id="pwa-notification-rule-form" noValidate onSubmit={handleSubmit} className="space-y-4 text-xs">
            
            {/* Step 1: Category Selection */}
            <div>
              <label className={`block font-semibold text-xs mb-1.5 ${textSub}`}>
                {t('pwa.selectCategory', 'Categorie')}
              </label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value as PwaCategory)}
                className={`w-full h-[38px] px-3 py-2 rounded-xl border text-xs outline-hidden transition ${inputBg}`}
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Trigger Event Selection */}
            <div>
              <label className={`block font-semibold text-xs mb-1.5 ${textSub}`}>
                {t('pwa.selectTrigger', 'Eveniment Declanșator')}
              </label>
              <select
                value={ruleType}
                onChange={(e) => handleTriggerChange(e.target.value)}
                className={`w-full h-[38px] px-3 py-2 rounded-xl border text-xs outline-hidden transition ${inputBg} ${fieldErrors.ruleType ? inputErrorBorder : ''}`}
              >
                {filteredTriggers.map(trig => (
                  <option key={trig.ruleType} value={trig.ruleType}>
                    {getTriggerName(t, trig.ruleType, trig.name)}
                  </option>
                ))}
              </select>
            </div>

            {/* Rule Name & Active Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="sm:col-span-2">
                <label className={`block font-semibold text-xs mb-1 ${textSub}`}>
                  {t('pwa.ruleName', 'Nume Regulă')}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' }));
                  }}
                  className={`w-full h-[38px] px-3 py-2 rounded-xl border text-xs outline-hidden transition ${inputBg} ${fieldErrors.name ? inputErrorBorder : ''}`}
                />
              </div>
              <div>
                <label className={`block font-semibold text-xs mb-1 ${textSub}`}>
                  {t('pwa.activeStatus', 'Stare Regulă')}
                </label>
                <button
                  type="button"
                  onClick={() => setActive(!active)}
                  className={`w-full h-[38px] px-3 py-2 rounded-xl border font-bold text-xs transition cursor-pointer flex items-center justify-center space-x-2 ${
                    active
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-zinc-800/80 border-zinc-700 text-zinc-400'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                  <span>{active ? t('pwa.ruleActive', 'Activ') : t('pwa.ruleInactive', 'Dezactivat')}</span>
                </button>
              </div>
            </div>

            {/* Dynamic Context Fields: Timing & Capacity Threshold */}
            {(selectedTriggerDef?.supportsTiming || selectedTriggerDef?.supportsMinCapacity) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedTriggerDef?.supportsTiming && (
                  <div>
                    <label className={`block font-semibold text-xs mb-1 ${textSub}`}>
                      {t('pwa.triggerTiming', 'Moment Declanșare (Minute înainte)')}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={triggerTimingMinutes}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/^0+(?=\d)/, '');
                        setTriggerTimingMinutes(clean === '' ? '' : Math.max(0, parseInt(clean, 10) || 0));
                      }}
                      className={`w-full h-[38px] px-3 py-2 rounded-xl border text-xs outline-hidden transition ${inputBg}`}
                    />
                  </div>
                )}

                {selectedTriggerDef?.supportsMinCapacity && (
                  <div>
                    <label className={`block font-semibold text-xs mb-1 ${textSub}`}>
                      {t('pwa.minCapacityThreshold', 'Prag Minim Deficit / Cantitate')}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={minCapacityThreshold}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/^0+(?=\d)/, '');
                        setMinCapacityThreshold(clean === '' ? '' : Math.max(0, parseInt(clean, 10) || 0));
                      }}
                      className={`w-full h-[38px] px-3 py-2 rounded-xl border text-xs outline-hidden transition ${inputBg}`}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Target Audience Category, Sub-picker & Action URL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`block font-semibold text-xs mb-1 ${textSub}`}>
                  {t('pwa.targetRecipientType', 'Destinatar')}
                </label>
                <select
                  value={targetRecipientType}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTargetRecipientType(val);
                    if (val === 'SPECIFIC_USER' && users.length > 0 && (!customRecipient || !users.some(u => u.id === customRecipient))) {
                      setCustomRecipient(users[0].id);
                    } else if (val === 'SPECIFIC_ROLE' && roles.length > 0 && (!customRecipient || !roles.some(r => r.id === customRecipient))) {
                      setCustomRecipient(roles[0].id);
                    } else if (val === 'SPECIFIC_STAND' && activeStands.length > 0 && (!customRecipient || !activeStands.some(s => s.id === customRecipient))) {
                      setCustomRecipient(activeStands[0].id);
                    } else if (val === 'ALL_USERS' || val === 'TASK_ASSIGNEES') {
                      setCustomRecipient('');
                    }
                  }}
                  className={`w-full h-[38px] px-3 py-2 rounded-xl border text-xs outline-hidden transition ${inputBg}`}
                >
                  {(!selectedTriggerDef?.allowedRecipientTypes || selectedTriggerDef.allowedRecipientTypes.includes('TASK_ASSIGNEES')) && (
                    <option value="TASK_ASSIGNEES">{t('pwa.recipientTaskAssignees', 'Utilizatorii Asignați Sarcinii')}</option>
                  )}
                  {(!selectedTriggerDef?.allowedRecipientTypes || selectedTriggerDef.allowedRecipientTypes.includes('SPECIFIC_USER')) && (
                    <option value="SPECIFIC_USER">{t('pwa.recipientSpecificUser', 'Voluntar Specific')}</option>
                  )}
                  {(!selectedTriggerDef?.allowedRecipientTypes || selectedTriggerDef.allowedRecipientTypes.includes('ALL_USERS')) && (
                    <option value="ALL_USERS">{t('pwa.recipientAll', 'Toți Utilizatorii')}</option>
                  )}
                  {(!selectedTriggerDef?.allowedRecipientTypes || selectedTriggerDef.allowedRecipientTypes.includes('SPECIFIC_ROLE')) && (
                    <option value="SPECIFIC_ROLE">{t('pwa.recipientSpecificRole', 'Rol Specific')}</option>
                  )}
                  {(!selectedTriggerDef?.allowedRecipientTypes || selectedTriggerDef.allowedRecipientTypes.includes('SPECIFIC_STAND')) && (
                    <option value="SPECIFIC_STAND">{t('pwa.recipientSpecificStand', 'Stand Specific (În desfășurare)')}</option>
                  )}
                </select>
              </div>

              {targetRecipientType === 'SPECIFIC_USER' && (
                <div>
                  <label className={`block font-semibold text-xs mb-1 ${textSub}`}>
                    {t('pwa.selectVolunteer', 'Selectează Voluntar')}
                  </label>
                  <select
                    value={customRecipient}
                    onChange={(e) => setCustomRecipient(e.target.value)}
                    className={`w-full h-[38px] px-3 py-2 rounded-xl border text-xs outline-hidden transition ${inputBg} ${fieldErrors.customRecipient ? 'border-rose-500 ring-1 ring-rose-500/40' : ''}`}
                  >
                    <option value="">{t('pwa.selectUserPlaceholder', 'Selectați un voluntar...')}</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName || u.email} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {targetRecipientType === 'SPECIFIC_ROLE' && (
                <div>
                  <label className={`block font-semibold text-xs mb-1 ${textSub}`}>
                    {t('pwa.selectRole', 'Selectează Rol')}
                  </label>
                  <select
                    value={customRecipient}
                    onChange={(e) => setCustomRecipient(e.target.value)}
                    className={`w-full h-[38px] px-3 py-2 rounded-xl border text-xs outline-hidden transition ${inputBg} ${fieldErrors.customRecipient ? 'border-rose-500 ring-1 ring-rose-500/40' : ''}`}
                  >
                    <option value="">{t('pwa.selectRolePlaceholder', 'Selectați un rol...')}</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {targetRecipientType === 'SPECIFIC_STAND' && (
                <div>
                  <label className={`block font-semibold text-xs mb-1 ${textSub}`}>
                    {t('pwa.selectStand', 'Selectează Stand')}
                  </label>
                  <select
                    value={customRecipient}
                    onChange={(e) => setCustomRecipient(e.target.value)}
                    className={`w-full h-[38px] px-3 py-2 rounded-xl border text-xs outline-hidden transition ${inputBg} ${fieldErrors.customRecipient ? 'border-rose-500 ring-1 ring-rose-500/40' : ''}`}
                  >
                    <option value="">{t('pwa.selectStandPlaceholder', 'Selectați un stand activ...')}</option>
                    {activeStands.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.locationName || s.eventName} {s.eventDate ? `(${s.eventDate})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className={targetRecipientType === 'ALL_USERS' ? 'sm:col-span-1' : 'sm:col-span-2'}>
                <label className={`block font-semibold text-xs mb-1 ${textSub}`}>
                  {t('pwa.actionUrl', 'Link Destinație (Click Action)')}
                </label>
                <input
                  type="text"
                  value={actionUrl}
                  onChange={(e) => setActionUrl(e.target.value)}
                  placeholder="/dashboard/hr"
                  className={`w-full h-[38px] px-3 py-2 rounded-xl border text-xs outline-hidden transition ${inputBg}`}
                />
              </div>
            </div>

            {/* Notification Title & Cooldown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className={`block font-semibold text-xs mb-1 ${textSub}`}>
                  {t('pwa.titleTemplate', 'Titlu Notificare Push')}
                </label>
                <input
                  type="text"
                  value={titleTemplate}
                  onChange={(e) => setTitleTemplate(e.target.value)}
                  placeholder={t('pwa.titleTemplatePlaceholder', `Ex: Reminder Tură ${tenant?.identity?.shorthand || ''}: {shiftName}`.trim())}
                  className={`w-full h-[38px] px-3 py-2 rounded-xl border text-xs outline-hidden transition ${inputBg}`}
                />
              </div>
              <div>
                <label className={`block font-semibold text-xs mb-1 ${textSub}`}>
                  {t('pwa.cooldown', 'Cooldown (minute)')}
                </label>
                <input
                  type="number"
                  min={0}
                  value={cooldownMinutes}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/^0+(?=\d)/, '');
                    setCooldownMinutes(clean === '' ? '' : Math.max(0, parseInt(clean, 10) || 0));
                  }}
                  className={`w-full h-[38px] px-3 py-2 rounded-xl border text-xs outline-hidden transition ${inputBg}`}
                />
              </div>
            </div>

            {/* Templates Section */}
            <div className={`p-3.5 rounded-xl border ${boxBg} space-y-3`}>
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-zinc-100">{t('pwa.templatesList', 'Șabloane Conținut Push')}</h4>
                <button
                  type="button"
                  onClick={handleAddTemplate}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer"
                >
                  {t('pwa.addTemplate', 'Adaugă')}
                </button>
              </div>

              {/* Template Tab Pills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {templates.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveTemplateIndex(idx)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1 border ${
                      activeTemplateIndex === idx
                        ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                        : 'bg-zinc-800/60 text-zinc-400 border-zinc-700 hover:text-white'
                    }`}
                  >
                    <span>{t('pwa.templateLabel', 'Șablon')} #{idx + 1}</span>
                    {templates.length > 1 && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(idx);
                        }}
                        title={t('pwa.deleteTemplate', 'Șterge Șablon')}
                        className="hover:text-rose-400 ml-1 p-0.5"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Active Template Textarea */}
              {templates.length > 0 && (
                <div className="space-y-2">
                  <textarea
                    rows={4}
                    value={templates[activeTemplateIndex] || ''}
                    onChange={(e) => handleTemplateChange(activeTemplateIndex, e.target.value)}
                    placeholder={t('pwa.templatePlaceholder', 'Scrie textul notificării push...')}
                    className={`w-full px-3 py-2 text-xs rounded-xl border outline-hidden resize-none font-mono ${inputBg} ${fieldErrors.templates ? inputErrorBorder : ''}`}
                  />

                  {/* Dynamic Context Variables Chips */}
                  <div>
                    <p className={`text-[10px] font-bold ${textSub} mb-1.5`}>
                      {t('pwa.availablePlaceholders', 'Variabile dinamice disponibile:')}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {currentPlaceholders.length > 0 ? (
                        currentPlaceholders.map((ph) => {
                          const phDesc = getPlaceholderDescription(t, ph.key, ph.description);
                          const tooltipSuffix = t('pwa.placeholderTooltipSuffix', 'Click: corp, Click dreapta: titlu');
                          const fullTooltip = phDesc ? `${phDesc} (${tooltipSuffix})` : tooltipSuffix;
                          return (
                            <button
                              key={ph.key}
                              type="button"
                              onClick={() => handleInsertPlaceholder(ph.key)}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                handleInsertTitlePlaceholder(ph.key);
                              }}
                              title={fullTooltip}
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border transition cursor-pointer ${badgeCss}`}
                            >
                              <span>{ph.key}</span>
                              {phDesc && <span className="opacity-60 ml-1 font-sans text-[9px]">({phDesc})</span>}
                            </button>
                          );
                        })
                      ) : (
                        <span className="text-[10px] text-zinc-500">-</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>

        <div className={`mx-5 sm:mx-6 border-t ${modalBorder}`} />

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="min-w-0 pr-3">
            {error && (
              <p className="text-xs text-rose-400 font-medium truncate">{error}</p>
            )}
          </div>
          <button
            form="pwa-notification-rule-form"
            type="submit"
            disabled={isSaving}
            className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md transition cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isSaving ? t('common.loading', 'Se procesează...') : (isEditMode ? t('pwa.saveRule', 'Salvează Configurația') : t('pwa.createRule', 'Creează Regula'))}
          </button>
        </div>
      </div>
    </div>
  );
};
