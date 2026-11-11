import React, { useState } from 'react';
import { adminAuthService } from '../../services/adminAuthService';
import { useLanguage } from '../../context/LanguageContext';
import type { AdminUIState } from '../../types/adminAuth';

interface AwaitingApprovalScreenProps {
  uiState: AdminUIState;
  sessionEmail: string;
  onStatusChange: (status: AdminUIState) => void;
  onBack: () => void;
  renderAlert: (state: string, message: string) => React.ReactNode;
  errorMsg: string | null;
  successMsg: string | null;
  setErrorMsg: (msg: string | null) => void;
  setSuccessMsg: (msg: string | null) => void;
}

export const AwaitingApprovalScreen: React.FC<AwaitingApprovalScreenProps> = ({
  uiState,
  sessionEmail,
  onStatusChange,
  onBack,
  renderAlert,
  errorMsg,
  successMsg,
  setErrorMsg,
  setSuccessMsg,
}) => {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);

  const steps = [
    { key: 'REQUEST_ACCESS', label: t('auth.stepRequest'), states: ['REQUEST_ACCESS', 'SIGN_IN'] },
    { key: 'EMAIL_VERIFY_PENDING', label: t('auth.stepEmailVerify'), states: ['EMAIL_VERIFY_PENDING'] },
    { key: 'APPROVAL_PENDING', label: t('auth.stepApproval'), states: ['APPROVAL_PENDING'] },
    { key: 'SUCCESS', label: t('auth.stepReady'), states: ['SUCCESS'] },
  ];

  const getStepStatus = (index: number) => {
    const activeIndex = steps.findIndex(step => step.states.includes(uiState));
    let currentIdx = activeIndex === -1 ? 2 : activeIndex;
    if (uiState === 'REJECTED') currentIdx = 2;
    if (index < currentIdx) return 'completed';
    if (index === currentIdx) return uiState === 'REJECTED' ? 'failed' : 'active';
    return 'upcoming';
  };

  const handleCheckStatus = async () => {
    if (!sessionEmail) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await adminAuthService.checkStatus(sessionEmail);
      let mappedStatus: AdminUIState = 'SUCCESS';
      if (response.status === 'PENDING_EMAIL') {
          mappedStatus = 'EMAIL_VERIFY_PENDING';
      } else if (response.status === 'PENDING_APPROVAL') {
          mappedStatus = 'APPROVAL_PENDING';
      } else if (response.status === 'REJECTED') {
          mappedStatus = 'REJECTED';
      } else if (response.status === 'APPROVED') {
          setSuccessMsg(t('auth.authSuccess'));
          setTimeout(() => {
            onBack();
          }, 1200);
      }
      onStatusChange(mappedStatus);
    } catch (err: any) {
      setErrorMsg(err.message || t('auth.invalidToken'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 pt-2">
      <div className="py-4">
        <div className="flex items-center justify-between relative max-w-xs mx-auto">
          <div className="absolute left-6 right-6 top-4.5 h-0.5 bg-zinc-800 z-0">
            <div className="h-full bg-blue-500 transition-all duration-500" style={{
              width: `${uiState === 'REJECTED' ? 66 : (steps.findIndex(s => s.states.includes(uiState)) / (steps.length - 1)) * 100}%`,
            }}/>
          </div>

          {steps.map((step, idx) => {
            const status = getStepStatus(idx);
            return (
              <div key={step.key} className="flex flex-col items-center relative z-10 space-y-1">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center border text-xs font-bold transition-all ${status === 'completed' ? 'bg-zinc-800 text-white border-zinc-700' : status === 'active' ? 'bg-blue-600 text-white border-blue-500 ring-4 ring-blue-500/20' : status === 'failed' ? 'bg-red-950 text-red-400 border-red-900 ring-4 ring-red-900/20' : 'bg-zinc-950 text-zinc-700 border-zinc-900'}`}>
                  {status === 'completed' ? '✓' : idx + 1}
                </div>
                <span className={`text-[9px] font-bold uppercase ${status === 'active' ? 'text-blue-400' : 'text-zinc-500'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {sessionEmail && uiState === 'EMAIL_VERIFY_PENDING' && (
        <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-left text-xs text-zinc-300 flex items-center gap-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">{t('auth.sentTo')}</p>
            <p className="font-semibold text-white truncate text-xs">{sessionEmail}</p>
          </div>
        </div>
      )}

      {successMsg && renderAlert('success', successMsg)}
      {uiState === 'REJECTED' && renderAlert('REJECTED', t('auth.requestRejected'))}
      {uiState === 'EMAIL_VERIFY_PENDING' && !successMsg && (
        <div className="space-y-2">
          {renderAlert('pending', t('auth.emailVerifyPending'))}
          <p className="text-[11px] text-zinc-400 text-left px-1 leading-relaxed">{t('auth.emailVerifyTip')}</p>
        </div>
      )}
      {uiState === 'APPROVAL_PENDING' && !successMsg && renderAlert('pending', t('auth.approvalPending'))}

      {uiState !== 'REJECTED' && (
        <button onClick={handleCheckStatus} disabled={isLoading} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-2.5 rounded-xl font-semibold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2">
          <span>{t('auth.checkStatus')}</span>
        </button>
      )}

      <div className="pt-2 flex justify-center">
        <button type="button" onClick={onBack} className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 font-medium">
          <span>{t('auth.backToLogin')}</span>
        </button>
      </div>

      {errorMsg && renderAlert('error', errorMsg)}
    </div>
  );
};
