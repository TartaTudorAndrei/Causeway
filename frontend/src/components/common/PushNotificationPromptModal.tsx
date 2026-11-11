import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { pwaNotificationService } from '../../services/pwaNotificationService';
import { X, Bell } from 'lucide-react';

interface PushNotificationPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  isDarkMode?: boolean;
}

export const PushNotificationPromptModal: React.FC<PushNotificationPromptModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  isDarkMode = true,
}) => {
  const { t } = useLanguage();
  const [isSubscribing, setIsSubscribing] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleEnable = async () => {
    setIsSubscribing(true);
    try {
      await pwaNotificationService.subscribeCurrentDevice();
      pwaNotificationService.markPromptDecision('accepted');
      if (onSuccess) {
        onSuccess();
      } else {
        onClose();
      }
    } catch {
      pwaNotificationService.markPromptDecision('accepted');
      if (onSuccess) {
        onSuccess();
      } else {
        onClose();
      }
    } finally {
      setIsSubscribing(false);
    }
  };

  const css = {
    modal: isDarkMode ? 'bg-black text-white border-zinc-800' : 'bg-white text-zinc-900 border-zinc-200',
    bodyText: isDarkMode ? 'text-zinc-300' : 'text-zinc-600',
    closeBtn: isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100',
    cancelBtn: isDarkMode ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${css.modal}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 pt-5 pb-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Bell className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-base tracking-tight">
              {t('pwa.promptTitle', 'Activează Notificările Push')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition cursor-pointer ${css.closeBtn}`}
            aria-label={t('common.close', 'Închide')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Divider 1 */}
        <div className="mx-5 sm:px-6 border-b border-zinc-800" />

        {/* Body */}
        <div className="px-5 sm:px-6 py-4 text-xs leading-relaxed space-y-2">
          <p className={css.bodyText}>
            {t(
              'pwa.promptMessage',
              'Rămâi la curent cu turele tale de voluntariat, sarcini noi și anunțuri importante în timp real direct pe dispozitivul tău.'
            )}
          </p>
        </div>

        {/* Divider 2 */}
        <div className="mx-5 sm:px-6 border-t border-zinc-800" />

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${css.cancelBtn}`}
          >
            {t('pwa.promptLater', 'Mai târziu')}
          </button>
          <button
            type="button"
            onClick={handleEnable}
            disabled={isSubscribing}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50 flex items-center space-x-2 shrink-0"
          >
            <span>
              {isSubscribing
                ? t('pwa.sending', 'Se procesează...')
                : t('pwa.promptEnable', 'Activează Notificările')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
