import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Lock } from 'lucide-react';
import { adminConfigService } from '../../services/adminConfigService';
import type { ConfigItem, ConfigStatus, ConfigSnapshot } from '../../types/adminConfig';
import { useLanguage } from '../../context/LanguageContext';
import { Modal, SearchInput } from '../common';

export interface AdminConfigViewProps {
  isDarkMode: boolean;
  onToast: (text: string, type: 'success' | 'error') => void;
}

export const AdminConfigView: React.FC<AdminConfigViewProps> = ({ isDarkMode, onToast }) => {
  const { t, language } = useLanguage();

  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Filters
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Edited form values: key -> new value
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  // Keys being replaced (for secret inputs)
  const [replacingSecretKeys, setReplacingSecretKeys] = useState<Set<string>>(new Set());

  // Step-Up authentication modal state
  const [isStepUpModalOpen, setIsStepUpModalOpen] = useState<boolean>(false);
  const [stepUpAction, setStepUpAction] = useState<'SAVE' | 'REVEAL' | 'ROLLBACK' | null>(null);
  const [stepUpKey, setStepUpKey] = useState<string | null>(null);
  const [stepUpSnapshotId, setStepUpSnapshotId] = useState<string | null>(null);
  const [stepUpPassword, setStepUpPassword] = useState<string>('');
  const [stepUpTotpCode, setStepUpTotpCode] = useState<string>('');
  const [stepUpError, setStepUpError] = useState<string | null>(null);

  // Revealed secrets cache: key -> revealed plaintext value
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, string>>({});

  // Snapshots & Rollback modal state
  const [isRollbackModalOpen, setIsRollbackModalOpen] = useState<boolean>(false);
  const [snapshots, setSnapshots] = useState<ConfigSnapshot[]>([]);
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState<boolean>(false);

  // Diagnostic testing state
  const [testingService, setTestingService] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const status = await adminConfigService.getStatus();
      setConfigStatus(status);
      if (status.uiConfigEnabled) {
        const items = await adminConfigService.getAllConfigs();
        setConfigs(items);
      } else {
        setConfigs([]);
      }
      setEditedValues({});
      setReplacingSecretKeys(new Set());
    } catch (err: any) {
      onToast(err.message || t('config.loadError', 'Eroare la încărcarea setărilor'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [t, onToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadSnapshots = async () => {
    setIsLoadingSnapshots(true);
    try {
      const list = await adminConfigService.getSnapshots();
      setSnapshots(list);
    } catch (err: any) {
      onToast(err.message || t('config.snapshotLoadError', 'Eroare la preluarea istoricului'), 'error');
    } finally {
      setIsLoadingSnapshots(false);
    }
  };

  const handleCreateSnapshot = async () => {
    try {
      await adminConfigService.createSnapshot();
      onToast(t('config.snapshotCreated', 'Snapshot creat cu succes'), 'success');
      loadSnapshots();
    } catch (err: any) {
      onToast(err.message || t('config.snapshotCreateError', 'Eroare la creare snapshot'), 'error');
    }
  };

  const handleInputChange = (key: string, value: string) => {
    setEditedValues(prev => ({ ...prev, [key]: value }));
  };

  const toggleReplaceSecret = (key: string) => {
    setReplacingSecretKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        // Clear edited value if cancelling replace
        setEditedValues(ev => {
          const copy = { ...ev };
          delete copy[key];
          return copy;
        });
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const openRevealModal = (key: string) => {
    setStepUpAction('REVEAL');
    setStepUpKey(key);
    setStepUpPassword('');
    setStepUpTotpCode('');
    setStepUpError(null);
    setIsStepUpModalOpen(true);
  };

  const openRollbackModal = () => {
    setIsRollbackModalOpen(true);
    loadSnapshots();
  };

  const initiateRollback = (snapshotId: string) => {
    setStepUpAction('ROLLBACK');
    setStepUpSnapshotId(snapshotId);
    setStepUpPassword('');
    setStepUpTotpCode('');
    setStepUpError(null);
    setIsStepUpModalOpen(true);
  };

  const handleSaveTrigger = () => {
    // Check if any secret is being updated
    const isSecretTouched = Object.keys(editedValues).some(k => {
      const cfg = configs.find(c => c.key === k);
      return cfg && cfg.isSecret;
    });

    if (isSecretTouched) {
      setStepUpAction('SAVE');
      setStepUpPassword('');
      setStepUpTotpCode('');
      setStepUpError(null);
      setIsStepUpModalOpen(true);
    } else {
      executeSave({});
    }
  };

  const executeSave = async (credentials: { password?: string; totpCode?: string }) => {
    setIsSaving(true);
    try {
      await adminConfigService.updateBatch({
        values: editedValues,
        password: credentials.password,
        totpCode: credentials.totpCode,
      });

      onToast(t('config.savedSuccess', 'Setările au fost salvate cu succes'), 'success');
      setIsStepUpModalOpen(false);
      loadData();
    } catch (err: any) {
      if (stepUpAction === 'SAVE') {
        setStepUpError(err.message || t('config.authFailed', 'Autentificare eșuată'));
      } else {
        onToast(err.message || t('config.saveError', 'Eroare la salvare'), 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleStepUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stepUpPassword && !stepUpTotpCode) {
      setStepUpError(t('config.enterCredentials', 'Introduceți parola contului sau codul 2FA'));
      return;
    }

    if (stepUpAction === 'SAVE') {
      await executeSave({ password: stepUpPassword, totpCode: stepUpTotpCode });
    } else if (stepUpAction === 'REVEAL' && stepUpKey) {
      try {
        const secret = await adminConfigService.revealSecret({
          key: stepUpKey,
          password: stepUpPassword,
          totpCode: stepUpTotpCode,
        });
        setRevealedSecrets(prev => ({ ...prev, [stepUpKey]: secret }));
        setIsStepUpModalOpen(false);
        onToast(t('config.secretRevealed', 'Valoare secretă afișată'), 'success');
      } catch (err: any) {
        setStepUpError(err.message || t('config.authFailed', 'Autentificare eșuată'));
      }
    } else if (stepUpAction === 'ROLLBACK' && stepUpSnapshotId) {
      try {
        await adminConfigService.rollbackSnapshot(stepUpSnapshotId, {
          password: stepUpPassword,
          totpCode: stepUpTotpCode,
        });
        setIsStepUpModalOpen(false);
        setIsRollbackModalOpen(false);
        onToast(t('config.rollbackSuccess', 'Configurarea a fost restaurată'), 'success');
        loadData();
      } catch (err: any) {
        setStepUpError(err.message || t('config.authFailed', 'Autentificare eșuată'));
      }
    }
  };

  const handleAcknowledgeRestart = async () => {
    try {
      await adminConfigService.acknowledgeRestart();
      onToast(t('config.restartAcknowledged', 'Confirmare repornire înregistrată'), 'success');
      loadData();
    } catch (err: any) {
      onToast(err.message || t('config.restartError', 'Eroare la confirmare'), 'error');
    }
  };

  // Diagnostic tests
  const runStripeTest = async () => {
    setTestingService('STRIPE');
    try {
      const res = await adminConfigService.testStripe(editedValues['STRIPE_SECRET_KEY']);
      onToast(res.message, res.success ? 'success' : 'error');
    } catch (err: any) {
      onToast(err.message, 'error');
    } finally {
      setTestingService(null);
    }
  };

  const runEmailTest = async () => {
    setTestingService('EMAIL');
    try {
      const res = await adminConfigService.testEmail({
        host: editedValues['SPRING_MAIL_HOST'],
        port: editedValues['SPRING_MAIL_PORT'] ? Number(editedValues['SPRING_MAIL_PORT']) : undefined,
        username: editedValues['SPRING_MAIL_USERNAME'],
        password: editedValues['SPRING_MAIL_PASSWORD'],
      });
      onToast(res.message, res.success ? 'success' : 'error');
    } catch (err: any) {
      onToast(err.message, 'error');
    } finally {
      setTestingService(null);
    }
  };

  const runGeminiTest = async () => {
    setTestingService('GEMINI');
    try {
      const res = await adminConfigService.testGemini(
        editedValues['GEMINI_API_KEY'],
        editedValues['GEMINI_MODEL']
      );
      onToast(res.message, res.success ? 'success' : 'error');
    } catch (err: any) {
      onToast(err.message, 'error');
    } finally {
      setTestingService(null);
    }
  };

  // Filtered configs
  const filteredConfigs = useMemo(() => {
    return configs.filter(c => {
      if (activeCategory !== 'ALL' && c.category !== activeCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const keyMatch = c.key.toLowerCase().includes(query);
        const descMatch = (c.descriptionRo && c.descriptionRo.toLowerCase().includes(query)) ||
                          (c.descriptionEn && c.descriptionEn.toLowerCase().includes(query));
        return keyMatch || descMatch;
      }
      return true;
    });
  }, [configs, activeCategory, searchQuery]);

  const hasModifications = Object.keys(editedValues).length > 0;

  const categories: { id: string; label: string }[] = [
    { id: 'ALL', label: t('config.catAll', 'Toate') },
    { id: 'BRANDING', label: t('config.catBranding', 'Brand & Identitate') },
    { id: 'THEME', label: t('config.catTheme', 'Temă & Culori') },
    { id: 'INTEGRATIONS', label: t('config.catIntegrations', 'Integrări & API') },
    { id: 'EMAIL', label: t('config.catEmail', 'Email & SMTP') },
    { id: 'SECURITY', label: t('config.catSecurity', 'Securitate & Auth') },
    { id: 'BUSINESS', label: t('config.catBusiness', 'Setări Operaționale') },
    { id: 'KERNEL', label: t('config.catKernel', 'Kernel') },
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-3">
      {/* Restart Required Banner */}
      {configStatus?.restartRequired && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between text-xs text-amber-300 shrink-0">
          <span>{t('config.restartBanner', 'Modificările de kernel necesită repornirea serviciului.')}</span>
          <button
            type="button"
            onClick={handleAcknowledgeRestart}
            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition cursor-pointer text-xs shrink-0"
          >
            {t('config.confirmRestart', 'Confirmă Repornirea')}
          </button>
        </div>
      )}

      {/* Control bar: Categories strip + Action buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <div className="w-full sm:w-56 shrink-0">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={t('common.searchOrAdd', 'Caută configurare...')}
              isDarkMode={isDarkMode}
            />
          </div>

          {/* Category Pills Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                activeCategory === cat.id
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            type="button"
            onClick={openRollbackModal}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold transition cursor-pointer"
          >
            {t('config.historyRollback', 'Istoric & Revenire')}
          </button>

          <button
            type="button"
            onClick={handleSaveTrigger}
            disabled={!hasModifications || isSaving}
            className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-40"
          >
            {isSaving ? t('common.saving', 'Se salvează...') : t('common.saveChanges', 'Salvează Modificările')}
          </button>
        </div>
      </div>

      {/* Main Settings Card */}
      <div className="flex-1 min-h-0 rounded-2xl border flex flex-col overflow-hidden bg-zinc-950 border-zinc-800">
        {/* Diagnostic Actions Strip if in relevant category */}
        {activeCategory === 'INTEGRATIONS' && (
          <div className="p-3 bg-zinc-900/60 border-b border-zinc-800 flex flex-wrap items-center gap-2 shrink-0 text-xs">
            <button
              type="button"
              onClick={runStripeTest}
              disabled={testingService === 'STRIPE'}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-200 font-semibold transition cursor-pointer disabled:opacity-50"
            >
              {testingService === 'STRIPE' ? t('common.testing', 'Se testează...') : t('config.testStripe', 'Testează Conexiunea Stripe')}
            </button>
            <button
              type="button"
              onClick={runGeminiTest}
              disabled={testingService === 'GEMINI'}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-200 font-semibold transition cursor-pointer disabled:opacity-50"
            >
              {testingService === 'GEMINI' ? t('common.testing', 'Se testează...') : t('config.testGemini', 'Testează API Gemini')}
            </button>
          </div>
        )}

        {activeCategory === 'EMAIL' && (
          <div className="p-3 bg-zinc-900/60 border-b border-zinc-800 flex items-center gap-2 shrink-0 text-xs">
            <button
              type="button"
              onClick={runEmailTest}
              disabled={testingService === 'EMAIL'}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-200 font-semibold transition cursor-pointer disabled:opacity-50"
            >
              {testingService === 'EMAIL' ? t('common.testing', 'Se testează...') : t('config.testEmail', 'Testează Conexiunea SMTP')}
            </button>
          </div>
        )}

        {/* Scrollable Settings List */}
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-zinc-500 text-xs">
              {t('common.loading', 'Se încarcă...')}
            </div>
          ) : configStatus && !configStatus.uiConfigEnabled ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-400">
                <Lock className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-zinc-200">
                {t('config.disabledTitle', 'Configurarea Dinamică prin Interfață este Dezactivată')}
              </div>
              <div className="text-xs text-zinc-400 max-w-md">
                {t('config.disabledDesc', 'Setările de sistem sunt gestionate exclusiv prin variabile de mediu (.env) pe host (APP_UI_CONFIG_ENABLED=false).')}
              </div>
            </div>
          ) : filteredConfigs.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-zinc-500 text-xs">
              {t('config.noItems', 'Nicio configurare găsită')}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredConfigs.map(item => {
                const isModified = item.key in editedValues;
                const isReplacing = replacingSecretKeys.has(item.key);
                const isRevealed = item.key in revealedSecrets;
                const currentValue = isModified ? editedValues[item.key] : item.value;
                const description = language === 'en' ? item.descriptionEn : item.descriptionRo;

                return (
                  <div
                    key={item.key}
                    className={`p-3.5 rounded-xl border bg-zinc-900 transition flex flex-col justify-between space-y-2.5 ${
                      isModified ? 'border-amber-500/60 shadow-xs' : 'border-zinc-800'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <label className="block text-xs font-bold text-zinc-200 truncate">
                          {description || item.key}
                        </label>
                        <span className="block font-mono text-[10px] text-zinc-500 truncate">
                          {item.key}
                        </span>
                      </div>

                      {item.requiresRestart && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                          Kernel
                        </span>
                      )}
                    </div>

                    {/* Input Controls */}
                    <div className="w-full">
                      {item.isSecret ? (
                        <div className="space-y-2">
                          {isReplacing ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={isModified ? editedValues[item.key] : ''}
                                onChange={e => handleInputChange(item.key, e.target.value)}
                                placeholder={t('config.enterNewSecret', 'Introduceți noua valoare secretă...')}
                                className="flex-1 h-[38px] px-3 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none transition"
                              />
                              <button
                                type="button"
                                onClick={() => toggleReplaceSecret(item.key)}
                                className="px-3 py-2 h-[38px] rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition cursor-pointer shrink-0"
                              >
                                {t('common.cancel', 'Anulează')}
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-[38px] px-3 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between text-zinc-400 font-mono">
                                <span>{isRevealed ? revealedSecrets[item.key] : item.value || 'Neconfigurat'}</span>
                              </div>

                              <button
                                type="button"
                                onClick={() => toggleReplaceSecret(item.key)}
                                className="px-3 py-2 h-[38px] rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition cursor-pointer shrink-0"
                              >
                                {t('config.replace', 'Schimbă')}
                              </button>

                              {!isRevealed && item.isConfigured && (
                                <button
                                  type="button"
                                  onClick={() => openRevealModal(item.key)}
                                  className="px-3 py-2 h-[38px] rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition cursor-pointer shrink-0"
                                >
                                  {t('config.reveal', 'Dezvăluie')}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ) : item.dataType === 'BOOLEAN' ? (
                        <select
                          value={currentValue}
                          onChange={e => handleInputChange(item.key, e.target.value)}
                          className="w-full h-[38px] px-3 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:border-amber-500 focus:outline-none transition cursor-pointer"
                        >
                          <option value="true">Activ / True</option>
                          <option value="false">Inactiv / False</option>
                        </select>
                      ) : item.category === 'THEME' && currentValue.startsWith('#') ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={currentValue}
                            onChange={e => handleInputChange(item.key, e.target.value)}
                            className="w-9 h-[38px] rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer p-0.5"
                          />
                          <input
                            type="text"
                            value={currentValue}
                            onChange={e => handleInputChange(item.key, e.target.value)}
                            className="flex-1 h-[38px] px-3 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-white font-mono focus:border-amber-500 focus:outline-none transition"
                          />
                        </div>
                      ) : (
                        <input
                          type={item.dataType === 'NUMBER' ? 'number' : 'text'}
                          value={currentValue}
                          onChange={e => handleInputChange(item.key, e.target.value)}
                          className="w-full h-[38px] px-3 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none transition"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Step-Up Authentication Modal */}
      <Modal
        isOpen={isStepUpModalOpen}
        onClose={() => setIsStepUpModalOpen(false)}
        title={t('config.stepUpTitle', 'Autentificare de Securitate')}
        maxWidth="md"
        isDarkMode={isDarkMode}
        footer={
          <div className="flex items-center justify-between w-full">
            {stepUpError ? (
              <span className="text-xs text-rose-400 font-medium truncate">{stepUpError}</span>
            ) : <span />}
            <button
              type="button"
              onClick={handleStepUpSubmit}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer"
            >
              {isSaving ? t('common.verifying', 'Se verifică...') : t('common.confirm', 'Confirmă')}
            </button>
          </div>
        }
      >
        <form onSubmit={handleStepUpSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold mb-1 text-zinc-400">
              {t('config.accountPassword', 'Parolă Cont')}
            </label>
            <input
              type="password"
              value={stepUpPassword}
              onChange={e => setStepUpPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full h-[38px] px-3 py-2 text-xs rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-zinc-400">
              {t('config.totpCode', 'Cod 2FA (TOTP)')}
            </label>
            <input
              type="text"
              maxLength={6}
              value={stepUpTotpCode}
              onChange={e => setStepUpTotpCode(e.target.value)}
              placeholder="123456"
              className="w-full h-[38px] px-3 py-2 text-xs rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 font-mono tracking-widest text-center focus:border-amber-500 focus:outline-none transition"
            />
          </div>
        </form>
      </Modal>

      {/* Snapshots & Rollback History Modal */}
      <Modal
        isOpen={isRollbackModalOpen}
        onClose={() => setIsRollbackModalOpen(false)}
        title={t('config.snapshotsTitle', 'Istoric & Restaurare Snapshot-uri')}
        maxWidth="3xl"
        isDarkMode={isDarkMode}
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={handleCreateSnapshot}
              className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition cursor-pointer"
            >
              {t('config.createSnapshotNow', 'Crează Snapshot Acum')}
            </button>
            <button
              type="button"
              onClick={() => setIsRollbackModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
            >
              {t('common.close', 'Închide')}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          {isLoadingSnapshots ? (
            <div className="py-8 text-center text-zinc-500 text-xs">
              {t('common.loading', 'Se încarcă...')}
            </div>
          ) : snapshots.length === 0 ? (
            <div className="py-8 text-center text-zinc-500 text-xs">
              {t('config.noSnapshots', 'Nu există snapshot-uri înregistrate')}
            </div>
          ) : (
            <div className="divide-y divide-zinc-800 border border-zinc-800 rounded-xl overflow-hidden">
              {snapshots.map(snap => (
                <div key={snap.id} className="p-3 bg-zinc-900 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-semibold text-zinc-200">{snap.snapshotLabel}</div>
                    <div className="font-mono text-[10px] text-zinc-500">
                      {new Date(snap.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => initiateRollback(snap.id)}
                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition cursor-pointer shrink-0"
                  >
                    {t('config.restore', 'Restaurează')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
