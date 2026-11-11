import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { useLanguage } from '../../context/LanguageContext';

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: React.ReactNode;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary' | 'success';
  isLoading?: boolean;
  isDarkMode?: boolean;
  zIndex?: string;
  requireConfirmationText?: string;
  confirmationPrompt?: React.ReactNode;
  confirmationPlaceholder?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'danger',
  isLoading = false,
  isDarkMode = true,
  zIndex = 'z-50',
  requireConfirmationText,
  confirmationPrompt,
  confirmationPlaceholder,
}) => {
  const { t } = useLanguage();
  const [typedConfirmation, setTypedConfirmation] = React.useState('');

  React.useEffect(() => {
    if (!isOpen) {
      setTypedConfirmation('');
    }
  }, [isOpen]);

  const isConfirmationMatched = !requireConfirmationText || 
    typedConfirmation.trim().toLowerCase() === requireConfirmationText.trim().toLowerCase();

  const variantStyles = {
    danger: {
      confirmBtn: 'bg-rose-600 hover:bg-rose-500 text-white shadow-md',
      iconBg: isDarkMode ? 'bg-rose-500/10 border-rose-500/20' : 'bg-rose-50 border-rose-200',
      iconColor: 'text-rose-500',
    },
    warning: {
      confirmBtn: 'bg-amber-600 hover:bg-amber-500 text-white shadow-md',
      iconBg: isDarkMode ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200',
      iconColor: 'text-amber-500',
    },
    primary: {
      confirmBtn: 'bg-blue-600 hover:bg-blue-500 text-white shadow-md',
      iconBg: isDarkMode ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200',
      iconColor: 'text-blue-500',
    },
    success: {
      confirmBtn: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md',
      iconBg: isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200',
      iconColor: 'text-emerald-500',
    },
  }[variant];

  return (
    <Modal
      isOpen={isOpen}
      onClose={isLoading ? () => {} : onClose}
      maxWidth="md"
      isDarkMode={isDarkMode}
      zIndex={zIndex}
    >
      <div className="flex flex-col items-center text-center p-2 sm:p-4">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center border mb-4 shrink-0 ${variantStyles.iconBg}`}
        >
          <AlertTriangle className={`w-6 h-6 ${variantStyles.iconColor}`} />
        </div>

        {title && (
          <h3
            className={`text-base sm:text-lg font-bold mb-2 ${
              isDarkMode ? 'text-zinc-100' : 'text-zinc-900'
            }`}
          >
            {title}
          </h3>
        )}

        <div
          className={`text-xs sm:text-sm leading-relaxed ${requireConfirmationText ? 'mb-4' : 'mb-6'} ${
            isDarkMode ? 'text-zinc-300' : 'text-zinc-600'
          }`}
        >
          {message}
        </div>

        {requireConfirmationText && (
          <div className="w-full mb-6 text-left">
            {confirmationPrompt && (
              <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                {confirmationPrompt}
              </label>
            )}
            <input
              type="text"
              value={typedConfirmation}
              onChange={(e) => setTypedConfirmation(e.target.value)}
              placeholder={confirmationPlaceholder || requireConfirmationText}
              disabled={isLoading}
              data-testid="confirmation-input"
              className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${
                isDarkMode
                  ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700 focus:border-zinc-700'
                  : 'bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400 focus:border-zinc-400'
              }`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isConfirmationMatched && !isLoading) {
                  e.preventDefault();
                  onConfirm();
                }
              }}
              autoFocus
            />
          </div>
        )}

        <div className="flex items-center justify-center space-x-3 w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer disabled:opacity-50"
          >
            {cancelText || t('common.cancel', 'Anulează')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading || !isConfirmationMatched}
            className={`px-5 py-2 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles.confirmBtn}`}
          >
            {isLoading ? t('common.loading', 'Se procesează...') : (confirmText || t('common.confirm', 'Confirmă'))}
          </button>
        </div>
      </div>
    </Modal>
  );
};
