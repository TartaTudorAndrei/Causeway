import React, { useState, useEffect } from 'react';
import { adminAuthService } from '../../services/adminAuthService';
import { useLanguage } from '../../context/LanguageContext';

interface TwoFactorFormProps {
  onSuccess: () => void;
  onBack: () => void;
  renderAlert: (state: string, message: string) => React.ReactNode;
  twoFactorData: {
    sessionToken: string;
    methods: string[];
    defaultMethod: 'TOTP' | 'EMAIL';
    maskedEmail: string;
  };
  errorMsg: string | null;
  successMsg: string | null;
  setErrorMsg: (msg: string | null) => void;
  setSuccessMsg: (msg: string | null) => void;
}

export const TwoFactorForm: React.FC<TwoFactorFormProps> = ({
  onSuccess,
  onBack,
  renderAlert,
  twoFactorData,
  errorMsg,
  successMsg,
  setErrorMsg,
  setSuccessMsg,
}) => {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [twoFactorMethod, setTwoFactorMethod] = useState<'TOTP' | 'EMAIL'>(twoFactorData.defaultMethod);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = twoFactorCode.trim().replaceAll(/\s+/g, '');
    if (!clean || clean.length < 6) {
      setErrorMsg(t('auth.twoFactorCodeLabel'));
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await adminAuthService.verify2FA(twoFactorData.sessionToken, clean, twoFactorMethod);
      if (response.token) {
        localStorage.setItem('adminToken', response.token);
      }
      localStorage.setItem('adminUser', JSON.stringify(response.user));
      window.dispatchEvent(new Event('authChange'));
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || t('auth.signInError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmailOtp = async () => {
    if (resendCooldown > 0 || !twoFactorData.sessionToken) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await adminAuthService.sendLoginEmailOtp(twoFactorData.sessionToken);
      setSuccessMsg(t('auth.twoFactorOtpSentSuccess'));
      setResendCooldown(45);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || t('auth.signInError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleTwoFactorSubmit} className="space-y-5 text-left" noValidate>
      <div className="text-center space-y-1 pb-1">
        <h3 className="text-base font-bold text-white">{t('auth.twoFactorTitle')}</h3>
        <p className="text-xs text-zinc-400">{t('auth.twoFactorSubtitle')}</p>
      </div>

      {twoFactorData.methods.length > 1 && (
        <div className="grid grid-cols-2 p-1 bg-zinc-950 border border-zinc-800 rounded-xl">
          <button type="button" onClick={() => { setTwoFactorMethod('EMAIL'); setErrorMsg(null); }} className={`py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${twoFactorMethod === 'EMAIL' ? 'bg-blue-600 text-white shadow-xs' : 'text-zinc-400 hover:text-white'}`}>
            <span>{t('auth.twoFactorMethodEmail')}</span>
          </button>
          <button type="button" onClick={() => { setTwoFactorMethod('TOTP'); setErrorMsg(null); }} className={`py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${twoFactorMethod === 'TOTP' ? 'bg-blue-600 text-white shadow-xs' : 'text-zinc-400 hover:text-white'}`}>
            <span>{t('auth.twoFactorMethodTotp')}</span>
          </button>
        </div>
      )}

      {twoFactorMethod === 'EMAIL' && twoFactorData.maskedEmail && (
        <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-left text-xs text-zinc-300 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="min-w-0">
              <p className="text-[10px] text-zinc-400 uppercase font-semibold">{t('auth.twoFactorEmailSent')}</p>
              <p className="font-semibold text-white truncate text-xs">{twoFactorData.maskedEmail}</p>
            </div>
          </div>
          <button type="button" onClick={handleResendEmailOtp} disabled={resendCooldown > 0 || isLoading} className="px-2.5 py-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 disabled:text-zinc-500 transition-colors cursor-pointer disabled:cursor-not-allowed shrink-0">
            {resendCooldown > 0 ? `${resendCooldown}s` : t('auth.twoFactorResendEmail')}
          </button>
        </div>
      )}

      <div className="space-y-1.5 text-left">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          {t('auth.twoFactorCodeLabel')}
        </label>
        <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus value={twoFactorCode} onChange={(e) => {
          const val = e.target.value.replace(/\D/g, '').slice(0, 6);
          setTwoFactorCode(val);
          if (errorMsg) setErrorMsg(null);
        }} disabled={isLoading} className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 focus:border-blue-500 rounded-xl text-white text-center font-mono text-xl tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:tracking-normal placeholder:font-sans placeholder:text-zinc-600" placeholder="000000"/>
      </div>

      {errorMsg && renderAlert('error', errorMsg)}
      {successMsg && renderAlert('success', successMsg)}

      <button type="submit" disabled={isLoading || twoFactorCode.trim().length < 6} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md transition-all hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:scale-100">
        {isLoading ? <span>{t('auth.twoFactorVerifying')}</span> : <span>{t('auth.twoFactorVerifyBtn')}</span>}
      </button>
      <div className="pt-1 flex justify-center">
        <button type="button" onClick={onBack} className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 font-medium">
          <span>{t('auth.backToLogin')}</span>
        </button>
      </div>
    </form>
  );
};
