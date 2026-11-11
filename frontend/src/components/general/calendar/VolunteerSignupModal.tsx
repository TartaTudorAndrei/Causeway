import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, User, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { usePermission } from '../../../hooks/usePermission';
import { hrService, isShiftExpiredClient } from '../../../services/hrService';
import { adminAuthService } from '../../../services/adminAuthService';
import { getErrorMessage } from '../../../utils/error';
import { GoogleLogin } from '@react-oauth/google';
import type { HrStand, HrStandRole, HrShift } from '../../../types/hr';
import type { Club, AdminUser } from '../../../types/adminAuth';
import { COUNTRY_PREFIXES } from '../../../config/countryPrefixes';
import { StandVolunteersModal } from '../../hr/StandVolunteersModal';

export type OrgType = 'Interact' | 'Rotaract' | 'Rotary' | 'Other';

function decodeJwtPayload(token: string): any {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
}

export interface VolunteerSignupModalProps {
    isOpen: boolean;
    standId: string;
    shiftId?: string;
    initialTab?: 'shifts' | 'signup';
    onClose: () => void;
    onSuccess?: () => void;
    isDarkMode?: boolean;
    isAdmin?: boolean;
    onRefreshData?: () => void;
}

export const VolunteerSignupModal: React.FC<VolunteerSignupModalProps> = ({
    isOpen,
    standId,
    shiftId = '',
    initialTab = 'shifts',
    onClose,
    onSuccess,
    isDarkMode = true,
    isAdmin = false,
    onRefreshData,
}) => {
    const { t } = useLanguage();
    const { user: currentUserFromHook } = usePermission();

    const [stand, setStand] = useState<HrStand | null>(null);
    const [roles, setRoles] = useState<HrStandRole[]>([]);
    const [dbClubs, setDbClubs] = useState<Club[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [activeTab, setActiveTab] = useState<'shifts' | 'signup'>(initialTab);

    // User session
    const [currentUser, setCurrentUser] = useState<AdminUser | null>(currentUserFromHook);

    // Volunteer Roster Modal
    const [isRosterModalOpen, setIsRosterModalOpen] = useState<boolean>(false);
    const [rosterModalShiftId, setRosterModalShiftId] = useState<string | null>(null);

    // Copy link state
    const [isCopied, setIsCopied] = useState<boolean>(false);

    // Signup Form State
    const [signupShiftId, setSignupShiftId] = useState<string>(shiftId);
    const [selectedRoleId, setSelectedRoleId] = useState<string>('');
    const [fullName, setFullName] = useState<string>(currentUserFromHook?.name || '');
    const [email, setEmail] = useState<string>(currentUserFromHook?.email || '');
    const [password, setPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
    const [phonePrefix, setPhonePrefix] = useState<string>('+40');
    const [phone, setPhone] = useState<string>('');
    const [orgType, setOrgType] = useState<OrgType>('Interact');
    const [orgDetails, setOrgDetails] = useState<string>('');

    // Google OAuth State
    const [googleCredential, setGoogleCredential] = useState<string | null>(null);
    const [googleUserEmail, setGoogleUserEmail] = useState<string>('');
    const [googleUserName, setGoogleUserName] = useState<string>('');
    const [googleStatusNotice, setGoogleStatusNotice] = useState<string | null>(null);
    const [isCompletingGoogle, setIsCompletingGoogle] = useState<boolean>(false);

    // Submission status
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [signupError, setSignupError] = useState<string | null>(null);
    const [signupSuccessMessage, setSignupSuccessMessage] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        if (!standId) return;
        try {
            const [fetchedStand, fetchedRoles, fetchedClubs] = await Promise.all([
                hrService.getStandById(standId),
                hrService.getRoles().catch(() => []),
                adminAuthService.getClubs().catch(() => [])
            ]);
            if (fetchedStand) {
                setStand(fetchedStand);
                setSignupShiftId(prev => prev || (fetchedStand.shifts && fetchedStand.shifts.length > 0 ? fetchedStand.shifts[0].id : ''));
            }
            if (fetchedRoles && fetchedRoles.length > 0) {
                setRoles(fetchedRoles);
                setSelectedRoleId(prev => prev || fetchedRoles[0].id);
            }
            if (fetchedClubs && fetchedClubs.length > 0) {
                setDbClubs(fetchedClubs);
            }
        } catch (err) {
            console.error('Error fetching calendar stand details:', err);
        }
    }, [standId]);

    useEffect(() => {
        if (!isOpen) return;
        setIsLoading(true);
        setActiveTab(initialTab);
        setSignupShiftId(shiftId);
        setSignupError(null);
        setSignupSuccessMessage(null);

        try {
            const raw = localStorage.getItem('adminUser');
            if (raw) {
                const parsed = JSON.parse(raw);
                setCurrentUser(parsed);
                if (parsed.name) setFullName(parsed.name);
                if (parsed.email) setEmail(parsed.email);
            } else if (currentUserFromHook) {
                setCurrentUser(currentUserFromHook);
                if (currentUserFromHook.name) setFullName(currentUserFromHook.name);
                if (currentUserFromHook.email) setEmail(currentUserFromHook.email);
            }
        } catch {}

        loadData().finally(() => setIsLoading(false));
    }, [isOpen, standId, initialTab, shiftId, currentUserFromHook, loadData]);

    // Handle Escape key
    useEffect(() => {
        if (!isOpen || isRosterModalOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isRosterModalOpen, onClose]);

    const currentClubs = useMemo(() => {
        if (orgType === 'Other') return [];
        return dbClubs.filter(c => c.organizationType?.toLowerCase() === orgType.toLowerCase()).map(c => c.name);
    }, [dbClubs, orgType]);

    const isAllExpired = useMemo(() => {
        if (!stand?.shifts || stand.shifts.length === 0) return false;
        return stand.shifts.every(sh => isShiftExpiredClient(stand.eventDate, sh.endTime));
    }, [stand]);

    useEffect(() => {
        if (orgType !== 'Other') {
            if (currentClubs.length > 0 && (!orgDetails || !currentClubs.includes(orgDetails))) {
                setOrgDetails(currentClubs[0]);
            }
        } else {
            setOrgDetails('');
        }
    }, [orgType, currentClubs, orgDetails]);

    const handleCopyLink = () => {
        const shortId = stand?.id ? stand.id.split('-')[0] : standId;
        const pageUrl = `${window.location.origin}/s/${shortId}`;
        navigator.clipboard.writeText(pageUrl);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2500);
    };

    const handleGoogleAuthSuccess = async (credential: string) => {
        setSignupError(null);
        setGoogleStatusNotice(null);
        try {
            const res = await adminAuthService.signInWithGoogle(credential);
            if (res && res.user) {
                localStorage.setItem('adminUser', JSON.stringify(res.user));
                window.dispatchEvent(new Event('authChange'));
                setCurrentUser(res.user);
                setFullName(res.user.name || '');
                setEmail(res.user.email || '');
                setGoogleCredential(null);
            }
        } catch (err: any) {
            if (err?.status === 'NEEDS_REGISTRATION') {
                const payload = decodeJwtPayload(credential);
                setGoogleCredential(credential);
                setGoogleUserEmail(payload?.email || '');
                setGoogleUserName(payload?.name || '');
                if (payload?.name) setFullName(payload.name);
                if (payload?.email) setEmail(payload.email);
                setGoogleStatusNotice(null);
            } else if (err?.status === 'PENDING_APPROVAL') {
                setGoogleStatusNotice(t('general.googleApprovalPendingNotice', 'Contul tău a fost creat și este în curs de aprobare de către un coordonator/administrator.'));
            } else {
                setSignupError(err?.message || t('auth.googleError', 'Eroare la autentificarea cu Google.'));
            }
        }
    };

    const handleGoogleCompleteRegistration = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!googleCredential || !standId || !signupShiftId || !selectedRoleId) return;
        if (!phone.trim()) {
            setSignupError(t('publicStand.errPhoneRequired', 'Numărul de telefon este obligatoriu.'));
            return;
        }
        if (!orgDetails.trim()) {
            setSignupError(t('publicStand.errOrgRequired', 'Selectați sau introduceți clubul/organizația.'));
            return;
        }

        setIsCompletingGoogle(true);
        setSignupError(null);
        const fullPhone = `${phonePrefix} ${phone.trim()}`;
        const displayName = fullName.trim() || googleUserName;

        try {
            try {
                await adminAuthService.registerWithGoogle({
                    credential: googleCredential,
                    fullName: displayName,
                    phone: fullPhone,
                    orgType,
                    orgDetails: orgDetails.trim(),
                    justification: `Înscriere Stand ${stand?.locationName || ''}`
                });
            } catch (regErr: any) {
                console.warn('Google registration note:', regErr?.message);
            }

            const res = await hrService.publicStandSignup(standId, {
                fullName: displayName,
                email: googleUserEmail,
                phone: fullPhone,
                orgType,
                orgDetails: orgDetails.trim(),
                shiftId: signupShiftId,
                roleId: selectedRoleId,
                availability: ''
            });

            if (res && res.success) {
                setSignupSuccessMessage(res.message || t('general.googleApprovalSubmittedNotice', 'Cererea ta de cont și înscrierea la stand au fost trimise spre aprobare!'));
                setGoogleCredential(null);
                await loadData();
                if (onRefreshData) onRefreshData();
                if (onSuccess) onSuccess();
            } else {
                setSignupError(res?.message || t('publicStand.errSignupGeneral', 'Eroare la înregistrarea pe schimb.'));
            }
        } catch (err: any) {
            setSignupError(err?.message || t('publicStand.errConnection', 'A apărut o eroare la conectare.'));
        } finally {
            setIsCompletingGoogle(false);
        }
    };

    const handleShiftSignupSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!standId || !signupShiftId || !selectedRoleId) return;

        const signupName = currentUser?.name || fullName.trim();
        const signupEmail = currentUser?.email || email.trim();

        if (!signupName || !signupEmail) {
            setSignupError(t('publicStand.errNameEmailRequired', 'Numele și adresa de email sunt obligatorii.'));
            return;
        }

        if (!currentUser) {
            if (!password || password.length < 8) {
                setSignupError(t('publicStand.errPasswordMin', 'Parola trebuie să aibă minim 8 caractere.'));
                return;
            }
            if (password !== confirmPassword) {
                setSignupError(t('publicStand.errPasswordMismatch', 'Parolele introduse nu coincid.'));
                return;
            }
            if (!phone.trim()) {
                setSignupError(t('publicStand.errPhoneRequired', 'Numărul de telefon este obligatoriu.'));
                return;
            }
            if (!orgDetails.trim()) {
                setSignupError(t('publicStand.errOrgRequired', 'Selectați sau introduceți clubul/organizația.'));
                return;
            }
        }

        const targetShift = stand?.shifts?.find(s => s.id === signupShiftId);
        if (stand && targetShift && isShiftExpiredClient(stand.eventDate, targetShift.endTime)) {
            setSignupError(t('general.shiftAlreadyPassed', 'Acest schimb s-a încheiat deja și nu mai acceptă înscrieri.'));
            return;
        }

        const alreadyRegistered = targetShift?.assignments?.some(a => a.memberEmail?.toLowerCase() === signupEmail.toLowerCase());
        if (alreadyRegistered) {
            setSignupError(t('general.alreadySignedUpForShift', 'Ești deja înscris pe acest schimb.'));
            return;
        }

        setIsSubmitting(true);
        setSignupError(null);

        try {
            const fullPhone = currentUser?.phone || `${phonePrefix} ${phone.trim()}`;
            const res = await hrService.publicStandSignup(standId, {
                fullName: signupName,
                email: signupEmail,
                password: currentUser ? undefined : password,
                phone: fullPhone,
                orgType: currentUser?.organizationType || orgType,
                orgDetails: currentUser?.organizationDetails || orgDetails.trim(),
                shiftId: signupShiftId,
                roleId: selectedRoleId,
                availability: ''
            });

            if (res && res.success) {
                setSignupSuccessMessage(res.message || t('publicStand.signupSuccessDesc', 'Înscrierea ta a fost înregistrată cu succes!'));
                await loadData();
                if (onRefreshData) onRefreshData();
                if (onSuccess) onSuccess();
            } else {
                setSignupError(res?.message || t('publicStand.errSignupGeneral', 'Eroare la înregistrarea pe schimb.'));
            }
        } catch (err: any) {
            setSignupError(getErrorMessage(err));
        } finally {
            setIsSubmitting(false);
        }
    };

    const getRoleQuotaInfo = (shift: HrShift, role: HrStandRole) => {
        const assignments = shift.assignments || [];
        const neededV = shift.neededVolunteers ?? 1;
        const neededL = shift.neededLogistics ?? 1;
        const neededF = shift.neededFinance ?? 1;

        const roleName = (role.name || '').toLowerCase();
        const category = (role.category || '').toUpperCase();
        const isFinance = category === 'FINANCE' || roleName.includes('finance') || roleName.includes('financiar') || roleName.includes('finanțe') || roleName.includes('finante');
        const isLogistics = category === 'LOGISTICS' || roleName.includes('logistic') || roleName.includes('logistica') || roleName.includes('logistică');

        if (isFinance) {
            const assigned = assignments.filter(a => a.roleName && (a.roleName.toLowerCase().includes('finance') || a.roleName.toLowerCase().includes('financiar') || a.roleName.toLowerCase().includes('finanțe') || a.roleName.toLowerCase().includes('finante'))).length;
            const isFull = neededF > 0 ? assigned >= neededF : true;
            const remaining = Math.max(0, neededF - assigned);
            return { assigned, needed: neededF, isFull, remaining };
        } else if (isLogistics) {
            const assigned = assignments.filter(a => a.roleName && (a.roleName.toLowerCase().includes('logistic') || a.roleName.toLowerCase().includes('logistica') || a.roleName.toLowerCase().includes('logistică'))).length;
            const isFull = neededL > 0 ? assigned >= neededL : true;
            const remaining = Math.max(0, neededL - assigned);
            return { assigned, needed: neededL, isFull, remaining };
        } else {
            const assigned = assignments.filter(a => {
                const rn = (a.roleName || '').toLowerCase();
                return !rn.includes('finance') && !rn.includes('financiar') && !rn.includes('finanțe') && !rn.includes('finante') && !rn.includes('logistic') && !rn.includes('logistica') && !rn.includes('logistică');
            }).length;
            const isFull = neededV > 0 ? assigned >= neededV : true;
            const remaining = Math.max(0, neededV - assigned);
            return { assigned, needed: neededV, isFull, remaining };
        }
    };

    if (!isOpen) return null;

    const totalVolunteers = stand?.shifts?.reduce((acc, sh) => acc + (sh.assignments?.length || 0), 0) || 0;
    const currentShift = stand?.shifts?.find(s => s.id === signupShiftId) || (stand?.shifts && stand.shifts.length > 0 ? stand.shifts[0] : null);

    const inputStyle = isDarkMode
        ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700 focus:border-blue-500'
        : 'bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400 focus:border-blue-500';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150" onClick={onClose}>
            <div
                className={`w-full h-full sm:h-[650px] max-w-2xl flex flex-col rounded-none sm:rounded-2xl border-0 sm:border shadow-2xl overflow-hidden transition-all ${
                    isDarkMode ? 'bg-black text-white border-zinc-800' : 'bg-white text-zinc-900 border-zinc-200'
                }`}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-5 sm:px-6 pt-4 pb-3 space-y-2.5 shrink-0">
                    {/* Top Row: Location Name + Subtitle (left) & Close Button (right) */}
                    <div className="flex items-start justify-between gap-3">
                        <div className="space-y-0.5 min-w-0 flex-1">
                            <h3 className={`font-bold text-base sm:text-lg tracking-tight truncate ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>

                                {stand?.locationName || t('general.typeStands', 'Stand')}
                            </h3>
                            {stand && (
                                <div className={`flex items-center gap-2 text-xs ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>

                                    <span className={`font-medium ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>{stand.eventDate}</span>
                                    <span className="text-zinc-600">•</span>
                                    <span className={`font-medium ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>{totalVolunteers} {t('publicStand.volunteersRegistered', 'voluntari înscriși')}</span>
                                </div>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className={`p-1.5 rounded-lg transition cursor-pointer shrink-0 ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}
                            aria-label={t('general.close', 'Închide')}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Action Buttons Row (separate line) */}
                    <div className="flex items-center gap-2">
                        {totalVolunteers > 0 && (
                            <button
                                type="button"
                                onClick={() => {
                                    setRosterModalShiftId(null);
                                    setIsRosterModalOpen(true);
                                }}
                                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer text-center ${isDarkMode ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border-zinc-800' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-900 border-zinc-300'}`}
                            >
                                <span>{t('publicStand.viewAllVolunteers', 'Vezi toți voluntarii')}</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleCopyLink}
                            className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer text-center ${
                                isCopied
                                    ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40'
                                    : (isDarkMode ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-800' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-900 border-zinc-300')
                            }`}
                        >
                            <span>{isCopied ? t('publicStand.linkCopied', 'Link Copiat!') : t('publicStand.copyLink', 'Copiază Link')}</span>
                        </button>
                    </div>
                </div>

                {/* Inset Divider 1 */}
                <div className={`mx-5 sm:mx-6 border-b shrink-0 ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`} />

                {/* Sub-Tab Navigation Bar */}
                <div className="px-5 sm:px-6 pt-3 pb-1 shrink-0">
                    <div className={`flex items-center w-full p-1 rounded-xl border ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`}>
                        <button
                            type="button"
                            onClick={() => {
                                setActiveTab('shifts');
                                setSignupError(null);
                                setSignupSuccessMessage(null);
                            }}
                            className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition cursor-pointer text-center ${
                                activeTab === 'shifts'
                                    ? isDarkMode
                                        ? 'bg-zinc-800 text-white border border-zinc-700/60 shadow-xs'
                                        : 'bg-white text-zinc-900 border border-zinc-300 shadow-xs'
                                    : isDarkMode
                                        ? 'text-zinc-400 hover:text-zinc-200'
                                        : 'text-zinc-500 hover:text-zinc-900'
                            }`}
                        >
                            <span>{t('general.standTabShifts', 'Schimburi & Voluntari')}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setActiveTab('signup');
                                setSignupError(null);
                                setSignupSuccessMessage(null);
                            }}
                            className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition cursor-pointer text-center ${
                                activeTab === 'signup'
                                    ? isDarkMode
                                        ? 'bg-zinc-800 text-white border border-zinc-700/60 shadow-xs'
                                        : 'bg-white text-zinc-900 border border-zinc-300 shadow-xs'
                                    : isDarkMode
                                        ? 'text-zinc-400 hover:text-zinc-200'
                                        : 'text-zinc-500 hover:text-zinc-900'
                            }`}
                        >
                            <span>{t('general.standTabSignup', 'Înscriere Voluntar')}</span>
                        </button>
                    </div>
                </div>

                {/* Scrollable Body Content */}
                <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-4 text-sm">
                    {isLoading ? (
                        <div className="h-48 flex items-center justify-center text-xs text-zinc-400 animate-pulse">
                            {t('general.loading', 'Se încarcă detaliile standului...')}
                        </div>
                    ) : !stand ? (
                        <div className="p-8 text-center text-xs text-zinc-500">
                            {t('publicStand.standNotFound', 'Standul nu a fost găsit.')}
                        </div>
                    ) : activeTab === 'shifts' ? (
                        /* TAB 1: SHIFTS & VOLUNTEERS OVERVIEW */
                        <div className="space-y-4">
                            {stand.notes && (
                                <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-300">
                                    <span className="font-bold text-zinc-200 block mb-1">
                                        {t('publicStand.standInstructions', 'Informații & Instrucțiuni Stand:')}
                                    </span>
                                    <p className="leading-relaxed text-zinc-400 break-words">{stand.notes}</p>
                                </div>
                            )}

                            <div className="space-y-3">
                                {(!stand.shifts || stand.shifts.length === 0) ? (
                                    <div className="p-8 text-center rounded-2xl border border-zinc-800 bg-zinc-900 text-xs text-zinc-500">
                                        {t('publicStand.noShiftsConfigured', 'Nu există schimburi configurate momentan pentru acest stand.')}
                                    </div>
                                ) : (
                                    stand.shifts.map(sh => {
                                        const assignments = sh.assignments || [];
                                        const isExpired = isShiftExpiredClient(stand.eventDate, sh.endTime);
                                        const neededV = sh.neededVolunteers ?? 1;
                                        const neededL = sh.neededLogistics ?? 1;
                                        const neededF = sh.neededFinance ?? 1;
                                        const totalCap = neededV + neededL + neededF;
                                        const isShiftFull = assignments.length >= totalCap;
                                        const isUserAssigned = assignments.some(a =>
                                            currentUser && (
                                                (a.memberEmail && a.memberEmail.toLowerCase() === currentUser.email?.toLowerCase()) ||
                                                (a.memberName && a.memberName.toLowerCase() === currentUser.name?.toLowerCase())
                                            )
                                        );

                                        return (
                                            <div
                                                key={sh.id}
                                                className="rounded-2xl border bg-zinc-900/80 border-zinc-800 hover:border-zinc-700/80 p-3.5 sm:p-4 transition-all shadow-md space-y-2.5"
                                            >
                                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h4 className={`text-sm sm:text-base font-bold ${isExpired ? 'text-zinc-500 line-through' : (isDarkMode ? 'text-white' : 'text-zinc-900')}`}>
                                                            {sh.shiftName}
                                                        </h4>
                                                        <span className="px-2.5 py-0.5 text-xs font-mono font-semibold rounded-lg bg-zinc-950 text-blue-400 border border-zinc-800 shrink-0">
                                                            {sh.startTime} - {sh.endTime}
                                                        </span>
                                                        {isExpired ? (
                                                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-zinc-800 text-zinc-500 shrink-0">
                                                                {t('publicStand.shiftEnded', 'Încheiat')}
                                                            </span>
                                                        ) : isShiftFull ? (
                                                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                                                                {t('hr.roleFull', 'Complet Ocupat')}
                                                            </span>
                                                        ) : null}
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {assignments.length > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setRosterModalShiftId(sh.id);
                                                                    setIsRosterModalOpen(true);
                                                                }}
                                                                className={`px-2.5 py-1 text-xs font-semibold rounded-xl border transition cursor-pointer ${isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-900 border-zinc-300'}`}
                                                            >
                                                                <span>{t('publicStand.viewVolunteers', 'Vezi voluntari')} ({assignments.length})</span>
                                                            </button>
                                                        )}

                                                        {!isExpired && (
                                                            isUserAssigned ? (
                                                                <span className="px-3 py-1 text-xs font-bold rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                                                    {t('publicStand.youAreRegistered', 'Ești Înscris')}
                                                                </span>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSignupShiftId(sh.id);
                                                                        setActiveTab('signup');
                                                                        setSignupError(null);
                                                                        setSignupSuccessMessage(null);
                                                                        const availableRole = roles.find(r => !getRoleQuotaInfo(sh, r).isFull);
                                                                        if (availableRole) setSelectedRoleId(availableRole.id);
                                                                    }}
                                                                    className="px-3.5 py-1 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md transition cursor-pointer"
                                                                >
                                                                    <span>{t('publicStand.signUpForShift', 'Înscrie-te')}</span>
                                                                </button>
                                                            )
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Role breakdown chips */}
                                                <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-zinc-800/60 text-xs">
                                                    {roles.map(r => {
                                                        const quota = getRoleQuotaInfo(sh, r);
                                                        return (
                                                            <div
                                                                key={r.id}
                                                                className={`px-2 py-0.5 rounded-lg border text-[11px] font-medium flex items-center gap-1.5 ${
                                                                    quota.isFull
                                                                        ? 'bg-zinc-950/60 border-zinc-850 text-zinc-500'
                                                                        : 'bg-zinc-900 border-zinc-800 text-zinc-300'
                                                                }`}
                                                            >
                                                                <span>{r.name}:</span>
                                                                <span className={quota.isFull ? 'text-zinc-500' : 'text-zinc-200 font-semibold'}>
                                                                    {quota.assigned}/{quota.needed}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    ) : (
                        /* TAB 2: VOLUNTEER SIGNUP FORM */
                        <div className="space-y-4">
                            {signupSuccessMessage ? (
                                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 space-y-3 animate-in fade-in duration-200">
                                    <h4 className="font-bold text-emerald-400 text-sm">
                                        {t('publicStand.signupSuccessTitle', 'Înscriere Reușită pe Schimb!')}
                                    </h4>
                                    <p className="text-zinc-300 leading-relaxed">
                                        {signupSuccessMessage}
                                    </p>
                                    <div className="pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('shifts')}
                                            className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition cursor-pointer"
                                        >
                                            <span>{t('publicStand.viewShifts', 'Vezi Schimburile')}</span>
                                        </button>
                                    </div>
                                </div>
                            ) : isAllExpired ? (
                                <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-center space-y-3">
                                    <h4 className="font-bold text-zinc-200 text-sm">{t('publicStand.standEndedAll', 'Toate schimburile s-au încheiat')}</h4>
                                    <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                                        {t('general.shiftAlreadyPassed', 'Acest stand s-a încheiat deja și nu mai acceptă înscrieri noi.')}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('shifts')}
                                        className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-semibold border border-zinc-700 transition cursor-pointer"
                                    >
                                        <span>{t('publicStand.viewShifts', 'Vezi Schimburile & Voluntarii')}</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Shift Selector */}
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-semibold text-zinc-400">
                                            {t('general.shift', 'Schimb:')}
                                        </label>
                                        <select
                                            value={signupShiftId}
                                            onChange={e => {
                                                setSignupShiftId(e.target.value);
                                                const targetSh = stand.shifts?.find(s => s.id === e.target.value);
                                                if (targetSh) {
                                                    const availableRole = roles.find(r => !getRoleQuotaInfo(targetSh, r).isFull);
                                                    if (availableRole) setSelectedRoleId(availableRole.id);
                                                }
                                            }}
                                            className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition cursor-pointer ${inputStyle}`}
                                        >
                                            {stand.shifts?.map(sh => (
                                                <option
                                                    key={sh.id}
                                                    value={sh.id}
                                                    disabled={isShiftExpiredClient(stand.eventDate, sh.endTime)}
                                                >
                                                    {sh.shiftName} ({sh.startTime} - {sh.endTime}) {isShiftExpiredClient(stand.eventDate, sh.endTime) ? ` - ${t('publicStand.shiftEnded', 'Încheiat')}` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Role Selector Grid */}
                                    {currentShift && (
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-semibold text-zinc-400">
                                                {t('publicStand.step1Role', 'Alege rolul pe stand:')}
                                            </label>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                {roles.map(r => {
                                                    const quota = getRoleQuotaInfo(currentShift, r);
                                                    const isSelected = selectedRoleId === r.id;
                                                    const isFull = quota.isFull;

                                                    return (
                                                        <button
                                                            key={r.id}
                                                            type="button"
                                                            disabled={isFull}
                                                            onClick={() => setSelectedRoleId(r.id)}
                                                            className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all text-center flex flex-col items-center justify-center gap-0.5 ${
                                                                isFull
                                                                    ? 'bg-zinc-950/60 border-zinc-850 text-zinc-600 opacity-60 cursor-not-allowed'
                                                                    : isSelected
                                                                        ? 'bg-blue-600/20 border-blue-500 text-white shadow-xs cursor-pointer'
                                                                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 cursor-pointer'
                                                            }`}
                                                        >
                                                            <span>{r.name}</span>
                                                            <span className={`text-[10px] ${
                                                                isFull
                                                                    ? 'text-rose-400/80 font-semibold'
                                                                    : quota.remaining <= 1
                                                                        ? 'text-amber-400/90 font-medium'
                                                                        : 'text-zinc-500'
                                                            }`}>
                                                                {isFull
                                                                    ? `(${t('hr.roleFull', 'Ocupat')} - ${quota.assigned}/${quota.needed})`
                                                                    : `(${quota.remaining} ${quota.remaining === 1 ? t('hr.slotRemaining', 'loc rămas') : t('hr.slotsRemaining', 'locuri rămase')})`}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Google Status Notice */}
                                    {googleStatusNotice && (
                                        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
                                            <p className="leading-relaxed">{googleStatusNotice}</p>
                                        </div>
                                    )}

                                    {/* If NOT logged in: Registration forms */}
                                    {!currentUser && (
                                        googleCredential ? (
                                            <div className="space-y-3.5 border-t border-zinc-800 pt-3">
                                                <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-xs space-y-2">
                                                    <div className="flex items-center space-x-2 text-blue-400 font-bold">
                                                        <span>{t('publicStand.googleCompleteTitle', 'Completează Datele de Voluntar (Google)')}</span>
                                                    </div>
                                                    <p className="text-zinc-300 text-xs leading-relaxed">
                                                        {t('publicStand.googleCompleteDesc', 'Pentru a finaliza înscrierea cu contul Google, completează numărul de telefon și clubul/organizația.')}
                                                    </p>
                                                    <div className="pt-1 text-[11px] text-zinc-400">
                                                        <span className="text-zinc-500">Google:</span> <strong className={isDarkMode ? "text-white" : "text-zinc-900"}>{googleUserEmail}</strong>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                    <input
                                                        type="text"
                                                        required
                                                        placeholder={t('publicStand.namePlaceholder', 'Nume și Prenume *')}
                                                        value={fullName}
                                                        onChange={e => setFullName(e.target.value)}
                                                        className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputStyle}`}
                                                    />
                                                    <div className="flex rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900">
                                                        <select
                                                            value={phonePrefix}
                                                            onChange={e => setPhonePrefix(e.target.value)}
                                                            className="px-2.5 py-2 text-xs bg-zinc-850 text-zinc-300 border-r border-zinc-800 outline-hidden cursor-pointer shrink-0"
                                                        >
                                                            {COUNTRY_PREFIXES.map(p => (
                                                                <option key={p.country} value={p.code} className={isDarkMode ? "bg-zinc-900 text-white" : "bg-white text-zinc-900"}>
                                                                    {p.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <input
                                                            type="tel"
                                                            required
                                                            placeholder={t('publicStand.phonePlaceholder', 'Număr de Telefon (WhatsApp) *')}
                                                            value={phone}
                                                            onChange={e => setPhone(e.target.value)}
                                                            className={`w-full px-3 py-2 text-xs bg-transparent ${isDarkMode ? 'text-white' : 'text-zinc-900'} outline-hidden focus:ring-2 focus:ring-blue-500`}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="block text-xs font-semibold text-zinc-400">
                                                        {t('publicStand.orgLabel', 'Organizație: *')}
                                                    </label>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                        {(['Interact', 'Rotaract', 'Rotary', 'Other'] as OrgType[]).map(type => (
                                                            <button
                                                                key={type}
                                                                type="button"
                                                                onClick={() => setOrgType(type)}
                                                                className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                                                                    orgType === type
                                                                        ? 'bg-blue-600/20 border-blue-500 text-white shadow-xs'
                                                                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                                                                }`}
                                                            >
                                                                {type === 'Other' ? t('publicStand.otherOrg', 'Altă Organizație') : type}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="block text-xs font-semibold text-zinc-400">
                                                        {orgType === 'Other' ? t('publicStand.otherOrgPrompt', 'Nume Organizație / Club / Instituție: *') : `${t('publicStand.clubPrompt', 'Club')} ${orgType}: *`}
                                                    </label>
                                                    {orgType === 'Other' ? (
                                                        <input
                                                            type="text"
                                                            required
                                                            placeholder={t('publicStand.otherOrgPlaceholder', 'Ex: Liceul X, Asociația Y, Independent...')}
                                                            value={orgDetails}
                                                            onChange={e => setOrgDetails(e.target.value)}
                                                            className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputStyle}`}
                                                        />
                                                    ) : (
                                                        <select
                                                            required
                                                            value={orgDetails}
                                                            onChange={e => setOrgDetails(e.target.value)}
                                                            className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition cursor-pointer ${inputStyle}`}
                                                        >
                                                            {currentClubs.map(club => (
                                                                <option key={club} value={club} className={isDarkMode ? "bg-zinc-900 text-white" : "bg-white text-zinc-900"}>
                                                                    {club}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </div>

                                                <div className="flex justify-start">
                                                    <button
                                                        type="button"
                                                        onClick={() => setGoogleCredential(null)}
                                                        className="text-xs font-semibold text-zinc-400 hover:text-white transition cursor-pointer"
                                                    >
                                                        {t('common.cancel', 'Anulează')}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            /* CLASSIC FORM WITH GOOGLE BUTTON */
                                            <div className="space-y-3.5 border-t border-zinc-800 pt-3">
                                                <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-center space-y-2">
                                                    <span className="text-[11px] font-semibold text-zinc-400 block">
                                                        {t('publicStand.googleSignInBtn', 'Înscriere rapidă cu contul Google')}
                                                    </span>
                                                    <div className="flex justify-center overflow-hidden rounded-full [&_iframe]:bg-transparent">
                                                        <GoogleLogin
                                                            onSuccess={res => {
                                                                if (res.credential) handleGoogleAuthSuccess(res.credential);
                                                            }}
                                                            onError={() => {
                                                                setSignupError(t('auth.googleError', 'Eroare la autentificarea cu Google.'));
                                                            }}
                                                            theme="filled_black"
                                                            shape="pill"
                                                            size="medium"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="relative flex items-center justify-center my-1">
                                                    <div className="border-t border-zinc-850 w-full" />
                                                    <span className="bg-black px-2 text-[10px] text-zinc-500 uppercase tracking-wider font-semibold absolute">
                                                        sau formular clasic de înregistrare
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                    <input
                                                        type="text"
                                                        required
                                                        placeholder={t('publicStand.namePlaceholder', 'Nume și Prenume *')}
                                                        value={fullName}
                                                        onChange={e => setFullName(e.target.value)}
                                                        className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputStyle}`}
                                                    />
                                                    <input
                                                        type="email"
                                                        required
                                                        placeholder={t('publicStand.emailPlaceholder', 'Adresă Email *')}
                                                        value={email}
                                                        onChange={e => setEmail(e.target.value)}
                                                        className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputStyle}`}
                                                    />
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                    <div className="relative">
                                                        <input
                                                            type={showPassword ? 'text' : 'password'}
                                                            required
                                                            placeholder={t('publicStand.passwordPlaceholder', 'Parolă Cont (min. 8 caractere) *')}
                                                            value={password}
                                                            onChange={e => setPassword(e.target.value)}
                                                            className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border pr-9 outline-hidden transition ${inputStyle}`}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPassword(!showPassword)}
                                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                                                        >
                                                            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                        </button>
                                                    </div>
                                                    <div className="relative">
                                                        <input
                                                            type={showConfirmPassword ? 'text' : 'password'}
                                                            required
                                                            placeholder={t('publicStand.confirmPasswordPlaceholder', 'Confirmă Parola *')}
                                                            value={confirmPassword}
                                                            onChange={e => setConfirmPassword(e.target.value)}
                                                            className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border pr-9 outline-hidden transition ${inputStyle}`}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                                                        >
                                                            {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div>
                                                    <div className="flex rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900">
                                                        <select
                                                            value={phonePrefix}
                                                            onChange={e => setPhonePrefix(e.target.value)}
                                                            className="px-2.5 py-2 text-xs bg-zinc-850 text-zinc-300 border-r border-zinc-800 outline-hidden cursor-pointer shrink-0"
                                                        >
                                                            {COUNTRY_PREFIXES.map(p => (
                                                                <option key={p.country} value={p.code} className={isDarkMode ? "bg-zinc-900 text-white" : "bg-white text-zinc-900"}>
                                                                    {p.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <input
                                                            type="tel"
                                                            required
                                                            placeholder={t('publicStand.phonePlaceholder', 'Număr de Telefon (WhatsApp) *')}
                                                            value={phone}
                                                            onChange={e => setPhone(e.target.value)}
                                                            className={`w-full px-3 py-2 text-xs bg-transparent ${isDarkMode ? 'text-white' : 'text-zinc-900'} outline-hidden focus:ring-2 focus:ring-blue-500`}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="block text-xs font-semibold text-zinc-400">
                                                        {t('publicStand.orgLabel', 'Organizație: *')}
                                                    </label>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                        {(['Interact', 'Rotaract', 'Rotary', 'Other'] as OrgType[]).map(type => (
                                                            <button
                                                                key={type}
                                                                type="button"
                                                                onClick={() => setOrgType(type)}
                                                                className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                                                                    orgType === type
                                                                        ? 'bg-blue-600/20 border-blue-500 text-white shadow-xs'
                                                                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                                                                }`}
                                                            >
                                                                {type === 'Other' ? t('publicStand.otherOrg', 'Altă Organizație') : type}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="block text-xs font-semibold text-zinc-400">
                                                        {orgType === 'Other' ? t('publicStand.otherOrgPrompt', 'Nume Organizație / Club / Instituție: *') : `${t('publicStand.clubPrompt', 'Club')} ${orgType}: *`}
                                                    </label>
                                                    {orgType === 'Other' ? (
                                                        <input
                                                            type="text"
                                                            required
                                                            placeholder={t('publicStand.otherOrgPlaceholder', 'Ex: Liceul X, Asociația Y, Independent...')}
                                                            value={orgDetails}
                                                            onChange={e => setOrgDetails(e.target.value)}
                                                            className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputStyle}`}
                                                        />
                                                    ) : (
                                                        <select
                                                            required
                                                            value={orgDetails}
                                                            onChange={e => setOrgDetails(e.target.value)}
                                                            className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition cursor-pointer ${inputStyle}`}
                                                        >
                                                            {currentClubs.map(club => (
                                                                <option key={club} value={club} className={isDarkMode ? "bg-zinc-900 text-white" : "bg-white text-zinc-900"}>
                                                                    {club}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Inset Divider 2 */}
                <div className={`mx-5 sm:mx-6 border-t shrink-0 ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`} />

                {/* Pinned Footer Action Bar */}
                <div className="px-5 sm:px-6 py-3.5 flex items-center justify-between shrink-0 gap-3">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                        {signupError ? (
                            <span className="text-xs text-rose-400 font-medium truncate">{signupError}</span>
                        ) : currentUser ? (
                            <div className="flex items-center space-x-1.5 text-xs text-zinc-400 truncate">
                                <User className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span className="truncate">
                                    {t('publicStand.loggedInAs', 'Autentificat ca:')} <strong className={isDarkMode ? "text-white" : "text-zinc-900"}>{currentUser.name}</strong>
                                </span>
                            </div>
                        ) : null}
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                        {activeTab === 'shifts' ? null : signupSuccessMessage || isAllExpired ? (
                            <button
                                type="button"
                                onClick={() => setActiveTab('shifts')}
                                className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition cursor-pointer"
                            >
                                <span>{t('publicStand.viewShifts', 'Vezi Schimburile')}</span>
                            </button>
                        ) : (
                            <button
                                type="button"
                                disabled={isSubmitting || isCompletingGoogle || !selectedRoleId}
                                onClick={googleCredential ? handleGoogleCompleteRegistration : handleShiftSignupSubmit}
                                className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md transition cursor-pointer disabled:opacity-50"
                            >
                                <span>{(isSubmitting || isCompletingGoogle) ? t('general.standSubmitting', 'Se procesează...') : (googleCredential ? t('general.googleCompleteSubmit', 'Finalizează & Trimite spre Aprobare') : t('publicStand.confirmSignup', 'Confirmă Înscrierea'))}</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Stand Volunteers Roster Modal */}
            <StandVolunteersModal
                isOpen={isRosterModalOpen}
                onClose={() => {
                    setIsRosterModalOpen(false);
                    setRosterModalShiftId(null);
                }}
                stand={stand}
                initialShiftId={rosterModalShiftId}
                canWrite={isAdmin}
                isDarkMode={isDarkMode}
            />
        </div>
    );
};

