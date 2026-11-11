import React, { useState, useEffect } from 'react';
import type {
  UnifiedNotificationRule,
  UnifiedTriggerDefinition,
  NotificationChannel,
  NotificationCategory,
} from '../../types/notifications';
import { UNIFIED_TRIGGERS } from '../../types/notifications';
import type { WhatsAppGroupInfo } from '../../types/whatsapp';
import { useLanguage } from '../../context/LanguageContext';
import { getTriggerName, getPlaceholderDescription } from '../../utils/notificationHelpers';
import { Trash2, X, Plus } from 'lucide-react';

interface NotificationRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  rule: UnifiedNotificationRule | null;
  triggers?: UnifiedTriggerDefinition[];
  groups?: WhatsAppGroupInfo[];
  users?: Array<{ id: string; fullName: string; email: string }>;
  roles?: Array<{ id: string; label: string }>;
  stands?: Array<{ id: string; locationName: string; eventName: string }>;
  isDarkMode: boolean;
  onSave: (ruleData: Partial<UnifiedNotificationRule>, id?: string) => Promise<void>;
}

export const NotificationRuleModal: React.FC<NotificationRuleModalProps> = ({
  isOpen,
  onClose,
  rule,
  triggers = UNIFIED_TRIGGERS,
  groups = [],
  users = [],
  roles = [],
  stands = [],
  isDarkMode,
  onSave,
}) => {
  const { t } = useLanguage();
  const isEditMode = !!rule;
  const allTriggers = triggers && triggers.length > 0 ? triggers : UNIFIED_TRIGGERS;

  // Form State
  const [channel, setChannel] = useState<NotificationChannel>('WHATSAPP');
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<NotificationCategory>('HR');
  const [ruleType, setRuleType] = useState<string>('HR_SHIFT_REMINDER');
  const [active, setActive] = useState<boolean>(true);
  const [triggerTimingMinutes, setTriggerTimingMinutes] = useState<number | ''>(120);
  const [minCapacityThreshold, setMinCapacityThreshold] = useState<number | ''>(1);
  const [targetRecipientType, setTargetRecipientType] = useState<string>('COORDINATOR_GROUP');
  const [customRecipient, setCustomRecipient] = useState<string>('');
  const [sourceGroupJid, setSourceGroupJid] = useState<string>('');
  const [titleTemplate, setTitleTemplate] = useState<string>('');
  const [actionUrl, setActionUrl] = useState<string>('/dashboard/general');
  const [cooldownMinutes, setCooldownMinutes] = useState<number | ''>(60);
  const [templates, setTemplates] = useState<string[]>(['']);
  const [activeTemplateIndex, setActiveTemplateIndex] = useState<number>(0);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorSummary, setErrorSummary] = useState<string>('');
  const [invalidFields, setInvalidFields] = useState<Record<string, boolean>>({});

  // Filter triggers by active category
  const filteredTriggers = allTriggers.filter(tr => tr.category === category);
  const selectedTriggerDef = allTriggers.find(tr => tr.ruleType === ruleType) || filteredTriggers[0] || allTriggers[0];

  useEffect(() => {
    if (!isOpen) return;
    setErrorSummary('');
    setInvalidFields({});

    if (rule) {
      setChannel(rule.channel || 'WHATSAPP');
      setName(rule.name || '');
      setCategory(rule.category || 'HR');
      setRuleType(rule.ruleType || 'HR_SHIFT_REMINDER');
      setActive(rule.active === true);
      setTriggerTimingMinutes(rule.triggerTimingMinutes ?? 120);
      setMinCapacityThreshold(rule.minCapacityThreshold ?? 1);
      setTargetRecipientType(rule.targetRecipientType || 'COORDINATOR_GROUP');
      setCustomRecipient(rule.customRecipient || rule.customRecipientJid || '');
      setSourceGroupJid(rule.sourceGroupJid || '');
      setTitleTemplate(rule.titleTemplate || '');
      setActionUrl(rule.actionUrl || '/dashboard/general');
      setCooldownMinutes(rule.cooldownMinutes ?? 60);
      setTemplates(rule.templates && rule.templates.length > 0 ? [...rule.templates] : ['']);
      setActiveTemplateIndex(0);
    } else {
      const defaultTrigger = allTriggers.find(t => t.ruleType === 'HR_SHIFT_REMINDER') || allTriggers[0];
      setChannel('WHATSAPP');
      if (defaultTrigger) {
        setCategory(defaultTrigger.category);
        setRuleType(defaultTrigger.ruleType);
        setName(getTriggerName(t, defaultTrigger.ruleType, defaultTrigger.name));
        setTriggerTimingMinutes(defaultTrigger.defaultTimingMinutes ?? 120);
        setMinCapacityThreshold(defaultTrigger.defaultMinCapacity ?? 1);
        setTargetRecipientType(defaultTrigger.defaultRecipientType || 'COORDINATOR_GROUP');
        setTitleTemplate(defaultTrigger.defaultTitle || '');
        setActionUrl(defaultTrigger.defaultActionUrl || '/dashboard/general');
        setCooldownMinutes(defaultTrigger.defaultCooldownMinutes ?? 60);
        setTemplates(defaultTrigger.defaultTemplates && defaultTrigger.defaultTemplates.length > 0 ? [...defaultTrigger.defaultTemplates] : ['']);
      }
      setCustomRecipient('');
      setSourceGroupJid('');
      setActive(true);
      setActiveTemplateIndex(0);
    }
  }, [isOpen, rule, allTriggers, t]);

  if (!isOpen) return null;

  const handleCategoryChange = (newCat: NotificationCategory) => {
    setCategory(newCat);
    const categoryTriggers = allTriggers.filter(tr => tr.category === newCat);
    if (categoryTriggers.length > 0) {
      const first = categoryTriggers[0];
      setRuleType(first.ruleType);
      if (!isEditMode) {
        setName(getTriggerName(t, first.ruleType, first.name));
        setTriggerTimingMinutes(first.defaultTimingMinutes ?? 120);
        setMinCapacityThreshold(first.defaultMinCapacity ?? 1);
        setTargetRecipientType(first.defaultRecipientType || 'COORDINATOR_GROUP');
        setSourceGroupJid('');
        setTitleTemplate(first.defaultTitle || '');
        setActionUrl(first.defaultActionUrl || '/dashboard/general');
        setCooldownMinutes(first.defaultCooldownMinutes ?? 60);
        setTemplates(first.defaultTemplates && first.defaultTemplates.length > 0 ? [...first.defaultTemplates] : ['']);
        setActiveTemplateIndex(0);
      }
    }
  };

  const handleTriggerChange = (newRuleType: string) => {
    setRuleType(newRuleType);
    const trig = allTriggers.find(t => t.ruleType === newRuleType);
    if (trig && !isEditMode) {
      setName(getTriggerName(t, trig.ruleType, trig.name));
      setTriggerTimingMinutes(trig.defaultTimingMinutes ?? 120);
      setMinCapacityThreshold(trig.defaultMinCapacity ?? 1);
      setTargetRecipientType(trig.defaultRecipientType || 'COORDINATOR_GROUP');
      setSourceGroupJid('');
      setTitleTemplate(trig.defaultTitle || '');
      setActionUrl(trig.defaultActionUrl || '/dashboard/general');
      setCooldownMinutes(trig.defaultCooldownMinutes ?? 60);
      setTemplates(trig.defaultTemplates && trig.defaultTemplates.length > 0 ? [...trig.defaultTemplates] : ['']);
      setActiveTemplateIndex(0);
    }
  };

  const handleInsertPlaceholder = (placeholderKey: string) => {
    const currentText = templates[activeTemplateIndex] || '';
    const updated = currentText + (currentText.length > 0 && !currentText.endsWith(' ') ? ' ' : '') + placeholderKey;
    const nextList = [...templates];
    nextList[activeTemplateIndex] = updated;
    setTemplates(nextList);
    setInvalidFields(prev => ({ ...prev, templates: false }));
  };

  const handleTemplateChange = (text: string) => {
    const nextList = [...templates];
    nextList[activeTemplateIndex] = text;
    setTemplates(nextList);
    if (text.trim()) {
      setInvalidFields(prev => ({ ...prev, templates: false }));
    }
  };

  const handleAddTemplate = () => {
    setTemplates(prev => [...prev, '']);
    setActiveTemplateIndex(templates.length);
  };

  const handleRemoveTemplate = (index: number) => {
    if (templates.length <= 1) return;
    const next = templates.filter((_, i) => i !== index);
    setTemplates(next);
    setActiveTemplateIndex(Math.max(0, index - 1));
  };

  const validate = (): boolean => {
    const errors: Record<string, boolean> = {};
    if (!name.trim()) errors.name = true;
    const filledTemplates = templates.map(s => s.trim()).filter(Boolean);
    if (filledTemplates.length === 0) errors.templates = true;
    if (channel === 'PWA' && !titleTemplate.trim()) errors.titleTemplate = true;

    setInvalidFields(errors);
    if (Object.keys(errors).length > 0) {
      setErrorSummary(t('common.fillRequiredFields', 'Completați câmpurile obligatorii marcate.'));
      return false;
    }
    setErrorSummary('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    try {
      const validTemplates = templates.map(s => s.trim()).filter(Boolean);
      const payload: Partial<UnifiedNotificationRule> = {
        channel,
        name: name.trim(),
        category,
        ruleType,
        active,
        triggerTimingMinutes: Number(triggerTimingMinutes) || 0,
        minCapacityThreshold: selectedTriggerDef?.supportsMinCapacity ? Number(minCapacityThreshold) || 0 : undefined,
        targetRecipientType,
        customRecipient: customRecipient.trim() || undefined,
        customRecipientJid: customRecipient.trim() || undefined,
        sourceGroupJid: selectedTriggerDef?.supportsSourceGroup ? (sourceGroupJid.trim() || undefined) : undefined,
        titleTemplate: channel === 'PWA' ? titleTemplate.trim() : undefined,
        actionUrl: channel === 'PWA' ? actionUrl.trim() : undefined,
        templates: validTemplates,
        cooldownMinutes: Number(cooldownMinutes) || 0,
      };

      await onSave(payload, rule?.id);
      onClose();
    } catch {
      setErrorSummary(t('common.saveError', 'Eroare la salvare. Reîncercați.'));
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = (fieldKey: string) => {
    const isInvalid = !!invalidFields[fieldKey];
    const base = isDarkMode
      ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700 focus:border-zinc-700'
      : 'bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400 focus:border-zinc-400';
    const err = isInvalid ? 'border-rose-500/80 focus:border-rose-500 ring-1 ring-rose-500/40' : '';
    return `h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition w-full ${base} ${err}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className={`w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl rounded-none sm:rounded-2xl border-0 sm:border flex flex-col overflow-hidden shadow-2xl ${
          isDarkMode ? 'bg-black text-white border-zinc-800' : 'bg-white text-zinc-900 border-zinc-200'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 pt-5 pb-3.5 flex items-center justify-between shrink-0">
          <h2 className="font-bold text-base sm:text-lg tracking-tight">
            {isEditMode ? t('whatsapp.editRuleTitle', 'Editează Regulă Notificare') : t('whatsapp.newRuleTitle', 'Regulă Nouă de Notificare')}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inset Divider 1 */}
        <div className={`mx-5 sm:mx-6 border-b ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`} />

        {/* Scrollable Form Body */}
        <form noValidate onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-4 text-sm">
          
          {/* Channel Selector */}
          <div>
            <label className="block text-xs font-semibold mb-1 text-zinc-400">
              {t('notifications.channel', 'Canal Notificare')}
            </label>
            <select
              value={channel}
              onChange={e => setChannel(e.target.value as NotificationChannel)}
              className={inputClass('channel')}
            >
              <option value="WHATSAPP">WhatsApp</option>
              <option value="PWA">PWA Push</option>
            </select>
          </div>

          {/* Category & Trigger Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-zinc-400">
                {t('pwa.selectCategory', 'Categorie')}
              </label>
              <select
                value={category}
                onChange={e => handleCategoryChange(e.target.value as NotificationCategory)}
                className={inputClass('category')}
              >
                <option value="HR">HR</option>
                <option value="LOGISTICS">{t('nav.logistics', 'Logistică')}</option>
                <option value="FINANCE">{t('nav.finance', 'Finanțe')}</option>
                <option value="GENERAL">{t('nav.general', 'General')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-zinc-400">
                {t('whatsapp.triggerEvent', 'Eveniment Declanșator')}
              </label>
              <select
                value={ruleType}
                onChange={e => handleTriggerChange(e.target.value)}
                className={inputClass('ruleType')}
              >
                {filteredTriggers.map(tr => (
                  <option key={tr.ruleType} value={tr.ruleType}>
                    {getTriggerName(t, tr.ruleType, tr.name)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Source Group Selection (e.g. for group join triggers) */}
          {selectedTriggerDef?.supportsSourceGroup && (
            <div>
              <label className="block text-xs font-semibold mb-1 text-zinc-400">
                {t('whatsapp.sourceGroup', 'Grup Declanșator')}
              </label>
              <select
                value={sourceGroupJid}
                onChange={e => setSourceGroupJid(e.target.value)}
                className={inputClass('sourceGroupJid')}
              >
                <option value="">{t('whatsapp.allGroups', 'Toate grupurile')}</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.subject}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Rule Name */}
          <div>
            <label className="block text-xs font-semibold mb-1 text-zinc-400">
              {t('whatsapp.ruleName', 'Nume Regulă')}
            </label>
            <input
              type="text"
              value={name}
              onChange={e => {
                setName(e.target.value);
                setInvalidFields(prev => ({ ...prev, name: false }));
              }}
              placeholder={t('whatsapp.ruleNamePlaceholder', 'Ex: Memento Tură Voluntar')}
              className={inputClass('name')}
            />
          </div>

          {/* PWA Specific: Title Template & Action URL */}
          {channel === 'PWA' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1 text-zinc-400">
                  {t('pwa.titleTemplate', 'Titlu Notificare')}
                </label>
                <input
                  type="text"
                  value={titleTemplate}
                  onChange={e => {
                    setTitleTemplate(e.target.value);
                    setInvalidFields(prev => ({ ...prev, titleTemplate: false }));
                  }}
                  placeholder="Ex: Reminder Tură: {shiftName}"
                  className={inputClass('titleTemplate')}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-zinc-400">
                  {t('pwa.actionUrl', 'Link Redirecționare')}
                </label>
                <input
                  type="text"
                  value={actionUrl}
                  onChange={e => setActionUrl(e.target.value)}
                  placeholder="/dashboard/general"
                  className={inputClass('actionUrl')}
                />
              </div>
            </div>
          )}

          {/* Recipient Target Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-zinc-400">
                {t('whatsapp.targetRecipientType', 'Destinatar Notificare')}
              </label>
              <select
                value={targetRecipientType}
                onChange={e => setTargetRecipientType(e.target.value)}
                className={inputClass('targetRecipientType')}
              >
                {channel === 'WHATSAPP' ? (
                  ruleType === 'GROUP_MEMBER_JOIN' ? (
                    <>
                      <option value="TRIGGER_GROUP">{t('whatsapp.recipientTriggerGroup', 'Grupul în care a intrat')}</option>
                      <option value="JOINED_USER_DIRECT">{t('whatsapp.recipientJoinedUserDirect', 'Membru Direct (WhatsApp Privat)')}</option>
                      <option value="COORDINATOR_GROUP">{t('whatsapp.recipientGroup', 'Grup WhatsApp Coordonatori')}</option>
                      <option value="SPECIFIC_PHONE">{t('whatsapp.recipientSpecificPhone', 'Număr / Grup Personalizat')}</option>
                    </>
                  ) : (
                    <>
                      <option value="COORDINATOR_GROUP">{t('whatsapp.recipientGroup', 'Grup WhatsApp Coordonatori')}</option>
                      <option value="VOLUNTEER_DIRECT">{t('whatsapp.recipientDirect', 'Voluntar Direct (Telefon)')}</option>
                      <option value="TASK_ASSIGNEES">{t('whatsapp.recipientTaskAssignees', 'Membri Asignați Sarcină')}</option>
                      <option value="SPECIFIC_PHONE">{t('whatsapp.recipientSpecificPhone', 'Număr / Grup Personalizat')}</option>
                    </>
                  )
                ) : (
                  <>
                    <option value="ALL_USERS">{t('pwa.recipientAll', 'Toți Membrii Activi')}</option>
                    <option value="VOLUNTEER_DIRECT">{t('pwa.recipientVolunteerDirect', 'Voluntar Direct')}</option>
                    <option value="TASK_ASSIGNEES">{t('pwa.recipientTaskAssignees', 'Membri Asignați Sarcină')}</option>
                    <option value="SPECIFIC_ROLE">{t('pwa.recipientRole', 'Rol Specific')}</option>
                    <option value="SPECIFIC_USER">{t('pwa.recipientUser', 'Utilizator Specific')}</option>
                    <option value="SPECIFIC_STAND">{t('pwa.recipientStand', 'Stand Specific')}</option>
                  </>
                )}
              </select>
            </div>

            {/* Custom Recipient Contextual Selector */}
            {channel === 'WHATSAPP' && (targetRecipientType === 'COORDINATOR_GROUP' || targetRecipientType === 'GROUP') && groups.length > 0 && (
              <div>
                <label className="block text-xs font-semibold mb-1 text-zinc-400">
                  {t('whatsapp.selectGroup', 'Selectează Grup WhatsApp')}
                </label>
                <select
                  value={customRecipient}
                  onChange={e => setCustomRecipient(e.target.value)}
                  className={inputClass('customRecipient')}
                >
                  <option value="">{t('whatsapp.defaultGroup', 'Grup Implicit')}</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.subject}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {targetRecipientType === 'SPECIFIC_PHONE' && (
              <div>
                <label className="block text-xs font-semibold mb-1 text-zinc-400">
                  {t('whatsapp.customJid', 'Număr Telefon / JID Grup')}
                </label>
                <input
                  type="text"
                  value={customRecipient}
                  onChange={e => setCustomRecipient(e.target.value)}
                  placeholder="407xxxxxxxx sau group-id@g.us"
                  className={inputClass('customRecipient')}
                />
              </div>
            )}

            {targetRecipientType === 'SPECIFIC_ROLE' && (
              <div>
                <label className="block text-xs font-semibold mb-1 text-zinc-400">
                  {t('table.primaryRole', 'Rol')}
                </label>
                <select
                  value={customRecipient}
                  onChange={e => setCustomRecipient(e.target.value)}
                  className={inputClass('customRecipient')}
                >
                  <option value="">{t('common.select', 'Selectează...')}</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {targetRecipientType === 'SPECIFIC_USER' && (
              <div>
                <label className="block text-xs font-semibold mb-1 text-zinc-400">
                  {t('table.user', 'Utilizator')}
                </label>
                <select
                  value={customRecipient}
                  onChange={e => setCustomRecipient(e.target.value)}
                  className={inputClass('customRecipient')}
                >
                  <option value="">{t('common.select', 'Selectează...')}</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {targetRecipientType === 'SPECIFIC_STAND' && (
              <div>
                <label className="block text-xs font-semibold mb-1 text-zinc-400">
                  {t('table.stand', 'Stand')}
                </label>
                <select
                  value={customRecipient}
                  onChange={e => setCustomRecipient(e.target.value)}
                  className={inputClass('customRecipient')}
                >
                  <option value="">{t('common.select', 'Selectează...')}</option>
                  {stands.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.locationName} - {s.eventName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Placeholders Quick Click Chips */}
          {selectedTriggerDef?.placeholders && selectedTriggerDef.placeholders.length > 0 && (
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-zinc-400">
                {t('whatsapp.availablePlaceholders', 'Variabile Disponibile')}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {selectedTriggerDef.placeholders.map(p => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => handleInsertPlaceholder(p.key)}
                    title={getPlaceholderDescription(t, p.key, p.description)}
                    className={`px-2 py-1 text-[11px] font-mono rounded-lg border transition cursor-pointer ${
                      isDarkMode
                        ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-blue-400 hover:border-zinc-700'
                        : 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700'
                    }`}
                  >
                    {p.key}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Templates Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-zinc-400">
                {t('whatsapp.messageTemplates', 'Șabloane Mesaj')}
              </label>
              <div className="flex items-center space-x-1">
                {templates.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveTemplateIndex(idx)}
                    className={`px-2 py-0.5 text-xs font-bold rounded-md transition cursor-pointer ${
                      activeTemplateIndex === idx
                        ? 'bg-blue-600 text-white'
                        : isDarkMode
                        ? 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                        : 'bg-zinc-200 text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    #{idx + 1}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleAddTemplate}
                  title={t('whatsapp.addTemplateVariation', 'Adaugă Variațiune')}
                  className="p-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                {templates.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTemplate(activeTemplateIndex)}
                    title={t('whatsapp.removeTemplateVariation', 'Șterge Variațiune')}
                    className="p-1 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <textarea
              rows={4}
              value={templates[activeTemplateIndex] || ''}
              onChange={e => handleTemplateChange(e.target.value)}
              placeholder={t('whatsapp.templatePlaceholder', 'Introduceți conținutul mesajului cu variabile {nume}...')}
              className={`w-full p-3 text-xs rounded-xl border outline-hidden resize-none transition ${
                isDarkMode
                  ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700 focus:border-zinc-700'
                  : 'bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400 focus:border-zinc-400'
              } ${invalidFields.templates ? 'border-rose-500/80 ring-1 ring-rose-500/40' : ''}`}
            />
          </div>

          {/* Timings & Conditions Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {selectedTriggerDef?.supportsTiming && (
              <div>
                <label className="block text-xs font-semibold mb-1 text-zinc-400">
                  {t('whatsapp.triggerTimingMinutes', 'Înainte cu (minute)')}
                </label>
                <input
                  type="number"
                  min={0}
                  value={triggerTimingMinutes}
                  onFocus={(e) => e.target.select()}
                  onChange={e => {
                    const clean = e.target.value.replace(/^0+(?=\d)/, '');
                    setTriggerTimingMinutes(clean === '' ? '' : Math.max(0, Number(clean)));
                  }}
                  className={inputClass('triggerTimingMinutes')}
                />
              </div>
            )}

            {selectedTriggerDef?.supportsMinCapacity && (
              <div>
                <label className="block text-xs font-semibold mb-1 text-zinc-400">
                  {t('whatsapp.minCapacityThreshold', 'Prag Minim')}
                </label>
                <input
                  type="number"
                  min={0}
                  value={minCapacityThreshold}
                  onFocus={(e) => e.target.select()}
                  onChange={e => {
                    const clean = e.target.value.replace(/^0+(?=\d)/, '');
                    setMinCapacityThreshold(clean === '' ? '' : Math.max(0, Number(clean)));
                  }}
                  className={inputClass('minCapacityThreshold')}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold mb-1 text-zinc-400">
                {t('whatsapp.cooldownMinutes', 'Cooldown (minute)')}
              </label>
              <input
                type="number"
                min={0}
                value={cooldownMinutes}
                onFocus={(e) => e.target.select()}
                onChange={e => {
                  const clean = e.target.value.replace(/^0+(?=\d)/, '');
                  setCooldownMinutes(clean === '' ? '' : Math.max(0, Number(clean)));
                }}
                className={inputClass('cooldownMinutes')}
              />
            </div>
          </div>

          {/* Active Switch Toggle */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <span className="text-xs font-bold">{t('table.state', 'Stare Regulă')}</span>
            </div>
            <button
              type="button"
              onClick={() => setActive(!active)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                active ? 'bg-emerald-600' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  active ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </form>

        {/* Inset Divider 2 */}
        <div className={`mx-5 sm:mx-6 border-t ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`} />

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="text-xs text-rose-400 font-medium truncate pr-2">
            {errorSummary}
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50 flex items-center space-x-2 shrink-0"
          >
            <span>{isSaving ? t('common.saving', 'Se salvează...') : t('common.save', 'Salvează')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
