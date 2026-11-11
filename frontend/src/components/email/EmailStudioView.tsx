import React, { useState, useEffect, useCallback } from 'react';
import type { EmailTemplate, EmailLog } from '../../types/email';
import { emailService } from '../../services/emailService';
import { useLanguage } from '../../context/LanguageContext';
import { SubTabNav, ConfirmationModal } from '../common';
import { EmailTemplatesView } from './EmailTemplatesView';
import { EmailTemplateEditorView } from './EmailTemplateEditorView';
import { EmailDispatchView } from './EmailDispatchView';
import { EmailDispatchesListView } from './EmailDispatchesListView';

export type EmailStudioSubTab = 'templates' | 'create-template' | 'dispatch' | 'dispatches';

interface EmailStudioViewProps {
  isDarkMode: boolean;
  defaultDepartment?: 'fundraising' | 'pr' | 'legal' | 'general';
  onToast?: (message: string, type?: 'success' | 'error') => void;
}

export const EmailStudioView: React.FC<EmailStudioViewProps> = ({
  isDarkMode,
  defaultDepartment = 'fundraising',
  onToast,
}) => {
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<EmailStudioSubTab>('templates');
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Editor state
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);

  // Dispatch state
  const [dispatchTemplateId, setDispatchTemplateId] = useState<string | undefined>();

  // Delete state
  const [deletingTemplate, setDeletingTemplate] = useState<EmailTemplate | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [tmplList, logList] = await Promise.all([
        emailService.getTemplates(),
        emailService.getLogs(50),
      ]);
      setTemplates(tmplList);
      setLogs(logList);
    } catch (err: any) {
      if (onToast) {
        onToast(err?.message || 'Eroare la încărcarea datelor', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveTemplate = async (templateData: any) => {
    if (editingTemplate) {
      await emailService.updateTemplate(editingTemplate.id, templateData);
      if (onToast) onToast(t('email.templateUpdated', 'Șablon actualizat cu succes'), 'success');
    } else {
      await emailService.createTemplate(templateData);
      if (onToast) onToast(t('email.templateCreated', 'Șablon creat cu succes'), 'success');
    }
    setEditingTemplate(null);
    setActiveTab('templates');
    loadData();
  };

  const handleDeleteTemplate = async () => {
    if (!deletingTemplate) return;
    try {
      await emailService.deleteTemplate(deletingTemplate.id, deletingTemplate.name);
      if (onToast) onToast(t('email.templateDeleted', 'Șablon șters cu succes'), 'success');
      setDeletingTemplate(null);
      loadData();
    } catch (err: any) {
      if (onToast) onToast(err?.message || 'Eroare la ștergerea șablonului', 'error');
    }
  };

  const handleCopyTemplate = async (template: EmailTemplate) => {
    try {
      await emailService.copyTemplate(template.id);
      if (onToast) onToast(t('email.templateCopied', 'Șablon copiat cu succes'), 'success');
      loadData();
    } catch (err: any) {
      if (onToast) onToast(err?.message || 'Eroare la copierea șablonului', 'error');
    }
  };

  const subTabs = [
    {
      id: 'templates' as const,
      label: t('email.templates', 'Șabloane'),
    },
    {
      id: 'create-template' as const,
      label: editingTemplate ? t('email.editTemplate', 'Editare Șablon') : t('email.createTemplate', 'Creare Șablon'),
    },
    {
      id: 'dispatch' as const,
      label: t('email.dispatch', 'Trimitere Email'),
    },
    {
      id: 'dispatches' as const,
      label: t('email.dispatchesList', 'Jurnal Trimiteri'),
    },
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-3">
      {/* Dedicated Sub-Tab Navigation Header */}
      <SubTabNav<EmailStudioSubTab>
        tabs={subTabs}
        activeTab={activeTab}
        onChange={(tabId) => {
          if (tabId !== 'create-template' && editingTemplate) {
            setEditingTemplate(null);
          }
          setActiveTab(tabId);
        }}
        isDarkMode={isDarkMode}
      />

      {/* Main Sub-Tab Viewport */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center flex-1 min-h-[250px]">
            <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeTab === 'templates' ? (
          <EmailTemplatesView
            templates={templates}
            onCreateNew={() => {
              setEditingTemplate(null);
              setActiveTab('create-template');
            }}
            onEditTemplate={(tmpl) => {
              setEditingTemplate(tmpl);
              setActiveTab('create-template');
            }}
            onCopyTemplate={handleCopyTemplate}
            onDeleteTemplate={(tmpl) => setDeletingTemplate(tmpl)}
            onDispatch={(tmpl) => {
              setDispatchTemplateId(tmpl.id);
              setActiveTab('dispatch');
            }}
            isDarkMode={isDarkMode}
          />
        ) : activeTab === 'create-template' ? (
          <EmailTemplateEditorView
            initialTemplate={editingTemplate}
            defaultDepartment={defaultDepartment}
            onSave={handleSaveTemplate}
            onCancel={() => {
              setEditingTemplate(null);
              setActiveTab('templates');
            }}
            isDarkMode={isDarkMode}
          />
        ) : activeTab === 'dispatch' ? (
          <EmailDispatchView
            templates={templates}
            initialTemplateId={dispatchTemplateId}
            onSuccess={() => {
              loadData();
              setActiveTab('dispatches');
            }}
            isDarkMode={isDarkMode}
          />
        ) : (
          <EmailDispatchesListView
            logs={logs}
            isDarkMode={isDarkMode}
          />
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingTemplate && (
        <ConfirmationModal
          isOpen={Boolean(deletingTemplate)}
          title={t('email.deleteTemplate', 'Șterge Șablon')}
          message={t(
            'email.deleteConfirm',
            'Sigur doriți să ștergeți acest șablon de email?'
          )}
          confirmText={t('common.delete', 'Șterge')}
          cancelText={t('common.cancel', 'Anulează')}
          variant="danger"
          onConfirm={handleDeleteTemplate}
          onClose={() => setDeletingTemplate(null)}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
};
