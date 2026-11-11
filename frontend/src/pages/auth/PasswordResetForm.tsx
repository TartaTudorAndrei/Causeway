import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { adminAuthService } from '../../services/adminAuthService';
import { useLanguage } from '../../context/LanguageContext';

interface PasswordResetFormProps {
  mode: 'FORGOT_PASSWORD' | 'RESET_PASSWORD';
  initialEmail?: string;
  resetToken?: string;
  onSuccess: () => void;
  onBack: () => void;
  renderAlert: (state: string, message: string) => React.ReactNode;
  errorMsg: string | null;
  successMsg: string | null;
  setErrorMsg: (msg: string | null) => void;
  setSuccessMsg: (msg: string | null) => void;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PasswordResetForm: React.FC<PasswordResetFormProps> = ({
  mode,
  initialEmail,
  resetToken,
  onSuccess,
  onBack,
  renderAlert,
  errorMsg,
  successMsg,
  setErrorMsg,
  setSuccessMsg,
}) => {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [forgotEmail, setForgotEmail] = useState(initialEmail || '');
  const [forgotEmailError, setForgotEmailError] = useState<string | undefined>();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [resetErrors, setResetErrors] = useState<{
    newPassword?: string;
    confirmNewPassword?: string;
  }>({});

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotEmailError(t('auth.emailRequired'));
      return;
    }
    if (!emailRegex.test(forgotEmail.trim())) {
      setForgotEmailError(t('auth.emailInvalid'));
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await adminAuthService.forgotPassword(forgotEmail.trim());
      setSuccessMsg(t('auth.resetLinkSent'));
    } catch (err: any) {
      setErrorMsg(err.message || t('auth.signInError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { newPassword?: string; confirmNewPassword?: string } = {};
    if (!newPassword) errors.newPassword = t('auth.passwordRequired');
    else if (newPassword.length < 8) errors.newPassword = t('auth.passwordMinLength');
    
    if (!confirmNewPassword) errors.confirmNewPassword = t('auth.passwordRequired');
    else if (confirmNewPassword !== newPassword) errors.confirmNewPassword = t('auth.passwordsDoNotMatch');
    
    setResetErrors(errors);
    if (Object.keys(errors).length > 0) return;
    
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await adminAuthService.resetPassword(resetToken || '', newPassword);
      setSuccessMsg(t('auth.passwordResetSuccess'));
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || t('auth.invalidResetToken'));
    } finally {
      setIsLoading(false);
    }
  };

  if (mode === 'FORGOT_PASSWORD') {
    return (
      <form onSubmit={handleForgotPasswordSubmit} className="space-y-5 text-left" noValidate>
        <div className="text-center space-y-1 pb-1">
          <h3 className="text-base font-bold text-white">{t('auth.forgotPasswordTitle')}</h3>
          <p className="text-xs text-zinc-400">{t('auth.forgotPasswordSubtitle')}</p>
        </div>
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            {t('auth.email')}
          </label>
          <input type="email" value={forgotEmail} onChange={(e) => {
            setForgotEmail(e.target.value);
            if (forgotEmailError) setForgotEmailError(undefined);
          }} disabled={isLoading} autoFocus className={`w-full px-4 py-2.5 bg-zinc-950 border ${forgotEmailError ? 'border-red-900 focus:ring-red-900/10' : 'border-zinc-800 focus:ring-blue-500/20'} rounded-xl text-white focus:outline-none focus:ring-2 transition-all text-sm`} placeholder={t('auth.emailPlaceholder')}/>
          {forgotEmailError && <p className="text-xs text-red-400 mt-1 font-medium">{forgotEmailError}</p>}
        </div>

        {errorMsg && renderAlert('error', errorMsg)}
        {successMsg && renderAlert('success', successMsg)}

        <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md transition-all hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:scale-100">
          {isLoading ? <span>{t('auth.sendingResetLink')}</span> : <span>{t('auth.sendResetLink')}</span>}
        </button>
        <div className="pt-1 flex justify-center">
          <button type="button" onClick={onBack} className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 font-medium">
            <span>{t('auth.backToLogin')}</span>
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-left" noValidate>
      <div className="text-center space-y-1 pb-1">
        <h3 className="text-base font-bold text-white">{t('auth.resetPasswordTitle')}</h3>
        <p className="text-xs text-zinc-400">{t('auth.resetPasswordSubtitle')}</p>
      </div>
      <div className="space-y-1.5">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          {t('auth.newPassword')}
        </label>
        <div className="relative">
          <input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => {
            setNewPassword(e.target.value);
            if (resetErrors.newPassword) setResetErrors({ ...resetErrors, newPassword: undefined });
          }} disabled={isLoading} autoFocus className={`w-full px-4 py-2.5 bg-zinc-950 border ${resetErrors.newPassword ? 'border-red-900 focus:ring-red-900/10' : 'border-zinc-800 focus:ring-blue-500/20'} rounded-xl text-white focus:outline-none focus:ring-2 transition-all pr-10 text-sm`} placeholder="••••••••"/>
          <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors">
            {showNewPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
          </button>
        </div>
        {resetErrors.newPassword && <p className="text-xs text-red-400 mt-1 font-medium">{resetErrors.newPassword}</p>}
      </div>
      <div className="space-y-1.5">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          {t('auth.confirmNewPassword')}
        </label>
        <div className="relative">
          <input type={showConfirmNewPassword ? 'text' : 'password'} value={confirmNewPassword} onChange={(e) => {
            setConfirmNewPassword(e.target.value);
            if (resetErrors.confirmNewPassword) setResetErrors({ ...resetErrors, confirmNewPassword: undefined });
          }} disabled={isLoading} className={`w-full px-4 py-2.5 bg-zinc-950 border ${resetErrors.confirmNewPassword ? 'border-red-900 focus:ring-red-900/10' : 'border-zinc-800 focus:ring-blue-500/20'} rounded-xl text-white focus:outline-none focus:ring-2 transition-all pr-10 text-sm`} placeholder="••••••••"/>
          <button type="button" onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors">
            {showConfirmNewPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
          </button>
        </div>
        {resetErrors.confirmNewPassword && <p className="text-xs text-red-400 mt-1 font-medium">{resetErrors.confirmNewPassword}</p>}
      </div>

      {errorMsg && renderAlert('error', errorMsg)}
      {successMsg && renderAlert('success', successMsg)}

      <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md transition-all hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:scale-100">
        {isLoading ? <span>{t('auth.resettingPassword')}</span> : <span>{t('auth.resetPasswordBtn')}</span>}
      </button>
      <div className="pt-1 flex justify-center">
        <button type="button" onClick={onBack} className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 font-medium">
          <span>{t('auth.backToLogin')}</span>
        </button>
      </div>
    </form>
  );
};
