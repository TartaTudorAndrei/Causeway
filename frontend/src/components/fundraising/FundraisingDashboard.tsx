import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { FundraisingSponsor, SponsorStatus } from '../../types/fundraising';
import { fundraisingService } from '../../services/fundraisingService';
import { useLanguage } from '../../context/LanguageContext';
import { useTenant } from '../../context/TenantContext';
import { usePermission } from '../../hooks/usePermission';
import { Trash2, Pencil, X, User, Mail } from 'lucide-react';
import { DashboardContainer, SubTabNav, ToastNotification, SearchInput, EmptyState, FilterPopover, ManageableSelect, DatePicker, DashboardHeaderSection, ConfirmationModal } from '../common';
import { FundraisingStatisticsView } from './FundraisingStatisticsView';
import { EmailComposerModal } from '../email/EmailComposerModal';
import type { MergeTagContext } from '../../types/email';

interface FundraisingDashboardProps {
    isDarkMode: boolean;
}
const SPONSORSHIP_TYPE_OPTIONS = [
    'Gold',
    'Silver',
    'Bronze',
    'Partner',
    'In-Kind',
    'Individual'
];
const CURRENCY_OPTIONS = [
    'RON',
    'EUR',
    'USD'
];

const FUNDRAISING_TAB_PERMISSIONS: Record<string, string[]> = {
    'leads': ['fundraising:sponsors:read', 'fundraising:leads:view'],
    'finished': ['fundraising:sponsors:read', 'fundraising:finished:view'],
    'statistics': ['fundraising:sponsors:read', 'fundraising:statistics:view'],
};

const VALID_FUNDRAISING_SUB_TABS = ['leads', 'finished', 'statistics'];
export type FundraisingSubTab = 'leads' | 'finished' | 'statistics';

