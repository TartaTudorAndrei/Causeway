import React from 'react';
import type { AdminUIState } from '../../types/adminAuth';
import { useLanguage } from '../../context/LanguageContext';

export interface ApprovalTimelineProps {
  currentState: AdminUIState;
}

export const ApprovalTimeline: React.FC<ApprovalTimelineProps> = ({ currentState }) => {
  const { t } = useLanguage();
  const steps = [
    {
      key: 'REQUEST_ACCESS',
      label: t('auth.stepRequest'),
      states: ['REQUEST_ACCESS', 'SIGN_IN'],
    },
    {
      key: 'EMAIL_VERIFY_PENDING',
      label: t('auth.stepEmailVerify'),
      states: ['EMAIL_VERIFY_PENDING'],
    },
    {
      key: 'APPROVAL_PENDING',
      label: t('auth.stepApproval'),
      states: ['APPROVAL_PENDING'],
    },
    {
      key: 'SUCCESS',
      label: t('auth.stepReady'),
      states: ['SUCCESS'],
    },
  ];

  const getStepStatus = (index: number) => {
    const activeIndex = steps.findIndex(step => step.states.includes(currentState));
    let currentIdx = activeIndex === -1 ? 2 : activeIndex;
    if (currentState === 'REJECTED') {
      currentIdx = 2;
    }
    if (index < currentIdx) return 'completed';
    if (index === currentIdx) {
      return currentState === 'REJECTED' ? 'failed' : 'active';
    }
    return 'upcoming';
  };

  return (
    <div className="py-4">
      <div className="flex items-center justify-between relative max-w-sm mx-auto">
        <div className="absolute left-6 right-6 top-5 h-0.5 bg-brand-accent/10 dark:bg-brand-cream/10 z-0">
          <div
            className="h-full bg-brand-accent transition-all duration-500"
            style={{
              width: `${
                currentState === 'REJECTED'
                  ? 66
                  : (steps.findIndex(s => s.states.includes(currentState)) / (steps.length - 1)) * 100
              }%`,
            }}
          />
        </div>

        {steps.map((step, idx) => {
          const status = getStepStatus(idx);
          return (
            <div key={step.key} className="flex flex-col items-center relative z-10 space-y-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border text-xs font-bold transition-all ${
                  status === 'completed'
                    ? 'bg-brand-primary text-brand-cream border-brand-primary dark:bg-brand-cream dark:text-brand-primary dark:border-brand-cream'
                    : status === 'active'
                    ? 'bg-white dark:bg-brand-charcoal text-brand-accent border-brand-accent ring-4 ring-brand-accent/10 scale-110'
                    : status === 'failed'
                    ? 'bg-brand-red text-white border-brand-red ring-4 ring-brand-red/10 scale-110 animate-shake'
                    : 'bg-brand-cream dark:bg-brand-charcoal/50 text-brand-primary/30 dark:text-brand-cream/30 border-brand-accent/10'
                }`}
              >
                {status === 'completed' ? '✓' : idx + 1}
              </div>
              <span
                className={`text-[10px] font-bold tracking-tight uppercase ${
                  status === 'active' || status === 'failed'
                    ? 'text-brand-accent'
                    : status === 'completed'
                    ? 'text-brand-primary dark:text-brand-cream'
                    : 'text-brand-primary/40 dark:text-brand-cream/40'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ApprovalTimeline;
