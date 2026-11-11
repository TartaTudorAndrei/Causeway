import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { User, X, LogOut, Bell, Settings, MessageSquare, Link2 } from 'lucide-react';
import type { AdminUser } from '../../types/adminAuth';
import type { HrStand, HrShift, HrShiftAssignment, HrFeedbackCategory, FeedbackType } from '../../types/hr';
import { adminAuthService } from '../../services/adminAuthService';
import { hrService } from '../../services/hrService';
import { pwaNotificationService } from '../../services/pwaNotificationService';
import { useLanguage } from '../../context/LanguageContext';
import { useTenant } from '../../context/TenantContext';
import { CustomSelect } from '../common';
interface AccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: 'settings' | 'attendance' | 'feedback';
    initialStandId?: string | null;
    initialQrToken?: string | null;
    isDarkMode: boolean;
    onLogout?: () => void;
    settingsOnly?: boolean;
}
const normalizeDateStr = (rawDate?: any): string => {
    if (!rawDate)
        return '';
    if (Array.isArray(rawDate) && rawDate.length >= 3) {
        const y = String(rawDate[0]);
        const m = String(rawDate[1]).padStart(2, '0');
        const d = String(rawDate[2]).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    let s = String(rawDate).trim();
    if (s.includes('T'))
        s = s.split('T')[0];
    if (s.includes(' '))
        s = s.split(' ')[0];
    const delims = ['.', '/', '-'];
    for (const delim of delims) {
        if (s.includes(delim)) {
            const parts = s.split(delim);
            if (parts.length === 3) {
                if (parts[0].length === 4) {
                    return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                }
                if (parts[2].length === 4) {
                    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
            }
        }
    }
    return s;
};
const getTodayStr = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, initialTab = 'settings', initialStandId, initialQrToken, isDarkMode, onLogout, settingsOnly = false }) => {
    const { language, setLanguage, t } = useLanguage();
    const { tenant } = useTenant();
    const [activeTab, setActiveTab] = useState<'settings' | 'attendance' | 'feedback'>(initialTab);
    const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
    // 2FA Management States
    const [twoFactorInfo, setTwoFactorInfo] = useState<{
        enabled: boolean;
        method: string;
    } | null>(null);
    const [isSetupOpen, setIsSetupOpen] = useState(false);
    const [setupLoading, setSetupLoading] = useState(false);
    const [setupError, setSetupError] = useState('');
    const [setupSuccess, setSetupSuccess] = useState('');
    const [setupData, setSetupData] = useState<{
        secret: string;
        otpAuthUrl: string;
        email: string;
    } | null>(null);
    const [setupMethod, setSetupMethod] = useState<'TOTP' | 'EMAIL' | 'BOTH'>('EMAIL');
    const [setupCode, setSetupCode] = useState('');
    const [secretCopied, setSecretCopied] = useState(false);
    // Disable 2FA States
    const [isDisableOpen, setIsDisableOpen] = useState(false);
    const [disablePassword, setDisablePassword] = useState('');
    const [disableError, setDisableError] = useState('');
    const [disableLoading, setDisableLoading] = useState(false);
    // Push Notifications State
    const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
    const [isPushSubscribed, setIsPushSubscribed] = useState(false);
    const [isPushToggling, setIsPushToggling] = useState(false);

    const checkPushPermission = async () => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            const perm = Notification.permission;
            setPushPermission(perm);
            if (perm === 'granted') {
                const subscribed = await pwaNotificationService.isSubscribed();
                setIsPushSubscribed(subscribed);
            } else {
                setIsPushSubscribed(false);
            }
        }
    };

    const handleTogglePushNotifications = async () => {
        setIsPushToggling(true);
        try {
            if (isPushSubscribed) {
                await pwaNotificationService.unsubscribeCurrentDevice();
                setIsPushSubscribed(false);
            } else {
                const granted = await pwaNotificationService.subscribeCurrentDevice();
                setIsPushSubscribed(granted);
                if (typeof window !== 'undefined' && 'Notification' in window) {
                    setPushPermission(Notification.permission);
                }
                if (granted) {
                    pwaNotificationService.markPromptDecision('accepted');
                }
            }
        } catch {
            // ignore
        } finally {
            setIsPushToggling(false);
        }
    };
    // WhatsApp Notifications State
    const [isWhatsappToggling, setIsWhatsappToggling] = useState(false);

    const handleToggleWhatsapp = async (enabled: boolean) => {
        setIsWhatsappToggling(true);
        try {
            const res = await adminAuthService.updateWhatsappNotificationsPreference(enabled);
            setCurrentUser(prev => {
                if (!prev) return null;
                const updated = { ...prev, whatsappNotificationsEnabled: res.whatsappNotificationsEnabled };
                try {
                    const stored = localStorage.getItem('adminUser');
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        localStorage.setItem('adminUser', JSON.stringify({ ...parsed, whatsappNotificationsEnabled: res.whatsappNotificationsEnabled }));
                    }
                } catch {}
                return updated;
            });
        } catch (e) {
            console.error('Failed updating WhatsApp notification preference:', e);
        } finally {
            setIsWhatsappToggling(false);
        }
    };
    // Referral Link States
    const [refCodeCopied, setRefCodeCopied] = useState(false);
    const [isGeneratingRef, setIsGeneratingRef] = useState(false);

    const handleGenerateReferralCode = async () => {
        setIsGeneratingRef(true);
        try {
            const res = await adminAuthService.generateReferralCode();
            setCurrentUser(prev => {
                if (!prev) return null;
                const updated = { ...prev, referralCode: res.referralCode };
                try {
                    const stored = localStorage.getItem('adminUser');
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        localStorage.setItem('adminUser', JSON.stringify({ ...parsed, referralCode: res.referralCode }));
                    }
                } catch {}
                return updated;
            });
        } catch (e) {
            console.error('Failed generating referral code:', e);
        } finally {
            setIsGeneratingRef(false);
        }
    };

    // --- ATTENDANCE TAB STATES ---
    const [stands, setStands] = useState<HrStand[]>([]);
    const [isStandsLoading, setIsStandsLoading] = useState(false);
    const [timelineFilter, setTimelineFilter] = useState<'today' | 'upcoming' | 'past'>('today');
    const [activeShiftAction, setActiveShiftAction] = useState<{
        standId: string;
        shiftId: string;
    } | null>(null);
    // GPS state
    const [isGpsLoading, setIsGpsLoading] = useState(false);
    const [gpsError, setGpsError] = useState<string | null>(null);
    const [gpsDistance, setGpsDistance] = useState<number | null>(null);
    const [gpsSuccessShiftId, setGpsSuccessShiftId] = useState<string | null>(null);
    // QR scanner state
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [qrScanningLoading, setQrScanningLoading] = useState(false);
    const [qrError, setQrError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const scanIntervalRef = useRef<any>(null);

    const loadTwoFactorStatus = async () => {
        try {
            const status = await adminAuthService.get2FAStatus();
            setTwoFactorInfo(status);
        } catch {
            // ignore
        }
    };

    // Load stands for attendance
    const loadStands = async () => {
        setIsStandsLoading(true);
        try {
            const list = await hrService.getStands();
            setStands(list);
        } catch (e) {
            console.warn('Failed loading stands for attendance:', e);
        } finally {
            setIsStandsLoading(false);
        }
    };

    // Stop camera scanner
    const stopCameraScanner = () => {
        if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsScannerOpen(false);
        setQrScanningLoading(false);
    };

    // --- FEEDBACK TAB STATES ---
    const [feedbackCategories, setFeedbackCategories] = useState<HrFeedbackCategory[]>([]);
    const [feedbackType, setFeedbackType] = useState<FeedbackType>('COMPLAINT');
    const [feedbackCategoryId, setFeedbackCategoryId] = useState<string>('');
    const [feedbackIsAnonymous, setFeedbackIsAnonymous] = useState<boolean>(false);
    const [feedbackContent, setFeedbackContent] = useState<string>('');
    const [feedbackSubmitting, setFeedbackSubmitting] = useState<boolean>(false);
    const [feedbackError, setFeedbackError] = useState<string | null>(null);
    const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

    const loadFeedbackCategories = useCallback(async () => {
        try {
            const list = await hrService.getFeedbackCategories();
            setFeedbackCategories(list);
            if (list.length > 0) {
                setFeedbackCategoryId(prev => prev || list[0].id);
            }
        } catch (e) {
            console.warn('Failed loading feedback categories:', e);
        }
    }, []);

    // Load user data on open
    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab);
            const stored = localStorage.getItem('adminUser');
            if (stored) {
                try {
                    const parsed: AdminUser = JSON.parse(stored);
                    setCurrentUser(parsed);
                }
                catch (e) {
                    console.error(e);
                }
            }
            adminAuthService.getMe().then((fresh) => {
                if (fresh) {
                    setCurrentUser(fresh);
                }
            });
            loadTwoFactorStatus();
            loadStands();
            loadFeedbackCategories();
            checkPushPermission();
            setIsSetupOpen(false);
            setIsDisableOpen(false);
            setGpsError(null);
            setGpsDistance(null);
            setQrError(null);
            setFeedbackError(null);
            setFeedbackSuccess(null);
            // Deep link direct QR checkin
            if (initialQrToken) {
                setActiveTab('attendance');
                handleDirectQrCheckin(initialQrToken, initialStandId || undefined);
            }
        }
        else {
            stopCameraScanner();
        }
    }, [isOpen, initialTab, initialQrToken, initialStandId, loadFeedbackCategories]);
    // Clean up on unmount
    useEffect(() => {
        return () => {
            stopCameraScanner();
        };
    }, []);
    // Compute ONLY user's signed-up assignments across all stands
    const userAssignments = useMemo(() => {
        if (!currentUser || !stands.length)
            return [];
        const list: {
            stand: HrStand;
            shift: HrShift;
            assignment: HrShiftAssignment;
        }[] = [];
        const userEmail = (currentUser.email || '').toLowerCase().trim();
        const userId = currentUser.id;
        stands.forEach(s => {
            (s.shifts || []).forEach(sh => {
                (sh.assignments || []).forEach(a => {
                    const matchesEmail = a.memberEmail && a.memberEmail.toLowerCase().trim() === userEmail;
                    const matchesId = a.memberId && userId && a.memberId === userId;
                    if (matchesEmail || matchesId) {
                        list.push({ stand: s, shift: sh, assignment: a });
                    }
                });
            });
        });
        return list;
    }, [currentUser, stands]);
    // Filter signed-up assignments by timeline
    const upcomingAssignments = useMemo(() => {
        const todayStr = getTodayStr();
        return userAssignments.filter(({ stand, assignment }) => {
            const normDate = normalizeDateStr(stand.eventDate);
            if (!normDate) return false;
            return normDate > todayStr && assignment.attendanceStatus !== 'PRESENT';
        });
    }, [userAssignments]);

    const pastAssignments = useMemo(() => {
        const todayStr = getTodayStr();
        return userAssignments.filter(({ stand, assignment }) => {
            const normDate = normalizeDateStr(stand.eventDate);
            if (!normDate) return false;
            return normDate < todayStr || (normDate === todayStr && (assignment.attendanceStatus === 'PRESENT' || assignment.attendanceStatus === 'ABSENT'));
        });
    }, [userAssignments]);

    const filteredAssignments = useMemo(() => {
        const todayStr = getTodayStr();
        return userAssignments
            .filter(({ stand, assignment }) => {
            const normDate = normalizeDateStr(stand.eventDate);
            if (!normDate)
                return true;
            if (timelineFilter === 'today')
                return normDate === todayStr;
            if (timelineFilter === 'upcoming')
                return normDate > todayStr && assignment.attendanceStatus !== 'PRESENT';
            if (timelineFilter === 'past')
                return normDate < todayStr || (normDate === todayStr && (assignment.attendanceStatus === 'PRESENT' || assignment.attendanceStatus === 'ABSENT'));
            return true;
        })
            .sort((a, b) => {
            const dateA = normalizeDateStr(a.stand.eventDate);
            const dateB = normalizeDateStr(b.stand.eventDate);
            if (timelineFilter === 'past') {
                return dateB.localeCompare(dateA); // most recent past first
            }
            return dateA.localeCompare(dateB); // nearest upcoming first
        });
    }, [userAssignments, timelineFilter]);
    // Direct QR checkin via deep-link
    const handleDirectQrCheckin = async (qrToken: string, standId?: string) => {
        try {
            await hrService.qrCheckin({ qrToken, standId });
            loadStands();
        }
        catch (err: any) {
            setQrError(err.message || 'Verificarea codului QR a eșuat.');
        }
    };
    // GPS Checkin for a specific shift
    const handleGpsCheckin = (standId: string, shiftId: string) => {
        if (!navigator.geolocation) {
            setGpsError(t('hr.geolocationNotSupported', 'Geolocația nu este suportată de browserul dumneavoastră.'));
            return;
        }
        setIsGpsLoading(true);
        setGpsError(null);
        setGpsDistance(null);
        setActiveShiftAction({ standId, shiftId });
        navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
                const { latitude, longitude } = pos.coords;
                await hrService.gpsCheckin({
                    standId,
                    shiftId,
                    latitude,
                    longitude,
                });
                setGpsSuccessShiftId(shiftId);
                setTimeout(() => setGpsSuccessShiftId(null), 4000);
                loadStands();
            }
            catch (err: any) {
                setGpsError(err.message || t('hr.gpsCheckinFailed', 'Nu s-a putut confirma prezența prin GPS.'));
                if (err.distanceMeters) {
                    setGpsDistance(err.distanceMeters);
                }
            }
            finally {
                setIsGpsLoading(false);
                setActiveShiftAction(null);
            }
        }, (err) => {
            setIsGpsLoading(false);
            setActiveShiftAction(null);
            let errorMsg = t('hr.gpsPermissionDenied', 'Accesul la locație a fost refuzat. Permiteți accesul la locație.');
            if (err.code === err.TIMEOUT) {
                errorMsg = t('hr.gpsTimeout', 'Timpul de așteptare pentru semnalul GPS a expirat. Reîncercați.');
            }
            else if (err.code === err.POSITION_UNAVAILABLE) {
                errorMsg = t('hr.gpsUnavailable', 'Semnalul GPS nu este disponibil în acest moment.');
            }
            setGpsError(errorMsg);
        }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
    };
    // Start Camera QR Scanner for a specific shift
    const startCameraScanner = async (standId: string, shiftId: string) => {
        setIsScannerOpen(true);
        setQrError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
            if ('BarcodeDetector' in window) {
                const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
                scanIntervalRef.current = setInterval(async () => {
                    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                        try {
                            const barcodes = await barcodeDetector.detect(videoRef.current);
                            if (barcodes && barcodes.length > 0) {
                                const rawValue = barcodes[0].rawValue;
                                if (rawValue) {
                                    let extractedToken = rawValue;
                                    try {
                                        const parsedUrl = new URL(rawValue);
                                        const tokenParam = parsedUrl.searchParams.get('token') || parsedUrl.searchParams.get('qrCheckin');
                                        if (tokenParam)
                                            extractedToken = tokenParam;
                                    }
                                    catch { }
                                    setQrScanningLoading(true);
                                    await hrService.qrCheckin({
                                        qrToken: extractedToken,
                                        standId,
                                        shiftId,
                                    });
                                    stopCameraScanner();
                                    loadStands();
                                }
                            }
                        }
                        catch (err: any) {
                            setQrError(err.message || 'Codul QR nu este valid.');
                        }
                        finally {
                            setQrScanningLoading(false);
                        }
                    }
                }, 400);
            }
        }
        catch {
            setQrError(t('hr.cameraPermissionDenied', 'Nu s-a putut accesa camera video.'));
            setIsScannerOpen(false);
        }
    };
    // Keyboard Escape listener
    useEffect(() => {
        if (!isOpen)
            return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (isSetupOpen)
                    setIsSetupOpen(false);
                else if (isDisableOpen)
                    setIsDisableOpen(false);
                else if (isScannerOpen)
                    stopCameraScanner();
                else
                    onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isSetupOpen, isDisableOpen, isScannerOpen, onClose]);
    if (!isOpen)
        return null;
    // Dark palette classes
    const tCss = {
        overlay: isDarkMode ? 'bg-black/75 backdrop-blur-xs' : 'bg-black/40 backdrop-blur-xs',
        modalBg: isDarkMode ? 'bg-zinc-950 text-white border-zinc-850' : 'bg-white text-zinc-900 border-zinc-200',
        headerBorder: isDarkMode ? 'border-zinc-850' : 'border-zinc-200',
        tabActive: isDarkMode ? 'bg-zinc-900 text-white border-zinc-700 shadow-xs' : 'bg-zinc-200 text-zinc-900 border-zinc-300 shadow-xs',
        tabInactive: isDarkMode ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border-transparent' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 border-transparent',
        card: isDarkMode ? 'bg-zinc-900/60 border-zinc-850' : 'bg-zinc-50 border-zinc-200',
        input: isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-700 focus:ring-blue-500' : 'bg-white border-zinc-300 text-zinc-900 focus:border-blue-600',
        subtext: isDarkMode ? 'text-zinc-400' : 'text-zinc-500',
        badge: isDarkMode ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-700 border-blue-200',
    };
    const getAttendanceBadge = (status?: string) => {
        const s = (status || 'WAITING').toUpperCase();
        switch (s) {
            case 'PRESENT':
                return (<span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {t('hr.attendancePresent', 'Prezent')}
          </span>);
            case 'LATE':
                return (<span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
            {t('hr.attendanceLate', 'Întârziat')}
          </span>);
            case 'ABSENT':
                return (<span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            {t('hr.attendanceAbsent', 'Absent')}
          </span>);
            case 'WAITING':
            default:
                return (<span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {t('hr.attendanceWaiting', 'În așteptare')}
          </span>);
        }
    };
    const modalBorder = isDarkMode ? 'border-zinc-800' : 'border-zinc-200';
    const modalBg = isDarkMode ? 'bg-black text-white border-zinc-800 shadow-2xl' : 'bg-white text-zinc-900 border-zinc-200 shadow-xl';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150" onClick={() => {
            stopCameraScanner();
            onClose();
        }}>
            <div className={`w-full h-full sm:h-[620px] sm:max-h-[90vh] max-w-2xl rounded-none sm:rounded-2xl border-0 sm:border shadow-2xl flex flex-col overflow-hidden transition-all transform scale-100 animate-in zoom-in-95 duration-150 ${modalBg}`} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="px-5 sm:px-6 pt-5 pb-3.5 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="font-bold text-base sm:text-lg tracking-tight">{t('account.title', 'Contul Tău')}</h3>
                        <p className={`text-xs ${tCss.subtext}`}>{currentUser?.email || `utilizator@${tenant?.integrations?.contactEmail?.split('@')[1] || 'domain.org'}`}</p>
                    </div>
                    <button onClick={() => {
                        stopCameraScanner();
                        onClose();
                    }} aria-label={t('common.close', 'Închide')} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}>
                        <X className="w-5 h-5"/>
                    </button>
                </div>
                <div className={`mx-5 sm:mx-6 border-b ${modalBorder}`} />

                {/* Tab Selection (Full-Width Segmented Control - No Horizontal Scrolling) */}
                {!settingsOnly && (
                <div className="px-5 sm:px-6 pt-3.5 pb-1 shrink-0">
                    <div className={`grid grid-cols-3 gap-1 p-1 rounded-xl border ${isDarkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`}>
                        <button
                            type="button"
                            onClick={() => {
                                stopCameraScanner();
                                setActiveTab('settings');
                            }}
                            className={`py-1.5 sm:py-2 px-2 rounded-lg text-xs font-bold transition cursor-pointer text-center truncate ${
                                activeTab === 'settings'
                                    ? isDarkMode
                                        ? 'bg-zinc-800 text-white border border-zinc-700/60 shadow-xs'
                                        : 'bg-white text-zinc-900 border border-zinc-300 shadow-xs'
                                    : isDarkMode
                                    ? 'text-zinc-400 hover:text-zinc-200'
                                    : 'text-zinc-500 hover:text-zinc-900'
                            }`}
                        >
                            <span>{t('account.settings', 'Setări')}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                stopCameraScanner();
                                setActiveTab('attendance');
                            }}
                            className={`py-1.5 sm:py-2 px-2 rounded-lg text-xs font-bold transition cursor-pointer text-center truncate ${
                                activeTab === 'attendance'
                                    ? isDarkMode
                                        ? 'bg-zinc-800 text-white border border-zinc-700/60 shadow-xs'
                                        : 'bg-white text-zinc-900 border border-zinc-300 shadow-xs'
                                    : isDarkMode
                                    ? 'text-zinc-400 hover:text-zinc-200'
                                    : 'text-zinc-500 hover:text-zinc-900'
                            }`}
                        >
                            <span>{t('account.attendanceTab', 'Prezență')}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                stopCameraScanner();
                                setActiveTab('feedback');
                            }}
                            className={`py-1.5 sm:py-2 px-2 rounded-lg text-xs font-bold transition cursor-pointer text-center truncate ${
                                activeTab === 'feedback'
                                    ? isDarkMode
                                        ? 'bg-zinc-800 text-white border border-zinc-700/60 shadow-xs'
                                        : 'bg-white text-zinc-900 border border-zinc-300 shadow-xs'
                                    : isDarkMode
                                    ? 'text-zinc-400 hover:text-zinc-200'
                                    : 'text-zinc-500 hover:text-zinc-900'
                            }`}
                        >
                            <span>{t('account.feedbackTab', 'Feedback')}</span>
                        </button>
                    </div>
                </div>
                )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 min-h-0">
          {/* TAB 1: SETĂRI & INFORMAȚII CONT */}
          {activeTab === 'settings' && (<div className="space-y-6">
              {/* Profile Overview Card */}
              <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${tCss.card}`}>
                <div>
                  <h3 className="font-bold text-base">{currentUser?.name || t('account.defaultUser', 'Utilizator')}</h3>
                  <p className={`text-xs ${tCss.subtext}`}>{currentUser?.email}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {(currentUser?.roles && currentUser.roles.length > 0 ? currentUser.roles : [currentUser?.role || 'ADMIN']).map((r, rIdx) => (
                      <span key={rIdx} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${tCss.badge}`}>
                        {r}
                      </span>
                    ))}
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {t('account.activeVerified', 'Activ & Verificat')}
                    </span>
                  </div>
                </div>

                {onLogout && (
                  <button onClick={onLogout} className="flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-all cursor-pointer shrink-0">
                    <LogOut className="w-3.5 h-3.5"/>
                    <span>{t('account.logout', 'Deconectare')}</span>
                  </button>
                )}
              </div>

              {/* Account & Personal Information Cards */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center">
                  <User className="w-3.5 h-3.5 mr-1.5 text-blue-400"/>
                  {t('account.personalInfo', 'Informații Cont & Contact')}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className={`p-3 rounded-xl border flex items-center space-x-3 ${tCss.card}`}>
                    <div className="min-w-0">
                      <p className="text-[10px] text-zinc-500 uppercase font-semibold">{t('account.displayName', 'Nume Afișat')}</p>
                      <p className="text-xs font-medium truncate">{currentUser?.name || t('account.defaultUser', 'Utilizator')}</p>
                    </div>
                  </div>
                  <div className={`p-3 rounded-xl border flex items-center space-x-3 ${tCss.card}`}>
                    <div className="min-w-0">
                      <p className="text-[10px] text-zinc-500 uppercase font-semibold">{t('account.emailAddress', 'Email')}</p>
                      <p className="text-xs font-medium truncate">{currentUser?.email || t('account.notProvided', 'Nespecificat')}</p>
                    </div>
                  </div>
                  <div className={`p-3 rounded-xl border flex items-center space-x-3 ${tCss.card}`}>
                    <div className="min-w-0">
                      <p className="text-[10px] text-zinc-500 uppercase font-semibold">{t('account.phone', 'Telefon')}</p>
                      <p className="text-xs font-medium truncate">{currentUser?.phone || t('account.notProvided', 'Nespecificat')}</p>
                    </div>
                  </div>
                  <div className={`p-3 rounded-xl border flex items-center space-x-3 ${tCss.card}`}>
                    <div className="min-w-0">
                      <p className="text-[10px] text-zinc-500 uppercase font-semibold">{t('account.organization', 'Organizație')}</p>
                      <p className="text-xs font-medium truncate">{currentUser?.organizationType || tenant?.identity?.shorthand || 'Organizație'}</p>
                    </div>
                  </div>
                  <div className={`p-3 rounded-xl border flex items-center space-x-3 sm:col-span-2 ${tCss.card}`}>
                    <div className="min-w-0">
                      <p className="text-[10px] text-zinc-500 uppercase font-semibold">{t('account.scope', 'Domeniu & Departament')}</p>
                      <p className="text-xs font-medium truncate">{currentUser?.organizationDetails || 'General'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Settings Section (Merged Preferences, Push Notifications & 2FA) */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center">
                  <Settings className="w-3.5 h-3.5 mr-1.5 text-blue-400"/>
                  {t('account.settings', 'Setări')}
                </h4>
                <div className="space-y-2.5">
                  {/* Language Switcher */}
                  <div className={`p-3 rounded-xl border flex items-center justify-between ${tCss.card}`}>
                    <div className="flex items-center space-x-3"><p className="text-xs font-semibold">{t('account.interfaceLanguage', 'Limbă Interfață')}</p>
                    </div>
                    <div className="flex items-center bg-zinc-900 p-0.5 rounded-lg border border-zinc-800">
                      <button type="button" onClick={() => setLanguage('ro')} className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition ${language === 'ro' ? 'bg-blue-600 text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-200'}`}>
                        🇷🇴 Română
                      </button>
                      <button type="button" onClick={() => setLanguage('en')} className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition ${language === 'en' ? 'bg-blue-600 text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-200'}`}>
                        🇬🇧 English
                      </button>
                    </div>
                  </div>

                  {/* Push Notifications Toggle */}
                  {pwaNotificationService.isPushSupported() && (
                    <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${tCss.card}`}>
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
                          <Bell className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold">{t('account.pushNotifications', 'Notificări Push')}</p>
                          <p className={`text-[11px] ${tCss.subtext} truncate`}>
                            {pushPermission === 'denied'
                              ? t('account.pushDenied', 'Refuzate în browser')
                              : isPushSubscribed
                              ? t('account.pushEnabled', 'Active pe acest dispozitiv')
                              : t('account.pushDisabled', 'Dezactivate pe acest dispozitiv')}
                          </p>
                        </div>
                      </div>
                      <div>
                        {pushPermission === 'denied' ? (
                          <span className="px-2.5 py-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                            {t('pwa.statusDenied', 'Refuzat')}
                          </span>
                        ) : isPushSubscribed ? (
                          <button
                            type="button"
                            onClick={handleTogglePushNotifications}
                            disabled={isPushToggling}
                            className="px-3 py-1.5 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-xl transition cursor-pointer disabled:opacity-50"
                          >
                            {isPushToggling ? t('common.loading', 'Se procesează...') : t('account.disablePush', 'Dezactivează')}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleTogglePushNotifications}
                            disabled={isPushToggling}
                            className="px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                          >
                            {isPushToggling ? t('common.loading', 'Se procesează...') : t('account.enablePush', 'Activează')}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* WhatsApp Notifications Toggle */}
                  <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${tCss.card}`}>
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                        <MessageSquare className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold">{t('account.whatsappNotifications', 'Notificări WhatsApp')}</p>
                        <p className={`text-[11px] ${tCss.subtext} truncate`}>
                          {currentUser?.whatsappNotificationsEnabled !== false
                            ? t('account.whatsappEnabled', 'Active pentru contul tău')
                            : t('account.whatsappDisabled', 'Dezactivate pentru contul tău')}
                        </p>
                      </div>
                    </div>
                    <div>
                      {currentUser?.whatsappNotificationsEnabled !== false ? (
                        <button
                          type="button"
                          onClick={() => handleToggleWhatsapp(false)}
                          disabled={isWhatsappToggling}
                          className="px-3 py-1.5 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-xl transition cursor-pointer disabled:opacity-50"
                        >
                          {isWhatsappToggling ? t('common.loading', 'Se procesează...') : t('account.disableWhatsapp', 'Dezactivează')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleWhatsapp(true)}
                          disabled={isWhatsappToggling}
                          className="px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                        >
                          {isWhatsappToggling ? t('common.loading', 'Se procesează...') : t('account.enableWhatsapp', 'Activează')}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Two-Factor Authentication (2FA) */}
                  <div className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${tCss.card}`}>
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-xs font-semibold">{t('account.twoFactorTitle', 'Autentificare în Doi Pași (2FA)')}</p>
                        {twoFactorInfo?.enabled ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {twoFactorInfo.method}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-750">
                            {t('account.twoFactorDisabled', 'Dezactivat')}
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] ${tCss.subtext}`}>
                        {twoFactorInfo?.enabled
                          ? t('account.twoFactorStatusEnabled', 'Contul tău este protejat prin 2FA.')
                          : t('account.twoFactorPrompt', 'Adăugați un nivel suplimentar de securitate contului cu verificare TOTP sau Email.')}
                      </p>
                    </div>

                    <div>
                      {twoFactorInfo?.enabled ? (
                        <button
                          type="button"
                          onClick={() => {
                            setDisablePassword('');
                            setDisableError('');
                            setIsDisableOpen(true);
                          }}
                          className="px-3 py-1.5 text-xs font-bold bg-rose-600/10 text-rose-400 hover:bg-rose-600/20 border border-rose-500/20 rounded-xl transition cursor-pointer shrink-0"
                        >
                          {t('account.twoFactorDisableBtn', 'Dezactivează 2FA')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={async () => {
                            setSetupError('');
                            setSetupSuccess('');
                            setSetupCode('');
                            setIsSetupOpen(true);
                            setSetupLoading(true);
                            try {
                              const init = await adminAuthService.initiate2FASetup();
                              setSetupData(init);
                              setSetupMethod('EMAIL');
                            } catch (err: any) {
                              setSetupError(err.message || 'Eroare la inițializare 2FA.');
                            } finally {
                              setSetupLoading(false);
                            }
                          }}
                          className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-xs transition cursor-pointer shrink-0"
                        >
                          {t('account.twoFactorEnableBtn', 'Activează 2FA')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Referral Link Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center">
                  <Link2 className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
                  Link Personal Donații
                </h4>
                <div className={`p-3 rounded-xl border ${tCss.card}`}>
                  {currentUser?.referralCode ? (
                    <div className="space-y-2">
                      <p className="text-xs text-zinc-400">Distribuie acest link — donațiile primite prin el vor fi atribuite contului tău.</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0 font-mono text-xs text-zinc-200 bg-zinc-950 border border-zinc-800 rounded-xl px-3 h-[38px] flex items-center overflow-hidden">
                          <span className="truncate">{`${window.location.origin}/doneaza?ref=${currentUser.referralCode}`}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/doneaza?ref=${currentUser.referralCode}`);
                            setRefCodeCopied(true);
                            setTimeout(() => setRefCodeCopied(false), 2500);
                          }}
                          className="px-3 py-1.5 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl transition cursor-pointer shrink-0"
                        >
                          {refCodeCopied ? 'Copiat!' : 'Copiază'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-zinc-400">Generează un link personal pentru a urmări donațiile atrase de tine.</p>
                      <button
                        type="button"
                        onClick={handleGenerateReferralCode}
                        disabled={isGeneratingRef}
                        className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-xs transition cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        {isGeneratingRef ? 'Se generează...' : 'Generează Cod'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>)}

          {/* TAB 3: PREZENȚĂ STAND (SIMPLIFIED & USER-SIGNED-UP ONLY) */}
          {activeTab === 'attendance' && (<div className="space-y-4">
              {/* Timeline Filter Strip */}
              <div className={`flex items-center justify-between gap-1 p-1 rounded-xl border ${isDarkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`}>
                <button
                  type="button"
                  onClick={() => setTimelineFilter('today')}
                  className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                    timelineFilter === 'today'
                      ? isDarkMode
                        ? 'bg-zinc-800 text-white border border-zinc-700/60 shadow-xs'
                        : 'bg-white text-zinc-900 border border-zinc-300 shadow-xs'
                      : isDarkMode
                      ? 'text-zinc-400 hover:text-zinc-200'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  <span>{t('hr.filterToday', 'Astăzi')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTimelineFilter('upcoming')}
                  className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                    timelineFilter === 'upcoming'
                      ? isDarkMode
                        ? 'bg-zinc-800 text-white border border-zinc-700/60 shadow-xs'
                        : 'bg-white text-zinc-900 border border-zinc-300 shadow-xs'
                      : isDarkMode
                      ? 'text-zinc-400 hover:text-zinc-200'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  <span>{t('hr.filterUpcoming', 'Viitoare')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTimelineFilter('past')}
                  className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                    timelineFilter === 'past'
                      ? isDarkMode
                        ? 'bg-zinc-800 text-white border border-zinc-700/60 shadow-xs'
                        : 'bg-white text-zinc-900 border border-zinc-300 shadow-xs'
                      : isDarkMode
                      ? 'text-zinc-400 hover:text-zinc-200'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  <span>{t('hr.filterPast', 'Încheiate')}</span>
                </button>
              </div>

              {/* Feedback Notifications */}
              {gpsError && (<div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start space-x-2"><div className="space-y-0.5 flex-1">
                    <p className="font-semibold">{gpsError}</p>
                    {gpsDistance !== null && (<p className="text-[11px] font-mono text-amber-400">Distanță calculată față de stand: ~{gpsDistance} m</p>)}
                  </div>
                </div>)}

              {qrError && (<div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start space-x-2"><p className="font-semibold">{qrError}</p>
                </div>)}

              {/* Live Camera Scanner View */}
              {isScannerOpen && (<div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-black aspect-video max-h-60 flex items-center justify-center">
                  <video ref={videoRef} className="w-full h-full object-cover"/>
                  <div className="absolute inset-0 border-2 border-blue-500/60 rounded-xl m-6 pointer-events-none animate-pulse flex items-center justify-center">
                    <span className="text-[10px] bg-black/70 text-white px-2 py-0.5 rounded-md font-mono">
                      {qrScanningLoading ? 'Se verifică codul...' : 'Încadrați Codul QR'}
                    </span>
                  </div>
                  <button type="button" onClick={stopCameraScanner} className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-zinc-900/90 text-zinc-300 text-[11px] font-bold hover:bg-zinc-800 cursor-pointer">
                    {t('common.cancel', 'Închide')}
                  </button>
                </div>)}

              {/* List of Signed-up Shifts */}
              {isStandsLoading ? (
                <div className="py-8 text-center text-zinc-500 text-xs animate-pulse">
                  {t('general.loading', 'Se încarcă turele alocate...')}
                </div>
              ) : filteredAssignments.length === 0 ? (
                <div className={`p-8 rounded-2xl border text-center space-y-2 ${tCss.card}`}>
                  <p className="text-xs font-semibold text-zinc-300">
                    {timelineFilter === 'today'
                      ? t('hr.noShiftsToday', 'Nu aveți nicio tură programată pentru astăzi.')
                      : timelineFilter === 'upcoming'
                      ? t('hr.noShiftsUpcoming', 'Nu aveți ture viitoare alocate.')
                      : t('hr.noShiftsPast', 'Nu aveți ture încheiate în istoric.')}
                  </p>
                  {timelineFilter === 'today' && upcomingAssignments.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setTimelineFilter('upcoming')}
                      className="text-xs text-blue-400 hover:text-blue-300 font-bold underline cursor-pointer"
                    >
                      {t('hr.viewUpcomingShifts', 'Vezi turele viitoare')}
                    </button>
                  )}
                  {timelineFilter === 'today' && upcomingAssignments.length === 0 && pastAssignments.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setTimelineFilter('past')}
                      className="text-xs text-blue-400 hover:text-blue-300 font-bold underline cursor-pointer"
                    >
                      {t('hr.viewPastShifts', 'Vezi turele încheiate')}
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredAssignments.map(({ stand, shift, assignment }) => {
                    const isPresent = assignment.attendanceStatus === 'PRESENT';
                    const isCurrentAction = activeShiftAction?.standId === stand.id && activeShiftAction?.shiftId === shift.id;
                    const isGpsSuccess = gpsSuccessShiftId === shift.id;
                    return (
                      <div
                        key={assignment.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isPresent
                            ? 'bg-emerald-500/5 border-emerald-500/20'
                            : (isDarkMode ? 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700' : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300')
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center space-x-2">
                              <h4 className={`font-bold text-xs sm:text-sm truncate ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>{stand.locationName}</h4>
                              {stand.eventName && (
                                <span className={`text-[11px] truncate ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>• {stand.eventName}</span>
                              )}
                            </div>
                            <div className={`flex flex-wrap items-center gap-2 text-xs ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>

                              <span className={`font-medium flex items-center gap-1 ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>

                                {stand.eventDate}
                              </span>
                              <span>•</span>
                              <span className={`font-medium flex items-center gap-1 ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>

                                {shift.shiftName} ({shift.startTime} - {shift.endTime})
                              </span>
                              <span>•</span>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${isDarkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-200 text-zinc-700'}`}>

                                {assignment.roleName}
                              </span>
                            </div>
                          </div>
                          <div className="shrink-0">
                            {getAttendanceBadge(assignment.attendanceStatus)}
                          </div>
                        </div>

                        {/* Checkin Action Buttons ONLY on Today's non-present shifts */}
                        {timelineFilter === 'today' && !isPresent && (
                          <div className={`mt-3 pt-3 border-t ${isDarkMode ? 'border-zinc-800/80' : 'border-zinc-200'} flex flex-wrap items-center gap-2`}>

                            <button
                              type="button"
                              disabled={isGpsLoading}
                              onClick={() => handleGpsCheckin(stand.id, shift.id)}
                              className="flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition cursor-pointer flex items-center justify-center space-x-1.5 disabled:opacity-50"
                            >
                              {isGpsLoading && isCurrentAction ? (
                                <span>{t('hr.verifyingGps', 'Se verifică...')}</span>
                              ) : (
                                <span>{t('hr.confirmGpsBtn', 'Confirmă GPS')}</span>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => startCameraScanner(stand.id, shift.id)}
                              className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center space-x-1.5 ${isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300'}`}
                            >
                              <span>{t('hr.scanQrBtn', 'Scanează QR')}</span>
                            </button>
                          </div>
                        )}

                        {isPresent && (
                          <div className="mt-2.5 pt-2 border-t border-emerald-500/20 flex items-center justify-between text-[11px] text-emerald-400">
                            <span className="flex items-center space-x-1.5 font-semibold">
                              <span>{t('hr.presenceSuccessRecorded', 'Prezență înregistrată cu succes')}</span>
                            </span>
                            {assignment.checkedInAt && (
                              <span className="font-mono text-zinc-500 text-[10px]">
                                {assignment.checkedInAt} ({assignment.checkinMethod || 'MANUAL'})
                              </span>
                            )}
                          </div>
                        )}

                        {isGpsSuccess && (
                          <div className="mt-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center space-x-1.5">
                            <span>{t('hr.presenceGpsConfirmed', 'Prezența a fost confirmată prin GPS!')}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>)}

          {/* TAB 3: FEEDBACK & RECLAMAȚII */}
          {activeTab === 'feedback' && (
            <div className="space-y-4">
              <form
                noValidate
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!feedbackContent.trim()) {
                    setFeedbackError(t('common.fillRequiredFields', 'Completați câmpurile obligatorii marcate.'));
                    return;
                  }
                  setFeedbackSubmitting(true);
                  setFeedbackError(null);
                  try {
                    await hrService.submitFeedback({
                      type: feedbackType,
                      categoryId: feedbackCategoryId || undefined,
                      isAnonymous: feedbackIsAnonymous,
                      isPublicSubmission: false,
                      targetType: 'GENERAL',
                      content: feedbackContent.trim(),
                      submitterName: !feedbackIsAnonymous ? currentUser?.name : undefined,
                      submitterEmail: !feedbackIsAnonymous ? currentUser?.email : undefined,
                    });
                    setFeedbackSuccess(t('hr.submitFeedbackSuccess', 'Feedback-ul tău a fost trimis cu succes. Mulțumim!'));
                    setFeedbackContent('');
                    setTimeout(() => setFeedbackSuccess(null), 4000);
                  } catch (err: any) {
                    setFeedbackError(err?.message || 'Eroare la trimiterea feedback-ului.');
                  } finally {
                    setFeedbackSubmitting(false);
                  }
                }}
                className="space-y-4 text-sm"
              >
                {/* 2-Column Grid: Type & Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-zinc-400">
                      {t('hr.feedbackTypeLabel', 'Tip Feedback')}
                    </label>
                    <CustomSelect
                      value={feedbackType}
                      onChange={(val) => setFeedbackType(val as FeedbackType)}
                      options={[
                        { value: 'COMPLAINT', label: t('hr.typeComplaint', 'Reclamație') },
                        { value: 'SUGGESTION', label: t('hr.typeSuggestion', 'Sugestie') },
                        { value: 'REVIEW', label: t('hr.typeReview', 'Apreciere') },
                      ]}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-zinc-400">
                      {t('hr.feedbackCategoryLabel', 'Categorie')}
                    </label>
                    <CustomSelect
                      value={feedbackCategoryId}
                      onChange={(val) => setFeedbackCategoryId(val)}
                      options={feedbackCategories.map((c) => ({
                        value: c.id,
                        label: c.name,
                      }))}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Identity Selector (Clean Segmented Picker) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold mb-1 text-zinc-400">
                    {t('hr.feedbackIdentityLabel', 'Identitate Expeditor')}
                  </label>
                  <div className={`grid grid-cols-2 gap-1 p-1 rounded-xl border ${isDarkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`}>
                    <button
                      type="button"
                      onClick={() => setFeedbackIsAnonymous(false)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer text-center truncate ${
                        !feedbackIsAnonymous
                          ? isDarkMode
                            ? 'bg-zinc-800 text-white border border-zinc-700/60 shadow-xs'
                            : 'bg-white text-zinc-900 border border-zinc-300 shadow-xs'
                          : isDarkMode
                          ? 'text-zinc-400 hover:text-zinc-200'
                          : 'text-zinc-500 hover:text-zinc-900'
                      }`}
                    >
                      <span>{t('hr.identityIdentified', 'Identificat')} ({currentUser?.name || currentUser?.email || 'Cont'})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedbackIsAnonymous(true)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer text-center truncate ${
                        feedbackIsAnonymous
                          ? isDarkMode
                            ? 'bg-zinc-800 text-white border border-zinc-700/60 shadow-xs'
                            : 'bg-white text-zinc-900 border border-zinc-300 shadow-xs'
                          : isDarkMode
                          ? 'text-zinc-400 hover:text-zinc-200'
                          : 'text-zinc-500 hover:text-zinc-900'
                      }`}
                    >
                      <span>{t('hr.identityAnonymous', 'Anonim')}</span>
                    </button>
                  </div>
                </div>

                {/* Message Content */}
                <div>
                  <label className="block text-xs font-semibold mb-1 text-zinc-400">
                    {t('hr.feedbackMessageLabel', 'Mesajul tău')}
                  </label>
                  <textarea
                    rows={4}
                    value={feedbackContent}
                    onChange={(e) => {
                      setFeedbackContent(e.target.value);
                      if (feedbackError) setFeedbackError(null);
                    }}
                    placeholder={t('hr.feedbackMessagePlaceholder', 'Descrieți în detaliu sugestia, problema sau aprecierea...')}
                    className={`w-full px-3 py-2 text-xs rounded-xl border outline-hidden resize-none ${
                      feedbackError && !feedbackContent.trim()
                        ? 'border-rose-500/80 focus:border-rose-500 ring-1 ring-rose-500/40'
                        : isDarkMode
                        ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700 focus:border-zinc-700'
                        : 'bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400 focus:border-zinc-400'
                    }`}
                  />
                </div>

                {/* Status messages & Submit Button */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex-1 mr-3">
                    {feedbackError && (
                      <p className="text-xs text-rose-400 font-medium truncate">{feedbackError}</p>
                    )}
                    {feedbackSuccess && (
                      <p className="text-xs text-emerald-400 font-medium truncate">{feedbackSuccess}</p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={feedbackSubmitting}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {feedbackSubmitting ? t('general.saving', 'Se trimite...') : t('hr.submitFeedbackButton', 'Trimite Feedback')}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* 2FA Setup Flow Drawer Modal */}
        {isSetupOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150" onClick={() => setIsSetupOpen(false)}>
            <div className={`w-full h-full sm:h-auto sm:max-h-[90vh] max-w-md rounded-none sm:rounded-2xl border-0 sm:border shadow-2xl p-6 space-y-4 overflow-y-auto flex flex-col transition-all transform scale-100 animate-in zoom-in-95 duration-150 ${tCss.modalBg}`} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b pb-3 border-zinc-800">
                <div className="flex items-center space-x-2"><h3 className="text-sm font-bold">{t('account.twoFactorSetupModalTitle', 'Configurare Autentificare 2FA')}</h3>
                </div>
                <button type="button" onClick={() => setIsSetupOpen(false)} className="p-1 rounded-lg text-zinc-400 hover:text-white transition cursor-pointer">
                  <X className="w-4 h-4"/>
                </button>
              </div>

              {setupLoading ? (<div className="py-8 text-center text-zinc-400 space-y-2"><p className="text-xs">{t('general.loading', 'Se generează cheile...')}</p>
                </div>) : (<div className="space-y-4 text-left">
                  {/* Method selector */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                      {t('account.twoFactorStep1Method', '1. Alege metoda 2FA')}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={async () => {
                    setSetupMethod('EMAIL');
                    setSetupLoading(true);
                    setSetupError('');
                    try {
                        const init = await adminAuthService.initiate2FASetup();
                        setSetupData(init);
                    }
                    catch (e: any) {
                        setSetupError(e.message);
                    }
                    finally {
                        setSetupLoading(false);
                    }
                }} className={`p-2.5 rounded-xl border text-left text-xs font-semibold cursor-pointer transition ${setupMethod === 'EMAIL'
                    ? 'bg-blue-600/20 border-blue-500 text-white'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'}`}>
                        <div className="flex items-center space-x-2">
<span>Email OTP</span>
                        </div>
                      </button>
<button type="button" onClick={async () => {
                    setSetupMethod('TOTP');
                    setSetupLoading(true);
                    setSetupError('');
                    try {
                        const init = await adminAuthService.initiate2FASetup();
                        setSetupData(init);
                    }
                    catch (e: any) {
                        setSetupError(e.message);
                    }
                    finally {
                        setSetupLoading(false);
                    }
                }} className={`p-2.5 rounded-xl border text-left text-xs font-semibold cursor-pointer transition ${setupMethod === 'TOTP'
                    ? 'bg-blue-600/20 border-blue-500 text-white'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'}`}>
                        <div className="flex items-center space-x-2">
<span>Authenticator</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* QR Code for TOTP */}
                  {setupMethod === 'TOTP' && setupData && (<div className="space-y-2.5 p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-center">
                      <p className="text-[11px] text-zinc-300">
                        {t('account.twoFactorScanQr', 'Scanați codul QR în Google Authenticator:')}
                      </p>
                      <div className="p-2 bg-white rounded-xl inline-block shadow-md">
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(setupData.otpAuthUrl)}`} alt="2FA QR Code" className="w-36 h-36 mx-auto block"/>
                      </div>
                      <div className="space-y-1 text-left">
                        <p className="text-[10px] font-semibold text-zinc-400 uppercase">{t('account.twoFactorSecretKey', 'Cheie secretă manuală:')}</p>
                        <div className="flex items-center gap-1.5">
                          <code className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-blue-400 font-bold flex-1 truncate">
                            {setupData.secret}
                          </code>
                          <button type="button" onClick={() => {
                        navigator.clipboard.writeText(setupData.secret);
                        setSecretCopied(true);
                        setTimeout(() => setSecretCopied(false), 2000);
                    }} className="px-2.5 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg flex items-center gap-1 cursor-pointer transition shrink-0">
                            <span>{secretCopied ? 'Copiat' : 'Copiază'}</span>
                          </button>
                        </div>
                      </div>
                    </div>)}

                  {setupMethod === 'EMAIL' && (<div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-300 flex items-start gap-2">
<div>
                        <p className="font-semibold text-white">Verificare prin email</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">Am trimis un cod la {currentUser?.email}. Introduceți codul de 6 cifre:</p>
                      </div>
                    </div>)}

                  {/* Step 2: Enter 6 digit code */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                      {t('account.twoFactorStepConfirm', '2. Introdu codul de 6 cifre:')}
                    </label>
                    <input type="text" inputMode="numeric" maxLength={6} value={setupCode} onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-blue-500 rounded-xl text-white text-center font-mono text-lg tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-blue-500/20"/>
                  </div>

                  {setupError && (<div className="p-3 rounded-xl bg-red-950/30 border border-red-900/40 text-red-400 text-xs flex items-center gap-2"><span>{setupError}</span>
                    </div>)}

                  {setupSuccess && (<div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-900/40 text-emerald-400 text-xs flex items-center gap-2"><span>{setupSuccess}</span>
                    </div>)}

                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setIsSetupOpen(false)} className="px-4 py-2 rounded-xl text-xs font-semibold border border-zinc-800 text-zinc-400 hover:text-white cursor-pointer">
                      {t('common.cancel', 'Anulează')}
                    </button>
                    <button type="button" disabled={setupCode.length < 6 || setupLoading} onClick={async () => {
                    setSetupError('');
                    setSetupLoading(true);
                    try {
                        await adminAuthService.confirm2FASetup(setupMethod, setupCode, setupData?.secret);
                        setSetupSuccess(t('account.twoFactorEnabledSuccess', '2FA a fost activat cu succes!'));
                        loadTwoFactorStatus();
                        setTimeout(() => setIsSetupOpen(false), 1200);
                    }
                    catch (err: any) {
                        setSetupError(err.message || 'Cod incorect.');
                    }
                    finally {
                        setSetupLoading(false);
                    }
                }} className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer disabled:opacity-50 transition">
                      {t('account.twoFactorConfirmBtn', 'Confirmă & Activează')}
                    </button>
                  </div>
                </div>)}
            </div>
          </div>)}

        {/* 2FA Disable Modal */}
        {isDisableOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150" onClick={() => setIsDisableOpen(false)}>
            <div className={`w-full h-full sm:h-auto sm:max-h-[90vh] max-w-sm rounded-none sm:rounded-2xl border-0 sm:border shadow-2xl p-6 space-y-4 overflow-y-auto flex flex-col transition-all transform scale-100 animate-in zoom-in-95 duration-150 ${tCss.modalBg}`} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center space-x-2 text-rose-400"><h3 className="text-sm font-bold">{t('account.twoFactorDisableModalTitle', 'Dezactivare 2FA')}</h3>
              </div>
              <p className="text-xs text-zinc-400">
                {t('account.twoFactorDisableConfirm', 'Introduceți parola contului pentru a confirma dezactivarea autentificării în doi pași:')}
              </p>
              <input type="password" value={disablePassword} onChange={(e) => setDisablePassword(e.target.value)} placeholder="••••••••" className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs outline-none focus:border-rose-500"/>
              {disableError && (<p className="text-xs text-red-400 font-medium">{disableError}</p>)}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsDisableOpen(false)} className="px-3 py-1.5 text-xs rounded-xl border border-zinc-800 text-zinc-400 hover:text-white cursor-pointer">
                  {t('common.cancel', 'Anulează')}
                </button>
                <button type="button" disabled={!disablePassword || disableLoading} onClick={async () => {
                setDisableError('');
                setDisableLoading(true);
                try {
                    await adminAuthService.disable2FA(disablePassword);
                    loadTwoFactorStatus();
                    setIsDisableOpen(false);
                }
                catch (err: any) {
                    setDisableError(err.message || 'Parolă incorectă.');
                }
                finally {
                    setDisableLoading(false);
                }
            }} className="px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white cursor-pointer disabled:opacity-50 transition">
                  {t('account.twoFactorDisableBtn', 'Dezactivează 2FA')}
                </button>
              </div>
            </div>
          </div>)}
      </div>
    </div>);
};