export const FundraisingDashboard: React.FC<FundraisingDashboardProps> = ({ isDarkMode }) => {
    const { t } = useLanguage();
    const { tenant } = useTenant();
    const { hasPermission, isSuperAdmin } = usePermission();
    
    const canWriteFundraising = hasPermission('fundraising:sponsors:write', 'DEPARTMENT', 'fundraising-dept-uuid') || hasPermission('fundraising:sponsor:write', 'DEPARTMENT', 'fundraising-dept-uuid') || hasPermission('fundraising:sponsor:create', 'DEPARTMENT', 'fundraising-dept-uuid') || isSuperAdmin;

    const isTabAccessible = useCallback((tabId: string): boolean => {
        if (isSuperAdmin) return true;
        const codes = FUNDRAISING_TAB_PERMISSIONS[tabId];
        return codes ? codes.some(code => hasPermission(code)) : true;
    }, [isSuperAdmin, hasPermission]);

    const [searchParams, setSearchParams] = useSearchParams();
    // URL-driven Sub-Tab
    const accessibleTabs = VALID_FUNDRAISING_SUB_TABS.filter(tab => isTabAccessible(tab));
    const rawSubTab = searchParams.get('subtab');
    const requestedTab = (rawSubTab && VALID_FUNDRAISING_SUB_TABS.includes(rawSubTab)) ? rawSubTab : 'leads';
    const activeSubTab = (isTabAccessible(requestedTab) ? requestedTab : (accessibleTabs[0] || 'leads')) as FundraisingSubTab;

    const setSubTab = useCallback((subtab: FundraisingSubTab) => {
        if (!isTabAccessible(subtab)) return;
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('subtab', subtab);
            return next;
        });
    }, [isTabAccessible, setSearchParams]);

    useEffect(() => {
        if (rawSubTab && !isTabAccessible(rawSubTab)) {
            setSubTab(activeSubTab);
        }
    }, [rawSubTab, activeSubTab, isTabAccessible, setSubTab]);

    // Direct Composer State
    const [composerSponsor, setComposerSponsor] = useState<{ email?: string; name?: string; mergeData?: MergeTagContext } | null>(null);
    const [isComposerOpen, setIsComposerOpen] = useState<boolean>(false);
    const [sponsors, setSponsors] = useState<FundraisingSponsor[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const handleComposeToSponsor = (item: FundraisingSponsor) => {
        setComposerSponsor({
            email: item.contactInfo?.includes('@') ? item.contactInfo : '',
            name: item.responsiblePerson || item.companyName,
            mergeData: {
                sponsor_name: item.companyName,
                contact_person: item.responsiblePerson || item.companyName,
                contact_email: item.contactInfo?.includes('@') ? item.contactInfo : '',
                tier: item.sponsorshipType || 'Partener',
                tier_amount: item.receivedValue ? `${item.receivedValue} ${item.currency || 'RON'}` : '10.000 RON',
                contract_amount: item.receivedValue ? `${item.receivedValue} ${item.currency || 'RON'}` : '10.000 RON',
                event_name: tenant?.terminology?.campaignSeasonName || 'Campania Anuală',
                event_year: new Date().getFullYear().toString(),
                proposal_url: item.contractUrl || tenant?.integrations?.socialLinks?.website || '',
            }
        });
        setIsComposerOpen(true);
    };
    const searchQuery = searchParams.get('search') || '';
    const setSearchQuery = (query: string) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (query)
                next.set('search', query);
            else
                next.delete('search');
            return next;
        }, { replace: true });
    };
    const statusFilter = searchParams.get('status') || 'ALL';
    const setStatusFilter = (status: string) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (status && status !== 'ALL')
                next.set('status', status);
            else
                next.delete('status');
            return next;
        }, { replace: true });
    };
    const tierFilter = searchParams.get('tier') || 'ALL';
    const setTierFilter = (tier: string) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (tier && tier !== 'ALL')
                next.set('tier', tier);
            else
                next.delete('tier');
            return next;
        }, { replace: true });
    };
    const currencyFilter = searchParams.get('currency') || 'ALL';
    const setCurrencyFilter = (curr: string) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (curr && curr !== 'ALL')
                next.set('currency', curr);
            else
                next.delete('currency');
            return next;
        }, { replace: true });
    };
    const minAmount = searchParams.get('minAmount') || '';
    const setMinAmount = (val: string) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (val)
                next.set('minAmount', val);
            else
                next.delete('minAmount');
            return next;
        }, { replace: true });
    };
    const maxAmount = searchParams.get('maxAmount') || '';
    const setMaxAmount = (val: string) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (val)
                next.set('maxAmount', val);
            else
                next.delete('maxAmount');
            return next;
        }, { replace: true });
    };
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [editingSponsor, setEditingSponsor] = useState<FundraisingSponsor | null>(null);
    const [formData, setFormData] = useState<Partial<FundraisingSponsor>>({
        sortIndex: 1,
        companyName: '',
        companyProfile: '',
        contactInfo: '',
        responsiblePerson: '',
        status: 'PENDING',
        lastContactDate: new Date().toISOString().split('T')[0],
        contractUrl: '',
        notes: '',
        sponsorshipType: 'Gold',
        receivedType: 'MONEY',
        receivedValue: '',
        currency: 'RON'
    });
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    // Delete Confirm State
    const [sponsorToDelete, setSponsorToDelete] = useState<FundraisingSponsor | null>(null);
    // Toast
    const [toastMessage, setToastMessage] = useState<{
        text: string;
        type: 'success' | 'error';
    } | null>(null);
    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        setToastMessage({ text, type });
    };
    // Keyboard Escape listener
    useEffect(() => {
        if (!isModalOpen && !sponsorToDelete)
            return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsModalOpen(false);
                setSponsorToDelete(null);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isModalOpen, sponsorToDelete]);
    const [customCompanyProfiles, setCustomCompanyProfiles] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('app_fundraising_company_profiles');
            return saved ? JSON.parse(saved) : [
                'IT & Software',
                'Servicii Financiare & Banking',
                'Retail & FMCG',
                'HORECA & Evenimente',
                'Construcții & Imobiliare',
                'Transport & Logistică',
                'Marketing & Publicitate',
                'Producție Industrială',
                'Educație & Training',
                'Sănătate & Farmacie',
            ];
        }
        catch {
            return [
                'IT & Software',
                'Servicii Financiare & Banking',
                'Retail & FMCG',
                'HORECA & Evenimente',
                'Construcții & Imobiliare',
                'Transport & Logistică',
                'Marketing & Publicitate',
                'Producție Industrială',
                'Educație & Training',
                'Sănătate & Farmacie',
            ];
        }
    });
    const dynamicCompanyProfiles = React.useMemo(() => {
        const set = new Set<string>(customCompanyProfiles);
        sponsors.forEach(s => s.companyProfile && set.add(s.companyProfile));
        return Array.from(set).sort();
    }, [sponsors, customCompanyProfiles]);
    const handleAddCompanyProfile = (profile: string) => {
        const trimmed = profile.trim();
        if (!trimmed)
            return;
        setCustomCompanyProfiles(prev => {
            if (prev.includes(trimmed))
                return prev;
            const updated = [...prev, trimmed];
            try {
                localStorage.setItem('app_fundraising_company_profiles', JSON.stringify(updated));
            }
            catch { }
            return updated;
        });
    };
    const handleRenameCompanyProfile = (oldVal: string, newVal: string) => {
        const trimmed = newVal.trim();
        if (!trimmed || trimmed === oldVal)
            return;
        setCustomCompanyProfiles(prev => {
            const updated = prev.map(p => p === oldVal ? trimmed : p);
            try {
                localStorage.setItem('app_fundraising_company_profiles', JSON.stringify(updated));
            }
            catch { }
            return updated;
        });
    };
    const handleDeleteCompanyProfile = (val: string) => {
        setCustomCompanyProfiles(prev => {
            const updated = prev.filter(p => p !== val);
            try {
                localStorage.setItem('app_fundraising_company_profiles', JSON.stringify(updated));
            }
            catch { }
            return updated;
        });
    };
    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await fundraisingService.getSponsors();
            setSponsors(data);
        }
        catch (err) {
            console.error('Error loading fundraising sponsors:', err);
            showToast(err instanceof Error ? err.message : t('fundraising.loadError', 'Eroare la încărcare'), 'error');
        }
        finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        loadData();
    }, []);
    const handleOpenAddModal = () => {
        setEditingSponsor(null);
        setFormData({
            sortIndex: sponsors.length + 1,
            companyName: '',
            companyProfile: '',
            contactInfo: '',
            responsiblePerson: '',
            status: activeSubTab === 'finished' ? 'SPONSORED' : 'PENDING',
            lastContactDate: new Date().toISOString().split('T')[0],
            contractUrl: '',
            notes: '',
            sponsorshipType: 'Gold',
            receivedType: 'MONEY',
            receivedValue: '',
            currency: 'RON'
        });
        setFieldErrors({});
        setIsModalOpen(true);
    };
    const handleOpenEditModal = (sponsor: FundraisingSponsor) => {
        setEditingSponsor(sponsor);
        setFormData({
            ...sponsor,
            sponsorshipType: sponsor.sponsorshipType || 'Gold',
            receivedType: sponsor.receivedType || 'MONEY',
            receivedValue: sponsor.receivedValue || '',
            currency: sponsor.currency || 'RON'
        });
        setFieldErrors({});
        setIsModalOpen(true);
    };
    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};
        if (!formData.companyName?.trim()) {
            errors.companyName = t('common.fieldRequired', 'Câmp obligatoriu');
        }
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm())
            return;
        try {
            const payload = {
                ...formData,
                sortIndex: formData.sortIndex || editingSponsor?.sortIndex || sponsors.length + 1,
            };
            if (editingSponsor) {
                await fundraisingService.updateSponsor(editingSponsor.id, payload);
                showToast(t('fundraising.updatedSuccess', 'Compania a fost actualizată cu succes.'));
            }
            else {
                await fundraisingService.createSponsor(payload);
                showToast(t('fundraising.createdSuccess', 'Compania a fost adăugată cu succes.'));
            }
            setIsModalOpen(false);
            await loadData();
        }
        catch (err) {
            showToast(err instanceof Error ? err.message : t('fundraising.saveError', 'Eroare la salvare'), 'error');
        }
    };
    const handleConfirmDelete = async () => {
        if (!sponsorToDelete) return;
        try {
            await fundraisingService.deleteSponsor(sponsorToDelete.id);
            showToast(t('fundraising.deletedSuccess', 'Compania a fost ștearsă.'));
            setSponsorToDelete(null);
            await loadData();
        }
        catch (err) {
            showToast(err instanceof Error ? err.message : t('fundraising.deleteError', 'Eroare la ștergere'), 'error');
        }
    };
    const filteredSponsors = sponsors.filter(s => {
        const matchesSearch = (s.companyName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.companyProfile || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.contactInfo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.responsiblePerson || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.sponsorshipType || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.receivedValue || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.notes || '').toLowerCase().includes(searchQuery.toLowerCase());
        const isFinishedSponsor = s.status === 'CONTRACT_SIGNED' || s.status === 'SPONSORED';
        if (activeSubTab === 'finished' && !isFinishedSponsor) {
            return false;
        }
        const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
        const matchesTier = tierFilter === 'ALL' || s.sponsorshipType === tierFilter;
        const matchesCurr = currencyFilter === 'ALL' || s.currency === currencyFilter;
        const numericVal = s.receivedValue ? parseFloat(s.receivedValue) : 0;
        const matchesMin = !minAmount || numericVal >= parseFloat(minAmount);
        const matchesMax = !maxAmount || numericVal <= parseFloat(maxAmount);
        return matchesSearch && matchesStatus && matchesTier && matchesCurr && matchesMin && matchesMax;
    });
    const activeFundraisingFilterCount = (statusFilter !== 'ALL' ? 1 : 0) +
        (tierFilter !== 'ALL' ? 1 : 0) +
        (currencyFilter !== 'ALL' ? 1 : 0) +
        (minAmount ? 1 : 0) +
        (maxAmount ? 1 : 0);
    const resetFundraisingFilters = () => {
        setStatusFilter('ALL');
        setTierFilter('ALL');
        setCurrencyFilter('ALL');
        setMinAmount('');
        setMaxAmount('');
    };
    const getStatusBadge = (status: SponsorStatus) => {
        switch (status) {
            case 'CONTRACT_SIGNED':
                return isDarkMode
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'SPONSORED':
                return isDarkMode
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                    : 'bg-blue-50 text-blue-700 border-blue-200';
            case 'IN_TALKS':
                return isDarkMode
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-amber-50 text-amber-700 border-amber-200';
            case 'CONTACTED':
                return isDarkMode
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                    : 'bg-purple-50 text-purple-700 border-purple-200';
            case 'REFUSED':
                return isDarkMode
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    : 'bg-rose-50 text-rose-700 border-rose-200';
            default:
                return isDarkMode
                    ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    : 'bg-zinc-100 text-zinc-600 border-zinc-200';
        }
    };
    // Styling Tokens matching Finance standard
    const tCss = {
        card: isDarkMode ? 'bg-zinc-950 border-zinc-850' : 'bg-white border-zinc-200 shadow-xs',
        textPrimary: isDarkMode ? 'text-zinc-100' : 'text-zinc-900',
        textSecondary: isDarkMode ? 'text-zinc-400' : 'text-zinc-500',
        border: isDarkMode ? 'border-zinc-850' : 'border-zinc-200',
        tableHeader: isDarkMode ? 'bg-zinc-900/60 text-zinc-400 border-zinc-800' : 'bg-zinc-100/90 text-zinc-600 border-zinc-200',
        rowHover: isDarkMode ? 'hover:bg-zinc-900/40' : 'hover:bg-zinc-50',
        input: isDarkMode
            ? 'bg-zinc-950 border-zinc-800 text-white placeholder-zinc-500'
            : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400',
        modalBg: isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900',
    };
    const modalBorder = isDarkMode ? 'border-zinc-800' : 'border-zinc-200';
    const modalBg = isDarkMode ? 'bg-black text-white border-zinc-800 shadow-2xl' : 'bg-white text-zinc-900 border-zinc-200 shadow-xl';
    const inputBg = isDarkMode
        ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700 focus:border-zinc-700'
        : 'bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400 focus:border-zinc-400';
    const inputErrorBorder = 'border-rose-500/80 focus:border-rose-500 ring-1 ring-rose-500/40';
    const textSub = isDarkMode ? 'text-zinc-400' : 'text-zinc-500';
    return (<DashboardContainer noScroll>
      {/* Toast Notification */}
      <ToastNotification toast={toastMessage} onClose={() => setToastMessage(null)}/>

      {/* Unified Dashboard Sub-Header + Filter & Action Controls */}
      <DashboardHeaderSection isDarkMode={isDarkMode} activeTabLabel={
        activeSubTab === 'leads' ? t('fundraising.tab.leads', 'Leads & Companii')
        : activeSubTab === 'finished' ? t('fundraising.tab.finished', 'Sponsorizări Finalizate')
        : t('common.tabStatistics', 'Statistici')
      } activeFilterCount={activeFundraisingFilterCount} searchQuery={searchQuery} subTabNav={<SubTabNav<FundraisingSubTab> tabs={[
                { id: 'leads', label: t('fundraising.tab.leads', 'Leads & Companii'), disabled: !isTabAccessible('leads') },
                { id: 'finished', label: t('fundraising.tab.finished', 'Sponsorizări Finalizate'), disabled: !isTabAccessible('finished') },
                { id: 'statistics', label: t('common.tabStatistics', 'Statistici'), disabled: !isTabAccessible('statistics') },
            ]} activeTab={activeSubTab} onChange={setSubTab} isDarkMode={isDarkMode}/>} controls={(activeSubTab === 'leads' || activeSubTab === 'finished') ? (<>
            <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder={t('fundraising.searchPlaceholder', 'Caută companie, profil, responsabil...')} isDarkMode={isDarkMode}/>
<div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0">
              <FilterPopover activeCount={activeFundraisingFilterCount} onReset={resetFundraisingFilters} isDarkMode={isDarkMode}>
                <div className="space-y-3">
                  {/* Status filter (only for leads subtab) */}
                  {activeSubTab === 'leads' && (<div className="space-y-1">
                      <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                        {t('fundraising.col.status', 'Status')}
                      </label>
                      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`w-full px-3 py-2 text-xs rounded-xl border outline-hidden ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'}`}>
                        <option value="ALL">{t('general.allStatuses', 'Toate Stările')}</option>
                        <option value="PENDING">{t('fundraising.status.PENDING', 'Neînceput')}</option>
                        <option value="CONTACTED">{t('fundraising.status.CONTACTED', 'Contactat')}</option>
                        <option value="IN_TALKS">{t('fundraising.status.IN_TALKS', 'În Negocieri')}</option>
                        <option value="REFUSED">{t('fundraising.status.REFUSED', 'Refuzat')}</option>
                      </select>
                    </div>)}

                  {/* Sponsorship Tier */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                      {t('table.sponsorshipTier', 'Tier Sponsorizare')}
                    </label>
                    <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)} className={`w-full px-3 py-2 text-xs rounded-xl border outline-hidden ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'}`}>
                      <option value="ALL">{t('general.allTiers', 'Toate Pachetele')}</option>
                      {SPONSORSHIP_TYPE_OPTIONS.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
                    </select>
                  </div>

                  {/* Currency */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                      {t('finance.currency', 'Monedă')}
                    </label>
                    <select value={currencyFilter} onChange={(e) => setCurrencyFilter(e.target.value)} className={`w-full px-3 py-2 text-xs rounded-xl border outline-hidden ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'}`}>
                      <option value="ALL">{t('finance.allCurrencies', 'Toate Monedele')}</option>
                      {CURRENCY_OPTIONS.map(c => (<option key={c} value={c}>{c}</option>))}
                    </select>
                  </div>

                  {/* Amount Range */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                      {t('finance.amountRange', 'Interval Valoare')}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" placeholder={t('common.min', 'Min')} value={minAmount} onFocus={(e) => e.target.select()} onChange={(e) => setMinAmount(e.target.value.replace(/^0+(?=\d)/, ''))} className={`px-3 py-1.5 text-xs rounded-xl border outline-hidden ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'}`}/>
                      <input type="number" placeholder={t('common.max', 'Max')} value={maxAmount} onFocus={(e) => e.target.select()} onChange={(e) => setMaxAmount(e.target.value.replace(/^0+(?=\d)/, ''))} className={`px-3 py-1.5 text-xs rounded-xl border outline-hidden ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'}`}/>
                    </div>
                  </div>
                </div>
              </FilterPopover>

              {canWriteFundraising && (<button onClick={handleOpenAddModal} className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer shrink-0">
                  <span>{t('fundraising.addSponsor', 'Adaugă Companie')}</span>
                </button>)}
            </div>
          </>) : null}/>

      {/* Main Single Table Card or Statistics View */}
      {activeSubTab === 'statistics' ? (
        <FundraisingStatisticsView
          sponsors={sponsors}
          isLoading={isLoading}
          isDarkMode={isDarkMode}
        />
      ) : (
        <div className={`flex-1 min-h-0 rounded-2xl border flex flex-col overflow-hidden ${tCss.card}`}>
        {isLoading ? (<div className="flex-1 flex items-center justify-center p-8">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
          </div>) : filteredSponsors.length === 0 ? (<EmptyState title={t('fundraising.noData', 'Nu există companii înregistrate.')} isDarkMode={isDarkMode} className="border-0 bg-transparent"/>) : (<>
            {/* Mobile Card List View */}
            <div className={`block md:hidden divide-y ${tCss.border} flex-1 min-h-0 overflow-y-auto no-scrollbar`}>
              {filteredSponsors.map((item, idx) => (<div key={item.id} className="p-4 space-y-2.5 text-xs">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1 mb-1">
                        {activeSubTab !== 'leads' && (
                          <span className={`font-mono font-bold text-[10px] ${tCss.textSecondary}`}>
                            #{item.sortIndex || idx + 1}
                          </span>
                        )}
                        {activeSubTab === 'leads' ? (<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(item.status)}`}>
                            {t(`fundraising.status.${item.status}`, item.status)}
                          </span>) : (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${item.receivedType === 'MONEY'
                        ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200')
                        : (isDarkMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-200')}`}>
                              {item.receivedType === 'MONEY' ? t('fundraising.money', 'Bani') : t('fundraising.other', 'Altele')}
                            </span>
                          )}
                      </div>
<h4 className={`font-bold text-sm leading-tight ${tCss.textPrimary}`}>
                        {activeSubTab === 'finished' && item.receivedType === 'MONEY' ? (<a href={`/dashboard/finance?subtab=sponsorships&search=${encodeURIComponent(item.companyName)}`} title={t('fundraising.viewInFinance', 'Vezi în Finanțe')} className="inline-flex items-center space-x-1 text-blue-500 hover:text-blue-400 hover:underline cursor-pointer">
                            <span>{item.companyName}</span></a>) : (item.companyName)}
                      </h4>

                      {item.companyProfile && (<p className={`text-[11px] mt-0.5 line-clamp-2 ${tCss.textSecondary}`}>
                          {item.companyProfile}
                        </p>)}
                    </div>

                    {activeSubTab === 'finished' && item.receivedValue && (
                      <span className="font-mono font-extrabold text-emerald-400 text-sm shrink-0">
                        {item.receivedType === 'OTHER' ? item.receivedValue : `${item.receivedValue} ${item.currency || 'RON'}`}
                      </span>
                    )}
                  </div>
<div className={`grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] pt-1.5 border-t border-zinc-800/40 ${tCss.textSecondary}`}>
                    {item.contactInfo && (<div className="truncate">
                        <span className="font-medium">{t('fundraising.col.contact', 'Contact')}:</span> <span className="font-mono text-zinc-300">{item.contactInfo}</span>
                      </div>)}
                    {item.responsiblePerson && (<div className="flex items-center space-x-1">
                        <User className="w-3 h-3 text-zinc-500 shrink-0"/>
                        <span className="text-zinc-300">{item.responsiblePerson}</span>
                      </div>)}
                    {item.lastContactDate && (<div className="flex items-center space-x-1"><span className="font-mono text-zinc-300">{item.lastContactDate}</span>
                      </div>)}
                    {item.contractUrl && (<div>
                        <a href={item.contractUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center space-x-1 text-blue-400 hover:underline font-semibold"><span>{t('fundraising.openContract', 'Contract')}</span>
                        </a>
                      </div>)}
                  </div>

                  {item.notes && (<p className={`text-[10px] italic bg-zinc-900/40 p-2 rounded-lg border border-zinc-800/60 ${tCss.textSecondary}`}>
                      {item.notes}
                    </p>)}

                  {canWriteFundraising && (<div className={`flex items-center justify-end space-x-2 pt-2 border-t border-zinc-800/40`}>
                      <button onClick={() => handleComposeToSponsor(item)} className={`px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center space-x-1 cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'}`}>
                        <Mail className="w-3.5 h-3.5"/>
                        <span>{t('email.compose', 'Compune')}</span>
                      </button>

                      <button onClick={() => handleOpenEditModal(item)} className="px-2.5 py-1 rounded-lg text-blue-400 hover:bg-blue-500/10 text-xs font-semibold inline-flex items-center space-x-1 cursor-pointer">
                        <Pencil className="w-3.5 h-3.5"/>
                        <span>{t('common.edit', 'Editează')}</span>
                      </button>

                      <button onClick={() => setSponsorToDelete(item)} className="px-2.5 py-1 rounded-lg text-rose-400 hover:bg-rose-500/10 text-xs font-semibold inline-flex items-center space-x-1 cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5"/>
                        <span>{t('common.delete', 'Șterge')}</span>
                      </button>
                    </div>)}
                </div>))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block flex-1 min-h-0 overflow-auto no-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead className={`sticky top-0 z-10 border-b font-bold tracking-wider uppercase text-[11px] ${tCss.tableHeader}`}>
                  {activeSubTab === 'leads' ? (<tr>
                      <th className="py-3 px-4 whitespace-nowrap">{t('fundraising.col.companyName', 'Nume Companie')}</th>
                      <th className="py-3 px-4 whitespace-nowrap">{t('fundraising.col.companyProfile', 'Profil Companie')}</th>
                      <th className="py-3 px-4 whitespace-nowrap">{t('fundraising.col.contact', 'Contact')}</th>
                      <th className="py-3 px-4 whitespace-nowrap">{t('fundraising.col.responsiblePerson', 'Persoană Responsabilă')}</th>
                      <th className="py-3 px-4 whitespace-nowrap">{t('fundraising.col.status', 'Status')}</th>
                      <th className="py-3 px-4 whitespace-nowrap">{t('fundraising.col.lastContact', 'Ultimul Contact')}</th>
                      <th className="py-3 px-4 whitespace-nowrap">{t('fundraising.col.notes', 'Notițe')}</th>
                      {canWriteFundraising && <th className="py-3 px-4 text-right whitespace-nowrap">{t('fundraising.col.actions', 'Acțiuni')}</th>}
                    </tr>) : (<tr>
                      <th className="py-3 px-4 w-12 text-center whitespace-nowrap">#</th>
                      <th className="py-3 px-4 whitespace-nowrap">{t('fundraising.col.companyName', 'Nume Companie')}</th>
                      <th className="py-3 px-4 whitespace-nowrap">{t('fundraising.col.receivedType', 'Tip')}</th>
                      <th className="py-3 px-4 whitespace-nowrap">{t('fundraising.col.currency', 'Valută')}</th>
                      <th className="py-3 px-4 whitespace-nowrap">{t('fundraising.col.receivedValue', 'Suma / Listă Bunuri')}</th>
                      <th className="py-3 px-4 whitespace-nowrap">{t('fundraising.col.responsiblePerson', 'Persoană Responsabilă')}</th>
                      <th className="py-3 px-4 whitespace-nowrap">{t('fundraising.col.notes', 'Notițe')}</th>
                      <th className="py-3 px-4 whitespace-nowrap">{t('fundraising.col.contractUrl', 'Link Contract')}</th>
                      {canWriteFundraising && <th className="py-3 px-4 text-right whitespace-nowrap">{t('fundraising.col.actions', 'Acțiuni')}</th>}
                    </tr>)}
                </thead>
                <tbody className={`divide-y ${tCss.border}`}>
                  {filteredSponsors.map((item, idx) => (<tr key={item.id} className={`transition-colors ${tCss.rowHover}`}>
                      {/* Index */}
                      {activeSubTab !== 'leads' && (
                        <td className={`py-3 px-4 text-center font-mono font-bold text-[11px] ${tCss.textSecondary}`}>
                          {item.sortIndex || idx + 1}
                        </td>
                      )}

                      {/* Company Name */}
                      <td className="py-3 px-4 font-bold">
                        {activeSubTab === 'finished' && item.receivedType === 'MONEY' ? (<a href={`/dashboard/finance?subtab=sponsorships&search=${encodeURIComponent(item.companyName)}`} title={t('fundraising.viewInFinance', 'Vezi în Finanțe')} className="inline-flex items-center space-x-1.5 text-blue-500 hover:text-blue-400 font-bold hover:underline cursor-pointer">
                            <span>{item.companyName}</span></a>) : (<span className={tCss.textPrimary}>{item.companyName}</span>)}
                      </td>

                      {activeSubTab === 'leads' ? (<>
                          {/* Company Profile */}
                          <td className={`py-3 px-4 max-w-xs truncate ${tCss.textSecondary}`} title={item.companyProfile}>
                            {item.companyProfile || '-'}
                          </td>

                          {/* Contact */}
                          <td className={`py-3 px-4 max-w-xs truncate font-mono text-[11px] ${tCss.textSecondary}`} title={item.contactInfo}>
                            {item.contactInfo || '-'}
                          </td>

                          {/* Responsible Person */}
                          <td className="py-3 px-4 font-medium">
                            <div className="flex items-center space-x-1.5">
                              <User className={`w-3.5 h-3.5 ${tCss.textSecondary}`}/>
                              <span className={tCss.textPrimary}>{item.responsiblePerson || '-'}</span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusBadge(item.status)}`}>
                              {t(`fundraising.status.${item.status}`, item.status)}
                            </span>
                          </td>

                          {/* Last Contact */}
                          <td className={`py-3 px-4 whitespace-nowrap font-mono text-[11px] ${tCss.textSecondary}`}>
                            {item.lastContactDate ? (<div className="flex items-center space-x-1.5"><span>{item.lastContactDate}</span>
                              </div>) : '-'}
                          </td>

                          {/* Notes */}
                          <td className={`py-3 px-4 max-w-xs truncate text-[11px] ${tCss.textSecondary}`} title={item.notes || ''}>
                            {item.notes || '-'}
                          </td>
                        </>) : (<>
                          {/* Type (Money/Other) */}
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${item.receivedType === 'MONEY'
                        ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200')
                        : (isDarkMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-200')}`}>
                              {item.receivedType === 'MONEY' ? t('fundraising.money', 'Bani') : t('fundraising.other', 'Altele')}
                            </span>
                          </td>

                          {/* Currency */}
                          <td className={`py-3 px-4 font-mono font-semibold ${tCss.textPrimary}`}>
                            {item.receivedType === 'OTHER' ? '-' : (item.currency || 'RON')}
                          </td>

                          {/* Sum/List of what we got */}
                          <td className={`py-3 px-4 font-bold ${tCss.textPrimary}`}>
                            {item.receivedValue || '-'}
                          </td>

                          {/* Responsible Person */}
                          <td className="py-3 px-4 font-medium">
                            <div className="flex items-center space-x-1.5">
                              <User className={`w-3.5 h-3.5 ${tCss.textSecondary}`}/>
                              <span className={tCss.textPrimary}>{item.responsiblePerson || '-'}</span>
                            </div>
                          </td>

                          {/* Notes */}
                          <td className={`py-3 px-4 max-w-xs truncate text-[11px] ${tCss.textSecondary}`} title={item.notes || ''}>
                            {item.notes || '-'}
                          </td>

                          {/* Link to Contract */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            {item.contractUrl ? (<a href={item.contractUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center space-x-1 text-blue-500 hover:text-blue-400 font-semibold hover:underline cursor-pointer">
                                <span>{t('fundraising.openContract', 'Deschide Contract')}</span></a>) : (<span className={`text-[11px] italic ${tCss.textSecondary}`}>
                                {t('fundraising.noContract', 'Fără Link')}
                              </span>)}
                          </td>
                        </>)}

                      {/* Actions */}
                      {canWriteFundraising && (<td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1">
                            <button onClick={() => handleComposeToSponsor(item)} title={t('email.composeEmail', 'Compune Email')} className={`p-1.5 rounded-lg transition cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}>
                              <Mail className="w-3.5 h-3.5"/>
                            </button>

                            <button onClick={() => handleOpenEditModal(item)} title={t('fundraising.editSponsor', 'Editează Companie')} className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition cursor-pointer">
                              <Pencil className="w-3.5 h-3.5"/>
                            </button>
                            
                            <button onClick={() => setSponsorToDelete(item)} title={t('fundraising.deleteSponsor', 'Șterge Companie')} className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer">
                              <Trash2 className="w-3.5 h-3.5"/>
                            </button>
                          </div>
                        </td>)}
                    </tr>))}
                </tbody>
              </table>
            </div>
          </>)}
      </div>)}

      {/* Add / Edit Sponsor Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className={`w-full h-full sm:h-[620px] sm:max-h-[90vh] max-w-xl flex flex-col rounded-none sm:rounded-2xl border-0 sm:border shadow-2xl overflow-hidden transition-all transform scale-100 animate-in zoom-in-95 duration-150 ${modalBg}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 sm:px-6 pt-5 pb-3.5 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-base sm:text-lg tracking-tight">
                {editingSponsor ? t('fundraising.editSponsor', 'Editează Companie') : t('fundraising.addSponsor', 'Adaugă Companie')}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label={t('common.close', 'Închide')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className={`mx-5 sm:mx-6 border-b ${modalBorder}`} />

            {/* Modal Form */}
            <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-4 text-sm">
              <form id="sponsor-form" noValidate onSubmit={handleSave} className="space-y-4 text-sm">
                {/* Company Name */}
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                    {t('fundraising.form.companyName', 'Nume Companie')}
                  </label>
                  <input
                    type="text"
                    value={formData.companyName || ''}
                    onChange={(e) => {
                      setFormData({ ...formData, companyName: e.target.value });
                      if (fieldErrors.companyName) setFieldErrors(prev => ({ ...prev, companyName: '' }));
                    }}
                    placeholder={t('fundraising.form.companyNamePlaceholder', 'ex. S.C. Transilvania Tech S.R.L.')}
                    className={`w-full h-[38px] px-3 py-2 rounded-xl border text-xs outline-hidden transition ${inputBg} ${
                      fieldErrors.companyName ? inputErrorBorder : ''
                    }`}
                  />
                </div>

                {/* Company Profile */}
                <div>
                  <ManageableSelect
                    label={t('fundraising.form.companyProfile', 'Profil Companie')}
                    value={formData.companyProfile || ''}
                    onChange={(val) => setFormData({ ...formData, companyProfile: val })}
                    options={dynamicCompanyProfiles}
                    placeholder={t('fundraising.selectCompanyProfile', 'Selectează sau adaugă profil companie...')}
                    modalTitle={t('fundraising.manageCompanyProfiles', 'Gestionează Profiluri Companie')}
                    isDarkMode={isDarkMode}
                    onAddItem={handleAddCompanyProfile}
                    onRenameItem={handleRenameCompanyProfile}
                    onDeleteItem={handleDeleteCompanyProfile}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Contact Info */}
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                      {t('fundraising.form.contactInfo', 'Contact')}
                    </label>
                    <input
                      type="text"
                      value={formData.contactInfo || ''}
                      onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
                      placeholder={t('fundraising.form.contactPlaceholder', 'email@companie.ro | +40 700 000 000')}
                      className={`w-full h-[38px] px-3 py-2 rounded-xl border text-xs outline-hidden transition ${inputBg}`}
                    />
                  </div>

                  {/* Responsible Person */}
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                      {t('fundraising.form.responsiblePerson', 'Persoană Responsabilă')}
                    </label>
                    <input
                      type="text"
                      value={formData.responsiblePerson || ''}
                      onChange={(e) => setFormData({ ...formData, responsiblePerson: e.target.value })}
                      placeholder={t('fundraising.form.responsiblePlaceholder', 'Popescu Elena')}
                      className={`w-full h-[38px] px-3 py-2 rounded-xl border text-xs outline-hidden transition ${inputBg}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Status */}
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                      {t('fundraising.form.status', 'Status')}
                    </label>
                    <select
                      value={formData.status || 'PENDING'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as SponsorStatus })}
                      className={`w-full h-[38px] px-3 py-2 rounded-xl border text-xs outline-hidden transition cursor-pointer ${inputBg}`}
                    >
                      <option value="PENDING">{t('fundraising.status.PENDING', 'Neînceput')}</option>
                      <option value="CONTACTED">{t('fundraising.status.CONTACTED', 'Contactat')}</option>
                      <option value="IN_TALKS">{t('fundraising.status.IN_TALKS', 'În Negocieri')}</option>
                      <option value="CONTRACT_SIGNED">{t('fundraising.status.CONTRACT_SIGNED', 'Contract Semnat')}</option>
                      <option value="SPONSORED">{t('fundraising.status.SPONSORED', 'Sponsorizat')}</option>
                      <option value="REFUSED">{t('fundraising.status.REFUSED', 'Refuzat')}</option>
                    </select>
                  </div>

                  {/* Last Contact Date */}
                  <div>
                    <DatePicker
                      label={t('fundraising.form.lastContactDate', 'Dată Ultimul Contact')}
                      value={formData.lastContactDate || ''}
                      onChange={(val) => setFormData({ ...formData, lastContactDate: val })}
                      isDarkMode={isDarkMode}
                      clearable
                    />
                  </div>
                </div>

                {/* Sponsored fields */}
                {formData.status === 'SPONSORED' && (
                  <>
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                        {t('fundraising.form.receivedType', 'Tip Beneficiu Primit')}
                      </label>
                      <select
                        value={formData.receivedType || 'MONEY'}
                        onChange={(e) => {
                          const nextType = e.target.value as 'MONEY' | 'OTHER';
                          const shouldReset = nextType === 'MONEY' && formData.receivedValue && isNaN(Number(formData.receivedValue));
                          setFormData({
                            ...formData,
                            receivedType: nextType,
                            receivedValue: shouldReset ? '' : formData.receivedValue,
                          });
                        }}
                        className={`w-full h-[38px] px-3 py-2 rounded-xl border text-xs outline-hidden transition cursor-pointer ${inputBg}`}
                      >
                        <option value="MONEY">{t('fundraising.form.receivedMoney', 'Bani (Numerar / Transfer)')}</option>
                        <option value="OTHER">{t('fundraising.form.receivedGoods', 'Bunuri / Servicii (In-kind)')}</option>
                      </select>
                    </div>

                    {(formData.receivedType || 'MONEY') === 'MONEY' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                            {t('fundraising.form.currency', 'Valută')}
                          </label>
                          <select
                            value={formData.currency || 'RON'}
                            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                            className={`w-full h-[38px] px-3 py-2 rounded-xl border text-xs outline-hidden transition cursor-pointer ${inputBg}`}
                          >
                            {CURRENCY_OPTIONS.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                            {t('fundraising.form.amount', 'Sumă')}
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={formData.receivedValue || ''}
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => {
                              if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
                                e.preventDefault();
                              }
                            }}
                            onChange={(e) => {
                              const val = e.target.value.replace(/^0+(?=\d)/, '');
                              if (val === '' || (!isNaN(Number(val)) && Number(val) >= 0)) {
                                setFormData({ ...formData, receivedValue: val });
                              }
                            }}
                            placeholder={t('fundraising.form.amountPlaceholder', 'ex. 10000')}
                            className={`w-full h-[38px] px-3 py-2 rounded-xl border text-xs outline-hidden transition ${inputBg}`}
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                          {t('fundraising.form.goodsList', 'Listă Bunuri / Servicii')}
                        </label>
                        <textarea
                          rows={2}
                          value={formData.receivedValue || ''}
                          onChange={(e) => setFormData({ ...formData, receivedValue: e.target.value })}
                          placeholder={t('fundraising.form.goodsPlaceholder', 'ex. 10 laptopuri, 50 tricouri...')}
                          className={`w-full px-3 py-2 rounded-xl border text-xs outline-hidden transition resize-none ${inputBg}`}
                        />
                      </div>
                    )}
                  </>
                )}

                {/* Contract URL */}
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                    {t('fundraising.form.contractUrl', 'Link Contract')}
                  </label>
                  <input
                    type="url"
                    value={formData.contractUrl || ''}
                    onChange={(e) => setFormData({ ...formData, contractUrl: e.target.value })}
                    placeholder="https://drive.google.com/file/d/..."
                    className={`w-full h-[38px] px-3 py-2 rounded-xl border text-xs font-mono outline-hidden transition ${inputBg}`}
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                    {t('fundraising.form.notes', 'Notițe & Detalii')}
                  </label>
                  <textarea
                    rows={2}
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder={t('fundraising.form.notesPlaceholder', 'Pachet Gold 10,000 EUR. Următoarea discuție stabilită pentru marțea viitoare...')}
                    className={`w-full px-3 py-2 rounded-xl border text-xs outline-hidden transition resize-none ${inputBg}`}
                  />
                </div>
              </form>
            </div>

            <div className={`mx-5 sm:mx-6 border-t ${modalBorder}`} />

            {/* Footer */}
            <div className="px-5 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
              <div className="min-w-0 pr-3">
                {fieldErrors.companyName && (
                  <p className="text-xs text-rose-400 font-medium truncate">
                    {t('common.fillRequiredFields', 'Completați câmpurile obligatorii marcate.')}
                  </p>
                )}
              </div>
              <button
                type="submit"
                form="sponsor-form"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center space-x-2 shrink-0"
              >
                <span>{t('general.save', 'Salvează')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Sponsor Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!sponsorToDelete}
        onClose={() => setSponsorToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={t('fundraising.deleteSponsor', 'Șterge Companie')}
        message={t('fundraising.deleteConfirm', 'Sigur doriți să ștergeți această companie?')}
        isDarkMode={isDarkMode}
      />

      {/* Email Composer Modal for direct sponsor emailing */}
      {isComposerOpen && (
        <EmailComposerModal
          isOpen={isComposerOpen}
          onClose={() => {
            setIsComposerOpen(false);
            setComposerSponsor(null);
          }}
          initialRecipientEmail={composerSponsor?.email}
          initialRecipientName={composerSponsor?.name}
          initialMergeData={composerSponsor?.mergeData}
          onSuccess={() => {
            showToast(t('email.sendSuccess', 'Email trimis cu succes'));
          }}
          isDarkMode={isDarkMode}
        />
      )}
    </DashboardContainer>);
};
