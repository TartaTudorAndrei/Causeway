import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { adminAuthService } from '../../services/adminAuthService';
import { useLanguage } from '../../context/LanguageContext';
import type { AdminUIState } from '../../types/adminAuth';

interface LoginFormProps {
  onSuccess: (email: string) => void;
  onNeedTwoFactor: (data: any, email: string) => void;
  onNeedRegistration: (data: any) => void;
  onForgotPassword: (email: string) => void;
  onError: (error: string, status?: AdminUIState, email?: string) => void;
  renderAlert: (state: string, message: string) => React.ReactNode;
  errorMsg: string | null;
  successMsg: string | null;
  setErrorMsg: (msg: string | null) => void;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onNeedTwoFactor,
  onNeedRegistration,
  onForgotPassword,
  onError,
  renderAlert,
  errorMsg,
  successMsg,
  setErrorMsg,
}) => {
  const { t } = useLanguage();
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInErrors, setSignInErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateSignIn = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    if (!signInEmail) {
      errors.email = t('auth.emailRequired');
    } else if (!emailRegex.test(signInEmail)) {
      errors.email = t('auth.emailInvalid');
    }
    if (!signInPassword) {
      errors.password = t('auth.passwordRequired');
    } else if (signInPassword.length < 8) {
      errors.password = t('auth.passwordMinLength');
    }
    setSignInErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSignIn()) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await adminAuthService.signIn(signInEmail, signInPassword);
      if (response.twoFactorRequired) {
        onNeedTwoFactor(response, signInEmail);
        return;
      }
      if (response.token) {
        localStorage.setItem('adminToken', response.token);
      }
      localStorage.setItem('adminUser', JSON.stringify(response.user));
      window.dispatchEvent(new Event('authChange'));
      onSuccess(signInEmail);
    } catch (err: any) {
      if (err.status) {
        onError(err.message, err.status, signInEmail);
      } else {
        setErrorMsg(err.message || t('auth.signInError'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credential: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await adminAuthService.signInWithGoogle(credential);
      if (response.user) {
        if (response.token) {
          localStorage.setItem('adminToken', response.token);
        }
        localStorage.setItem('adminUser', JSON.stringify(response.user));
        window.dispatchEvent(new Event('authChange'));
        onSuccess(response.user.email);
      }
    } catch (err: any) {
      if (err.status === 'NEEDS_REGISTRATION') {
        onNeedRegistration({ credential, email: err.email || '' });
      } else if (err.status) {
        onError(err.message, err.status, err.email);
      } else {
        setErrorMsg(err.message || t('auth.googleError'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignInSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5 text-left">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          {t('auth.email')}
        </label>
        <input type="email" value={signInEmail} onChange={(e) => {
          setSignInEmail(e.target.value);
          if (signInErrors.email) setSignInErrors({ ...signInErrors, email: undefined });
        }} disabled={isLoading} className={`w-full px-4 py-2.5 bg-zinc-950 border ${signInErrors.email ? 'border-red-900 focus:ring-red-900/10' : 'border-zinc-800 focus:ring-blue-500/20'} rounded-xl text-white focus:outline-none focus:ring-2 transition-all text-sm`} placeholder={t('auth.emailPlaceholder')}/>
        {signInErrors.email && <p className="text-xs text-red-400 mt-1 font-medium">{signInErrors.email}</p>}
      </div>
      <div className="space-y-1.5 text-left">
        <div className="flex items-center justify-between">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            {t('auth.password')}
          </label>
          <button type="button" onClick={() => onForgotPassword(signInEmail)} className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer">
            {t('auth.forgotPassword')}
          </button>
        </div>
        <div className="relative">
          <input type={showSignInPassword ? 'text' : 'password'} value={signInPassword} onChange={(e) => {
            setSignInPassword(e.target.value);
            if (signInErrors.password) setSignInErrors({ ...signInErrors, password: undefined });
          }} disabled={isLoading} className={`w-full px-4 py-2.5 bg-zinc-950 border ${signInErrors.password ? 'border-red-900 focus:ring-red-900/10' : 'border-zinc-800 focus:ring-blue-500/20'} rounded-xl text-white focus:outline-none focus:ring-2 transition-all pr-10 text-sm`} placeholder="••••••••"/>
          <button type="button" onClick={() => setShowSignInPassword(!showSignInPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors">
            {showSignInPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
          </button>
        </div>
        {signInErrors.password && <p className="text-xs text-red-400 mt-1 font-medium">{signInErrors.password}</p>}
      </div>

      {errorMsg && renderAlert('error', errorMsg)}
      {successMsg && renderAlert('success', successMsg)}

      <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md transition-all hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:scale-100">
        {isLoading ? <span>{t('auth.signingIn')}</span> : <span>{t('auth.signIn')}</span>}
      </button>

      <div className="relative my-4 flex items-center justify-center">
        <div className="border-t border-zinc-800 w-full"/>
        <span className="bg-zinc-900 px-3 text-[11px] uppercase tracking-wider text-zinc-500 font-medium whitespace-nowrap">
          {t('auth.orContinueWith')}
        </span>
        <div className="border-t border-zinc-800 w-full"/>
      </div>
      <div className="flex justify-center w-full min-h-[44px] overflow-hidden rounded-full [&_iframe]:bg-transparent">
        <GoogleLogin onSuccess={(credentialResponse) => {
          if (credentialResponse.credential) {
            handleGoogleSuccess(credentialResponse.credential);
          }
        }} onError={() => {
          setErrorMsg(t('auth.googleError'));
        }} theme="filled_black" shape="pill" size="large" text="signin_with"/>
      </div>
    </form>
  );
};
