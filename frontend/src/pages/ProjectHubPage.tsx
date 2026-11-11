import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  FolderKanban,
  Plus,
  ArrowRight,
  Trash2,
  Moon,
  Sun,
  LogOut,
  User,
  LayoutGrid,
  Settings,
  ChevronLeft,
  ChevronRight,
  Lock,
} from 'lucide-react';
import { projectService } from '../services/projectService';
import { adminAuthService } from '../services/adminAuthService';
import { adminConfigService } from '../services/adminConfigService';
import { usePermission } from '../hooks/usePermission';
import { useLanguage } from '../context/LanguageContext';
import { useTenant } from '../context/TenantContext';
import { SyncStatusPill } from '../context/SyncStatusContext';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { EmptyState } from '../components/common/EmptyState';
import { DashboardContainer } from '../components/common/DashboardContainer';
import { SubTabNav } from '../components/common/SubTabNav';
import { DashboardHeaderSection } from '../components/common/CollapsibleControlBar';
import { SearchInput } from '../components/common/SearchInput';
import { ToastNotification, type ToastMessage } from '../components/common/ToastNotification';
import { ProjectSetupWizardModal } from '../components/project/ProjectSetupWizardModal';
import { HubVolunteersView } from '../components/project/HubVolunteersView';
import { AdminConfigView } from '../components/admin/AdminConfigView';
import { AccountModal } from '../components/account/AccountModal';
import type { ProjectResponse } from '../types/project';
import logoAlb from '../assets/logo_alb.png';
import logoNegru from '../assets/logo_negru.png';

type MainSection = 'general' | 'admin';
type GeneralSubTab = 'projects';
type AdminSubTab = 'volunteers' | 'config';

const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr).split('T')[0];
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return String(dateStr);
  }
};

