import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { usePermission } from '../hooks/usePermission';
import { AccountModal } from '../components/account/AccountModal';
import { PushNotificationPromptModal } from '../components/common/PushNotificationPromptModal';
import { ErrorBoundary } from '../components/common';
import { pwaNotificationService } from '../services/pwaNotificationService';

const GeneralDashboard = React.lazy(() => import('../components/general/GeneralDashboard').then(m => ({ default: m.GeneralDashboard })));
const FinanceDashboard = React.lazy(() => import('../components/finance/FinanceDashboard').then(m => ({ default: m.FinanceDashboard })));
const AdminSettingsDashboard = React.lazy(() => import('../components/admin/AdminSettingsDashboard').then(m => ({ default: m.AdminSettingsDashboard })));
const HRDashboard = React.lazy(() => import('../components/hr/HRDashboard').then(m => ({ default: m.HRDashboard })));
const FundraisingDashboard = React.lazy(() => import('../components/fundraising/FundraisingDashboard').then(m => ({ default: m.FundraisingDashboard })));
const LogisticsDashboard = React.lazy(() => import('../components/logistics/LogisticsDashboard').then(m => ({ default: m.LogisticsDashboard })));
const MarketingDashboard = React.lazy(() => import('../components/marketing/MarketingDashboard').then(m => ({ default: m.MarketingDashboard })));
const LegalDashboard = React.lazy(() => import('../components/legal/LegalDashboard').then(m => ({ default: m.LegalDashboard })));
import {
  DollarSign, Settings, HeartHandshake, Users, Scale, User, Package, Megaphone,
  LogOut, Lock, Sun, Moon, ChevronRight, ChevronLeft, LayoutGrid, FolderKanban, ArrowLeft
} from 'lucide-react';
import logoAlb from '../assets/logo_alb.png';
import logoNegru from '../assets/logo_negru.png';
import { adminAuthService } from '../services/adminAuthService';
import { projectService } from '../services/projectService';
import type { ProjectResponse } from '../types/project';
import { useLanguage } from '../context/LanguageContext';
import { useTenant } from '../context/TenantContext';
import { SyncStatusPill } from '../context/SyncStatusContext';

type TabType = 'general' | 'logistics' | 'finance' | 'hr' | 'fundraising' | 'marketing' | 'legal' | 'admin' | 'it';
const VALID_TABS: TabType[] = ['general', 'logistics', 'finance', 'hr', 'fundraising', 'marketing', 'legal', 'admin'];

const MODULE_TAB_PERMISSIONS: Record<TabType, string[]> = {
  general: ['general:calendar:view', 'general:tasks:view', 'general:map:view', 'general:statistics:view'],
  logistics: ['logistics:stockeditor:view', 'logistics:inventory:view', 'logistics:predictor:view', 'logistics:standstats:view', 'logistics:history:view', 'logistics:statistics:view'],
  finance: ['finance:expenses:view', 'finance:onlinedonations:view', 'finance:stands:view', 'finance:sponsorships:view', 'finance:otherincomes:view', 'finance:statistics:view'],
  hr: ['hr:stands:view', 'hr:statistics:view'],
  fundraising: ['fundraising:leads:view', 'fundraising:finished:view', 'fundraising:statistics:view'],
  marketing: ['marketing:resources:view'],
  legal: ['legal:templates:view', 'legal:generator:view', 'legal:contracts:view', 'legal:statistics:view'],
  admin: ['admin:users:view', 'admin:permissions:view', 'admin:audit:view', 'admin:sync:view', 'admin:whatsapp:view', 'admin:statistics:view', 'it:users:view', 'it:permissions:view', 'it:audit:view', 'it:sync:view', 'it:whatsapp:view', 'it:statistics:view'],
  it: ['admin:users:view', 'admin:permissions:view', 'admin:audit:view', 'admin:sync:view', 'admin:whatsapp:view', 'admin:statistics:view', 'it:users:view', 'it:permissions:view', 'it:audit:view', 'it:sync:view', 'it:whatsapp:view', 'it:statistics:view'],
};

