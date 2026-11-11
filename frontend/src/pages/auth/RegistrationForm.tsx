import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { adminAuthService } from '../../services/adminAuthService';
import { useLanguage } from '../../context/LanguageContext';
import { COUNTRY_PREFIXES } from '../../config/countryPrefixes';
import type { AdminUIState } from '../../types/adminAuth';

interface RegistrationFormProps {
  mode: 'REQUEST_ACCESS' | 'GOOGLE_ONBOARDING';
  googleData?: {
    credential?: string;
    email?: string;
  };
  onSuccess: (status: AdminUIState, email: string) => void;
  onBack: () => void;
  renderAlert: (state: string, message: string) => React.ReactNode;
  errorMsg: string | null;
  setErrorMsg: (msg: string | null) => void;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const RegistrationForm: React.FC<RegistrationFormProps> = ({
  mode,
  googleData,
  onSuccess,
  onBack,
  renderAlert,
  errorMsg,
  setErrorMsg,
}) => {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [phonePrefix, setPhonePrefix] = useState('+40');
  const [phone, setPhone] = useState('');

  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    phone?: string;
  }>({});

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!name.trim()) newErrors.name = t('auth.nameRequired');
    else if (name.trim().length < 2) newErrors.name = t('auth.nameMinLength');

    if (mode === 'REQUEST_ACCESS') {
      if (!email) newErrors.email = t('auth.emailRequired');
      else if (!emailRegex.test(email)) newErrors.email = t('auth.emailInvalid');
      
      if (!password) newErrors.password = t('auth.passwordRequired');
      else if (password.length < 8) newErrors.password = t('auth.passwordMinLength');
      
      if (!confirmPassword) newErrors.confirmPassword = t('auth.passwordRequired');
      else if (confirmPassword !== password) newErrors.confirmPassword = t('auth.passwordsDoNotMatch');
    }

    const cleanPhoneDigits = phone.replace(/\D/g, '');
    let nationalPhoneNumber = cleanPhoneDigits;
    const prefixDigits = phonePrefix.replace(/\D/g, '');
    if (prefixDigits && nationalPhoneNumber.startsWith(prefixDigits)) {
      nationalPhoneNumber = nationalPhoneNumber.slice(prefixDigits.length);
    }
    if (nationalPhoneNumber.startsWith('0')) {
      nationalPhoneNumber = nationalPhoneNumber.slice(1);
    }
    
    if (!phone.trim()) newErrors.phone = t('auth.phoneRequired');
    else if (!/^\d{6,14}$/.test(nationalPhoneNumber)) newErrors.phone = t('auth.phoneInvalid');

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    setErrorMsg(null);

    const cleanDigits = phone.replace(/\D/g, '');
    let nationalNumber = cleanDigits;
    const prefixDigits = phonePrefix.replace(/\D/g, '');
    if (prefixDigits && nationalNumber.startsWith(prefixDigits)) {
      nationalNumber = nationalNumber.slice(prefixDigits.length);
    }
    if (nationalNumber.startsWith('0')) {
      nationalNumber = nationalNumber.slice(1);
    }
    const fullPhoneNumber = `${phonePrefix}${nationalNumber}`;

    try {
      if (mode === 'GOOGLE_ONBOARDING') {
        await adminAuthService.registerWithGoogle({
          credential: googleData?.credential || '',
          fullName: name.trim(),
          phone: fullPhoneNumber,
          orgType: 'Other',
          orgDetails: '',
        });
        onSuccess('APPROVAL_PENDING', googleData?.email || '');
      } else {
        const response = await adminAuthService.requestAccess(
          name, email, password, fullPhoneNumber, 'Other', ''
        );
        let mappedStatus: AdminUIState = 'SUCCESS';
        if (response.status === 'PENDING_EMAIL') {
            mappedStatus = 'EMAIL_VERIFY_PENDING';
        } else if (response.status === 'PENDING_APPROVAL') {
            mappedStatus = 'APPROVAL_PENDING';
        }
        onSuccess(mappedStatus, email);
      }
    } catch (err: any) {
      if (err.status && mode === 'GOOGLE_ONBOARDING') {
          let mappedStatus: AdminUIState = 'SUCCESS';
          if (err.status === 'PENDING_EMAIL' || err.status === 'PENDING_EMAIL_VERIFICATION') {
              mappedStatus = 'EMAIL_VERIFY_PENDING';
          } else if (err.status === 'PENDING_APPROVAL') {
              mappedStatus = 'APPROVAL_PENDING';
          } else if (err.status === 'REJECTED') {
              mappedStatus = 'REJECTED';
          }
          onSuccess(mappedStatus, err.email || '');
      } else {
        setErrorMsg(err.message || t('auth.requestError'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left" noValidate>
      {mode === 'GOOGLE_ONBOARDING' && (
        <>
          <div className="text-center space-y-1 pb-1">
            <h3 className="text-base font-bold text-white">{t('auth.googleCompleteTitle')}</h3>
            <p className="text-xs text-zinc-400">{t('auth.googleCompleteSubtitle')}</p>
          </div>
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="min-w-0">
                <p className="text-[10px] text-zinc-400 uppercase font-semibold">{t('auth.emailAddress')}</p>
                <p className="text-xs font-semibold text-white truncate">{googleData?.email}</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              {t('auth.googleVerifiedBadge')}
            </span>
          </div>
        </>
      )}

      <div className="space-y-1.5">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          {t('auth.fullName')}
        </label>
        <input type="text" value={name} onChange={(e) => {
          setName(e.target.value);
          if (errors.name) setErrors({ ...errors, name: undefined });
        }} disabled={isLoading} className={`w-full px-4 py-2.5 bg-zinc-950 border ${errors.name ? 'border-red-900 focus:ring-red-900/10' : 'border-zinc-800 focus:ring-blue-500/20'} rounded-xl text-white focus:outline-none focus:ring-2 transition-all text-sm`} placeholder={t('auth.namePlaceholder')}/>
        {errors.name && <p className="text-xs text-red-400 mt-1 font-medium">{errors.name}</p>}
      </div>

      {mode === 'REQUEST_ACCESS' && (
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            {t('auth.emailAddress')}
          </label>
          <input type="email" value={email} onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors({ ...errors, email: undefined });
          }} disabled={isLoading} className={`w-full px-4 py-2.5 bg-zinc-950 border ${errors.email ? 'border-red-900 focus:ring-red-900/10' : 'border-zinc-800 focus:ring-blue-500/20'} rounded-xl text-white focus:outline-none focus:ring-2 transition-all text-sm`} placeholder={t('auth.emailPlaceholder')}/>
          {errors.email && <p className="text-xs text-red-400 mt-1 font-medium">{errors.email}</p>}
        </div>
      )}

      {mode === 'REQUEST_ACCESS' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              {t('auth.password')}
            </label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors({ ...errors, password: undefined });
              }} disabled={isLoading} className={`w-full px-4 py-2.5 bg-zinc-950 border ${errors.password ? 'border-red-900 focus:ring-red-900/10' : 'border-zinc-800 focus:ring-blue-500/20'} rounded-xl text-white focus:outline-none focus:ring-2 transition-all pr-9 text-sm`} placeholder="••••••••"/>
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors">
                {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-400 mt-1 font-medium">{errors.password}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              {t('auth.confirmPassword')}
            </label>
            <div className="relative">
              <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
              }} disabled={isLoading} className={`w-full px-4 py-2.5 bg-zinc-950 border ${errors.confirmPassword ? 'border-red-900 focus:ring-red-900/10' : 'border-zinc-800 focus:ring-blue-500/20'} rounded-xl text-white focus:outline-none focus:ring-2 transition-all pr-9 text-sm`} placeholder="••••••••"/>
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors">
                {showConfirmPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-xs text-red-400 mt-1 font-medium">{errors.confirmPassword}</p>}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          {t('auth.phoneNumber')}
        </label>
        <div className="flex gap-2">
          <div className="w-28 shrink-0">
            <select value={phonePrefix} onChange={(e) => setPhonePrefix(e.target.value)} disabled={isLoading} className="w-full px-2 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-xs font-semibold cursor-pointer">
              {COUNTRY_PREFIXES.map((p) => (
                <option key={p.country} value={p.code} className="bg-zinc-900 text-white">{p.label}</option>
              ))}
            </select>
          </div>
          <div className="relative flex-1">
            <input type="tel" value={phone} onChange={(e) => {
              setPhone(e.target.value);
              if (errors.phone) setErrors({ ...errors, phone: undefined });
            }} disabled={isLoading} className={`w-full px-4 py-2.5 bg-zinc-950 border ${errors.phone ? 'border-red-900 focus:ring-red-900/10' : 'border-zinc-800 focus:ring-blue-500/20'} rounded-xl text-white focus:outline-none focus:ring-2 transition-all text-sm`}/>
          </div>
        </div>
        {errors.phone && <p className="text-xs text-red-400 mt-1 font-medium">{errors.phone}</p>}
      </div>

      {errorMsg && renderAlert('error', errorMsg)}

      <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md transition-all hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
        {isLoading ? <span>{t('auth.processing')}</span> : <span>{t('auth.submitRequest')}</span>}
      </button>

      {mode === 'GOOGLE_ONBOARDING' && (
        <div className="pt-1 flex justify-center">
          <button type="button" onClick={onBack} className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 font-medium">
            <span>{t('auth.backToLogin')}</span>
          </button>
        </div>
      )}
    </form>
  );
};