export const ProjectHubPage: React.FC = () => {
  const { t } = useLanguage();
  const { tenant } = useTenant();
  const { user, hasPermission, isSuperAdmin } = usePermission();
  const navigate = useNavigate();

  const { section, subTab } = useParams<{ section?: string; subTab?: string }>();
  const [searchParams] = useSearchParams();
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [isConfigEnabled, setIsConfigEnabled] = useState(false);

  // Determine normalized active main section from URL parameter
  const activeMainSection: MainSection = useMemo(() => {
    if (section === 'admin') return 'admin';
    return 'general';
  }, [section]);

  // Determine active sub-tab for General
  const activeGeneralTab: GeneralSubTab = 'projects';

  const canViewConfig = isSuperAdmin ||
    hasPermission('SYSTEM_CONFIG_MANAGE') ||
    hasPermission('it:config:manage') ||
    hasPermission('it:config:read');

  const canAccessAdmin = isSuperAdmin ||
    hasPermission('it:users:roles:manage') ||
    hasPermission('it:users:write') ||
    hasPermission('it:users:read') ||
    hasPermission('admin:write') ||
    canViewConfig;

  // Determine active sub-tab for Admin
  const activeAdminTab: AdminSubTab = useMemo(() => {
    const rawTab = (subTab || searchParams.get('subtab') || '').toLowerCase();
    if (rawTab === 'config' && (!isConfigLoading ? (isConfigEnabled && canViewConfig) : true)) {
      return 'config';
    }
    return 'volunteers';
  }, [subTab, searchParams, isConfigLoading, isConfigEnabled, canViewConfig]);

  const handleSectionChange = (targetSection: MainSection) => {
    if (targetSection === activeMainSection) return;
    if (targetSection === 'admin') {
      navigate(`/dashboard/hub/admin/${activeAdminTab}`);
    } else {
      navigate('/dashboard/hub/general');
    }
  };

  // Search queries per section
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [volunteerSearchQuery, setVolunteerSearchQuery] = useState('');

  // Sidebar collapse state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('hubSidebarCollapsed');
    return saved === null ? false : saved === 'true';
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('hubSidebarCollapsed', String(next));
      return next;
    });
  };

  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const desktopMenuRef = useRef<HTMLDivElement>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Theme state
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

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('adminTheme', next ? 'dark' : 'light');
      return next;
    });
  };

  const handleLogout = async () => {
    await adminAuthService.signOut();
    window.location.href = '/login';
  };

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (desktopMenuRef.current && !desktopMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const canCreateProject = isSuperAdmin ||
    hasPermission('projects:write') ||
    hasPermission('projects:manage');

  const canDeleteProject = (project: ProjectResponse): boolean => {
    if (isSuperAdmin) return true;
    if (!project.createdBy || !user?.id) return false;
    return project.createdBy === user.id;
  };

  // URL normalization and permission fallbacks
  useEffect(() => {
    const currentPath = window.location.pathname;

    // Direct shortcut/alias redirects
    if (section === 'projects') {
      if (currentPath !== '/dashboard/hub/general') {
        navigate('/dashboard/hub/general', { replace: true });
      }
      return;
    }
    if (section === 'volunteers') {
      if (currentPath !== '/dashboard/hub/admin/volunteers') {
        navigate('/dashboard/hub/admin/volunteers', { replace: true });
      }
      return;
    }
    if (section === 'config') {
      if (currentPath !== '/dashboard/hub/admin/config') {
        navigate('/dashboard/hub/admin/config', { replace: true });
      }
      return;
    }

    // Default /dashboard/hub/admin to volunteers
    if (section === 'admin' && !subTab) {
      if (currentPath !== '/dashboard/hub/admin/volunteers') {
        navigate('/dashboard/hub/admin/volunteers', { replace: true });
      }
      return;
    }

    // Invalid or unknown section
    if (section && section !== 'general' && section !== 'admin') {
      if (currentPath !== '/dashboard/hub/general') {
        navigate('/dashboard/hub/general', { replace: true });
      }
      return;
    }

    // Unauthorized access to admin section - only redirect if user has been loaded
    if (section === 'admin' && user && !canAccessAdmin) {
      if (currentPath !== '/dashboard/hub/general') {
        navigate('/dashboard/hub/general', { replace: true });
      }
      return;
    }

    // Attempting to access config when disabled or unauthorized
    const querySubtab = searchParams.get('subtab');
    if (section === 'admin' && (subTab === 'config' || querySubtab === 'config')) {
      if (!isConfigLoading && (!isConfigEnabled || !canViewConfig)) {
        if (currentPath !== '/dashboard/hub/admin/volunteers') {
          navigate('/dashboard/hub/admin/volunteers', { replace: true });
        }
      }
    }
  }, [section, subTab, canAccessAdmin, user, isConfigLoading, isConfigEnabled, canViewConfig, navigate]);

  useEffect(() => {
    loadProjectsAndClubs();
    checkConfigStatus();
  }, []);

  const checkConfigStatus = async () => {
    setIsConfigLoading(true);
    try {
      const status = await adminConfigService.getStatus();
      setIsConfigEnabled(status.uiConfigEnabled);
    } catch {
      setIsConfigEnabled(false);
    } finally {
      setIsConfigLoading(false);
    }
  };

  const loadProjectsAndClubs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [projList, clubList] = await Promise.all([
        projectService.listProjects(),
        adminAuthService.getClubs().catch(() => []),
      ]);
      setProjects(projList);
      setClubs(clubList);
    } catch (err: any) {
      setError(err.message || t('projects.loadError', 'Eroare la încărcarea proiectelor.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await projectService.deleteProject(deleteTarget.id);
      setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
      showToast(t('common.deletedSuccess', 'Proiectul a fost șters cu succes.'), 'success');
    } catch (err: any) {
      setError(err.message || t('projects.deleteError', 'Eroare la ștergerea proiectului.'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter projects by search query
  const filteredProjects = useMemo(() => {
    const q = projectSearchQuery.toLowerCase().trim();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.createdByName && p.createdByName.toLowerCase().includes(q))
    );
  }, [projects, projectSearchQuery]);

  // Main Section Navigation Items on the left
  const mainNavItems = [
    {
      id: 'general' as MainSection,
      label: t('nav.general', 'General'),
      icon: LayoutGrid,
      canAccess: true,
    },
    {
      id: 'admin' as MainSection,
      label: t('nav.admin', 'Admin'),
      icon: Settings,
      canAccess: canAccessAdmin,
    },
  ];

  // Subsection Tabs for Admin
  const adminSubTabs = [
    { id: 'volunteers' as AdminSubTab, label: t('hub.tabVolunteers', 'Voluntari') },
    ...(isConfigEnabled && canViewConfig
      ? [{ id: 'config' as AdminSubTab, label: t('hub.tabConfig', 'Configurări Sistem') }]
      : []),
  ];

  // Grayscale CSS tokens matching AdminDashboard
  const tCss = {
    bg: isDarkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900',
    sidebar: isDarkMode ? 'bg-zinc-950 border-zinc-850' : 'bg-white border-zinc-200',
    sidebarBorder: isDarkMode ? 'border-zinc-850' : 'border-zinc-200',
    main: isDarkMode ? 'bg-zinc-900' : 'bg-zinc-100',
    card: isDarkMode ? 'bg-zinc-950 border-zinc-850' : 'bg-white border-zinc-200',
    tableHeaderBg: isDarkMode ? 'bg-zinc-900/60 border-zinc-850 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-600',
    rowHover: isDarkMode ? 'hover:bg-zinc-900/40 border-zinc-850' : 'hover:bg-zinc-50 border-zinc-200',
    buttonGhost: isDarkMode
      ? 'hover:bg-zinc-900 text-zinc-400 hover:text-white border-transparent hover:border-zinc-800'
      : 'hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 border-transparent hover:border-zinc-300',
  };

  return (
    <div className={`h-[100dvh] min-h-[100dvh] w-full max-w-full flex flex-col md:flex-row overflow-hidden select-none font-sans theme-transition ${tCss.bg}`}>
      <ToastNotification toast={toast} />

      {/* Mobile Top Header */}
      <header className={`md:hidden flex items-center justify-between px-3.5 py-2 border-b shrink-0 relative z-40 ${tCss.sidebar} pt-[calc(0.5rem+env(safe-area-inset-top,0px))]`}>
        <div className="flex items-center space-x-2 min-w-0">
          <img src={isDarkMode ? logoAlb : logoNegru} alt="Logo" className="w-6 h-6 object-contain shrink-0" />
          <div className="min-w-0">
            <span className="font-bold text-xs tracking-tight truncate block">
              {tenant?.identity?.name || t('common.platform', 'Platformă')}
            </span>
            <span className="text-[10px] text-zinc-400 block truncate">
              {activeMainSection === 'general' ? t('nav.general', 'General') : t('nav.admin', 'Admin')}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          <SyncStatusPill />
          <button
            type="button"
            onClick={() => setIsAccountModalOpen(true)}
            className={`p-1.5 rounded-xl border text-xs font-semibold ${
              isDarkMode ? 'border-zinc-800 text-zinc-300 hover:bg-zinc-850' : 'border-zinc-200 text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            <User className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Desktop Sidebar Nav (Collapsible & Wide) */}
      <aside className={`hidden md:flex h-full ${isSidebarCollapsed ? 'w-20' : 'w-64'} flex-col justify-between border-r shrink-0 py-5 px-3 relative transition-[width] duration-300 ease-in-out ${tCss.sidebar}`}>
        {/* Floating Edge Toggle Button */}
        <button
          type="button"
          onClick={toggleSidebar}
          title={isSidebarCollapsed ? t('nav.expandSidebar', 'Extinde Bara Laterală') : t('nav.collapseSidebar', 'Restrânge Bara Laterală')}
          className={`absolute -right-3.5 top-7 z-30 w-7 h-7 rounded-full border shadow-md flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 ${
            isDarkMode
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
              />
            </div>
            <div className={`flex flex-col min-w-0 overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'max-w-0 opacity-0 pointer-events-none ml-0' : 'max-w-44 opacity-100 ml-3'}`}>
              <span className="font-bold text-sm tracking-tight whitespace-nowrap leading-tight">
                {tenant?.identity?.shorthand || 'Hub'}
              </span>
              <span className="text-[10px] text-zinc-500 font-medium whitespace-nowrap">
                {t('projects.title', 'Proiecte')}
              </span>
            </div>
          </div>

          {/* Main Section Navigation Items */}
          <nav className="space-y-1.5 w-full flex flex-col">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeMainSection === item.id;

              return item.canAccess ? (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSectionChange(item.id)}
                  title={isSidebarCollapsed ? item.label : undefined}
                  className={`w-full h-10 flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'px-3'} rounded-xl transition-colors duration-200 cursor-pointer font-medium text-xs sm:text-sm ${
                    isActive
                      ? isDarkMode
                        ? 'bg-zinc-800 text-white shadow-xs border border-zinc-700 font-semibold'
                        : 'bg-zinc-200 text-zinc-900 shadow-xs border border-zinc-300 font-semibold'
                      : isDarkMode
                      ? 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 border border-transparent'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? (isDarkMode ? 'text-blue-400' : 'text-blue-600') : (isDarkMode ? 'text-zinc-400' : 'text-zinc-500')}`} />
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

        {/* User Info / Theme Toggle / Settings Dropdown */}
        <div ref={desktopMenuRef} className="relative w-full">
          <div className="space-y-3 flex flex-col w-full">
            <div className="flex justify-center md:justify-start">
              <SyncStatusPill />
            </div>

            {/* User Card */}
            <div
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              title={`${user?.name || t('account.guest', 'Vizitator')} - ${t('account.options', 'Opțiuni Cont')}`}
              className={`h-10 rounded-xl border flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'px-3 justify-between'} cursor-pointer transition-colors duration-200 ${
                isDarkMode
                  ? 'bg-zinc-900/70 hover:bg-zinc-850 border-zinc-800 text-zinc-100'
                  : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-900'
              } ${isUserMenuOpen ? 'ring-2 ring-blue-500' : ''}`}
            >
              <div className="flex items-center min-w-0">
                <User className={`w-4 h-4 shrink-0 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                <div className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${isSidebarCollapsed ? 'max-w-0 opacity-0 ml-0 pointer-events-none' : 'max-w-36 opacity-100 ml-2.5 min-w-0'}`}>
                  <p className="font-bold text-xs truncate leading-tight">{user?.name || t('account.defaultUser', 'Utilizator')}</p>
                  <p className="text-[10px] text-zinc-400 truncate leading-tight">{user?.email}</p>
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

              <button
                type="button"
                onClick={handleLogout}
                title={t('account.logout', 'Logout')}
                className={`h-10 ${isSidebarCollapsed ? 'w-full' : 'px-3'} flex items-center justify-center rounded-xl transition-colors duration-200 cursor-pointer border ${
                  isDarkMode
                    ? 'bg-zinc-850 hover:bg-zinc-800 text-white border-zinc-850'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200'
                }`}
              >
                <LogOut className="w-4 h-4 text-zinc-400 shrink-0" />
              </button>
            </div>
          </div>

          {/* User Popover Menu */}
          {isUserMenuOpen && (
            <div
              className={`absolute z-50 bottom-16 ${isSidebarCollapsed ? 'left-20' : 'left-64 ml-2'} w-64 rounded-2xl border shadow-2xl p-2.5 transition-all transform scale-100 ${
                isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
              }`}
            >
              <div className="p-2.5 border-b border-zinc-800/60 mb-1">
                <div className="min-w-0">
                  <p className="font-bold text-xs truncate">{user?.name || t('account.defaultUser', 'Utilizator')}</p>
                  <p className="text-[11px] text-zinc-400 truncate">{user?.email}</p>
                </div>
              </div>

              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsAccountModalOpen(true);
                  }}
                  className={`w-full flex items-center px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                    isDarkMode ? 'hover:bg-zinc-850 text-zinc-200' : 'hover:bg-zinc-100 text-zinc-800'
                  }`}
                >
                  <span>{t('account.settings', 'Setări')}</span>
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
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 min-h-0 p-2 sm:p-4 md:p-6 overflow-hidden flex flex-col min-w-0 ${tCss.main}`}>
        <DashboardContainer noScroll>
          {/* General Section */}
          {activeMainSection === 'general' && (
            <>
              {/* Collapsible Header with SubTabNav and Search Filter Controls */}
              <DashboardHeaderSection
                isDarkMode={isDarkMode}
                subTabNav={
                  <SubTabNav<GeneralSubTab>
                    tabs={[{ id: 'projects', label: t('hub.tabProjects', 'Proiecte') }]}
                    activeTab={activeGeneralTab}
                    onChange={() => {
                      if (window.location.pathname !== '/dashboard/hub/general') {
                        navigate('/dashboard/hub/general');
                      }
                    }}
                    isDarkMode={isDarkMode}
                    actionSlot={
                      canCreateProject ? (
                        <button
                          type="button"
                          onClick={() => setIsWizardOpen(true)}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{t('projects.new', 'Proiect Nou')}</span>
                        </button>
                      ) : undefined
                    }
                  />
                }
                controls={
                  <div className="w-full sm:w-72">
                    <SearchInput
                      value={projectSearchQuery}
                      onChange={setProjectSearchQuery}
                      placeholder={t('projects.searchPlaceholder', 'Caută proiecte...')}
                      isDarkMode={isDarkMode}
                    />
                  </div>
                }
              />

              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
                  {error}
                </div>
              )}

              {/* Projects Hybrid Table (Desktop) + Cards (Mobile) */}
              <div className={`flex-1 min-h-0 rounded-2xl border flex flex-col overflow-hidden ${tCss.card}`}>
                {isLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center space-y-3">
                    <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filteredProjects.length === 0 ? (
                  <EmptyState
                    icon={FolderKanban}
                    title={t('projects.emptyTitle', 'Niciun proiect')}
                    description={t('projects.emptyDesc', 'Nu există proiecte configurate.')}
                    action={canCreateProject ? (
                      <button
                        type="button"
                        onClick={() => setIsWizardOpen(true)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition"
                      >
                        {t('projects.new', 'Proiect Nou')}
                      </button>
                    ) : undefined}
                    isDarkMode={isDarkMode}
                  />
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block flex-1 min-h-0 overflow-auto no-scrollbar">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className={`sticky top-0 z-10 border-b text-[11px] font-bold uppercase tracking-wider ${tCss.tableHeaderBg}`}>
                          <tr>
                            <th className="py-3 px-4">{t('projects.colName', 'Proiect')}</th>
                            <th className="py-3 px-4">{t('projects.colCreatedBy', 'Creat de')}</th>
                            <th className="py-3 px-4">{t('projects.colCreatedAt', 'Data Creării')}</th>
                            <th className="py-3 px-4 text-right">{t('common.actions', 'Acțiuni')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/40">
                          {filteredProjects.map((project) => (
                            <tr
                              key={project.id}
                              onClick={() => navigate(`/dashboard/${project.slug}/general`)}
                              className={`transition-colors cursor-pointer ${tCss.rowHover}`}
                            >
                              <td className="py-3.5 px-4 font-bold text-zinc-100 hover:text-blue-400 transition">
                                {project.name}
                              </td>
                              <td className="py-3.5 px-4 text-zinc-400">
                                {project.createdByName || '-'}
                              </td>
                              <td className="py-3.5 px-4 text-zinc-400 font-mono">
                                {formatDate(project.createdAt)}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <div className="inline-flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/dashboard/${project.slug}/general`)}
                                    title={t('common.open', 'Deschide')}
                                    className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition cursor-pointer"
                                  >
                                    <ArrowRight className="w-4 h-4" />
                                  </button>
                                  {canDeleteProject(project) && (
                                    <button
                                      type="button"
                                      onClick={() => setDeleteTarget({ id: project.id, name: project.name })}
                                      title={t('common.delete', 'Șterge')}
                                      className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards View */}
                    <div className="block md:hidden divide-y divide-zinc-850 flex-1 min-h-0 overflow-y-auto no-scrollbar">
                      {filteredProjects.map((project) => (
                        <div
                          key={project.id}
                          onClick={() => navigate(`/dashboard/${project.slug}/general`)}
                          className="p-4 space-y-3 cursor-pointer hover:bg-zinc-900/40 transition"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-bold text-sm text-zinc-100">
                              {project.name}
                            </h3>
                            {canDeleteProject(project) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTarget({ id: project.id, name: project.name });
                                }}
                                title={t('common.delete', 'Șterge')}
                                className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400">
                            <div>
                              <span className="text-[10px] text-zinc-500 uppercase block font-semibold">
                                {t('projects.colCreatedBy', 'Creat de')}
                              </span>
                              <span className="truncate block">{project.createdByName || '-'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-zinc-500 uppercase block font-semibold">
                                {t('projects.colCreatedAt', 'Data Creării')}
                              </span>
                              <span className="font-mono block">{formatDate(project.createdAt)}</span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => navigate(`/dashboard/${project.slug}/general`)}
                              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <span>{t('common.open', 'Deschide')}</span>
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* Admin Section */}
          {activeMainSection === 'admin' && (
            <>
              {/* Collapsible Header for Admin */}
              <DashboardHeaderSection
                isDarkMode={isDarkMode}
                subTabNav={
                  <SubTabNav<AdminSubTab>
                    tabs={adminSubTabs}
                    activeTab={activeAdminTab}
                    onChange={(tab) => navigate(`/dashboard/hub/admin/${tab}`)}
                    isDarkMode={isDarkMode}
                  />
                }
                controls={
                  activeAdminTab === 'volunteers' ? (
                    <div className="w-full sm:w-72">
                      <SearchInput
                        value={volunteerSearchQuery}
                        onChange={setVolunteerSearchQuery}
                        placeholder={t('hub.searchVolunteers', 'Caută voluntari...')}
                        isDarkMode={isDarkMode}
                      />
                    </div>
                  ) : undefined
                }
              />

              {activeAdminTab === 'volunteers' && (
                <HubVolunteersView
                  isDarkMode={isDarkMode}
                  onToast={showToast}
                  searchQuery={volunteerSearchQuery}
                />
              )}

              {activeAdminTab === 'config' && isConfigEnabled && canViewConfig && (
                <div className={`flex-1 min-h-0 rounded-2xl border flex flex-col overflow-hidden ${tCss.card} p-4 sm:p-6`}>
                  <AdminConfigView
                    isDarkMode={isDarkMode}
                    onToast={showToast}
                  />
                </div>
              )}
            </>
          )}
        </DashboardContainer>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className={`md:hidden flex items-center overflow-x-auto no-scrollbar gap-1 px-2 py-1.5 border-t shrink-0 z-40 ${tCss.sidebar} pb-[calc(0.375rem+env(safe-area-inset-bottom))]`}>
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeMainSection === item.id;
          return item.canAccess ? (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSectionChange(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? isDarkMode ? 'text-blue-400 font-bold' : 'text-blue-600 font-bold'
                  : isDarkMode ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <div className={`p-1 rounded-lg ${isActive ? (isDarkMode ? 'bg-blue-500/15' : 'bg-blue-50') : ''}`}>
                <Icon className="w-4 h-4 shrink-0" />
              </div>
              <span className="text-[10px] leading-tight mt-0.5 truncate">{item.label}</span>
            </button>
          ) : null;
        })}
      </nav>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title={t('projects.deleteTitle', 'Șterge Proiect')}
        message={
          deleteTarget ? (
            <span>
              {t('projects.deleteConfirm', 'Sigur doriți să ștergeți proiectul')} <strong>{deleteTarget.name}</strong>?
            </span>
          ) : ''
        }
        confirmText={t('common.delete', 'Șterge')}
        cancelText={t('common.cancel', 'Anulează')}
        variant="danger"
        isLoading={isDeleting}
        isDarkMode={isDarkMode}
      />

      {/* Setup Wizard Modal */}
      {isWizardOpen && (
        <ProjectSetupWizardModal
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          clubs={clubs}
          onSuccess={(newProj) => {
            setIsWizardOpen(false);
            navigate(`/dashboard/${newProj.slug}/general`);
          }}
        />
      )}

      {/* Account Settings Modal */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        initialTab="settings"
        settingsOnly={true}
        isDarkMode={isDarkMode}
        onLogout={handleLogout}
      />
    </div>
  );
};