export const AdminDashboard: React.FC = () => {
  const { t } = useLanguage();
  const { tenant } = useTenant();
  const { user, hasPermission, isSuperAdmin } = usePermission();
  const { projectSlug, tab } = useParams<{ projectSlug?: string; tab?: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const [currentProject, setCurrentProject] = useState<ProjectResponse | null>(null);
  const [isProjectLoading, setIsProjectLoading] = useState<boolean>(true);
  const [projectError, setProjectError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectSlug || projectSlug === 'hub') {
      navigate('/dashboard/hub/general', { replace: true });
      return;
    }

    let isMounted = true;
    setIsProjectLoading(true);
    setProjectError(null);

    projectService.getProjectBySlug(projectSlug)
      .then((proj) => {
        if (isMounted) {
          setCurrentProject(proj);
          setIsProjectLoading(false);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setProjectError(err.message || 'Proiectul nu a fost găsit.');
          setIsProjectLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [projectSlug, navigate]);

  const canAccessModule = useCallback((moduleId: TabType): boolean => {
    if (!user) return false;
    const isOnlyCustomer =
      (user.roles && user.roles.length > 0)
        ? user.roles.every((r) => r === 'CUSTOMER')
        : user.role === 'CUSTOMER';
    if (isOnlyCustomer) return false;
    if (moduleId === 'general') return true;
    if (isSuperAdmin) return true;
    const perms = MODULE_TAB_PERMISSIONS[moduleId] ?? [];
    return perms.some(code => hasPermission(code));
  }, [user, isSuperAdmin, hasPermission]);

  const isModuleEnabled = useCallback((moduleId: string): boolean => {
    if (!currentProject) return true;
    return currentProject.enabledModules?.some((m) => m.moduleId === moduleId && m.active) ?? false;
  }, [currentProject]);

  const isTabEnabledForProject = useCallback((tabId: TabType): boolean => {
    if (tabId === 'general') return true;
    if (tabId === 'admin' || tabId === 'it') return canAccessModule('admin');
    if (tabId === 'finance') return isModuleEnabled('mod.finance.expenses') || isModuleEnabled('mod.finance.online-donations') || isModuleEnabled('mod.finance.stands') || isModuleEnabled('mod.finance.sponsorships') || isModuleEnabled('mod.finance.other-incomes') || isModuleEnabled('mod.finance.statistics');
    if (tabId === 'fundraising') return isModuleEnabled('mod.fundraising.leads') || isModuleEnabled('mod.fundraising.finished') || isModuleEnabled('mod.fundraising.statistics');
    if (tabId === 'logistics') return isModuleEnabled('mod.logistics.inventory') || isModuleEnabled('mod.logistics.predictor') || isModuleEnabled('mod.logistics.stand-stats') || isModuleEnabled('mod.logistics.history') || isModuleEnabled('mod.logistics.statistics');
    if (tabId === 'hr') return isModuleEnabled('mod.hr.stands') || isModuleEnabled('mod.hr.feedback') || isModuleEnabled('mod.hr.statistics');
    if (tabId === 'legal') return isModuleEnabled('mod.legal.templates') || isModuleEnabled('mod.legal.generator') || isModuleEnabled('mod.legal.contracts') || isModuleEnabled('mod.legal.statistics');
    if (tabId === 'marketing') return isModuleEnabled('mod.marketing.resources') || isModuleEnabled('mod.marketing.emails');
    return true;
  }, [isModuleEnabled, canAccessModule]);

  const pathTab = location.pathname.split('/').filter(Boolean).pop();
  const currentTab = (tab && VALID_TABS.includes(tab as TabType))
    ? tab
    : (pathTab && VALID_TABS.includes(pathTab as TabType))
      ? pathTab
      : 'general';
  const activeTab: TabType = currentTab as TabType;

  const handleTabChange = (targetTab: TabType) => {
    if (projectSlug) {
      navigate(`/dashboard/${projectSlug}/${targetTab}`);
    } else {
      navigate('/dashboard/hub/general');
    }
  };

  // Fallback to general if active tab is unauthorized or disabled in current project
  useEffect(() => {
    if (!isProjectLoading && currentProject) {
      const isAllowed = canAccessModule(activeTab) && isTabEnabledForProject(activeTab);
      if (!isAllowed && activeTab !== 'general') {
        navigate(`/dashboard/${projectSlug}/general`, { replace: true });
      }
    }
  }, [isProjectLoading, currentProject, activeTab, canAccessModule, isTabEnabledForProject, projectSlug, navigate]);

  // Account Modal & Popover state
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountModalTab, setAccountModalTab] = useState<'settings' | 'attendance'>('settings');
  const [accountModalParams, setAccountModalParams] = useState<{ standId?: string | null; qrToken?: string | null }>({});
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isPushPromptOpen, setIsPushPromptOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const desktopMenuRef = useRef<HTMLDivElement>(null);

  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!user) return;
    if (!pwaNotificationService.isPushSupported()) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'default') return;

    const dismissedUntil = localStorage.getItem('app_push_prompt_dismissed_until');
    if (dismissedUntil && Number(dismissedUntil) > Date.now()) return;

    const timer = setTimeout(() => {
      setIsPushPromptOpen(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [user]);

  const handleDismissPushPrompt = () => {
    setIsPushPromptOpen(false);
    // Dismiss for 2 days
    localStorage.setItem('app_push_prompt_dismissed_until', String(Date.now() + 2 * 24 * 60 * 60 * 1000));
  };

  const handlePushPromptSuccess = () => {
    setIsPushPromptOpen(false);
    localStorage.removeItem('app_push_prompt_dismissed_until');
  };

  useEffect(() => {
    const checkinStandId = searchParams.get('checkinStand') || searchParams.get('standId');
    const qrToken = searchParams.get('token') || searchParams.get('qrCheckin');
    if (qrToken || searchParams.get('checkinStand')) {
      setAccountModalTab('attendance');
      setAccountModalParams({
        standId: checkinStandId,
        qrToken: qrToken,
      });
      setIsAccountModalOpen(true);
    }
  }, [searchParams]);


  useEffect(() => {
    if (!user && activeTab !== 'general') {
      navigate('/login', { replace: true });
    }
  }, [user, activeTab, navigate]);

  // Click outside to close user popover menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      const clickedInsideMobile = mobileMenuRef.current && mobileMenuRef.current.contains(target);
      const clickedInsideDesktop = desktopMenuRef.current && desktopMenuRef.current.contains(target);
      if (!clickedInsideMobile && !clickedInsideDesktop) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  // Theme state persisted in localStorage (default to Dark)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('adminTheme');
    return saved === null ? true : saved === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleLogout = async () => {
    await adminAuthService.signOut();
    window.location.href = '/login';
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('adminTheme', next ? 'dark' : 'light');
      return next;
    });
  };

  const openAccountModal = (tab: 'settings' | 'attendance', standId?: string, qrToken?: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setAccountModalTab(tab);
    if (standId || qrToken) {
      setAccountModalParams({ standId, qrToken });
    }
    setIsAccountModalOpen(true);
    setIsUserMenuOpen(false);
  };

  // Sidebar collapse state persisted in localStorage (default to expanded / wide)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('adminSidebarCollapsed');
    return saved === 'true';
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('adminSidebarCollapsed', String(next));
      return next;
    });
  };

  // Grayscale CSS tokens map matching dark mode vs light mode
  const tCss = {
    bg: isDarkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900',
    sidebar: isDarkMode ? 'bg-zinc-950 border-zinc-850' : 'bg-white border-zinc-200',
    sidebarBorder: isDarkMode ? 'border-zinc-850' : 'border-zinc-200',
    main: isDarkMode ? 'bg-zinc-900' : 'bg-zinc-100',
    card: isDarkMode ? 'bg-zinc-950 border border-zinc-850' : 'bg-white border border-zinc-200 shadow-sm',
    border: isDarkMode ? 'border-zinc-850' : 'border-zinc-200',
    textPrimary: isDarkMode ? 'text-white' : 'text-zinc-900',
    textSecondary: isDarkMode ? 'text-zinc-400' : 'text-zinc-500',
    buttonGhost: isDarkMode
      ? 'hover:bg-zinc-900 text-zinc-400 hover:text-white border-transparent hover:border-zinc-800'
      : 'hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 border-transparent hover:border-zinc-300',
  };

  const allNavItems: {
    id: TabType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    canAccess: boolean;
  }[] = [
      { id: 'general', label: t('nav.general', 'General'), icon: LayoutGrid, canAccess: canAccessModule('general') },
      { id: 'logistics', label: t('nav.logistics', 'Logistică'), icon: Package, canAccess: canAccessModule('logistics') },
      { id: 'finance', label: t('nav.finance', 'Finanțe'), icon: DollarSign, canAccess: canAccessModule('finance') },
      { id: 'hr', label: t('nav.hr', 'HR'), icon: Users, canAccess: canAccessModule('hr') },
      { id: 'fundraising', label: t('nav.fundraising', 'Fundraising'), icon: HeartHandshake, canAccess: canAccessModule('fundraising') },
      { id: 'marketing', label: t('nav.marketing', 'Marketing'), icon: Megaphone, canAccess: canAccessModule('marketing') },
      { id: 'legal', label: t('nav.legal', 'Legal'), icon: Scale, canAccess: canAccessModule('legal') },
      { id: 'admin', label: t('nav.admin', 'Admin'), icon: Settings, canAccess: canAccessModule('admin') },
    ];

  const navItems = allNavItems.filter((item) => isTabEnabledForProject(item.id));

  return (
    <div className={`h-[100dvh] min-h-[100dvh] w-full max-w-full flex flex-col md:flex-row overflow-hidden select-none font-sans theme-transition ${tCss.bg}`}>

      {/* Mobile Top Header (Ultra-compact) */}
      <header className={`md:hidden flex items-center justify-between px-3.5 py-2 border-b shrink-0 relative z-40 ${tCss.sidebar} pt-[calc(0.5rem+env(safe-area-inset-top,0px))]`}>
        <div className="flex items-center space-x-2 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/dashboard/hub/general')}
            title="Înapoi la Hub Proiecte"
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <ArrowLeft className="w-4 h-4 text-blue-400" />
          </button>
          <img
            src={(isDarkMode ? tenant?.theme?.assets?.logoLightUrl : tenant?.theme?.assets?.logoDarkUrl) || (isDarkMode ? logoAlb : logoNegru)}
            alt={tenant?.identity?.name || 'Logo'}
            className="w-6 h-6 object-contain shrink-0"
            onError={(e) => {
              const fallback = isDarkMode ? logoAlb : logoNegru;
              if (e.currentTarget.src !== fallback) {
                e.currentTarget.src = fallback;
              }
            }}
          />
          <div className="min-w-0">
            <span className="font-bold text-xs tracking-tight truncate block">
              {currentProject?.name || 'Proiect'}
            </span>
            <span className="text-[10px] text-zinc-400 block truncate">
              {navItems.find(n => n.id === activeTab)?.label || t('nav.dashboard', 'Dashboard')}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 relative" ref={mobileMenuRef}>
          <SyncStatusPill />
          {/* Combined User & Quick Actions Trigger */}
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(prev => !prev)}
            aria-label="User profile & settings menu"
            className={`flex items-center space-x-1.5 px-2 py-1.5 rounded-xl border transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-hidden ${isDarkMode
                ? 'bg-zinc-900/80 hover:bg-zinc-850 border-zinc-800 text-zinc-200'
                : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-800'
              } ${isUserMenuOpen ? 'ring-2 ring-blue-500' : ''}`}
          >
            <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="text-xs font-semibold max-w-[80px] truncate">{user?.name ? user.name.split(' ')[0] : t('account.guest', 'Guest')}</span>
          </button>

          {/* Mobile User Popover Menu */}
          {isUserMenuOpen && (
            <div
              className={`absolute z-50 top-11 right-0 w-64 rounded-2xl border shadow-2xl p-2.5 transition-all animate-in zoom-in-95 duration-150 ${isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
                }`}
            >
              <div className="p-2.5 border-b border-zinc-800/60 mb-1.5">
                <div className="min-w-0">
                  <p className="font-bold text-xs truncate">{user?.name || t('account.guest', 'Vizitator')}</p>
                  <p className="text-[11px] text-zinc-400 truncate">{user?.email || t('account.guestMode', 'Mod Vizualizare Publică')}</p>
                </div>
              </div>

              {/* Theme switch row inside dropdown */}
              <div className="px-1 py-1">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${isDarkMode ? 'hover:bg-zinc-850 text-zinc-200' : 'hover:bg-zinc-100 text-zinc-800'
                    }`}
                >
                  <div className="flex items-center space-x-2">
                    {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-500" />}
                    <span>{isDarkMode ? t('account.themeLight', 'Light Mode') : t('account.themeDark', 'Dark Mode')}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500">{isDarkMode ? 'Dark' : 'Light'}</span>
                </button>
              </div>

              <div className="my-1 border-t border-zinc-800/60" />

              <div className="space-y-0.5">
                {user ? (
                  <>
                    <button
                      type="button"
                      onClick={() => openAccountModal('settings')}
                      className={`w-full flex items-center px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${isDarkMode ? 'hover:bg-zinc-850 text-zinc-200' : 'hover:bg-zinc-100 text-zinc-800'
                        }`}
                    >
                      <span>{t('account.myAccount', 'Contul Meu')}</span>
                    </button>

                    <div className="my-1 border-t border-zinc-800/60" />

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-all"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{t('account.logout', 'Deconectare')}</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleLogin}
                    className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer transition-all"
                  >
                    <span>{t('account.login', 'Autentificare Admin')}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Desktop Sidebar Nav (Collapsible & Wide) */}
      <aside className={`hidden md:flex h-full ${isSidebarCollapsed ? 'w-20' : 'w-64'} flex-col justify-between border-r shrink-0 py-5 px-3 relative transition-[width] duration-300 ease-in-out ${tCss.sidebar}`}>

        {/* Floating Edge Dent Toggle Button */}
        <button
          onClick={toggleSidebar}
          title={isSidebarCollapsed ? t('nav.expandSidebar', 'Extinde Bara Laterală') : t('nav.collapseSidebar', 'Restrânge Bara Laterală')}
          className={`absolute -right-3.5 top-7 z-30 w-7 h-7 rounded-full border shadow-md flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 ${isDarkMode
              ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800'
              : 'bg-white border-zinc-300 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
            }`}
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </button>

        <div className="space-y-5 flex flex-col w-full">

          {/* Sidebar Top Logo */}
          <div className={`pb-3 border-b w-full flex items-center px-2 ${tCss.sidebarBorder}`}>
            <div className="w-10 h-10 min-w-10 max-w-10 shrink-0 flex items-center justify-center">
              <img
                src={(isDarkMode ? tenant?.theme?.assets?.logoLightUrl : tenant?.theme?.assets?.logoDarkUrl) || (isDarkMode ? logoAlb : logoNegru)}
                alt={tenant?.identity?.name || 'Logo'}
                width={40}
                height={40}
                className="w-10 h-10 min-w-10 max-w-10 object-contain shrink-0 transition-transform duration-200 hover:scale-105 select-none"
                onError={(e) => {
                  const fallback = isDarkMode ? logoAlb : logoNegru;
                  if (e.currentTarget.src !== fallback) {
                    e.currentTarget.src = fallback;
                  }
                }}
              />
            </div>
            <div className={`flex flex-col min-w-0 overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'max-w-0 opacity-0 pointer-events-none ml-0' : 'max-w-44 opacity-100 ml-3'}`}>
              <span className="font-bold text-sm tracking-tight whitespace-nowrap leading-tight">{tenant?.identity?.shorthand || 'Admin'}</span>
              <span className="text-[10px] text-zinc-500 font-medium whitespace-nowrap">Portal Management</span>
            </div>
          </div>

          {/* Back to Hub Button */}
          <button
            type="button"
            onClick={() => navigate('/dashboard/hub/general')}
            title={t('nav.hub', 'Hub Proiecte')}
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'px-3'} py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              isDarkMode
                ? 'bg-zinc-900/60 hover:bg-zinc-850 text-zinc-300 hover:text-white border-zinc-800'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200'
            }`}
          >
            <ArrowLeft className="w-4 h-4 shrink-0 text-blue-500" />
            {!isSidebarCollapsed && (
              <span className="ml-2.5 truncate">{t('nav.hub', 'Hub Proiecte')}</span>
            )}
          </button>

          {/* Active Project Info */}
          {!isSidebarCollapsed && currentProject && (
            <div className={`px-3 py-2 rounded-xl border ${
              isDarkMode ? 'bg-zinc-900/40 border-zinc-800' : 'bg-zinc-100 border-zinc-200'
            }`}>
              <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                {t('common.project', 'Proiect')}
              </div>
              <div className="font-semibold text-xs truncate text-zinc-200 mt-0.5" title={currentProject.name}>
                {currentProject.name}
              </div>
            </div>
          )}

          {/* Department Navigation Items */}
          <nav className="space-y-1.5 w-full flex flex-col">
            {navItems.map(item => {
              const Icon = item.icon;
              return item.canAccess ? (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  title={isSidebarCollapsed ? item.label : undefined}
                  className={`w-full h-10 flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'px-3'} rounded-xl transition-colors duration-200 cursor-pointer font-medium text-xs sm:text-sm ${activeTab === item.id
                      ? (isDarkMode ? 'bg-zinc-800 text-white shadow-xs border border-zinc-700 font-semibold' : 'bg-zinc-200 text-zinc-900 shadow-xs border border-zinc-300 font-semibold')
                      : (isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 border border-transparent')
                    }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${activeTab === item.id ? (isDarkMode ? 'text-blue-400' : 'text-blue-600') : (isDarkMode ? 'text-zinc-400' : 'text-zinc-500')}`} />
                  <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${isSidebarCollapsed ? 'max-w-0 opacity-0 ml-0 pointer-events-none' : 'max-w-44 opacity-100 ml-3 flex-1 text-left'}`}>
                    {item.label}
                  </span>
                </button>
              ) : (
                <div
                  key={item.id}
                  title={`${item.label} (${t('common.noModuleAccess', 'Acces restricționat')})`}
                  className={`w-full h-10 flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'px-3'} rounded-xl text-zinc-500 dark:text-zinc-600 cursor-not-allowed opacity-50 border border-transparent select-none text-xs sm:text-sm relative`}
                >
                  <Icon className="w-5 h-5 shrink-0 opacity-40" />
                  <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${isSidebarCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-44 opacity-100 ml-3 flex-1 text-left'}`}>
                    {item.label}
                  </span>
                  <Lock className={`w-3.5 h-3.5 shrink-0 opacity-60 ${isSidebarCollapsed ? 'absolute bottom-1 right-1' : ''}`} />
                </div>
              );
            })}
          </nav>
        </div>

        {/* User Info / Theme Toggle / Logout */}
        <div ref={desktopMenuRef} className="relative w-full">
          <div className="space-y-3 flex flex-col w-full">
            <div className="flex justify-center md:justify-start">
              <SyncStatusPill />
            </div>
            {/* User Card */}
            <div
              onClick={() => setIsUserMenuOpen(prev => !prev)}
              title={`${user?.name || t('account.guest', 'Vizitator')} - ${t('account.options', 'Opțiuni Cont')}`}
              className={`h-10 rounded-xl border flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'px-3 justify-between'} cursor-pointer transition-colors duration-200 ${isDarkMode
                  ? 'bg-zinc-900/70 hover:bg-zinc-850 border-zinc-800 text-zinc-100'
                  : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-900'
                } ${isUserMenuOpen ? 'ring-2 ring-blue-500' : ''}`}
            >
              <div className="flex items-center min-w-0">
                <User className={`w-4 h-4 shrink-0 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                <div className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${isSidebarCollapsed ? 'max-w-0 opacity-0 ml-0 pointer-events-none' : 'max-w-36 opacity-100 ml-2.5 min-w-0'}`}>
                  <p className="font-bold text-xs truncate leading-tight">{user?.name || t('account.guest', 'Vizitator')}</p>
                  <p className="text-[10px] text-zinc-400 truncate leading-tight">{user?.email || t('account.guestMode', 'Mod Vizualizare')}</p>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 text-zinc-400 shrink-0 transition-all duration-300 ${isSidebarCollapsed ? 'max-w-0 opacity-0 pointer-events-none' : 'max-w-4 opacity-100'} ${isUserMenuOpen ? 'rotate-90' : ''}`} />
            </div>

            {/* Quick Actions Strip: Theme + Logout */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                title={isDarkMode ? t('account.themeLight', 'Light Mode') : t('account.themeDark', 'Dark Mode')}
                className={`h-10 ${isSidebarCollapsed ? 'w-full px-0 justify-center' : 'flex-1 px-3 justify-center'} flex items-center space-x-2 border rounded-xl transition-colors duration-200 cursor-pointer text-xs font-medium ${tCss.buttonGhost}`}
              >
                <div className="relative w-4 h-4 flex items-center justify-center shrink-0">
                  <Sun className={`w-4 h-4 text-amber-400 absolute transition-all duration-300 transform ${isDarkMode ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'}`} />
                  <Moon className={`w-4 h-4 text-blue-500 absolute transition-all duration-300 transform ${isDarkMode ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`} />
                </div>
                <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${isSidebarCollapsed ? 'max-w-0 opacity-0 pointer-events-none ml-0' : 'max-w-16 opacity-100'}`}>
                  {isDarkMode ? t('account.themeLight', 'Light') : t('account.themeDark', 'Dark')}
                </span>
              </button>

              {user ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  title={t('account.logout', 'Logout')}
                  className={`h-10 ${isSidebarCollapsed ? 'w-full' : 'px-3'} flex items-center justify-center rounded-xl transition-colors duration-200 cursor-pointer border ${isDarkMode
                      ? 'bg-zinc-850 hover:bg-zinc-800 text-white border-zinc-850'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200'
                    }`}
                >
                  <LogOut className="w-4 h-4 text-zinc-400 shrink-0" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleLogin}
                  title={t('account.login', 'Autentificare')}
                  className={`h-10 ${isSidebarCollapsed ? 'w-full' : 'px-3'} flex items-center justify-center rounded-xl transition-colors duration-200 cursor-pointer bg-blue-600 hover:bg-blue-500 text-white shadow-xs`}
                >
                  <LogOut className="w-4 h-4 rotate-180 shrink-0" />
                </button>
              )}
            </div>
          </div>

          {/* User Popover Menu */}
          {isUserMenuOpen && (
            <div
              className={`absolute z-50 bottom-16 ${isSidebarCollapsed ? 'left-20' : 'left-64 ml-2'} w-64 rounded-2xl border shadow-2xl p-2.5 transition-all transform scale-100 ${isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
                }`}
            >
              {/* Popover Header */}
              <div className="p-2.5 border-b border-zinc-800/60 mb-1">
                <div className="min-w-0">
                  <p className="font-bold text-xs truncate">{user?.name || t('account.guest', 'Vizitator')}</p>
                  <p className="text-[11px] text-zinc-400 truncate">{user?.email || t('account.guestMode', 'Mod Vizualizare Publică')}</p>
                </div>
              </div>

              {/* Menu Items */}
              <div className="space-y-0.5">
                {user ? (
                  <>
                    <button
                      type="button"
                      onClick={() => openAccountModal('settings')}
                      className={`w-full flex items-center px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${isDarkMode ? 'hover:bg-zinc-850 text-zinc-200' : 'hover:bg-zinc-100 text-zinc-800'
                        }`}
                    >
                      <span>{t('account.myAccount', 'Contul Meu')}</span>
                    </button>

                    <div className="my-1 border-t border-zinc-800/60" />

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-all"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{t('account.logout', 'Deconectare')}</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleLogin}
                    className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer transition-all"
                  >
                    <span>{t('account.login', 'Autentificare Admin')}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 min-h-0 p-2 sm:p-4 md:p-6 overflow-hidden flex flex-col min-w-0 ${tCss.main}`}>
        {isProjectLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-zinc-400">Se încarcă spațiul de lucru al proiectului...</p>
          </div>
        ) : projectError ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4 p-6 text-center">
            <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500">
              <FolderKanban className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">Proiect negăsit</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">{projectError}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/dashboard/hub/general')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Înapoi la Hub Proiecte
            </button>
          </div>
        ) : (
          <ErrorBoundary isDarkMode={isDarkMode}>
            <Suspense fallback={
              <div className="flex items-center justify-center h-64 w-full">
                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            }>
              {activeTab === 'general' && <GeneralDashboard isDarkMode={isDarkMode} />}
              {activeTab === 'finance' && <FinanceDashboard isDarkMode={isDarkMode} />}
              {(activeTab === 'admin' || (activeTab as string) === 'it') && <AdminSettingsDashboard isDarkMode={isDarkMode} />}
              {activeTab === 'hr' && <HRDashboard isDarkMode={isDarkMode} />}
              {activeTab === 'fundraising' && <FundraisingDashboard isDarkMode={isDarkMode} />}
              {activeTab === 'logistics' && <LogisticsDashboard isDarkMode={isDarkMode} />}
              {activeTab === 'marketing' && <MarketingDashboard isDarkMode={isDarkMode} />}
              {activeTab === 'legal' && <LegalDashboard isDarkMode={isDarkMode} />}
            </Suspense>
          </ErrorBoundary>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Horizontally scrollable with comfortable touch targets) */}
      <nav className={`md:hidden flex items-center overflow-x-auto no-scrollbar gap-1 px-2 py-1.5 border-t shrink-0 z-40 ${tCss.sidebar} pb-[calc(0.375rem+env(safe-area-inset-bottom))]`}>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return item.canAccess ? (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`flex flex-col items-center justify-center min-w-[62px] py-1 px-1 rounded-xl transition-all cursor-pointer shrink-0 ${isActive
                  ? (isDarkMode ? 'text-blue-400 font-bold' : 'text-blue-600 font-bold')
                  : (isDarkMode ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-900')
                }`}
            >
              <div className={`p-1 rounded-lg ${isActive ? (isDarkMode ? 'bg-blue-500/15' : 'bg-blue-50') : ''}`}>
                <Icon className="w-4 h-4 shrink-0" />
              </div>
              <span className="text-[10px] tracking-tight truncate max-w-[68px] mt-0.5">{item.label}</span>
            </button>
          ) : (
            <div
              key={item.id}
              title={`${item.label} (${t('common.noModuleAccess', 'Acces restricționat')})`}
              className="flex flex-col items-center justify-center min-w-[62px] py-1 px-1 rounded-xl opacity-30 cursor-not-allowed text-zinc-500 shrink-0"
            >
              <div className="p-1 relative">
                <Icon className="w-4 h-4 shrink-0" />
                <Lock className="w-2.5 h-2.5 absolute -bottom-0.5 -right-0.5 text-zinc-400" />
              </div>
              <span className="text-[10px] tracking-tight truncate max-w-[68px] mt-0.5">{item.label}</span>
            </div>
          );
        })}
      </nav>

      {/* Account Info / Settings Modal */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => {
          setIsAccountModalOpen(false);
          setAccountModalParams({});
        }}
        initialTab={accountModalTab}
        initialStandId={accountModalParams.standId}
        initialQrToken={accountModalParams.qrToken}
        isDarkMode={isDarkMode}
        onLogout={handleLogout}
      />

      {/* Push Notification Custom Consent Prompt */}
      <PushNotificationPromptModal
        isOpen={isPushPromptOpen}
        onClose={handleDismissPushPrompt}
        onSuccess={handlePushPromptSuccess}
        isDarkMode={isDarkMode}
      />

    </div>
  );
};

export default AdminDashboard;


