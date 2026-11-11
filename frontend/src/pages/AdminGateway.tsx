import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import type { AdminUIState } from '../types/adminAuth';
import { adminAuthService } from '../services/adminAuthService';
import { useLanguage } from '../context/LanguageContext';
import logoAlb from '../assets/logo_alb.png';
import { LoginForm } from './auth/LoginForm';
import { TwoFactorForm } from './auth/TwoFactorForm';
import { RegistrationForm } from './auth/RegistrationForm';
import { PasswordResetForm } from './auth/PasswordResetForm';
import { AwaitingApprovalScreen } from './auth/AwaitingApprovalScreen';

export const AdminGateway: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { language, setLanguage, t } = useLanguage();

  const [uiState, setUiState] = useState<AdminUIState>('SIGN_IN');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string>('');
  const [twoFactorData, setTwoFactorData] = useState<{ sessionToken: string; methods: string[]; defaultMethod: 'TOTP' | 'EMAIL'; maskedEmail: string } | null>(null);
  const [googleData, setGoogleData] = useState<{ credential?: string; email?: string } | undefined>(undefined);
  const [resetToken, setResetToken] = useState('');

  const mapStatusToUiState = (status: string): AdminUIState => (
    status === 'PENDING_EMAIL' || status === 'PENDING_EMAIL_VERIFICATION' ? 'EMAIL_VERIFY_PENDING' :
    status === 'PENDING_APPROVAL' ? 'APPROVAL_PENDING' :
    status === 'REJECTED' ? 'REJECTED' :
    status === 'APPROVED' ? 'SUCCESS' : 'SIGN_IN'
  );

  useEffect(() => {
    const isReset = searchParams.get('resetToken') || window.location.pathname.includes('reset');
    const verifyToken = searchParams.get('verifyToken') || (!isReset ? searchParams.get('token') : null);
    const resetTokenParam = searchParams.get('resetToken') || (isReset ? searchParams.get('token') : null);
    if (!verifyToken && !resetTokenParam) adminAuthService.getMe().then(user => { if (user) navigate('/dashboard/hub/general', { replace: true }); });
  }, [navigate, searchParams]);

  const isVerifyingRef = useRef(false);
  useEffect(() => {
    const verifyToken = searchParams.get('verifyToken') || (!(searchParams.get('resetToken') || window.location.pathname.includes('reset')) ? searchParams.get('token') : null);
    if (verifyToken && !isVerifyingRef.current) {
      isVerifyingRef.current = true; setErrorMsg(null); setSuccessMsg(null);
      adminAuthService.verifyEmail(verifyToken).then((data) => {
        if (data && data.email) setSessionEmail(data.email);
        setUiState('APPROVAL_PENDING'); setSuccessMsg(t('auth.emailVerified')); setSearchParams({}, { replace: true });
      }).catch((err: any) => {
        setErrorMsg(err.message || t('auth.invalidToken')); setUiState('SIGN_IN'); setSearchParams({}, { replace: true });
      });
    }
  }, [searchParams, setSearchParams, t]);

  const isValidatingResetRef = useRef(false);
  useEffect(() => {
    const resetTokenParam = searchParams.get('resetToken') || (window.location.pathname.includes('reset') ? searchParams.get('token') : null);
    if (resetTokenParam && !isValidatingResetRef.current) {
      isValidatingResetRef.current = true; setErrorMsg(null); setSuccessMsg(null);
      adminAuthService.validateResetToken(resetTokenParam).then((result) => {
        if (result.valid) { setResetToken(resetTokenParam); setUiState('RESET_PASSWORD'); }
        else { setErrorMsg(result.message || t('auth.invalidResetToken')); setUiState('SIGN_IN'); setSearchParams({}, { replace: true }); }
      }).catch(() => {
        setErrorMsg(t('auth.invalidResetToken')); setUiState('SIGN_IN'); setSearchParams({}, { replace: true });
      });
    }
  }, [searchParams, setSearchParams, t]);

  const renderAlert = (state: string, message: string) => {
    const bgClass = state === 'error' || state === 'REJECTED' ? 'bg-red-950/20 border-red-900/30 text-red-400' :
                    state === 'success' ? 'bg-emerald-950/20 border-emerald-900/30 text-emerald-400' : 'bg-zinc-800/40 border-zinc-700 text-zinc-300';
    return <div className={`p-4 border rounded-xl text-left text-xs flex items-start gap-2.5 ${bgClass}`}><p className="font-medium leading-relaxed">{message}</p></div>;
  };

  const handleLoginSuccess = (email: string) => { setSessionEmail(email); setUiState('SUCCESS'); setTimeout(() => navigate('/dashboard/hub/general', { replace: true }), 1000); };
  const resetMessages = () => { setErrorMsg(null); setSuccessMsg(null); };

  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center py-12 pt-[calc(3rem+env(safe-area-inset-top,0px))] pb-[calc(3rem+env(safe-area-inset-bottom,0px))] px-4 selection:bg-zinc-800 selection:text-white overflow-hidden font-sans">
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent"/>
      <div className="absolute bottom-10 left-10 w-48 h-48 bg-zinc-900/10 rounded-full blur-3xl pointer-events-none"/>

      <div className="w-full flex flex-col items-center justify-center space-y-4 max-w-md">
        <div className="w-full flex items-center justify-end px-2 text-xs">
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
            <button type="button" onClick={() => setLanguage('ro')} className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${language === 'ro' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}>RO</button>
            <button type="button" onClick={() => setLanguage('en')} className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${language === 'en' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}>EN</button>
          </div>
        </div>

        <div className="text-center flex flex-col items-center select-none mb-1">
          <img src={logoAlb} alt="Logo" className="w-16 h-16 object-contain filter drop-shadow-md"/>
        </div>

        <div className="w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden select-none">
          <div className="space-y-6">
            {(uiState === 'SIGN_IN' || uiState === 'REQUEST_ACCESS') && (
              <div className="grid grid-cols-2 p-1 bg-zinc-950 border border-zinc-800 rounded-xl">
                <button type="button" onClick={() => { setUiState('SIGN_IN'); resetMessages(); }} className={`py-2 text-xs font-bold uppercase tracking-wider rounded-lg cursor-pointer transition-all ${uiState === 'SIGN_IN' ? 'bg-blue-600 text-white shadow-xs' : 'text-zinc-400 hover:text-white'}`}>{t('auth.signIn')}</button>
                <button type="button" onClick={() => { setUiState('REQUEST_ACCESS'); resetMessages(); }} className={`py-2 text-xs font-bold uppercase tracking-wider rounded-lg cursor-pointer transition-all ${uiState === 'REQUEST_ACCESS' ? 'bg-blue-600 text-white shadow-xs' : 'text-zinc-400 hover:text-white'}`}>{t('auth.requestAccess')}</button>
              </div>
            )}

            {uiState === 'SIGN_IN' && (
              <LoginForm 
                onSuccess={handleLoginSuccess}
                onNeedTwoFactor={(data, email) => {
                  setSessionEmail(email);
                  const methods = data.twoFactorMethods || ['EMAIL', 'TOTP'];
                  setTwoFactorData({
                    sessionToken: data.twoFactorSessionToken || '',
                    methods,
                    defaultMethod: methods.includes('EMAIL') ? 'EMAIL' : methods[0],
                    maskedEmail: data.maskedEmail || ''
                  });
                  setUiState('TWO_FACTOR');
                }}
                onNeedRegistration={(data) => {
                  setGoogleData(data);
                  setUiState('GOOGLE_ONBOARDING');
                }}
                onForgotPassword={(email) => {
                  setSessionEmail(email);
                  setUiState('FORGOT_PASSWORD');
                  resetMessages();
                }}
                onError={(err, status, email) => {
                  if (email) setSessionEmail(email);
                  if (status) setUiState(mapStatusToUiState(status));
                  else setErrorMsg(err);
                }}
                renderAlert={renderAlert}
                errorMsg={errorMsg}
                successMsg={successMsg}
                setErrorMsg={setErrorMsg}
              />
            )}

            {uiState === 'TWO_FACTOR' && twoFactorData && (
              <TwoFactorForm 
                onSuccess={() => handleLoginSuccess(sessionEmail)}
                onBack={() => { setUiState('SIGN_IN'); resetMessages(); }}
                renderAlert={renderAlert}
                twoFactorData={twoFactorData}
                errorMsg={errorMsg}
                successMsg={successMsg}
                setErrorMsg={setErrorMsg}
                setSuccessMsg={setSuccessMsg}
              />
            )}

            {(uiState === 'REQUEST_ACCESS' || uiState === 'GOOGLE_ONBOARDING') && (
              <RegistrationForm mode={uiState} googleData={googleData}
                onSuccess={(status, email) => { setSessionEmail(email); setUiState(status); }}
                onBack={() => { setUiState('SIGN_IN'); setErrorMsg(null); setSuccessMsg(null); }}
                renderAlert={renderAlert} errorMsg={errorMsg} setErrorMsg={setErrorMsg} />
            )}
            {(uiState === 'FORGOT_PASSWORD' || uiState === 'RESET_PASSWORD') && (
              <PasswordResetForm mode={uiState} initialEmail={sessionEmail} resetToken={resetToken}
                onSuccess={() => { setUiState('SIGN_IN'); setErrorMsg(null); setSuccessMsg(null); setSearchParams({}, { replace: true }); }}
                onBack={() => { setUiState('SIGN_IN'); setErrorMsg(null); setSuccessMsg(null); }}
                renderAlert={renderAlert} errorMsg={errorMsg} successMsg={successMsg} setErrorMsg={setErrorMsg} setSuccessMsg={setSuccessMsg} />
            )}
            {(uiState === 'EMAIL_VERIFY_PENDING' || uiState === 'APPROVAL_PENDING' || uiState === 'REJECTED') && (
              <AwaitingApprovalScreen uiState={uiState} sessionEmail={sessionEmail} onStatusChange={setUiState}
                onBack={() => { setUiState('SIGN_IN'); setErrorMsg(null); setSuccessMsg(null); }}
                renderAlert={renderAlert} errorMsg={errorMsg} successMsg={successMsg} setErrorMsg={setErrorMsg} setSuccessMsg={setSuccessMsg} />
            )}
            {uiState === 'SUCCESS' && (
              <div className="flex flex-col items-center justify-center py-6 space-y-4">
                <div className="w-16 h-16 bg-zinc-950 text-blue-500 rounded-full flex items-center justify-center border border-zinc-800">
                  <Check className="w-8 h-8" />
                </div>
                <p className="text-xs font-semibold text-zinc-400">{t('auth.authSuccess')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default AdminGateway;
