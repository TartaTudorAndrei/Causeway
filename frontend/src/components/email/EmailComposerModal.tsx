import React, { useState, useEffect, useMemo } from 'react';
import { X, Send, Copy, Download, Monitor, Smartphone } from 'lucide-react';
import type { EmailTemplate, EmailBlock, EmailGlobalSettings, MergeTagContext } from '../../types/email';
import { useLanguage } from '../../context/LanguageContext';
import { useTenant } from '../../context/TenantContext';
import { usePermission } from '../../hooks/usePermission';
import { emailService } from '../../services/emailService';
import {
  compileEmailHtml,
  compileEmailPlainText,
  downloadEmlFile,
  downloadHtmlFile,
  copyEmailToClipboard,
  extractMergeTagsFromBlocksAndSubject,
  hydrateMergeTags,
  AVAILABLE_MERGE_TAGS,
} from '../../utils/emailCompiler';

interface EmailComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates?: EmailTemplate[];
  initialTemplateId?: string;
  initialRecipientEmail?: string;
  initialRecipientName?: string;
  initialMergeData?: MergeTagContext;
  onSuccess?: () => void;
  isDarkMode?: boolean;
}

export const EmailComposerModal: React.FC<EmailComposerModalProps> = ({
  isOpen,
  onClose,
  templates: propTemplates,
  initialTemplateId,
  initialRecipientEmail = '',
  initialRecipientName = '',
  initialMergeData = {},
  onSuccess,
  isDarkMode = true,
}) => {
  const { t } = useLanguage();
  const { tenant } = useTenant();
  const { user } = usePermission();

  const [loadedTemplates, setLoadedTemplates] = useState<EmailTemplate[]>([]);
  const templates = propTemplates && propTemplates.length > 0 ? propTemplates : loadedTemplates;

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [subject, setSubject] = useState('');
  const [blocks, setBlocks] = useState<EmailBlock[]>([]);
  const [settings, setSettings] = useState<EmailGlobalSettings>({
    emailBgColor: '#ffffff',
    backdropColor: '#f4f4f5',
    canvasWidth: 600,
    sheetBorderRadius: 16,
    sheetBorderWidth: 1,
    sheetBorderColor: '#e4e4e7',
    fontFamily: 'sans',
  });
  const [mergeData, setMergeData] = useState<MergeTagContext>({});
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (isOpen && (!propTemplates || propTemplates.length === 0)) {
      emailService.getTemplates().then(setLoadedTemplates).catch(() => {});
    }
  }, [isOpen, propTemplates]);

  const wasOpenRef = React.useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      const activeTemplate = initialTemplateId
        ? templates.find((t) => t.id === initialTemplateId) || null
        : null;

      if (activeTemplate) {
        setSelectedTemplateId(activeTemplate.id);
        setSubject(activeTemplate.subject || '');
        setBlocks(Array.isArray(activeTemplate.blocks) ? JSON.parse(JSON.stringify(activeTemplate.blocks)) : []);
        setSettings(activeTemplate.settings || {
          emailBgColor: '#ffffff',
          backdropColor: '#f4f4f5',
          canvasWidth: 600,
          sheetBorderRadius: 16,
          sheetBorderWidth: 1,
          sheetBorderColor: '#e4e4e7',
          fontFamily: 'sans',
        });
      } else {
        setSelectedTemplateId('');
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

      setRecipientEmail(initialRecipientEmail || '');
      setRecipientName(initialRecipientName || '');

      setMergeData({
        sponsor_name: initialMergeData.sponsor_name || initialRecipientName || '',
        contact_person: initialMergeData.contact_person || initialRecipientName || '',
        contact_email: initialMergeData.contact_email || initialRecipientEmail || '',
        tier: initialMergeData.tier || '',
        tier_amount: initialMergeData.tier_amount || '',
        contract_amount: initialMergeData.contract_amount || '',
        proposal_url: initialMergeData.proposal_url || '',
        sender_name: user?.name || (user as any)?.fullName || '',
        sender_email: user?.email || '',
        event_name: tenant?.terminology?.campaignSeasonName || 'Campania Anuală',
        event_year: new Date().getFullYear().toString(),
        ...initialMergeData,
      });

      setStatusMessage(null);
      setIsSending(false);
    } else if (!isOpen) {
      wasOpenRef.current = false;
    }
  }, [isOpen, initialTemplateId, initialRecipientEmail, initialRecipientName, initialMergeData, templates, user]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleTemplateChange = (tmplId: string) => {
    setSelectedTemplateId(tmplId);
    if (!tmplId) {
      setSubject('');
      setBlocks([]);
      return;
    }
    const tmpl = templates.find((t) => t.id === tmplId);
    if (tmpl) {
      setSubject(tmpl.subject || '');
      setBlocks(Array.isArray(tmpl.blocks) ? JSON.parse(JSON.stringify(tmpl.blocks)) : []);
      if (tmpl.settings) {
        setSettings(tmpl.settings);
      }
    }
  };

  const detectedTags = useMemo(() => {
    if (!selectedTemplateId && blocks.length === 0) {
      return [];
    }
    return extractMergeTagsFromBlocksAndSubject(blocks, subject);
  }, [blocks, subject, selectedTemplateId]);

  const getTagMeta = (tag: string) => {
    const clean = tag.toLowerCase().trim();
    const found = AVAILABLE_MERGE_TAGS.find(
      (m) => m.tag.replace(/[{}]/g, '').toLowerCase() === clean
    );
    if (found) {
      return {
        label: found.label,
        example: found.example ? `Ex: ${found.example}` : '',
      };
    }
    return {
      label: tag
        .split(/[-_]/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' '),
      example: '',
    };
  };

  const activeMergeContext: MergeTagContext = useMemo(() => {
    return {
      ...mergeData,
      contact_person: mergeData.contact_person !== undefined ? mergeData.contact_person : (recipientName || ''),
      contact_email: mergeData.contact_email !== undefined ? mergeData.contact_email : (recipientEmail || ''),
      sponsor_name: mergeData.sponsor_name !== undefined ? mergeData.sponsor_name : (recipientName || ''),
      sender_name: mergeData.sender_name !== undefined ? mergeData.sender_name : (user?.name || (user as any)?.fullName || ''),
      sender_email: mergeData.sender_email !== undefined ? mergeData.sender_email : (user?.email || ''),
    };
  }, [mergeData, recipientName, recipientEmail, user]);

  const handleMergeFieldChange = (tag: string, value: string) => {
    setMergeData((prev) => ({
      ...prev,
      [tag]: value,
    }));
    if (tag === 'contact_person' || tag === 'recipient_name') {
      setRecipientName(value);
    }
    if (tag === 'contact_email' || tag === 'recipient_email') {
      setRecipientEmail(value);
    }
  };

  // Compiled HTML & Plain text
  const compiledSubject = useMemo(() => {
    return hydrateMergeTags(subject, activeMergeContext);
  }, [subject, activeMergeContext]);

  const compiledHtml = useMemo(() => {
    return compileEmailHtml(blocks, subject, activeMergeContext, settings);
  }, [blocks, subject, activeMergeContext, settings]);

  const compiledPlainText = useMemo(() => {
    return compileEmailPlainText(blocks, activeMergeContext);
  }, [blocks, activeMergeContext]);

  // Export handlers
  const handleCopyClipboard = async () => {
    if (!selectedTemplateId) return;
    const ok = await copyEmailToClipboard(compiledHtml, compiledPlainText);
    if (ok) {
      setStatusMessage({ text: t('email.copiedSuccess', 'Email copiat în clipboard'), type: 'success' });
      try {
        await emailService.recordLog({
          templateId: selectedTemplateId || undefined,
          recipientEmail: recipientEmail || undefined,
          recipientName: recipientName || undefined,
          subject: subject || 'No Subject',
          dispatchMethod: 'CLIPBOARD_COPY',
          status: 'SENT',
        });
      } catch {
        // silent
      }
    } else {
      setStatusMessage({ text: 'Eroare la copiere', type: 'error' });
    }
  };

  const handleDownloadEml = async () => {
    if (!selectedTemplateId) return;
    downloadEmlFile(subject || 'email', recipientEmail, recipientName, compiledHtml);
    setStatusMessage({ text: 'Fișier .eml descărcat', type: 'success' });
    try {
      await emailService.recordLog({
        templateId: selectedTemplateId || undefined,
        recipientEmail: recipientEmail || undefined,
        recipientName: recipientName || undefined,
        subject: subject || 'No Subject',
        dispatchMethod: 'EML_DOWNLOAD',
        status: 'SENT',
      });
    } catch {
      // silent
    }
  };

  const handleDownloadHtml = async () => {
    if (!selectedTemplateId) return;
    downloadHtmlFile(subject || 'email', compiledHtml);
    setStatusMessage({ text: 'Fișier .html descărcat', type: 'success' });
    try {
      await emailService.recordLog({
        templateId: selectedTemplateId || undefined,
        recipientEmail: recipientEmail || undefined,
        recipientName: recipientName || undefined,
        subject: subject || 'No Subject',
        dispatchMethod: 'HTML_DOWNLOAD',
        status: 'SENT',
      });
    } catch {
      // silent
    }
  };

  // Direct platform dispatch
  const handleSendDirect = async () => {
    if (!selectedTemplateId) return;
    if (!recipientEmail.trim() || !recipientEmail.includes('@')) {
      setStatusMessage({
        text: t('common.fillRequiredFields', 'Completați câmpurile obligatorii marcate.'),
        type: 'error',
      });
      return;
    }
    if (!subject.trim()) {
      setStatusMessage({
        text: t('common.fillRequiredFields', 'Completați câmpurile obligatorii marcate.'),
        type: 'error',
      });
      return;
    }

    setIsSending(true);
    setStatusMessage(null);

    try {
      await emailService.dispatchEmail({
        templateId: selectedTemplateId || undefined,
        recipientEmail: recipientEmail.trim(),
        recipientName: recipientName.trim() || undefined,
        subject: subject.trim(),
        htmlContent: compiledHtml,
        mergeData: activeMergeContext,
      });

      setStatusMessage({
        text: t('email.sendSuccess', 'Email trimis cu succes'),
        type: 'success',
      });
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setStatusMessage({
        text: err?.message || t('email.sendFailed', 'Eroare la trimiterea email-ului'),
        type: 'error',
      });
    } finally {
      setIsSending(false);
    }
  };

  const inputClass = isDarkMode
    ? 'w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700 focus:border-zinc-700'
    : 'w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400 focus:border-zinc-400';

  const labelClass = `block text-[11px] font-semibold mb-1 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs">
      <div className={`w-full h-full sm:h-[92vh] sm:max-w-6xl rounded-none sm:rounded-2xl border-0 sm:border flex flex-col overflow-hidden ${
        isDarkMode ? 'bg-black text-white border-zinc-800 shadow-2xl' : 'bg-white text-zinc-900 border-zinc-200 shadow-xl'
      }`}>
        {/* Header */}
        <div className="px-5 sm:px-6 pt-4 pb-3 flex items-center justify-between shrink-0">
          <h2 className="font-bold text-base sm:text-lg tracking-tight">
            {t('email.composeEmail', 'Compune Email')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition cursor-pointer ${
              isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Divider 1 */}
        <div className={`mx-5 sm:mx-6 border-b ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`} />

        {/* Modal Body: Left Controls & Dynamic Fields + Right Live Preview */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* Left Panel: Basic Metadata & Dynamic Fields */}
          <div className={`w-full md:w-[340px] lg:w-[400px] shrink-0 max-h-[42vh] md:max-h-none p-4 sm:p-5 overflow-y-auto custom-scrollbar border-b md:border-b-0 md:border-r space-y-4 ${
            isDarkMode ? 'bg-zinc-950/80 border-zinc-850' : 'bg-zinc-50 border-zinc-200'
          }`}>
            <div className="space-y-3">
              {/* Template Selector */}
              <div>
                <label className={labelClass}>{t('email.selectTemplate', 'Selectează Șablon')}</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className={inputClass}
                >
                  <option value="">{t('email.selectTemplatePlaceholder', '-- Selectează un șablon --')}</option>
                  {templates.map((tmpl) => (
                    <option key={tmpl.id} value={tmpl.id}>
                      {tmpl.name} ({tmpl.department})
                    </option>
                  ))}
                </select>
              </div>

              {/* Recipient Email */}
              <div>
                <label className={labelClass}>{t('email.recipientEmail', 'Email Destinatar')}</label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => {
                    setRecipientEmail(e.target.value);
                    if (statusMessage) setStatusMessage(null);
                  }}
                  placeholder="contact@companie.ro"
                  className={`${inputClass} ${!recipientEmail.trim() && statusMessage?.type === 'error' ? 'border-rose-500/80 ring-1 ring-rose-500/40' : ''}`}
                />
              </div>

              {/* Recipient Name */}
              <div>
                <label className={labelClass}>{t('email.recipientName', 'Nume Destinatar')}</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Ion Popescu"
                  className={inputClass}
                />
              </div>

              {/* Subject */}
              <div>
                <label className={labelClass}>{t('email.subject', 'Subiect Email')}</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    if (statusMessage) setStatusMessage(null);
                  }}
                  placeholder="Subiectul mesajului..."
                  className={`${inputClass} ${!subject.trim() && statusMessage?.type === 'error' ? 'border-rose-500/80 ring-1 ring-rose-500/40' : ''}`}
                />
              </div>
            </div>

            {/* Dynamic Fields ({{ }}) */}
            <div className={`pt-3 border-t space-y-3 ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <span className={`block text-[11px] font-bold uppercase tracking-wider ${
                isDarkMode ? 'text-zinc-400' : 'text-zinc-500'
              }`}>
                {t('email.dynamicFields', 'Câmpuri Dinamice ({{ }})')}
              </span>

              <div className="space-y-3">
                {!selectedTemplateId ? (
                  <div className={`p-4 rounded-xl border text-xs text-center font-medium ${
                    isDarkMode
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                      : 'border-amber-500/40 bg-amber-50 text-amber-800'
                  }`}>
                    {t('email.noTemplateSelectedWarning', 'Șablonul nu este selectat. Alegeți un șablon din lista de mai sus.')}
                  </div>
                ) : detectedTags.length === 0 ? (
                  <div className="py-8 text-center text-zinc-500 text-xs font-medium">
                    {t('email.noDynamicFieldsInTemplate', 'Acest șablon nu conține câmpuri dinamice ({{ }}).')}
                  </div>
                ) : (
                  detectedTags.map((tag) => {
                    const meta = getTagMeta(tag);
                    const val = mergeData[tag] !== undefined ? mergeData[tag] : (activeMergeContext[tag] ?? '');
                    return (
                      <div key={tag}>
                        <label className={labelClass}>
                          {meta.label}
                        </label>
                        <input
                          type="text"
                          value={val}
                          onChange={(e) => handleMergeFieldChange(tag, e.target.value)}
                          placeholder={meta.example}
                          className={inputClass}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: Live Email Preview */}
          <div className={`flex-1 min-h-0 flex flex-col overflow-hidden ${
            isDarkMode ? 'bg-[#09090b]' : 'bg-zinc-200/70'
          }`}>
            {/* Preview Toolbar with Title */}
            <div className={`px-4 py-2 border-b flex items-center justify-between gap-3 shrink-0 ${
              isDarkMode ? 'bg-zinc-900/80 border-zinc-850' : 'bg-zinc-100/90 border-zinc-200'
            }`}>
              <div className="flex items-center space-x-2 min-w-0 flex-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>
                  {t('email.subject', 'Subiect')}:
                </span>
                <span className={`text-xs font-semibold truncate ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`} title={compiledSubject || subject}>
                  {compiledSubject || subject || t('email.noSubject', '(Fără Subiect)')}
                </span>
              </div>

              <div className="flex items-center space-x-1.5 shrink-0">
                <div className={`flex items-center space-x-1 p-1 rounded-xl border ${
                  isDarkMode ? 'bg-zinc-950 border-zinc-850' : 'bg-zinc-200/80 border-zinc-300'
                }`}>
                  <button
                    type="button"
                    onClick={() => setViewport('desktop')}
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      viewport === 'desktop'
                        ? isDarkMode
                          ? 'bg-zinc-800 text-white font-bold'
                          : 'bg-white text-zinc-900 font-bold shadow-2xs'
                        : isDarkMode
                        ? 'text-zinc-400 hover:text-white'
                        : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                    title={t('email.viewDesktop', 'Desktop')}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewport('mobile')}
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      viewport === 'mobile'
                        ? isDarkMode
                          ? 'bg-zinc-800 text-white font-bold'
                          : 'bg-white text-zinc-900 font-bold shadow-2xs'
                        : isDarkMode
                        ? 'text-zinc-400 hover:text-white'
                        : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                    title={t('email.viewMobile', 'Mobil')}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Email Preview Workspace */}
            <div className="flex-1 min-h-0 p-3 sm:p-5 flex justify-center items-stretch overflow-hidden">
              {!selectedTemplateId && blocks.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500 space-y-2">
                  <p className="text-xs font-semibold">
                    {t('email.noTemplateSelectedPreview', 'Selectează un șablon din lista de mai sus pentru previzualizare.')}
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    width: viewport === 'desktop' ? `${settings.canvasWidth || 600}px` : '375px',
                    maxWidth: '100%',
                  }}
                  className="transition-all duration-200 flex flex-col h-full max-h-full rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 bg-white"
                >
                  <iframe
                    title="Email Preview"
                    srcDoc={compiledHtml}
                    className="w-full h-full border-0 bg-white"
                    sandbox="allow-same-origin allow-popups"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Divider 2 */}
        <div className={`mx-5 sm:mx-6 border-b ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`} />

        {/* Footer Action Cluster */}
        <div className="px-5 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Left Slot: Export Utilities & Test Send */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!selectedTemplateId}
              onClick={handleCopyClipboard}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5 ${
                isDarkMode
                  ? 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200'
                  : 'border-zinc-300 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 shadow-2xs'
              }`}
              title="Copiază format HTML pentru Gmail / Outlook Web"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{t('email.copyHtml', 'Copiază Email')}</span>
            </button>

            <button
              type="button"
              disabled={!selectedTemplateId}
              onClick={handleDownloadEml}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5 ${
                isDarkMode
                  ? 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200'
                  : 'border-zinc-300 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 shadow-2xs'
              }`}
              title="Descarcă fișier .eml pentru Outlook Desktop / Apple Mail"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('email.downloadEml', 'Descarcă .eml')}</span>
            </button>

            <button
              type="button"
              disabled={!selectedTemplateId}
              onClick={handleDownloadHtml}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                isDarkMode
                  ? 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200'
                  : 'border-zinc-300 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 shadow-2xs'
              }`}
            >
              <span>{t('email.downloadHtml', 'Descarcă .html')}</span>
            </button>

            {statusMessage && (
              <span
                className={`text-xs font-medium ml-2 ${
                  statusMessage.type === 'success' ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {statusMessage.text}
              </span>
            )}
          </div>

          {/* Right Slot: Primary Direct Dispatch Button */}
          <button
            type="button"
            disabled={!selectedTemplateId || isSending}
            onClick={handleSendDirect}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shrink-0 ml-auto"
          >
            {isSending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>{t('email.sendDirect', 'Trimite Direct')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
