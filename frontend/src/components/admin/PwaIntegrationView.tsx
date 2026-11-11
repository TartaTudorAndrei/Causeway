import React, { useState, useEffect, useCallback } from 'react';
import { pwaNotificationService } from '../../services/pwaNotificationService';
import { PwaNotificationRuleModal } from './PwaNotificationRuleModal';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { DEFAULT_PWA_TRIGGERS } from '../../types/pwa';
import type {
  PwaConnectionStatus,
  PwaNotificationRule,
  PwaCategory,
  PwaTriggerDefinition,
  PwaTestAudience,
} from '../../types/pwa';
import { useLanguage } from '../../context/LanguageContext';
import { useTenant } from '../../context/TenantContext';
import { getTriggerName } from '../../utils/notificationHelpers';
import { Pencil, Trash2 } from 'lucide-react';

interface PwaIntegrationViewProps {
  isDarkMode: boolean;
  canWrite?: boolean;
  categoryFilter?: string;
  searchQuery?: string;
  onShowToast: (text: string, type?: 'success' | 'error') => void;
}

export const PwaIntegrationView: React.FC<PwaIntegrationViewProps> = ({
  isDarkMode,
  canWrite = true,
  categoryFilter = 'ALL',
  searchQuery = '',
  onShowToast,
}) => {
  const { t } = useLanguage();
  const { tenant } = useTenant();
  const [status, setStatus] = useState<PwaConnectionStatus>('NOT_CONFIGURED');
  const [subscribersCount, setSubscribersCount] = useState<number>(0);

  // Notification Rules & Triggers State
  const [rules, setRules] = useState<PwaNotificationRule[]>([]);
  const [triggers, setTriggers] = useState<PwaTriggerDefinition[]>(DEFAULT_PWA_TRIGGERS);
  const [isLoadingRules, setIsLoadingRules] = useState<boolean>(false);

  // Modal states
  const [selectedRuleForEdit, setSelectedRuleForEdit] = useState<PwaNotificationRule | null>(null);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState<boolean>(false);

  // Delete Confirmation state
  const [ruleToDelete, setRuleToDelete] = useState<PwaNotificationRule | null>(null);
  const [isDeletingRule, setIsDeletingRule] = useState<boolean>(false);

  // Test push notification form
  const [testAudience, setTestAudience] = useState<PwaTestAudience>('CURRENT_DEVICE');
  const [users, setUsers] = useState<Array<{ id: string; fullName: string; email: string }>>([]);
  const [roles, setRoles] = useState<Array<{ id: string; label: string }>>([]);
  const [activeStands, setActiveStands] = useState<Array<{ id: string; locationName: string; eventName: string; eventDate: string; status: string; volunteersCount?: number }>>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedStandId, setSelectedStandId] = useState<string>('');
  const [testTitle, setTestTitle] = useState<string>('');
  const [testBody, setTestBody] = useState<string>('');
  const [testUrl, setTestUrl] = useState<string>('/dashboard/general');
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await pwaNotificationService.getStatus();
      setStatus(res.status);
      setSubscribersCount(res.activeSubscribersCount || 0);
    } catch {
      setStatus('NOT_CONFIGURED');
    }
  }, []);

  const loadTriggersAndRules = useCallback(async () => {
    setIsLoadingRules(true);
    try {
      const [fetchedTriggers, fetchedRules] = await Promise.all([
        pwaNotificationService.getTriggers().catch(() => DEFAULT_PWA_TRIGGERS),
        pwaNotificationService.getRules().catch(() => []),
      ]);
      setTriggers(fetchedTriggers && fetchedTriggers.length > 0 ? fetchedTriggers : DEFAULT_PWA_TRIGGERS);
      setRules(fetchedRules);
    } catch (err: any) {
      onShowToast(err.message || t('pwa.rulesFetchError', 'Eroare la încărcarea regulilor PWA'), 'error');
    } finally {
      setIsLoadingRules(false);
    }
  }, [onShowToast, t]);

  const loadAuxData = useCallback(async () => {
    try {
      const [fetchedUsers, fetchedRoles, fetchedStands] = await Promise.all([
        pwaNotificationService.getUsers().catch(() => []),
        pwaNotificationService.getRoles().catch(() => []),
        pwaNotificationService.getActiveStands().catch(() => []),
      ]);
      setUsers(fetchedUsers);
      setRoles(fetchedRoles);
      setActiveStands(fetchedStands);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    loadTriggersAndRules();
    loadAuxData();
  }, [fetchStatus, loadTriggersAndRules, loadAuxData]);

  const handleToggleRule = async (rule: PwaNotificationRule) => {
    try {
      const updated = await pwaNotificationService.toggleRule(rule.id, !rule.active);
      setRules(prev => prev.map(r => r.id === rule.id ? updated : r));
      onShowToast(t('pwa.ruleToggledSuccess', 'Starea regulii a fost actualizată!'));
    } catch (err: any) {
      onShowToast(err.message || t('pwa.ruleToggleError', 'Eroare la modificarea stării'), 'error');
    }
  };

  const handleSaveRule = async (payload: Partial<PwaNotificationRule>, id?: string) => {
    try {
      if (id) {
        const saved = await pwaNotificationService.updateRule(id, payload);
        setRules(prev => prev.map(r => r.id === id ? saved : r));
        onShowToast(t('pwa.ruleUpdatedSuccess', 'Regula de notificare PWA a fost salvată cu succes!'));
      } else {
        const created = await pwaNotificationService.createRule(payload);
        setRules(prev => [created, ...prev]);
        onShowToast(t('pwa.ruleCreatedSuccess', 'Regula nouă de notificare PWA a fost creată cu succes!'));
      }
    } catch (err: any) {
      onShowToast(err.message || t('pwa.ruleSaveError', 'Eroare la salvarea regulii'), 'error');
      throw err;
    }
  };

  const handleConfirmDelete = async () => {
    if (!ruleToDelete) return;
    setIsDeletingRule(true);
    try {
      await pwaNotificationService.deleteRule(ruleToDelete.id);
      setRules(prev => prev.filter(r => r.id !== ruleToDelete.id));
      onShowToast(t('pwa.ruleDeletedSuccess', 'Regula a fost ștearsă cu succes!'));
      setRuleToDelete(null);
    } catch (err: any) {
      onShowToast(err.message || t('pwa.ruleDeleteError', 'Eroare la ștergerea regulii'), 'error');
    } finally {
      setIsDeletingRule(false);
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((testAudience === 'SPECIFIC_USER' || testAudience === 'USER_DIRECT') && !selectedUserId) {
      onShowToast(t('pwa.testUserValidation', 'Selectați un voluntar destinatar.'), 'error');
      return;
    }
    if (testAudience === 'SPECIFIC_ROLE' && !selectedRole) {
      onShowToast(t('pwa.selectRolePlaceholder', 'Selectați un rol...'), 'error');
      return;
    }
    if (testAudience === 'SPECIFIC_STAND' && !selectedStandId) {
      onShowToast(t('pwa.selectStandPlaceholder', 'Selectați un stand activ...'), 'error');
      return;
    }
    if (!testTitle.trim() || !testBody.trim()) {
      onShowToast(t('pwa.testFormValidation', 'Introduceți titlul și conținutul notificării.'), 'error');
      return;
    }
    const targetUser = users.find(u => u.id === selectedUserId);
    let targetValue: string | undefined = undefined;
    if (testAudience === 'SPECIFIC_USER' || testAudience === 'USER_DIRECT') {
      targetValue = selectedUserId;
    } else if (testAudience === 'SPECIFIC_ROLE') {
      targetValue = selectedRole;
    } else if (testAudience === 'SPECIFIC_STAND') {
      targetValue = selectedStandId;
    }

    setIsSendingTest(true);
    try {
      const res = await pwaNotificationService.sendTestPush({
        targetAudience: testAudience,
        userId: (testAudience === 'SPECIFIC_USER' || testAudience === 'USER_DIRECT') ? selectedUserId : undefined,
        userEmail: (testAudience === 'SPECIFIC_USER' || testAudience === 'USER_DIRECT') ? targetUser?.email : undefined,
        targetValue,
        title: testTitle.trim(),
        body: testBody.trim(),
        actionUrl: testUrl.trim() || '/dashboard/general',
      });
      if (res.success) {
        onShowToast(t('pwa.testSentSuccess', 'Notificarea manuală a fost expediată cu succes!'));
      } else {
        onShowToast(res.error || t('pwa.testSendError', 'Eroare la trimiterea notificării'), 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || t('pwa.testSendError', 'Eroare la trimiterea notificării'), 'error');
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
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>{t('pwa.statusActive', 'Web Push Activ')}</span>
          </span>
        );
      case 'PERMISSION_DENIED':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>{t('pwa.statusDenied', 'Permisiune Refuzată')}</span>
          </span>
        );
      case 'NOT_CONFIGURED':
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>{t('pwa.statusReady', 'Pregătit')}</span>
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
      const matchTitle = r.titleTemplate?.toLowerCase().includes(effectiveSearch);
      const matchTemplates = r.templates?.some(tmpl => tmpl.toLowerCase().includes(effectiveSearch));
      if (!matchName && !matchType && !matchTitle && !matchTemplates) {
        return false;
      }
    }
    return true;
  });

  const getCategoryBadge = (cat: PwaCategory | string) => {
    switch (cat) {
      case 'HR':
      case 'VOLUNTEER':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">HR</span>;
      case 'LOGISTICS':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">{t('pwa.categoryLogistics', 'Logistică')}</span>;
      case 'FINANCE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">{t('pwa.categoryFinance', 'Finanțe')}</span>;
      case 'GENERAL':
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">{cat}</span>;
    }
  };

  const getRecipientLabel = (type: string, custom?: string) => {
    switch (type) {
      case 'SPECIFIC_USER':
      case 'USER_DIRECT': {
        if (custom) {
          const user = users.find(u => u.id === custom);
          if (user) return `${t('pwa.recipientPrefixUser', 'Voluntar')}: ${user.fullName || user.email}`;
          return `${t('pwa.recipientPrefixUser', 'Voluntar')}: ${custom}`;
        }
        return t('pwa.recipientSpecificUser', 'Voluntar Specific');
      }
      case 'ALL_USERS':
        return t('pwa.recipientAll', 'Toți Utilizatorii');
      case 'SPECIFIC_ROLE':
      case 'ROLE': {
        if (custom) {
          const r = roles.find(role => role.id === custom);
          if (r) return `${t('pwa.recipientPrefixRole', 'Rol')}: ${r.label}`;
          return `${t('pwa.recipientPrefixRole', 'Rol')}: ${custom}`;
        }
        return t('pwa.recipientSpecificRole', 'Rol Specific');
      }
      case 'SPECIFIC_STAND':
      case 'STAND': {
        if (custom) {
          const stand = activeStands.find(s => s.id === custom);
          if (stand) {
            const loc = stand.locationName || stand.eventName;
            return `${t('pwa.recipientPrefixStand', 'Stand')}: ${loc}${stand.eventDate ? ` (${stand.eventDate})` : ''}`;
          }
          return `${t('pwa.recipientPrefixStand', 'Stand')}: ${custom}`;
        }
        return t('pwa.recipientSpecificStand', 'Stand Specific (În desfășurare)');
      }
      case 'VOLUNTEERS':
      case 'VOLUNTEER_DIRECT':
        return t('pwa.recipientVolunteers', 'Voluntari');
      case 'COORDINATORS':
        return t('pwa.recipientCoordinators', 'Coordonatori');
      case 'ADMINS':
        return t('pwa.recipientAdmins', 'Admin');
      default:
        return type;
    }
  };

  return (
    <div className="space-y-4">
      {/* Unified Notification Rules & Status Container */}
      <div className={`p-4 sm:p-5 rounded-2xl border ${css.card} space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {getStatusBadge()}
            <span className="text-xs text-zinc-400">
              {subscribersCount > 0 ? `${subscribersCount} ${t('pwa.subscribersRegistered', 'dispozitive înregistrate')}` : t('pwa.pushServiceReady', 'PWA Push Gateway')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {canWrite && (
              <button
                type="button"
                onClick={() => {
                  setSelectedRuleForEdit(null);
                  setIsRuleModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition cursor-pointer flex items-center space-x-1.5"
              >
                <span>{t('pwa.newRule', 'Regulă Nouă')}</span>
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
            <p>{t('pwa.noRulesFound', 'Nu s-au găsit reguli de notificare PWA configurate.')}</p>
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
                      <span>{rule.active ? t('pwa.ruleActive', 'Activ') : t('pwa.ruleInactive', 'Dezactivat')}</span>
                    </button>
                  </div>

                  {/* Rule Name */}
                  <h4 className="font-bold text-xs text-zinc-100 line-clamp-1" title={rule.name}>
                    {rule.name}
                  </h4>

                  {/* Rule Parameters Grid */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-300 pt-1">
                    <div className="flex items-center space-x-1.5">
                      <span className="truncate">
                        {rule.triggerTimingMinutes > 0
                          ? `${rule.triggerTimingMinutes} ${t('pwa.timingMinutes', 'min')}`
                          : t('pwa.instant', 'Instant')}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <span className="truncate">
                        {rule.minCapacityThreshold !== undefined && rule.minCapacityThreshold > 0
                          ? `${t('pwa.thresholdPrefix', 'Prag')} ≥ ${rule.minCapacityThreshold}`
                          : t('pwa.noThreshold', 'Fără prag')}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5 col-span-2">
                      <span className="text-zinc-300 truncate" title={getRecipientLabel(rule.targetRecipientType, rule.customRecipient)}>
                        {getRecipientLabel(rule.targetRecipientType, rule.customRecipient)}
                      </span>
                    </div>
                  </div>

                  {/* Template Snippet Preview */}
                  <div className={`p-2.5 rounded-xl border text-[11px] font-mono leading-relaxed space-y-1.5 ${css.snippetBox}`}>
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 font-sans">
                      <div className="flex items-center space-x-1 text-blue-400 font-bold">
                        <span>{rule.templates?.length || 0} {t('pwa.templatesCount', 'șabloane active')}</span>
                      </div>
                      <span>{rule.cooldownMinutes > 0 ? `${rule.cooldownMinutes} ${t('pwa.timingMinutes', 'min')} ${t('pwa.cooldownSuffix', 'cooldown')}` : t('pwa.noCooldown', 'Fără cooldown')}</span>
                    </div>

                    {rule.titleTemplate && (
                      <p className="font-bold text-zinc-200 truncate">
                        {rule.titleTemplate}
                      </p>
                    )}

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
                      title={t('pwa.editRule', 'Editare Regulă PWA')}
                      className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRuleToDelete(rule)}
                      title={t('pwa.deleteRule', 'Șterge Regulă')}
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

      {/* Manual Push Dispatch Card */}
      <div className={`p-4 sm:p-5 rounded-2xl border ${css.card} space-y-3`}>
        <h3 className="font-bold text-sm text-zinc-100">
          {t('pwa.quickTestTitle', 'Notificare Manuală Push')}
        </h3>
        <form onSubmit={handleSendTest} className="space-y-3">
          <div className={`grid grid-cols-1 ${testAudience === 'SPECIFIC_USER' || testAudience === 'SPECIFIC_ROLE' || testAudience === 'SPECIFIC_STAND' ? 'sm:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'} gap-3 items-start`}>
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                {t('pwa.targetRecipientType', 'Destinatar')}
              </label>
              <select
                value={testAudience}
                onChange={(e) => {
                  const val = e.target.value as PwaTestAudience;
                  setTestAudience(val);
                  if (val === 'SPECIFIC_USER' && !selectedUserId && users.length > 0) {
                    setSelectedUserId(users[0].id);
                  } else if (val === 'SPECIFIC_ROLE' && !selectedRole && roles.length > 0) {
                    setSelectedRole(roles[0].id);
                  } else if (val === 'SPECIFIC_STAND' && !selectedStandId && activeStands.length > 0) {
                    setSelectedStandId(activeStands[0].id);
                  }
                }}
                className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${css.input}`}
              >
                <option value="CURRENT_DEVICE">{t('pwa.testCurrentDevice', 'Dispozitivul Curent')}</option>
                <option value="SPECIFIC_USER">{t('pwa.recipientSpecificUser', 'Voluntar Specific')}</option>
                <option value="ALL_USERS">{t('pwa.recipientAll', 'Toți Utilizatorii')}</option>
                <option value="SPECIFIC_ROLE">{t('pwa.recipientSpecificRole', 'Rol Specific')}</option>
                <option value="SPECIFIC_STAND">{t('pwa.recipientSpecificStand', 'Stand Specific (În desfășurare)')}</option>
              </select>
            </div>

            {(testAudience === 'SPECIFIC_USER' || testAudience === 'USER_DIRECT') && (
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
                      {u.fullName || u.email} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {testAudience === 'SPECIFIC_ROLE' && (
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

            {testAudience === 'SPECIFIC_STAND' && (
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
                {t('pwa.testTitleLabel', 'Titlu Notificare')}
              </label>
              <input
                type="text"
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                placeholder={t('pwa.testTitlePlaceholder', `Ex: Anunț Important ${tenant?.identity?.shorthand || ''}`.trim())}
                className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${css.input}`}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                {t('pwa.testUrlLabel', 'Link Acțiune (Click URL)')}
              </label>
              <input
                type="text"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                placeholder="/dashboard/general"
                className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${css.input}`}
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-400 mb-1">
              {t('pwa.testMessageLabel', 'Conținut Notificare')}
            </label>
            <input
              type="text"
              value={testBody}
              onChange={(e) => setTestBody(e.target.value)}
              placeholder={t('pwa.testMessagePlaceholder', 'Introduceți conținutul notificării...')}
              className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${css.input}`}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div />
            <button
              type="submit"
              disabled={isSendingTest || !canWrite}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition cursor-pointer disabled:opacity-50"
            >
              {isSendingTest ? t('pwa.sending', 'Se trimite...') : t('pwa.sendTestBtn', 'Trimite Push')}
            </button>
          </div>
        </form>
      </div>

      {/* Modular Rule Modal */}
      <PwaNotificationRuleModal
        isOpen={isRuleModalOpen}
        onClose={() => {
          setIsRuleModalOpen(false);
          setSelectedRuleForEdit(null);
        }}
        rule={selectedRuleForEdit}
        triggers={triggers}
        users={users}
        roles={roles}
        activeStands={activeStands}
        isDarkMode={isDarkMode}
        onSave={handleSaveRule}
      />

      {/* Delete Rule Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!ruleToDelete}
        onClose={() => setRuleToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={t('pwa.deleteRuleConfirmTitle', 'Confirmare Ștergere Regulă')}
        message={t('pwa.deleteRuleConfirmMessage', `Sigur doriți să ștergeți regula de notificare PWA "${ruleToDelete?.name}"? Această acțiune nu poate fi anulată.`)}
        confirmText={t('common.delete', 'Șterge')}
        cancelText={t('common.cancel', 'Anulează')}
        variant="danger"
        isLoading={isDeletingRule}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};
