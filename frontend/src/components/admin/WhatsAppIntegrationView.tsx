import React, { useState, useEffect, useCallback } from 'react';
import { whatsappService } from '../../services/whatsappService';
import { WhatsAppPairingModal } from './WhatsAppPairingModal';
import { NotificationRuleModal } from './NotificationRuleModal';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { DEFAULT_TRIGGERS } from '../../types/whatsapp';
import type { WhatsAppConnectionStatus, NotificationRule, NotificationCategory, TriggerDefinition, WhatsAppManualAudience } from '../../types/whatsapp';
import { useLanguage } from '../../context/LanguageContext';
import { getTriggerName } from '../../utils/notificationHelpers';
import { Pencil, Trash2 } from 'lucide-react';

interface WhatsAppIntegrationViewProps {
  isDarkMode: boolean;
  canWrite?: boolean;
  categoryFilter?: string;
  searchQuery?: string;
  onShowToast: (text: string, type?: 'success' | 'error') => void;
}

export const WhatsAppIntegrationView: React.FC<WhatsAppIntegrationViewProps> = ({
  isDarkMode,
  canWrite = true,
  categoryFilter = 'ALL',
  searchQuery = '',
  onShowToast,
}) => {
  const { t } = useLanguage();
  const [status, setStatus] = useState<WhatsAppConnectionStatus>('DISCONNECTED');
  const [isPairingModalOpen, setIsPairingModalOpen] = useState<boolean>(false);

  // Notification Rules & Triggers State
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [triggers, setTriggers] = useState<TriggerDefinition[]>(DEFAULT_TRIGGERS);
  const [groups, setGroups] = useState<import('../../types/whatsapp').WhatsAppGroupInfo[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; fullName: string; email: string; phone?: string }>>([]);
  const [roles, setRoles] = useState<Array<{ id: string; label: string }>>([]);
  const [activeStands, setActiveStands] = useState<Array<{ id: string; locationName: string; eventName: string; eventDate: string; status: string; volunteersCount?: number }>>([]);
  const [isLoadingRules, setIsLoadingRules] = useState<boolean>(false);

  // Modal states
  const [selectedRuleForEdit, setSelectedRuleForEdit] = useState<NotificationRule | null>(null);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState<boolean>(false);

  // Delete Confirmation state
  const [ruleToDelete, setRuleToDelete] = useState<NotificationRule | null>(null);
  const [isDeletingRule, setIsDeletingRule] = useState<boolean>(false);

  // Manual message form
  const [manualAudience, setManualAudience] = useState<WhatsAppManualAudience>('DIRECT');
  const [testPhone, setTestPhone] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedStandId, setSelectedStandId] = useState<string>('');
  const [testMessage, setTestMessage] = useState<string>('');
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await whatsappService.getStatus();
      setStatus(res.status);
      if (res.status === 'CONNECTED') {
        whatsappService.getGroups().then(g => setGroups(g || [])).catch(() => {});
      }
    } catch (err: any) {
      setStatus('DISCONNECTED');
      onShowToast(err.message || t('whatsapp.statusFetchError', 'Eroare la verificarea conexiunii WhatsApp'), 'error');
    }
  }, [onShowToast, t]);

  const loadTriggersAndRules = useCallback(async () => {
    setIsLoadingRules(true);
    try {
      const [fetchedTriggers, fetchedRules, fetchedGroups, fetchedUsers, fetchedRoles, fetchedStands] = await Promise.all([
        whatsappService.getTriggers().catch(() => DEFAULT_TRIGGERS),
        whatsappService.getRules().catch(() => []),
        whatsappService.getGroups().catch(() => []),
        whatsappService.getUsers().catch(() => []),
        whatsappService.getRoles().catch(() => []),
        whatsappService.getActiveStands().catch(() => []),
      ]);
      setTriggers(fetchedTriggers && fetchedTriggers.length > 0 ? fetchedTriggers : DEFAULT_TRIGGERS);
      setRules(fetchedRules);
      setGroups(fetchedGroups);
      setUsers(fetchedUsers);
      setRoles(fetchedRoles);
      setActiveStands(fetchedStands);
    } catch (err: any) {
      onShowToast(err.message || t('whatsapp.rulesFetchError', 'Eroare la încărcarea regulilor de notificare'), 'error');
    } finally {
      setIsLoadingRules(false);
    }
  }, [onShowToast, t]);

  useEffect(() => {
    fetchStatus();
    loadTriggersAndRules();
  }, [fetchStatus, loadTriggersAndRules]);

  const handleToggleRule = async (rule: NotificationRule) => {
    try {
      const updated = await whatsappService.toggleRule(rule.id, !rule.active);
      setRules(prev => prev.map(r => r.id === rule.id ? updated : r));
      onShowToast(t('whatsapp.ruleToggledSuccess', 'Starea regulii a fost actualizată!'));
    } catch (err: any) {
      onShowToast(err.message || t('whatsapp.ruleToggleError', 'Eroare la modificarea stării'), 'error');
    }
  };

  const handleSaveRule = async (payload: Partial<NotificationRule>, id?: string) => {
    try {
      if (id) {
        const saved = await whatsappService.updateRule(id, payload);
        setRules(prev => prev.map(r => r.id === id ? saved : r));
        onShowToast(t('whatsapp.ruleUpdatedSuccess', 'Regula de notificare a fost salvată cu succes!'));
      } else {
        const created = await whatsappService.createRule(payload);
        setRules(prev => [created, ...prev]);
        onShowToast(t('whatsapp.ruleCreatedSuccess', 'Regula nouă de notificare a fost creată cu succes!'));
      }
    } catch (err: any) {
      onShowToast(err.message || t('whatsapp.ruleSaveError', 'Eroare la salvarea regulii'), 'error');
      throw err;
    }
  };

  const handleConfirmDelete = async () => {
    if (!ruleToDelete) return;
    setIsDeletingRule(true);
    try {
      await whatsappService.deleteRule(ruleToDelete.id);
      setRules(prev => prev.filter(r => r.id !== ruleToDelete.id));
      onShowToast(t('whatsapp.ruleDeletedSuccess', 'Regula a fost ștearsă cu succes!'));
      setRuleToDelete(null);
    } catch (err: any) {
      onShowToast(err.message || t('whatsapp.ruleDeleteError', 'Eroare la ștergerea regulii'), 'error');
    } finally {
      setIsDeletingRule(false);
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testMessage.trim()) {
      onShowToast(t('whatsapp.testGroupValidation', 'Introduceți conținutul mesajului.'), 'error');
      return;
    }

    let targetVal: string | undefined = undefined;
    if (manualAudience === 'DIRECT') {
      if (!testPhone.trim()) {
        onShowToast(t('whatsapp.testFormValidation', 'Introduceți numărul de telefon și mesajul.'), 'error');
        return;
      }
      targetVal = testPhone.trim();
    } else if (manualAudience === 'SPECIFIC_USER') {
      if (!selectedUserId) {
        onShowToast(t('pwa.testUserValidation', 'Selectați un voluntar destinatar.'), 'error');
        return;
      }
      targetVal = selectedUserId;
    } else if (manualAudience === 'WHATSAPP_GROUP') {
      if (!selectedGroupId) {
        onShowToast(t('whatsapp.selectGroupPlaceholder', 'Selectați un grup WhatsApp...'), 'error');
        return;
      }
      targetVal = selectedGroupId;
    } else if (manualAudience === 'SPECIFIC_ROLE') {
      if (!selectedRole) {
        onShowToast(t('pwa.selectRolePlaceholder', 'Selectați un rol...'), 'error');
        return;
      }
      targetVal = selectedRole;
    } else if (manualAudience === 'SPECIFIC_STAND') {
      if (!selectedStandId) {
        onShowToast(t('pwa.selectStandPlaceholder', 'Selectați un stand activ...'), 'error');
        return;
      }
      targetVal = selectedStandId;
    }

    setIsSendingTest(true);
    try {
      const res = await whatsappService.sendManualMessage({
        targetAudience: manualAudience,
        targetValue: targetVal,
        phone: manualAudience === 'DIRECT' ? testPhone.trim() : undefined,
        userId: manualAudience === 'SPECIFIC_USER' ? selectedUserId : undefined,
        to: manualAudience === 'DIRECT' ? testPhone.trim() : targetVal,
        message: testMessage.trim(),
      });
      if (res.success) {
        onShowToast(t('whatsapp.testSentSuccess', 'Mesajul a fost adăugat în coadă cu succes!'));
        if (manualAudience === 'DIRECT') {
          setTestPhone('');
        }
        setTestMessage('');
      } else {
        onShowToast(res.error || t('whatsapp.testSendError', 'Eroare la trimiterea mesajului'), 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || t('whatsapp.testSendError', 'Eroare la trimiterea mesajului'), 'error');
    } finally {
      setIsSendingTest(false);
    }
  };

  const css = {
    card: isDarkMode ? 'bg-zinc-950 border-zinc-850' : 'bg-white border-zinc-200 shadow-xs',
    input: isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500' : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400',
    itemBox: isDarkMode ? 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700' : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300',
    snippetBox: isDarkMode ? 'bg-zinc-950/80 border-zinc-800/80 text-zinc-400' : 'bg-white border-zinc-200 text-zinc-600',
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'CONNECTED':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>{t('whatsapp.statusConnected', 'Conectat & Activ')}</span>
          </span>
        );
      case 'PAIRING_REQUIRED':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span>{t('whatsapp.statusPairing', 'Scanare QR Necesară')}</span>
          </span>
        );
      case 'DISCONNECTED':
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            <span>{t('whatsapp.statusDisconnected', 'Deconectat')}</span>
          </span>
        );
    }
  };

  const effectiveCategory = categoryFilter || 'ALL';
  const effectiveSearch = (searchQuery || '').trim().toLowerCase();

  const filteredRules = rules.filter(r => {
    if (effectiveCategory !== 'ALL' && r.category !== effectiveCategory && !(effectiveCategory === 'HR' && (r.category as string) === 'VOLUNTEER')) {
      return false;
    }
    if (effectiveSearch) {
      const matchName = r.name?.toLowerCase().includes(effectiveSearch);
      const matchType = r.ruleType?.toLowerCase().includes(effectiveSearch) || getTriggerName(t, r.ruleType).toLowerCase().includes(effectiveSearch);
      const matchTemplates = r.templates?.some(tmpl => tmpl.toLowerCase().includes(effectiveSearch));
      if (!matchName && !matchType && !matchTemplates) {
        return false;
      }
    }
    return true;
  });

  const getCategoryBadge = (cat: NotificationCategory | string) => {
    switch (cat) {
      case 'HR':
      case 'VOLUNTEER':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">HR</span>;
      case 'LOGISTICS':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">{t('whatsapp.categoryLogistics', 'Logistică')}</span>;
      case 'FINANCE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">{t('whatsapp.categoryFinance', 'Finanțe')}</span>;
      case 'GENERAL':
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">{cat}</span>;
    }
  };

  const getRecipientLabel = (type: string, custom?: string) => {
    if (custom) {
      const found = groups.find(g => g.id === custom);
      if (found) return found.subject;
      return custom;
    }
    if (type === 'VOLUNTEER_DIRECT' || type === 'DIRECT') {
      return t('whatsapp.recipientDirect', 'Mesaj Direct (Personal)');
    }
    const found = groups.find(g => g.id === type);
    if (found) return found.subject;
    if (type === 'COORDINATOR_GROUP') {
      return t('whatsapp.recipientCoordinatorGroup', 'Grup Coordonatori');
    }
    if (type === 'ADMIN_GROUP') {
      return t('whatsapp.recipientAdminGroup', 'Grup Administratori');
    }
    return type;
  };

  return (
    <div className="space-y-4">
      {/* Unified Notification Rules & Status Container */}
      <div className={`p-4 sm:p-5 rounded-2xl border ${css.card} space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {getStatusBadge()}
          </div>

          <div className="flex items-center gap-2">
            {canWrite && (
              <button
                type="button"
                onClick={() => setIsPairingModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {t('whatsapp.pairButton', 'Asociază WhatsApp (QR)')}
              </button>
            )}

            {canWrite && (
              <button
                type="button"
                onClick={() => {
                  setSelectedRuleForEdit(null);
                  setIsRuleModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition cursor-pointer flex items-center space-x-1.5"
              >
                <span>{t('whatsapp.newRule', 'Regulă Nouă')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Card Grid View */}
        {isLoadingRules ? (
          <div className="py-12 text-center text-zinc-500">
            <p>{t('general.loading', 'Se încarcă datele...')}</p>
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">
            <p>{t('whatsapp.noRulesFound', 'Nu s-au găsit reguli de notificare configurate.')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredRules.map(rule => (
              <div key={rule.id} className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${css.itemBox}`}>
                <div className="space-y-3">
                  {/* Card Header: Category & Active Pill */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      {getCategoryBadge(rule.category)}
                      <span className="text-[10px] font-mono text-zinc-500 truncate max-w-[130px]" title={rule.ruleType}>
                        {rule.ruleType}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleRule(rule)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer flex items-center space-x-1 ${
                        rule.active
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${rule.active ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                      <span>{rule.active ? t('whatsapp.ruleActive', 'Activ') : t('whatsapp.ruleInactive', 'Dezactivat')}</span>
                    </button>
                  </div>

                  {/* Rule Name */}
                  <h4 className="font-bold text-xs text-zinc-100 line-clamp-1" title={rule.name}>
                    {rule.name}
                  </h4>

                  {/* Rule Parameters Badge Grid */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-300 pt-1">
                    {/* Timing */}
                    <div className="flex items-center space-x-1.5">
                      <span className="truncate">
                        {rule.triggerTimingMinutes > 0
                          ? `${rule.triggerTimingMinutes} ${t('whatsapp.timingMinutes', 'min')}`
                          : t('whatsapp.instant', 'Instant')}
                      </span>
                    </div>

                    {/* Deficit / Capacity */}
                    <div className="flex items-center space-x-1.5">
                      <span className="truncate">
                        {rule.minCapacityThreshold !== undefined && rule.minCapacityThreshold > 0
                          ? `${t('whatsapp.thresholdPrefix', 'Prag')} ≥ ${rule.minCapacityThreshold}`
                          : t('whatsapp.noThreshold', 'Fără prag')}
                      </span>
                    </div>

                    {/* Recipient */}
                    <div className="flex items-center space-x-1.5 col-span-2">
                      <span className="text-zinc-300 truncate" title={getRecipientLabel(rule.targetRecipientType, rule.customRecipientJid)}>
                        {getRecipientLabel(rule.targetRecipientType, rule.customRecipientJid)}
                      </span>
                    </div>
                  </div>

                  {/* Template Snippet Preview */}
                  <div className={`p-2.5 rounded-xl border text-[11px] font-mono leading-relaxed space-y-1.5 ${css.snippetBox}`}>
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 font-sans">
                      <div className="flex items-center space-x-1 text-blue-400 font-bold">
                        <span>{rule.templates?.length || 0} {t('whatsapp.templatesCount', 'șabloane active')}</span>
                      </div>
                      <span>{rule.cooldownMinutes > 0 ? `${rule.cooldownMinutes} min cooldown` : t('whatsapp.noCooldown', 'Fără cooldown')}</span>
                    </div>

                    {rule.templates && rule.templates.length > 0 && (
                      <p className="line-clamp-2 text-zinc-300">
                        {rule.templates[0]}
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Footer: Action Triggers */}
                {canWrite && (
                  <div className="flex items-center justify-end space-x-1 pt-3 mt-3 border-t border-zinc-800/40">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRuleForEdit(rule);
                        setIsRuleModalOpen(true);
                      }}
                      title={t('whatsapp.editRule', 'Editare Regulă Notificare')}
                      className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRuleToDelete(rule)}
                      title={t('whatsapp.deleteRule', 'Șterge Regulă')}
                      className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual Notification Dispatch Card */}
      <div className={`p-4 sm:p-5 rounded-2xl border ${css.card} space-y-3`}>
        <h3 className="font-bold text-sm text-zinc-100">
          {t('whatsapp.quickTestTitle', 'Notificare Manuală WhatsApp')}
        </h3>
        <form onSubmit={handleSendTest} className="space-y-3">
          <div className={`grid grid-cols-1 ${manualAudience === 'ALL_USERS' ? 'md:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'} gap-3 items-start`}>
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                {t('whatsapp.targetRecipientType', 'Destinatar')}
              </label>
              <select
                value={manualAudience}
                onChange={(e) => {
                  const val = e.target.value as WhatsAppManualAudience;
                  setManualAudience(val);
                  if (val === 'SPECIFIC_USER' && !selectedUserId && users.length > 0) {
                    setSelectedUserId(users[0].id);
                  } else if (val === 'WHATSAPP_GROUP' && !selectedGroupId && groups.length > 0) {
                    setSelectedGroupId(groups[0].id);
                  } else if (val === 'SPECIFIC_ROLE' && !selectedRole && roles.length > 0) {
                    setSelectedRole(roles[0].id);
                  } else if (val === 'SPECIFIC_STAND' && !selectedStandId && activeStands.length > 0) {
                    setSelectedStandId(activeStands[0].id);
                  }
                }}
                className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${css.input}`}
              >
                <option value="DIRECT">{t('whatsapp.recipientDirectPhone', 'Număr de Telefon Direct')}</option>
                <option value="SPECIFIC_USER">{t('pwa.recipientSpecificUser', 'Voluntar Specific')}</option>
                <option value="WHATSAPP_GROUP">{t('whatsapp.recipientWhatsAppGroup', 'Grup WhatsApp')}</option>
                <option value="ALL_USERS">{t('pwa.recipientAll', 'Toți Utilizatorii')}</option>
                <option value="SPECIFIC_ROLE">{t('pwa.recipientSpecificRole', 'Rol Specific')}</option>
                <option value="SPECIFIC_STAND">{t('pwa.recipientSpecificStand', 'Stand Specific (În desfășurare)')}</option>
              </select>
            </div>

            {manualAudience === 'DIRECT' && (
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                  {t('whatsapp.testPhoneLabel', 'Număr de Telefon Destinatar')}
                </label>
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="07xxxxxxxx / 407xxxxxxxx"
                  className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${css.input}`}
                />
              </div>
            )}

            {manualAudience === 'SPECIFIC_USER' && (
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                  {t('pwa.selectVolunteer', 'Selectează Voluntar')}
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${css.input}`}
                >
                  <option value="">{t('pwa.selectUserPlaceholder', 'Selectați un voluntar...')}</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName || u.email} {u.phone ? `(${u.phone})` : `(${u.email})`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {manualAudience === 'WHATSAPP_GROUP' && (
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                  {t('whatsapp.selectGroup', 'Selectează Grup WhatsApp')}
                </label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${css.input}`}
                >
                  <option value="">{t('whatsapp.selectGroupPlaceholder', 'Selectați un grup WhatsApp...')}</option>
                  {groups && groups.length > 0 ? (
                    groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.subject}
                      </option>
                    ))
                  ) : (
                    <option disabled value="">
                      {t('whatsapp.noGroupsAvailable', 'Niciun grup conectat găsit')}
                    </option>
                  )}
                </select>
              </div>
            )}

            {manualAudience === 'SPECIFIC_ROLE' && (
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                  {t('pwa.selectRole', 'Selectează Rol')}
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${css.input}`}
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

            {manualAudience === 'SPECIFIC_STAND' && (
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                  {t('pwa.selectStand', 'Selectează Stand')}
                </label>
                <select
                  value={selectedStandId}
                  onChange={(e) => setSelectedStandId(e.target.value)}
                  className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${css.input}`}
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

            <div>
              <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                {t('whatsapp.testMessageLabel', 'Conținut Mesaj')}
              </label>
              <input
                type="text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder={t('whatsapp.testMessagePlaceholder', 'Introduceți conținutul mesajului...')}
                className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${css.input}`}
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            {status !== 'CONNECTED' ? (
              <p className="text-[11px] text-amber-400">
                {t('whatsapp.connectRequiredNotice', 'Asociază WhatsApp pentru a putea trimite mesaje.')}
              </p>
            ) : (
              <div />
            )}

            <button
              type="submit"
              disabled={isSendingTest || status !== 'CONNECTED' || !canWrite}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition cursor-pointer disabled:opacity-50"
            >
              {isSendingTest ? t('whatsapp.sending', 'Se trimite...') : t('whatsapp.sendTestBtn', 'Trimite Mesaj')}
            </button>
          </div>
        </form>
      </div>

      {/* Modular Rule Modal (Create & Edit) */}
      <NotificationRuleModal
        isOpen={isRuleModalOpen}
        onClose={() => {
          setIsRuleModalOpen(false);
          setSelectedRuleForEdit(null);
        }}
        rule={selectedRuleForEdit ? { ...selectedRuleForEdit, channel: 'WHATSAPP' } as any : null}
        triggers={triggers as any}
        groups={groups}
        isDarkMode={isDarkMode}
        onSave={handleSaveRule as any}
      />

      {/* Delete Rule Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!ruleToDelete}
        onClose={() => setRuleToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={t('whatsapp.deleteRuleConfirmTitle', 'Confirmare Ștergere Regulă')}
        message={t('whatsapp.deleteRuleConfirmMessage', `Sigur doriți să ștergeți regula de notificare "${ruleToDelete?.name}"? Această acțiune nu poate fi anulată.`)}
        confirmText={t('common.delete', 'Șterge')}
        cancelText={t('common.cancel', 'Anulează')}
        variant="danger"
        isLoading={isDeletingRule}
        isDarkMode={isDarkMode}
      />

      {/* Pairing Modal */}
      <WhatsAppPairingModal
        isOpen={isPairingModalOpen}
        onClose={() => {
          setIsPairingModalOpen(false);
          fetchStatus();
          loadTriggersAndRules();
        }}
        isDarkMode={isDarkMode}
        onStatusChange={(newStatus) => {
          setStatus(newStatus);
          if (newStatus === 'CONNECTED') {
            loadTriggersAndRules();
          }
        }}
      />
    </div>
  );
};
