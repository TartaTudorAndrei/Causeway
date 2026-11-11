import React, { useState, useEffect, useCallback } from 'react';
import { notificationService } from '../../services/notificationService';
import { pwaNotificationService } from '../../services/pwaNotificationService';
import { WhatsAppPairingModal } from './WhatsAppPairingModal';
import { NotificationServicesStatusModal } from './NotificationServicesStatusModal';
import { NotificationRuleModal } from './NotificationRuleModal';
import { ConfirmationModal } from '../common/ConfirmationModal';
import type {
  UnifiedNotificationRule,
  UnifiedTriggerDefinition,
  NotificationChannel,
} from '../../types/notifications';
import { UNIFIED_TRIGGERS } from '../../types/notifications';
import type { WhatsAppConnectionStatus, WhatsAppGroupInfo, WhatsAppManualAudience } from '../../types/whatsapp';
import type { PwaConnectionStatus, PwaTestAudience } from '../../types/pwa';
import { useLanguage } from '../../context/LanguageContext';
import { useTenant } from '../../context/TenantContext';
import { Pencil, Trash2 } from 'lucide-react';

interface NotificationsIntegrationViewProps {
  isDarkMode: boolean;
  canWrite?: boolean;
  categoryFilter?: string;
  channelFilter?: string;
  searchQuery?: string;
  isStatusModalOpen?: boolean;
  onCloseStatusModal?: () => void;
  isCreateModalOpen?: boolean;
  onCloseCreateModal?: () => void;
  onShowToast: (text: string, type?: 'success' | 'error') => void;
}

