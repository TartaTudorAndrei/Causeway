import React from 'react';
import type { AdminUIState } from '../../types/adminAuth';
import { useLanguage } from '../../context/LanguageContext';

export interface StatusBannerProps {
  state: AdminUIState | 'error';
  message?: string;
  onActionClick?: () => void;
  actionText?: string;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({
  state,
  message,
  onActionClick,
  actionText,
}) => {
  const { t } = useLanguage();

  const getBannerDetails = () => {
    switch (state) {
      case 'EMAIL_VERIFY_PENDING':
        return {
          bg: 'bg-blue-50/80 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900',
          text: 'text-blue-800 dark:text-blue-200',
          icon: null,
          title: t('auth.stepEmailVerify'),
          description: message || t('auth.emailVerifyPending'),
        };
      case 'APPROVAL_PENDING':
        return {
          bg: 'bg-brand-cream/60 dark:bg-brand-charcoal border-brand-accent/30',
          text: 'text-brand-primary dark:text-brand-cream',
          icon: null,
          title: t('auth.stepApproval'),
          description: message || t('auth.approvalPending'),
        };
      case 'REJECTED':
        return {
          bg: 'bg-brand-red/5 dark:bg-brand-red/10 border-brand-red/20',
          text: 'text-brand-red dark:text-red-400',
          icon: null,
          title: t('status.REJECTED'),
          description: message || t('auth.requestRejected'),
        };
      case 'error':
        return {
          bg: 'bg-red-50/80 dark:bg-red-950/20 border-red-200 dark:border-red-900',
          text: 'text-red-800 dark:text-red-300',
          icon: null,
          title: t('auth.requestError'),
          description: message || t('auth.signInError'),
        };
      default:
        return null;
    }
  };

  const details = getBannerDetails();
  if (!details) return null;

  return (
    <div className={`p-4 rounded-2xl border ${details.bg} transition-all`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className={`text-sm font-bold ${details.text}`}>{details.title}</h4>
          <p className={`text-xs mt-0.5 opacity-90 ${details.text}`}>{details.description}</p>
        </div>
        {onActionClick && actionText && (
          <button
            onClick={onActionClick}
            className="ml-3 px-3 py-1 text-xs font-semibold rounded-lg bg-brand-primary dark:bg-brand-cream text-brand-cream dark:text-brand-primary hover:opacity-90 transition-opacity"
          >
            {actionText}
          </button>
        )}
      </div>
    </div>
  );
};

export default StatusBanner;
