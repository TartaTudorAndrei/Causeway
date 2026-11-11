import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Modal } from '../common';
import TurndownService from 'turndown';
import { generalService } from '../../services/generalService';

interface EditSectionInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionKey: string;
  initialMarkdown: string;
  initialTitle: string;
  initialGoogleDocUrl?: string | null;
  onSaved: (newMarkdown: string, newTitle: string, newGoogleDocUrl?: string | null) => void;
  isDarkMode: boolean;
}

export const EditSectionInfoModal: React.FC<EditSectionInfoModalProps> = ({
  isOpen,
  onClose,
  sectionKey,
  initialMarkdown,
  initialTitle,
  initialGoogleDocUrl,
  onSaved,
  isDarkMode,
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'markdown' | 'gdoc'>('markdown');
  const [title, setTitle] = useState(initialTitle);
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [gdocUrl, setGdocUrl] = useState(initialGoogleDocUrl || '');
  const [isImporting, setIsImporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
      setMarkdown(initialMarkdown);
      setGdocUrl(initialGoogleDocUrl || '');
      setErrorNotice(null);
      setActiveTab('markdown');
    }
  }, [isOpen, initialTitle, initialMarkdown, initialGoogleDocUrl]);

  const handleImportGoogleDoc = async () => {
    if (!gdocUrl.trim()) {
      setErrorNotice(t('general.enterGdocUrl', 'Introduceti un link valid de Google Docs.'));
      return;
    }
    setErrorNotice(null);
    setIsImporting(true);
    try {
      const html = await generalService.proxyGoogleDocHtml(gdocUrl.trim());
      const turndownService = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
        hr: '---',
      });
      const converted = turndownService.turndown(html);
      setMarkdown(converted);
      setActiveTab('markdown');
    } catch (err: any) {
      setErrorNotice(err.message || t('general.gdocImportError', 'Eroare la importul Google Doc.'));
    } finally {
      setIsImporting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!markdown.trim()) {
      setErrorNotice(t('common.fillRequiredFields', 'Completati campurile obligatorii marcate.'));
      return;
    }
    setErrorNotice(null);
    setIsSaving(true);
    try {
      const res = await generalService.updateSectionInfo(sectionKey, {
        title: title.trim() || sectionKey,
        contentMarkdown: markdown,
        googleDocUrl: gdocUrl.trim() || null,
      });
      onSaved(res.contentMarkdown, res.title, res.googleDocUrl);
      onClose();
    } catch (err: any) {
      setErrorNotice(err.message || t('general.saveError', 'Eroare la salvare.'));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('general.editSectionInfo', 'Editează Informații Secțiune')}
      maxWidth="3xl"
      isDarkMode={isDarkMode}
    >
      <form onSubmit={handleSave} noValidate className="flex flex-col h-full flex-1">
        {/* Modal Subtabs */}
        <div className="px-5 sm:px-6 pt-3 pb-2 flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('markdown')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition cursor-pointer ${
              activeTab === 'markdown'
                ? isDarkMode ? 'bg-zinc-800 text-white border border-zinc-700' : 'bg-zinc-200 text-zinc-900 border border-zinc-300'
                : isDarkMode ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            {t('general.rawMarkdown', 'Markdown')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('gdoc')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition cursor-pointer ${
              activeTab === 'gdoc'
                ? isDarkMode ? 'bg-zinc-800 text-white border border-zinc-700' : 'bg-zinc-200 text-zinc-900 border border-zinc-300'
                : isDarkMode ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            {t('general.importGoogleDoc', 'Import Google Docs')}
          </button>
        </div>

        <div className={`mx-5 sm:mx-6 border-b ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`} />

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-4 text-sm">
          {activeTab === 'gdoc' ? (
            <div className="space-y-4">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {t('general.gdocUrlLabel', 'Link Google Docs (Acces Public sau Oricine cu linkul)')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={gdocUrl}
                    onChange={(e) => {
                      setGdocUrl(e.target.value);
                      setErrorNotice(null);
                    }}
                    placeholder="https://docs.google.com/document/d/.../edit"
                    className={`flex-1 h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${
                      isDarkMode
                        ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700 focus:border-zinc-700'
                        : 'bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400 focus:border-zinc-400'
                    }`}
                  />
                  <button
                    type="button"
                    disabled={isImporting}
                    onClick={handleImportGoogleDoc}
                    className="h-[38px] px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {isImporting ? t('common.loading', 'Se incarca...') : t('general.convertMarkdown', 'Converteste in Markdown')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {t('general.sectionTitle', 'Titlu')}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${
                    isDarkMode
                      ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700 focus:border-zinc-700'
                      : 'bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400 focus:border-zinc-400'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {t('general.markdownContent', 'Continut Markdown')}
                </label>
                <textarea
                  value={markdown}
                  onChange={(e) => {
                    setMarkdown(e.target.value);
                    setErrorNotice(null);
                  }}
                  rows={14}
                  className={`w-full p-3 text-xs font-mono rounded-xl border outline-hidden transition resize-none leading-relaxed ${
                    isDarkMode
                      ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700 focus:border-zinc-700'
                      : 'bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400 focus:border-zinc-400'
                  }`}
                />
              </div>
            </div>
          )}
        </div>

        <div className={`mx-5 sm:mx-6 border-t ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`} />

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="text-xs text-rose-400 font-medium truncate max-w-[60%]">
            {errorNotice}
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isSaving ? t('common.saving', 'Se salveaza...') : t('common.save', 'Salveaza')}
          </button>
        </div>
      </form>
    </Modal>
  );
};