export const NotificationsIntegrationView: React.FC<NotificationsIntegrationViewProps> = ({
  isDarkMode,
  canWrite = true,
  categoryFilter = 'ALL',
  channelFilter = 'ALL',
  searchQuery = '',
  isStatusModalOpen = false,
  onCloseStatusModal,
  isCreateModalOpen = false,
  onCloseCreateModal,
  onShowToast,
}) => {
  const { t } = useLanguage();
  const { tenant } = useTenant();

  // Status State
  const [waStatus, setWaStatus] = useState<WhatsAppConnectionStatus>('DISCONNECTED');
  const [pwaStatus, setPwaStatus] = useState<PwaConnectionStatus>('NOT_CONFIGURED');
  const [pwaSubscribersCount, setPwaSubscribersCount] = useState<number>(0);
  const [isBrowserSubscribed, setIsBrowserSubscribed] = useState<boolean>(false);
  const [isPairingModalOpen, setIsPairingModalOpen] = useState<boolean>(false);

  // Notification Rules & Triggers State
  const [rules, setRules] = useState<UnifiedNotificationRule[]>([]);
  const [triggers, setTriggers] = useState<UnifiedTriggerDefinition[]>(UNIFIED_TRIGGERS);
  const [groups, setGroups] = useState<WhatsAppGroupInfo[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; fullName: string; email: string; phone?: string }>>([]);
  const [roles, setRoles] = useState<Array<{ id: string; label: string }>>([]);
  const [activeStands, setActiveStands] = useState<Array<{ id: string; locationName: string; eventName: string; eventDate: string; status: string; volunteersCount?: number }>>([]);
  const [isLoadingRules, setIsLoadingRules] = useState<boolean>(false);

  // Modal states
  const [selectedRuleForEdit, setSelectedRuleForEdit] = useState<UnifiedNotificationRule | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  // Delete Confirmation state
  const [ruleToDelete, setRuleToDelete] = useState<UnifiedNotificationRule | null>(null);
  const [isDeletingRule, setIsDeletingRule] = useState<boolean>(false);

  // Manual / Test notification form
  const [activeManualChannel, setActiveManualChannel] = useState<NotificationChannel>('WHATSAPP');
  const [manualAudience, setManualAudience] = useState<WhatsAppManualAudience | PwaTestAudience>('DIRECT');
  const [testPhone, setTestPhone] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedStandId, setSelectedStandId] = useState<string>('');
  const [testTitle, setTestTitle] = useState<string>('');
  const [testActionUrl, setTestActionUrl] = useState<string>('/dashboard/general');
  const [testMessage, setTestMessage] = useState<string>('');
  const [isSendingManual, setIsSendingManual] = useState<boolean>(false);

  const fetchStatus = useCallback(async () => {
    try {
      const summary = await notificationService.getStatusSummary();
      setWaStatus(summary.whatsappStatus);
      setPwaStatus(summary.pwaStatus);
      setPwaSubscribersCount(summary.pwaSubscribersCount);
      const isSub = await pwaNotificationService.isSubscribed();
      setIsBrowserSubscribed(isSub);
    } catch {
      // ignore
    }
  }, []);

  const loadData = useCallback(async () => {
    setIsLoadingRules(true);
    try {
      const [fetchedRules, fetchedTriggers, fetchedGroups, fetchedUsers, fetchedRoles, fetchedStands] =
        await Promise.all([
          notificationService.getRules(channelFilter, categoryFilter).catch(() => []),
          notificationService.getTriggers().catch(() => UNIFIED_TRIGGERS),
          notificationService.getWhatsAppGroups().catch(() => []),
          notificationService.getUsers().catch(() => []),
          notificationService.getRoles().catch(() => []),
          notificationService.getActiveStands().catch(() => []),
        ]);

      setRules(fetchedRules);
      setTriggers(fetchedTriggers && fetchedTriggers.length > 0 ? fetchedTriggers : UNIFIED_TRIGGERS);
      setGroups(fetchedGroups);
      setUsers(fetchedUsers);
      setRoles(fetchedRoles);
      setActiveStands(fetchedStands);
    } catch (err: any) {
      onShowToast(err.message || t('whatsapp.rulesFetchError', 'Eroare la încărcarea regulilor de notificare'), 'error');
    } finally {
      setIsLoadingRules(false);
    }
  }, [channelFilter, categoryFilter, onShowToast, t]);

  useEffect(() => {
    fetchStatus();
    loadData();
  }, [fetchStatus, loadData]);

  const handleToggleRule = async (rule: UnifiedNotificationRule) => {
    try {
      const updated = await notificationService.toggleRule(rule.id, !rule.active, rule.channel);
      setRules(prev => prev.map(r => (r.id === rule.id ? updated : r)));
      onShowToast(t('whatsapp.ruleToggledSuccess', 'Starea regulii a fost actualizată!'));
    } catch (err: any) {
      onShowToast(err.message || t('whatsapp.ruleToggleError', 'Eroare la modificarea stării'), 'error');
    }
  };

  const handleSaveRule = async (payload: Partial<UnifiedNotificationRule>, id?: string) => {
    try {
      if (id) {
        const saved = await notificationService.updateRule(id, payload);
        setRules(prev => prev.map(r => (r.id === id ? saved : r)));
        onShowToast(t('whatsapp.ruleUpdatedSuccess', 'Regula de notificare a fost salvată cu succes!'));
      } else {
        const created = await notificationService.createRule(payload);
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
      await notificationService.deleteRule(ruleToDelete.id, ruleToDelete.channel);
      setRules(prev => prev.filter(r => r.id !== ruleToDelete.id));
      onShowToast(t('whatsapp.ruleDeletedSuccess', 'Regula a fost ștearsă cu succes!'));
      setRuleToDelete(null);
    } catch (err: any) {
      onShowToast(err.message || t('whatsapp.ruleDeleteError', 'Eroare la ștergerea regulii'), 'error');
    } finally {
      setIsDeletingRule(false);
    }
  };

  const handleTogglePwaSubscription = async () => {
    if (isBrowserSubscribed) {
      const ok = await pwaNotificationService.unsubscribeCurrentDevice();
      if (ok) {
        setIsBrowserSubscribed(false);
        onShowToast(t('pwa.unsubscribeSuccess', 'Dispozitivul curent a fost dezabonat de la notificări PWA.'));
        fetchStatus();
      }
    } else {
      const ok = await pwaNotificationService.subscribeCurrentDevice();
      if (ok) {
        setIsBrowserSubscribed(true);
        onShowToast(t('pwa.subscribeSuccess', 'Dispozitivul curent a fost abonat cu succes la notificări PWA!'));
        fetchStatus();
      } else {
        onShowToast(t('pwa.subscribeFailed', 'Abonarea la notificări a eșuat sau permisiunea a fost refuzată.'), 'error');
      }
    }
  };

  const handleSendManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testMessage.trim()) {
      onShowToast(t('whatsapp.testGroupValidation', 'Introduceți conținutul mesajului.'), 'error');
      return;
    }

    setIsSendingManual(true);
    try {
      if (activeManualChannel === 'WHATSAPP') {
        let targetVal: string | undefined = undefined;
        if (manualAudience === 'DIRECT') {
          targetVal = testPhone.trim();
        } else if (manualAudience === 'SPECIFIC_USER') {
          targetVal = selectedUserId;
        } else if (manualAudience === 'WHATSAPP_GROUP') {
          targetVal = selectedGroupId;
        } else if (manualAudience === 'SPECIFIC_ROLE') {
          targetVal = selectedRole;
        } else if (manualAudience === 'SPECIFIC_STAND') {
          targetVal = selectedStandId;
        }

        await notificationService.sendWhatsAppManual({
          targetAudience: manualAudience as WhatsAppManualAudience,
          targetValue: targetVal,
          message: testMessage.trim(),
        });
        onShowToast(t('whatsapp.testSentSuccess', 'Mesajul WhatsApp a fost expediat!'));
      } else if (activeManualChannel === 'PWA') {
        let targetVal: string | undefined = undefined;
        if (manualAudience === 'SPECIFIC_USER') {
          targetVal = selectedUserId;
        } else if (manualAudience === 'SPECIFIC_ROLE') {
          targetVal = selectedRole;
        } else if (manualAudience === 'SPECIFIC_STAND') {
          targetVal = selectedStandId;
        }

        await notificationService.sendPwaTest({
          targetAudience: manualAudience as PwaTestAudience,
          targetValue: targetVal,
          title: testTitle.trim() || tenant?.identity?.name || 'Notificare',
          body: testMessage.trim(),
          actionUrl: testActionUrl.trim() || '/dashboard/general',
        });
        onShowToast(t('pwa.testPushSuccess', 'Notificarea PWA a fost expediată cu succes!'));
      } else {
        onShowToast(t('notifications.emailGatewayDesc', 'Integrare dispecerizare email pregătită.'), 'success');
      }
      setTestMessage('');
    } catch (err: any) {
      onShowToast(err.message || 'Eroare la trimiterea mesajului', 'error');
    } finally {
      setIsSendingManual(false);
    }
  };

  // Filter rules
  const filteredRules = rules.filter(r => {
    const matchesCategory = categoryFilter === 'ALL' || r.category === categoryFilter;
    const matchesChannel = channelFilter === 'ALL' || r.channel === channelFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.ruleType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.templates && r.templates.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));

    return matchesCategory && matchesChannel && matchesSearch;
  });

  const getChannelBadge = (ch: NotificationChannel) => {
    switch (ch) {
      case 'WHATSAPP':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            WhatsApp
          </span>
        );
      case 'PWA':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            PWA Push
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-zinc-800/60 text-zinc-300 border border-zinc-700/50">
            {ch}
          </span>
        );
    }
  };

  const getRecipientLabel = (rule: UnifiedNotificationRule) => {
    const type = rule.targetRecipientType;
    if (type === 'TRIGGER_GROUP') return t('whatsapp.recipientTriggerGroup', 'Grupul în care a intrat');
    if (type === 'JOINED_USER_DIRECT') return t('whatsapp.recipientJoinedUserDirect', 'Membru Direct (WhatsApp Privat)');
    if (type === 'COORDINATOR_GROUP') {
      if (rule.customRecipientJid) {
        const found = groups.find(g => g.id === rule.customRecipientJid);
        if (found) return found.subject;
      }
      return t('whatsapp.recipientCoordinatorGroup', 'Grup Coordonatori');
    }
    if (type === 'VOLUNTEER_DIRECT') return t('whatsapp.recipientDirect', 'Voluntar Direct (Telefon)');
    if (type === 'TASK_ASSIGNEES') return t('whatsapp.recipientTaskAssignees', 'Membri Asignați Sarcină');
    if (type === 'SPECIFIC_PHONE') return rule.customRecipientJid || t('whatsapp.recipientSpecificPhone', 'Număr / Grup Personalizat');
    if (type === 'ALL_USERS') return t('pwa.recipientAll', 'Toți Membrii Activi');
    if (type === 'SPECIFIC_ROLE') return t('pwa.recipientRole', 'Rol Specific');
    if (type === 'SPECIFIC_USER') return t('pwa.recipientUser', 'Utilizator Specific');
    if (type === 'SPECIFIC_STAND') return t('pwa.recipientStand', 'Stand Specific');
    return type;
  };

  const css = {
    card: isDarkMode ? 'bg-zinc-950 border-zinc-850' : 'bg-white border-zinc-200 shadow-xs',
    tableHeader: isDarkMode ? 'bg-zinc-900/60 text-zinc-400 border-zinc-800' : 'bg-zinc-100/90 text-zinc-600 border-zinc-200',
    tableRow: isDarkMode ? 'border-zinc-850 hover:bg-zinc-900/40' : 'border-zinc-200 hover:bg-zinc-50',
    input: isDarkMode
      ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700 focus:border-zinc-700'
      : 'bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400 focus:border-zinc-400',
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-4">
      
      {/* Rules Table & Mobile Cards */}
      <div className={`flex-1 min-h-0 rounded-2xl border flex flex-col overflow-hidden ${css.card}`}>
        
        {/* Mobile View */}
        <div className="block md:hidden divide-y divide-zinc-850 flex-1 min-h-0 overflow-y-auto no-scrollbar">
          {isLoadingRules ? (
            <div className="py-12 text-center text-zinc-500">
              <p className="font-semibold text-xs animate-pulse">{t('general.loading', 'Se încarcă regulile...')}</p>
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="py-12 text-center text-zinc-500">
              <p className="font-semibold text-xs">{t('whatsapp.noRulesFound', 'Nu există reguli configurate.')}</p>
            </div>
          ) : (
            filteredRules.map(rule => (
              <div key={rule.id} className="p-4 space-y-2.5 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center space-x-2">
                      {getChannelBadge(rule.channel)}
                      <span className="font-bold text-sm truncate">{rule.name}</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 font-mono truncate">{rule.ruleType}</p>
                  </div>
                  <button
                    type="button"
                    disabled={!canWrite}
                    onClick={() => handleToggleRule(rule)}
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:opacity-50 ${
                      rule.active ? 'bg-emerald-600' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        rule.active ? 'translate-x-4.5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="pt-1 border-t border-zinc-800/40 space-y-1 text-[11px] text-zinc-400">
                  <div>
                    <span className="font-medium">{t('pwa.selectCategory', 'Categorie')}: </span>
                    <span className="text-zinc-200">{rule.category}</span>
                  </div>
                  <div>
                    <span className="font-medium">{t('whatsapp.targetRecipientType', 'Destinatar')}: </span>
                    <span className="text-zinc-200">{getRecipientLabel(rule)}</span>
                  </div>
                  {rule.sourceGroupJid && (
                    <div>
                      <span className="font-medium">{t('whatsapp.sourceGroup', 'Grup Declanșator')}: </span>
                      <span className="text-zinc-200">
                        {groups.find(g => g.id === rule.sourceGroupJid)?.subject || rule.sourceGroupJid}
                      </span>
                    </div>
                  )}
                  {rule.templates && rule.templates.length > 0 && (
                    <div className="text-zinc-300 italic line-clamp-2">
                      "{rule.templates[0]}"
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end space-x-1.5 pt-2 border-t border-zinc-800/40">
                  {canWrite && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedRuleForEdit(rule);
                          setIsEditModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setRuleToDelete(rule)}
                        className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block flex-1 min-h-0 overflow-auto no-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className={`border-b uppercase font-bold text-[11px] tracking-wider ${css.tableHeader}`}>
                <th className="py-3 px-4 whitespace-nowrap">{t('notifications.channel', 'Canal')}</th>
                <th className="py-3 px-4 whitespace-nowrap">{t('whatsapp.ruleName', 'Nume Regulă')}</th>
                <th className="py-3 px-4 whitespace-nowrap">{t('whatsapp.triggerEvent', 'Eveniment')}</th>
                <th className="py-3 px-4 whitespace-nowrap">{t('pwa.selectCategory', 'Categorie')}</th>
                <th className="py-3 px-4 whitespace-nowrap">{t('whatsapp.targetRecipientType', 'Destinatar')}</th>
                <th className="py-3 px-4 whitespace-nowrap">{t('table.state', 'Stare')}</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">{t('table.actions', 'Acțiuni')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {isLoadingRules ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    <p className="font-semibold text-xs animate-pulse">{t('general.loading', 'Se încarcă regulile...')}</p>
                  </td>
                </tr>
              ) : filteredRules.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    <p className="font-semibold text-xs">{t('whatsapp.noRulesFound', 'Nu există reguli configurate.')}</p>
                  </td>
                </tr>
              ) : (
                filteredRules.map(rule => (
                  <tr key={rule.id} className={`transition-all ${css.tableRow}`}>
                    <td className="py-3.5 px-4 whitespace-nowrap">{getChannelBadge(rule.channel)}</td>
                    <td className="py-3.5 px-4 font-bold text-zinc-200">{rule.name}</td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-400">{rule.ruleType}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-zinc-800/60 text-zinc-300 border border-zinc-700/50">
                        {rule.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-300 font-medium">
                      <div>{getRecipientLabel(rule)}</div>
                      {rule.sourceGroupJid && (
                        <div className="text-[10px] text-zinc-500 font-normal">
                          {t('whatsapp.sourceGroup', 'Grup')}: {groups.find(g => g.id === rule.sourceGroupJid)?.subject || rule.sourceGroupJid}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        disabled={!canWrite}
                        onClick={() => handleToggleRule(rule)}
                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:opacity-50 ${
                          rule.active ? 'bg-emerald-600' : 'bg-zinc-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            rule.active ? 'translate-x-4.5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {canWrite && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedRuleForEdit(rule);
                                setIsEditModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition cursor-pointer"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setRuleToDelete(rule)}
                              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual / Test Notification Card */}
      {canWrite && (
        <div className={`p-5 rounded-2xl border space-y-4 shrink-0 ${css.card}`}>
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-zinc-300">
              {t('whatsapp.manualTestTitle', 'Trimitere Manuală / Notificare Instantă')}
            </span>

            {/* Channel Dropdown */}
            <div className="w-36 shrink-0">
              <select
                value={activeManualChannel}
                onChange={e => setActiveManualChannel(e.target.value as NotificationChannel)}
                className={`h-[34px] px-3 py-1.5 text-xs font-semibold rounded-xl border outline-hidden w-full ${css.input}`}
              >
                <option value="WHATSAPP">WhatsApp</option>
                <option value="PWA">PWA Push</option>
              </select>
            </div>
          </div>

          <form onSubmit={handleSendManual} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1 text-zinc-400">
                  {t('whatsapp.manualAudience', 'Audiență')}
                </label>
                <select
                  value={manualAudience}
                  onChange={e => setManualAudience(e.target.value as any)}
                  className={`h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden w-full ${css.input}`}
                >
                  {activeManualChannel === 'WHATSAPP' ? (
                    <>
                      <option value="DIRECT">{t('whatsapp.directPhone', 'Număr Telefon Direct')}</option>
                      <option value="SPECIFIC_USER">{t('table.user', 'Utilizator')}</option>
                      <option value="WHATSAPP_GROUP">{t('whatsapp.recipientGroup', 'Grup WhatsApp')}</option>
                      <option value="SPECIFIC_ROLE">{t('table.primaryRole', 'Rol')}</option>
                      <option value="SPECIFIC_STAND">{t('table.stand', 'Stand')}</option>
                    </>
                  ) : (
                    <>
                      <option value="CURRENT_DEVICE">{t('pwa.currentDevice', 'Dispozitivul Meu Curent')}</option>
                      <option value="ALL_USERS">{t('pwa.recipientAll', 'Toți Membrii')}</option>
                      <option value="SPECIFIC_USER">{t('table.user', 'Utilizator Specific')}</option>
                      <option value="SPECIFIC_ROLE">{t('table.primaryRole', 'Rol Specific')}</option>
                      <option value="SPECIFIC_STAND">{t('table.stand', 'Stand Specific')}</option>
                    </>
                  )}
                </select>
              </div>

              {/* Dynamic Target inputs */}
              {activeManualChannel === 'WHATSAPP' && manualAudience === 'DIRECT' && (
                <div>
                  <label className="block text-xs font-semibold mb-1 text-zinc-400">
                    {t('whatsapp.phoneNumber', 'Număr Telefon')}
                  </label>
                  <input
                    type="text"
                    value={testPhone}
                    onChange={e => setTestPhone(e.target.value)}
                    placeholder="407xxxxxxxx"
                    className={`h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden w-full ${css.input}`}
                  />
                </div>
              )}

              {manualAudience === 'SPECIFIC_USER' && (
                <div>
                  <label className="block text-xs font-semibold mb-1 text-zinc-400">
                    {t('table.user', 'Utilizator')}
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={e => setSelectedUserId(e.target.value)}
                    className={`h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden w-full ${css.input}`}
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

              {activeManualChannel === 'WHATSAPP' && manualAudience === 'WHATSAPP_GROUP' && (
                <div>
                  <label className="block text-xs font-semibold mb-1 text-zinc-400">
                    {t('whatsapp.recipientGroup', 'Grup WhatsApp')}
                  </label>
                  <select
                    value={selectedGroupId}
                    onChange={e => setSelectedGroupId(e.target.value)}
                    className={`h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden w-full ${css.input}`}
                  >
                    <option value="">{t('common.select', 'Selectează...')}</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.subject}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {manualAudience === 'SPECIFIC_ROLE' && (
                <div>
                  <label className="block text-xs font-semibold mb-1 text-zinc-400">
                    {t('table.primaryRole', 'Rol')}
                  </label>
                  <select
                    value={selectedRole}
                    onChange={e => setSelectedRole(e.target.value)}
                    className={`h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden w-full ${css.input}`}
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

              {manualAudience === 'SPECIFIC_STAND' && (
                <div>
                  <label className="block text-xs font-semibold mb-1 text-zinc-400">
                    {t('table.stand', 'Stand')}
                  </label>
                  <select
                    value={selectedStandId}
                    onChange={e => setSelectedStandId(e.target.value)}
                    className={`h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden w-full ${css.input}`}
                  >
                    <option value="">{t('common.select', 'Selectează...')}</option>
                    {activeStands.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.locationName} - {s.eventName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {activeManualChannel === 'PWA' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-zinc-400">
                    {t('pwa.titleTemplate', 'Titlu Notificare')}
                  </label>
                  <input
                    type="text"
                    value={testTitle}
                    onChange={e => setTestTitle(e.target.value)}
                    placeholder={tenant?.identity?.name || t('pwa.titlePlaceholder', 'Titlu notificare')}
                    className={`h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden w-full ${css.input}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-zinc-400">
                    {t('pwa.actionUrl', 'Link Redirecționare')}
                  </label>
                  <input
                    type="text"
                    value={testActionUrl}
                    onChange={e => setTestActionUrl(e.target.value)}
                    placeholder="/dashboard/general"
                    className={`h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden w-full ${css.input}`}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold mb-1 text-zinc-400">
                {t('whatsapp.messageContent', 'Conținut Mesaj')}
              </label>
              <textarea
                rows={2}
                value={testMessage}
                onChange={e => setTestMessage(e.target.value)}
                placeholder={t('whatsapp.testMessagePlaceholder', 'Introduceți mesajul...')}
                className={`w-full p-3 text-xs rounded-xl border outline-hidden resize-none ${css.input}`}
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSendingManual || !testMessage.trim()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {isSendingManual ? t('common.sending', 'Se trimite...') : t('common.send', 'Trimite Notificare')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Services Status Modal */}
      <NotificationServicesStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => onCloseStatusModal?.()}
        isDarkMode={isDarkMode}
        waStatus={waStatus}
        pwaStatus={pwaStatus}
        pwaSubscribersCount={pwaSubscribersCount}
        isBrowserSubscribed={isBrowserSubscribed}
        groupsCount={groups.length}
        canWrite={canWrite}
        onOpenPairing={() => setIsPairingModalOpen(true)}
        onTogglePwaSubscription={handleTogglePwaSubscription}
      />

      {/* Pairing Modal */}
      <WhatsAppPairingModal
        isOpen={isPairingModalOpen}
        onClose={() => setIsPairingModalOpen(false)}
        isDarkMode={isDarkMode}
        onStatusChange={newStat => {
          setWaStatus(newStat);
          if (newStat === 'CONNECTED') {
            loadData();
          }
        }}
      />

      {/* Unified Notification Rule Modal */}
      <NotificationRuleModal
        isOpen={isEditModalOpen || isCreateModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedRuleForEdit(null);
          onCloseCreateModal?.();
        }}
        rule={selectedRuleForEdit}
        triggers={triggers}
        groups={groups}
        users={users}
        roles={roles}
        stands={activeStands}
        isDarkMode={isDarkMode}
        onSave={handleSaveRule}
      />

      {/* Delete Rule Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!ruleToDelete}
        onClose={() => setRuleToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={t('whatsapp.deleteRuleTitle', 'Confirmare Ștergere')}
        message={t('whatsapp.deleteRuleConfirm', 'Sunteți sigur că doriți să ștergeți această regulă?')}
        confirmText={t('common.delete', 'Șterge')}
        cancelText={t('common.cancel', 'Anulează')}
        variant="danger"
        isLoading={isDeletingRule}
      />
    </div>
  );
};
