import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ActiveFinanceTab, FinanceExpense, FinanceOnlineDonation, FinanceStand, FinanceSponsorship, FinanceOtherIncome, FinancialStats, } from '../../types/finance';
import { financeService } from '../../services/financeService';
import { AddExpenseModal } from './AddExpenseModal';
import { SubmitStandEoDModal } from './SubmitStandEoDModal';
import { AddOtherIncomeModal } from './AddOtherIncomeModal';
import { EditSponsorshipModal } from './EditSponsorshipModal';
import { FinanceStatisticsView } from './FinanceStatisticsView';
import { DashboardContainer, SubTabNav, SearchInput, FilterPopover, DashboardHeaderSection, ToastNotification, ConfirmationModal, CustomSelect } from '../common';
import { Pencil, Trash2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { usePermission } from '../../hooks/usePermission';
interface FinanceDashboardProps {
    isDarkMode: boolean;
}

const FINANCE_TAB_PERMISSIONS: Record<ActiveFinanceTab, string[]> = {
    'expenses': ['finance:expenses:read', 'finance:expenses:view'],
    'online-donations': ['finance:donations:read', 'finance:onlinedonations:view'],
    'stands': ['finance:stands:read', 'finance:stands:view'],
    'sponsorships': ['finance:sponsorships:read', 'finance:sponsorships:view'],
    'other-incomes': ['finance:other_incomes:read', 'finance:otherincomes:view'],
    'statistics': ['finance:statistics:read', 'finance:statistics:view'],
};

const VALID_FINANCE_SUB_TABS: ActiveFinanceTab[] = ['expenses', 'online-donations', 'stands', 'sponsorships', 'other-incomes', 'statistics'];

export const FinanceDashboard: React.FC<FinanceDashboardProps> = ({ isDarkMode }) => {
    const { t } = useLanguage();
    const { hasPermission, isSuperAdmin } = usePermission();

    const isTabAccessible = useCallback((tabId: ActiveFinanceTab): boolean => {
        if (isSuperAdmin) return true;
        const codes = FINANCE_TAB_PERMISSIONS[tabId];
        return codes ? codes.some(code => hasPermission(code)) : true;
    }, [isSuperAdmin, hasPermission]);

    const canWriteFinance = isSuperAdmin || hasPermission('finance:expenses:write') || hasPermission('finance:expense:write') || hasPermission('finance:write');
    const canHandoverStand = isSuperAdmin || hasPermission('finance:stands:eod:write') || hasPermission('finance:stand:handover') || hasPermission('finance:write');
    const canReimburseExpense = isSuperAdmin || hasPermission('finance:expenses:reimburse:approve') || hasPermission('finance:expense:reimburse') || hasPermission('finance:expenses:write') || hasPermission('finance:expense:write') || hasPermission('finance:write');
    const [searchParams, setSearchParams] = useSearchParams();
    const rawSubTab = searchParams.get('subtab');
    const accessibleTabs = VALID_FINANCE_SUB_TABS.filter(tab => isTabAccessible(tab));
    const requestedSubTab: ActiveFinanceTab = (rawSubTab && VALID_FINANCE_SUB_TABS.includes(rawSubTab as ActiveFinanceTab))
        ? (rawSubTab as ActiveFinanceTab)
        : 'expenses';
    const activeSubTab: ActiveFinanceTab = isTabAccessible(requestedSubTab) ? requestedSubTab : (accessibleTabs[0] || 'expenses');

    const setActiveSubTab = useCallback((newSubTab: ActiveFinanceTab) => {
        if (!isTabAccessible(newSubTab)) return;
        setSearchParams(prev => ({ ...Object.fromEntries(prev.entries()), subtab: newSubTab }));
    }, [isTabAccessible, setSearchParams]);

    useEffect(() => {
        if (rawSubTab && !isTabAccessible(rawSubTab as ActiveFinanceTab)) {
            setActiveSubTab(activeSubTab);
        }
    }, [rawSubTab, activeSubTab, isTabAccessible, setActiveSubTab]);
    const searchTerm = searchParams.get('search') || '';
    const setSearchTerm = (term: string) => {
        const nextParams = { ...Object.fromEntries(searchParams.entries()) };
        if (term)
            nextParams.search = term;
        else
            delete nextParams.search;
        setSearchParams(nextParams);
    };
    const campaignFilter = searchParams.get('campaign') || 'ALL';
    const setCampaignFilter = (camp: string) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (camp && camp !== 'ALL')
                next.set('campaign', camp);
            else
                next.delete('campaign');
            return next;
        }, { replace: true });
    };
    const categoryFilter = searchParams.get('category') || 'ALL';
    const setCategoryFilter = (cat: string) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (cat && cat !== 'ALL')
                next.set('category', cat);
            else
                next.delete('category');
            return next;
        }, { replace: true });
    };
    const paymentMethodFilter = searchParams.get('payMethod') || 'ALL';
    const setPaymentMethodFilter = (pm: string) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (pm && pm !== 'ALL')
                next.set('payMethod', pm);
            else
                next.delete('payMethod');
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
    const standStatusFilter = searchParams.get('standStatus') || 'ALL';
    const setStandStatusFilter = (status: string) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (status && status !== 'ALL')
                next.set('standStatus', status);
            else
                next.delete('standStatus');
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
    // Data States
    const [expenses, setExpenses] = useState<FinanceExpense[]>([]);
    const [onlineDonations, setOnlineDonations] = useState<FinanceOnlineDonation[]>([]);
    const [stands, setStands] = useState<FinanceStand[]>([]);
    const [sponsorships, setSponsorships] = useState<FinanceSponsorship[]>([]);
    const [otherIncomes, setOtherIncomes] = useState<FinanceOtherIncome[]>([]);
    const [stats, setStats] = useState<FinancialStats | null>(null);
    // Modal States
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isStandModalOpen, setIsStandModalOpen] = useState(false);
    const [isOtherIncomeModalOpen, setIsOtherIncomeModalOpen] = useState(false);
    // Toast
    const [toastMessage, setToastMessage] = useState<{
        text: string;
        type: 'success' | 'error';
    } | null>(null);
    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        setToastMessage({ text, type });
    };
    // Custom Expense Categories
    const [customExpenseCategories, setCustomExpenseCategories] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('app_expense_categories');
            if (saved !== null) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed))
                    return parsed;
            }
        }
        catch { }
        return [];
    });
    const handleAddCustomCategory = (cat: string) => {
        const trimmed = cat.trim();
        if (!trimmed)
            return;
        setCustomExpenseCategories(prev => {
            if (prev.includes(trimmed))
                return prev;
            const updated = [...prev, trimmed];
            try {
                localStorage.setItem('app_expense_categories', JSON.stringify(updated));
            }
            catch (err) {
                console.error(err);
            }
            return updated;
        });
    };
    const handleRenameCustomCategory = (oldCat: string, newCat: string) => {
        const trimmed = newCat.trim();
        if (!trimmed || trimmed === oldCat)
            return;
        setCustomExpenseCategories(prev => {
            const updated = prev.map(c => c === oldCat ? trimmed : c);
            try {
                localStorage.setItem('app_expense_categories', JSON.stringify(updated));
            }
            catch (err) {
                console.error(err);
            }
            return updated;
        });
    };
    const handleDeleteCustomCategory = (cat: string) => {
        setCustomExpenseCategories(prev => {
            const updated = prev.filter(c => c !== cat);
            try {
                localStorage.setItem('app_expense_categories', JSON.stringify(updated));
            }
            catch (err) {
                console.error(err);
            }
            return updated;
        });
    };
    // Custom Other Income Categories
    const [customOtherIncomeCategories, setCustomOtherIncomeCategories] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('app_other_income_categories');
            if (saved !== null) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed))
                    return parsed;
            }
        }
        catch { }
        return [];
    });
    const handleAddOtherIncomeCategory = (cat: string) => {
        const trimmed = cat.trim();
        if (!trimmed)
            return;
        setCustomOtherIncomeCategories(prev => {
            if (prev.includes(trimmed))
                return prev;
            const updated = [...prev, trimmed];
            try {
                localStorage.setItem('app_other_income_categories', JSON.stringify(updated));
            }
            catch (err) {
                console.error(err);
            }
            return updated;
        });
    };
    const handleRenameOtherIncomeCategory = (oldCat: string, newCat: string) => {
        const trimmed = newCat.trim();
        if (!trimmed || trimmed === oldCat)
            return;
        setCustomOtherIncomeCategories(prev => {
            const updated = prev.map(c => c === oldCat ? trimmed : c);
            try {
                localStorage.setItem('app_other_income_categories', JSON.stringify(updated));
            }
            catch (err) {
                console.error(err);
            }
            return updated;
        });
    };
    const handleDeleteOtherIncomeCategory = (cat: string) => {
        setCustomOtherIncomeCategories(prev => {
            const updated = prev.filter(c => c !== cat);
            try {
                localStorage.setItem('app_other_income_categories', JSON.stringify(updated));
            }
            catch (err) {
                console.error(err);
            }
            return updated;
        });
    };
    // Custom POS Devices
    const [customPosDevices, setCustomPosDevices] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('app_finance_pos_devices');
            if (saved !== null) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed))
                    return parsed;
            }
        }
        catch { }
        return [];
    });
    const handleAddCustomPosDevice = (posName: string) => {
        const trimmed = posName.trim();
        if (!trimmed)
            return;
        setCustomPosDevices(prev => {
            if (prev.includes(trimmed))
                return prev;
            const updated = [...prev, trimmed];
            try {
                localStorage.setItem('app_finance_pos_devices', JSON.stringify(updated));
            }
            catch (err) {
                console.error(err);
            }
            return updated;
        });
    };
    const handleRenameCustomPosDevice = (oldName: string, newName: string) => {
        const trimmed = newName.trim();
        if (!trimmed || trimmed === oldName)
            return;
        setCustomPosDevices(prev => {
            const updated = prev.map(p => p === oldName ? trimmed : p);
            try {
                localStorage.setItem('app_finance_pos_devices', JSON.stringify(updated));
            }
            catch (err) {
                console.error(err);
            }
            return updated;
        });
    };
    const handleDeleteCustomPosDevice = (posName: string) => {
        setCustomPosDevices(prev => {
            const updated = prev.filter(p => p !== posName);
            try {
                localStorage.setItem('app_finance_pos_devices', JSON.stringify(updated));
            }
            catch (err) {
                console.error(err);
            }
            return updated;
        });
    };
    // Edit States
    const [editingExpense, setEditingExpense] = useState<FinanceExpense | null>(null);
    const [editingStand, setEditingStand] = useState<FinanceStand | null>(null);
    const [editingSponsorship, setEditingSponsorship] = useState<FinanceSponsorship | null>(null);
    const [editingOtherIncome, setEditingOtherIncome] = useState<FinanceOtherIncome | null>(null);
    const loadAllData = useCallback(async () => {
        if (activeSubTab === 'expenses') {
            const [expRes, stRes] = await Promise.allSettled([
                financeService.getExpenses(),
                financeService.getStats(),
            ]);
            if (expRes.status === 'fulfilled') setExpenses(expRes.value);
            if (stRes.status === 'fulfilled') setStats(stRes.value);
        } else if (activeSubTab === 'stands') {
            const [stdRes, stRes] = await Promise.allSettled([
                financeService.getStands(),
                financeService.getStats(),
            ]);
            if (stdRes.status === 'fulfilled') setStands(stdRes.value);
            if (stRes.status === 'fulfilled') setStats(stRes.value);
        } else if (activeSubTab === 'online-donations') {
            const [donRes, stRes] = await Promise.allSettled([
                financeService.getOnlineDonations(),
                financeService.getStats(),
            ]);
            if (donRes.status === 'fulfilled') setOnlineDonations(donRes.value);
            if (stRes.status === 'fulfilled') setStats(stRes.value);
        } else if (activeSubTab === 'sponsorships') {
            const [spRes, stRes] = await Promise.allSettled([
                financeService.getSponsorships(),
                financeService.getStats(),
            ]);
            if (spRes.status === 'fulfilled') setSponsorships(spRes.value);
            if (stRes.status === 'fulfilled') setStats(stRes.value);
        } else if (activeSubTab === 'other-incomes') {
            const [incRes, stRes] = await Promise.allSettled([
                financeService.getOtherIncomes(),
                financeService.getStats(),
            ]);
            if (incRes.status === 'fulfilled') setOtherIncomes(incRes.value);
            if (stRes.status === 'fulfilled') setStats(stRes.value);
        } else {
            const [expRes, donRes, stdRes, spRes, incRes, stRes] = await Promise.allSettled([
                financeService.getExpenses(),
                financeService.getOnlineDonations(),
                financeService.getStands(),
                financeService.getSponsorships(),
                financeService.getOtherIncomes(),
                financeService.getStats(),
            ]);
            if (expRes.status === 'fulfilled') setExpenses(expRes.value);
            if (donRes.status === 'fulfilled') setOnlineDonations(donRes.value);
            if (stdRes.status === 'fulfilled') setStands(stdRes.value);
            if (spRes.status === 'fulfilled') setSponsorships(spRes.value);
            if (incRes.status === 'fulfilled') setOtherIncomes(incRes.value);
            if (stRes.status === 'fulfilled') setStats(stRes.value);
        }
    }, [activeSubTab]);

    useEffect(() => {
        loadAllData();
    }, [loadAllData]);
    const handleSaveExpense = async (data: Omit<FinanceExpense, 'id' | 'createdAt'>) => {
        try {
            if (editingExpense) {
                await financeService.updateExpense(editingExpense.id, data);
                setEditingExpense(null);
                showToast(t('finance.expenseUpdated', 'Cheltuiala a fost actualizată cu succes.'));
            }
            else {
                await financeService.addExpense(data);
                setIsExpenseModalOpen(false);
                showToast(t('finance.expenseAdded', 'Cheltuiala a fost adăugată cu succes.'));
            }
            await loadAllData();
        }
        catch (err: any) {
            console.error('Error saving expense:', err);
            showToast(err?.message || t('finance.expenseError', 'Eroare la salvarea cheltuielii.'), 'error');
            throw err;
        }
    };
    // Confirmation Modal State
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title?: string;
        message: string;
        onConfirm: () => Promise<void> | void;
    }>({
        isOpen: false,
        message: '',
        onConfirm: () => { },
    });
    const handleDeleteExpense = (id: string) => {
        setConfirmDialog({
            isOpen: true,
            title: t('finance.deleteExpenseTitle', 'Șterge Cheltuială'),
            message: t('finance.confirmDeleteExpense', 'Sigur doriți să ștergeți această cheltuială?'),
            onConfirm: async () => {
                try {
                    await financeService.deleteExpense(id);
                    showToast(t('finance.expenseDeleted', 'Cheltuiala a fost ștearsă.'));
                    await loadAllData();
                }
                catch (err: any) {
                    console.error('Error deleting expense:', err);
                    showToast(err?.message || 'Eroare la ștergerea cheltuielii', 'error');
                }
                finally {
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                }
            },
        });
    };
    const handleToggleReimbursement = async (expense: FinanceExpense) => {
        if (!canReimburseExpense) return;
        const isCurrentlyReimbursed = (expense.paymentMethod || '').toLowerCase() === 'reimbursed';
        const newPaymentMethod = isCurrentlyReimbursed ? 'Reimbursement' : 'Reimbursed';
        try {
            await financeService.updateExpense(expense.id, { ...expense, paymentMethod: newPaymentMethod });
            setExpenses(prev => prev.map(e => e.id === expense.id ? { ...e, paymentMethod: newPaymentMethod } : e));
            showToast(newPaymentMethod === 'Reimbursed' ? t('finance.markedReimbursed', 'Cheltuială marcată ca decontată.') : t('finance.markedNotReimbursed', 'Cheltuială marcată ca nedecontată.'));
        } catch (err: any) {
            console.error('Error toggling reimbursement:', err);
            showToast(err?.message || 'Eroare la actualizarea decontării', 'error');
        }
    };
    const handleSaveStand = async (data: Omit<FinanceStand, 'id' | 'createdAt'>) => {
        try {
            if (editingStand) {
                await financeService.updateStand(editingStand.id, data);
                setEditingStand(null);
                showToast(t('finance.standUpdated', 'Raportul de stand a fost actualizat.'));
            }
            else {
                await financeService.submitStandEoD(data);
                setIsStandModalOpen(false);
                showToast(t('finance.standAdded', 'Raportul de stand a fost trimis cu succes.'));
            }
            await loadAllData();
        }
        catch (err: any) {
            console.error('Error saving stand:', err);
            showToast(err?.message || 'Eroare la salvarea raportului de stand', 'error');
            throw err;
        }
    };
    const handleDeleteStand = (id: string, location?: string) => {
        setConfirmDialog({
            isOpen: true,
            title: t('finance.deleteStandTitle', 'Șterge Raport Stand'),
            message: t('finance.confirmDeleteStand', 'Sigur doriți să ștergeți acest raport de stand?'),
            onConfirm: async () => {
                try {
                    await financeService.deleteStand(id, location);
                    showToast(t('finance.standDeleted', 'Raportul de stand a fost șters.'));
                    await loadAllData();
                }
                catch (err: any) {
                    console.error('Error deleting stand:', err);
                    showToast(err?.message || 'Eroare la ștergerea raportului de stand', 'error');
                }
                finally {
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                }
            },
        });
    };
    const handleToggleStandHanded = async (stand: FinanceStand) => {
        if (!canHandoverStand) return;
        const newStatus = stand.status === 'HANDED' ? 'NOT_HANDED' : 'HANDED';
        try {
            await financeService.updateStand(stand.id, { ...stand, status: newStatus });
            setStands(prev => prev.map(s => s.id === stand.id ? { ...s, status: newStatus } : s));
            showToast(newStatus === 'HANDED' ? t('finance.markedHanded', 'Stand marcat ca predat.') : t('finance.markedNotHanded', 'Stand marcat ca nepredat.'));
        } catch (err: any) {
            console.error('Error toggling stand handed status:', err);
            showToast(err?.message || 'Eroare la actualizarea statusului', 'error');
        }
    };
    const handleSaveSponsorship = async (data: Partial<FinanceSponsorship>) => {
        try {
            if (editingSponsorship) {
                await financeService.updateSponsorship(editingSponsorship.id, data);
                setEditingSponsorship(null);
                showToast(t('finance.sponsorshipUpdated', 'Sponsorizarea a fost actualizată.'));
                await loadAllData();
            }
        }
        catch (err: any) {
            console.error('Error saving sponsorship:', err);
            showToast(err?.message || 'Eroare la salvarea sponsorizării', 'error');
            throw err;
        }
    };
    const handleDeleteSponsorship = (id: string) => {
        setConfirmDialog({
            isOpen: true,
            title: t('finance.deleteSponsorshipTitle', 'Șterge Sponsorizare'),
            message: t('finance.confirmDeleteSponsorship', 'Sigur doriți să ștergeți această sponsorizare?'),
            onConfirm: async () => {
                try {
                    await financeService.deleteSponsorship(id);
                    showToast(t('finance.sponsorshipDeleted', 'Sponsorizarea a fost ștearsă.'));
                    await loadAllData();
                }
                catch (err: any) {
                    console.error('Error deleting sponsorship:', err);
                    showToast(err?.message || 'Eroare la ștergerea sponsorizării', 'error');
                }
                finally {
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                }
            },
        });
    };
    const handleSaveOtherIncome = async (data: Omit<FinanceOtherIncome, 'id' | 'createdAt'>) => {
        try {
            if (editingOtherIncome) {
                await financeService.updateOtherIncome(editingOtherIncome.id, data);
                setEditingOtherIncome(null);
                showToast(t('finance.incomeUpdated', 'Încasarea a fost actualizată.'));
            }
            else {
                await financeService.addOtherIncome(data);
                setIsOtherIncomeModalOpen(false);
                showToast(t('finance.incomeAdded', 'Încasarea a fost adăugată cu succes.'));
            }
            await loadAllData();
        }
        catch (err: any) {
            console.error('Error saving other income:', err);
            showToast(err?.message || 'Eroare la salvarea încasării', 'error');
            throw err;
        }
    };
    const handleDeleteOtherIncome = (id: string) => {
        setConfirmDialog({
            isOpen: true,
            title: t('finance.deleteIncomeTitle', 'Șterge Încasare'),
            message: t('finance.confirmDeleteIncome', 'Sigur doriți să ștergeți această încasare?'),
            onConfirm: async () => {
                try {
                    await financeService.deleteOtherIncome(id);
                    showToast(t('finance.incomeDeleted', 'Încasarea a fost ștearsă.'));
                    await loadAllData();
                }
                catch (err: any) {
                    console.error('Error deleting other income:', err);
                    showToast(err?.message || 'Eroare la ștergerea încasării', 'error');
                }
                finally {
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                }
            },
        });
    };
    const bgCard = isDarkMode ? 'bg-zinc-950 border-zinc-850' : 'bg-white border-zinc-200 shadow-xs';
    const tableHeader = isDarkMode ? 'bg-zinc-900/60 text-zinc-400 border-zinc-850' : 'bg-zinc-100/90 text-zinc-600 border-zinc-200';
    const tableRowHover = isDarkMode ? 'hover:bg-zinc-900/40 border-zinc-850' : 'hover:bg-zinc-50 border-zinc-200';
    const textTitle = isDarkMode ? 'text-zinc-100' : 'text-zinc-900';
    const textSub = isDarkMode ? 'text-zinc-400' : 'text-zinc-500';
    const textValue = isDarkMode ? 'text-zinc-300' : 'text-zinc-700';
    const divideLine = isDarkMode ? 'divide-zinc-800/40' : 'divide-zinc-200';
    const cardDivide = isDarkMode ? 'divide-zinc-850' : 'divide-zinc-200';
    const cardInnerDivider = isDarkMode ? 'border-zinc-800/60' : 'border-zinc-100';
    // Computed filtered arrays
    const filteredExpenses = expenses.filter(e => {
        const matchCat = categoryFilter === 'ALL' || (e.category || '').toLowerCase() === categoryFilter.toLowerCase();
        let matchPay = paymentMethodFilter === 'ALL';
        if (!matchPay) {
            const lowerFilter = paymentMethodFilter.toLowerCase();
            const lowerPm = (e.paymentMethod || '').toLowerCase();
            if (lowerFilter === 'reimbursement') {
                matchPay = lowerPm.includes('reimburse') || lowerPm.includes('decont');
            } else if (lowerFilter === 'reimbursed') {
                matchPay = lowerPm === 'reimbursed';
            } else if (lowerFilter === 'not reimbursed' || lowerFilter === 'not_reimbursed') {
                matchPay = lowerPm === 'reimbursement' || (lowerPm.includes('decont') && lowerPm !== 'reimbursed');
            } else {
                matchPay = lowerPm === lowerFilter;
            }
        }
        const matchCurr = currencyFilter === 'ALL' || e.currency === currencyFilter;
        const matchMin = !minAmount || (e.amount ?? 0) >= parseFloat(minAmount);
        const matchMax = !maxAmount || (e.amount ?? 0) <= parseFloat(maxAmount);
        const matchSearch = !searchTerm ||
            (e.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (e.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (e.category || '').toLowerCase().includes(searchTerm.toLowerCase());
        return matchCat && matchPay && matchCurr && matchMin && matchMax && matchSearch;
    });
    const filteredOnlineDonations = onlineDonations.filter(d => {
        const matchCurr = currencyFilter === 'ALL' || d.currency === currencyFilter;
        const matchMin = !minAmount || (d.amount ?? 0) >= parseFloat(minAmount);
        const matchMax = !maxAmount || (d.amount ?? 0) <= parseFloat(maxAmount);
        const matchSearch = !searchTerm || (d.donorName || '').toLowerCase().includes(searchTerm.toLowerCase()) || (d.donorEmail && d.donorEmail.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchCurr && matchMin && matchMax && matchSearch;
    });
    const filteredStands = stands.filter(s => {
        const totalCollected = (s.cashCollected ?? 0) + (s.posCardCollected ?? 0);
        const matchMin = !minAmount || totalCollected >= parseFloat(minAmount);
        const matchMax = !maxAmount || totalCollected <= parseFloat(maxAmount);
        const matchSearch = !searchTerm || (s.standLocation || '').toLowerCase().includes(searchTerm.toLowerCase()) || (s.financeResponsibleName || '').toLowerCase().includes(searchTerm.toLowerCase());
        const isHanded = s.status === 'HANDED';
        const matchStatus = standStatusFilter === 'ALL' ||
            (standStatusFilter === 'HANDED' && isHanded) ||
            (standStatusFilter === 'NOT_HANDED' && !isHanded);
        return matchMin && matchMax && matchSearch && matchStatus;
    });
    const filteredSponsorships = sponsorships.filter(sp => {
        const matchCamp = campaignFilter === 'ALL' || sp.campaign === campaignFilter;
        const matchCurr = currencyFilter === 'ALL' || sp.currency === currencyFilter;
        const matchMin = !minAmount || (sp.agreedAmount ?? 0) >= parseFloat(minAmount);
        const matchMax = !maxAmount || (sp.agreedAmount ?? 0) <= parseFloat(maxAmount);
        const matchSearch = !searchTerm || (sp.sponsorName || '').toLowerCase().includes(searchTerm.toLowerCase()) || (sp.contactPerson && sp.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchCamp && matchCurr && matchMin && matchMax && matchSearch;
    });
    const filteredOtherIncomes = otherIncomes.filter(inc => {
        const matchCat = categoryFilter === 'ALL' || (inc.category || '').toLowerCase() === categoryFilter.toLowerCase();
        const matchCurr = currencyFilter === 'ALL' || inc.currency === currencyFilter;
        const matchMin = !minAmount || (inc.amount ?? 0) >= parseFloat(minAmount);
        const matchMax = !maxAmount || (inc.amount ?? 0) <= parseFloat(maxAmount);
        const matchSearch = !searchTerm || (inc.sourcePayer || '').toLowerCase().includes(searchTerm.toLowerCase()) || (inc.description || '').toLowerCase().includes(searchTerm.toLowerCase());
        return matchCat && matchCurr && matchMin && matchMax && matchSearch;
    });
    // Dynamically derived filter options from real live data
    const dynamicCampaigns = useMemo(() => {
        const set = new Set<string>();
        sponsorships.forEach(s => s.campaign && set.add(s.campaign));
        return Array.from(set).sort();
    }, [sponsorships]);
    const dynamicCategories = useMemo(() => {
        const set = new Set<string>(customExpenseCategories);
        expenses.forEach(e => e.category && set.add(e.category));
        return Array.from(set).sort();
    }, [expenses, customExpenseCategories]);
    const dynamicOtherIncomeCategories = useMemo(() => {
        const set = new Set<string>(customOtherIncomeCategories);
        otherIncomes.forEach(i => i.category && set.add(i.category));
        return Array.from(set).sort();
    }, [otherIncomes, customOtherIncomeCategories]);
    const dynamicPaymentMethods = useMemo(() => {
        const set = new Set<string>();
        let hasReimbursement = false;
        expenses.forEach(e => {
            if (e.paymentMethod) {
                const lower = e.paymentMethod.toLowerCase();
                if (lower === 'reimbursement' || lower === 'reimbursed' || lower.includes('decont')) {
                    hasReimbursement = true;
                } else {
                    set.add(e.paymentMethod);
                }
            }
        });
        const list = Array.from(set).sort();
        if (hasReimbursement) {
            list.push('Reimbursement', 'Reimbursed', 'Not Reimbursed');
        }
        return list;
    }, [expenses]);
    const dynamicCurrencies = useMemo(() => {
        const set = new Set<string>(['RON']);
        expenses.forEach(e => e.currency && set.add(e.currency));
        onlineDonations.forEach(d => d.currency && set.add(d.currency));
        sponsorships.forEach(s => s.currency && set.add(s.currency));
        otherIncomes.forEach(i => i.currency && set.add(i.currency));
        return Array.from(set).sort();
    }, [expenses, onlineDonations, sponsorships, otherIncomes]);
    const activeFinanceFilterCount = (activeSubTab === 'sponsorships' && campaignFilter !== 'ALL' ? 1 : 0) +
        ((activeSubTab === 'expenses' || activeSubTab === 'other-incomes') && categoryFilter !== 'ALL' ? 1 : 0) +
        (activeSubTab === 'expenses' && paymentMethodFilter !== 'ALL' ? 1 : 0) +
        (activeSubTab === 'stands' && standStatusFilter !== 'ALL' ? 1 : 0) +
        (currencyFilter !== 'ALL' ? 1 : 0) +
        (minAmount ? 1 : 0) +
        (maxAmount ? 1 : 0);
    const resetFinanceFilters = () => {
        setCampaignFilter('ALL');
        setCategoryFilter('ALL');
        setPaymentMethodFilter('ALL');
        setCurrencyFilter('ALL');
        setStandStatusFilter('ALL');
        setMinAmount('');
        setMaxAmount('');
    };
    return (<DashboardContainer noScroll className="text-left">
      {/* Toast Notification */}
      <ToastNotification toast={toastMessage} onClose={() => setToastMessage(null)}/>
      
      {/* Unified Dashboard Sub-Header + Filter & Action Controls */}
      <DashboardHeaderSection isDarkMode={isDarkMode} activeTabLabel={activeSubTab === 'expenses' ? t('finance.tabExpenses', 'Cheltuieli') :
            activeSubTab === 'online-donations' ? t('finance.tabOnlineDonations', 'Donații Online') :
                activeSubTab === 'stands' ? t('finance.tabStands', 'Încasări Standuri') :
                    activeSubTab === 'sponsorships' ? t('finance.tabSponsorships', 'Sponsorizări') :
                        activeSubTab === 'other-incomes' ? t('finance.tabOtherIncomes', 'Alte Încasări') :
                            t('finance.tabStatistics', 'Statistici')} activeFilterCount={activeFinanceFilterCount} searchQuery={searchTerm} subTabNav={<SubTabNav<ActiveFinanceTab> tabs={[
                { id: 'expenses', label: t('finance.tabExpenses', 'Cheltuieli'), disabled: !isTabAccessible('expenses') },
                { id: 'online-donations', label: t('finance.tabOnlineDonations', 'Donații Online'), disabled: !isTabAccessible('online-donations') },
                { id: 'stands', label: t('finance.tabStands', 'Încasări Standuri'), disabled: !isTabAccessible('stands') },
                { id: 'sponsorships', label: t('finance.tabSponsorships', 'Sponsorizări'), disabled: !isTabAccessible('sponsorships') },
                { id: 'other-incomes', label: t('finance.tabOtherIncomes', 'Alte Încasări'), disabled: !isTabAccessible('other-incomes') },
                { id: 'statistics', label: t('finance.tabStatistics', 'Statistici'), disabled: !isTabAccessible('statistics') },
            ]} activeTab={activeSubTab} onChange={(tabId) => setActiveSubTab(tabId)} isDarkMode={isDarkMode}/>} controls={activeSubTab !== 'statistics' ? (<>
              <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder={t('finance.searchPlaceholder', 'Caută...')} isDarkMode={isDarkMode}/>
<div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0">
                <FilterPopover activeCount={activeFinanceFilterCount} onReset={resetFinanceFilters} isDarkMode={isDarkMode}>
                  <div className="space-y-3">
                    {/* Stand Status (only for stands) */}
                    {activeSubTab === 'stands' && (
                      <CustomSelect
                        label={t('table.status', 'Status')}
                        value={standStatusFilter}
                        onChange={(val) => setStandStatusFilter(val)}
                        options={[
                          { value: 'ALL', label: t('common.all', 'Toate') },
                          { value: 'HANDED', label: t('finance.handed', 'Predat') },
                          { value: 'NOT_HANDED', label: t('finance.notHanded', 'Nepredat') },
                        ]}
                        isDarkMode={isDarkMode}
                      />
                    )}

                    {/* Campaign / Department (only for sponsorships) */}
                    {activeSubTab === 'sponsorships' && dynamicCampaigns.length > 0 && (<CustomSelect label={t('finance.campaignOrDept', 'Campanie / Departament')} value={campaignFilter} onChange={(val) => setCampaignFilter(val)} options={[
                    { value: 'ALL', label: t('finance.allCampaigns', 'Toate Campaniile') },
                    ...dynamicCampaigns.map(c => ({ value: c, label: c })),
                ]} isDarkMode={isDarkMode}/>)}

                    {/* Category (for expenses) */}
                    {activeSubTab === 'expenses' && (<CustomSelect label={t('table.category', 'Categorie')} value={categoryFilter} onChange={(val) => setCategoryFilter(val)} options={[
                    { value: 'ALL', label: t('table.allCategories', 'Toate Categoriile') },
                    ...dynamicCategories.map(c => ({ value: c, label: c })),
                ]} isDarkMode={isDarkMode}/>)}

                    {/* Category (for other incomes) */}
                    {activeSubTab === 'other-incomes' && (<CustomSelect label={t('table.category', 'Categorie')} value={categoryFilter} onChange={(val) => setCategoryFilter(val)} options={[
                    { value: 'ALL', label: t('table.allCategories', 'Toate Categoriile') },
                    ...dynamicOtherIncomeCategories.map(c => ({ value: c, label: c })),
                ]} isDarkMode={isDarkMode}/>)}

                    {/* Payment Method (for expenses) */}
                    {activeSubTab === 'expenses' && dynamicPaymentMethods.length > 0 && (<CustomSelect label={t('table.paymentMethod', 'Metodă Plată')} value={paymentMethodFilter} onChange={(val) => setPaymentMethodFilter(val)} options={[
                    { value: 'ALL', label: t('table.allPaymentMethods', 'Toate Metodele') },
                    ...dynamicPaymentMethods.map(pm => ({
                      value: pm,
                      label: pm === 'Reimbursement'
                        ? t('finance.reimbursement', 'Decontare Personală')
                        : pm === 'Reimbursed'
                          ? `${t('finance.reimbursement', 'Decontare')} (${t('finance.reimbursed', 'Decontat')})`
                          : pm === 'Not Reimbursed'
                            ? `${t('finance.reimbursement', 'Decontare')} (${t('finance.notReimbursed', 'Nedecontat')})`
                            : pm
                    })),
                ]} isDarkMode={isDarkMode}/>)}

                    {/* Currency Filter */}
                    {(activeSubTab === 'expenses' || activeSubTab === 'online-donations' || activeSubTab === 'sponsorships' || activeSubTab === 'other-incomes') && dynamicCurrencies.length > 0 && (<CustomSelect label={t('finance.currency', 'Monedă')} value={currencyFilter} onChange={(val) => setCurrencyFilter(val)} options={[
                    { value: 'ALL', label: t('finance.allCurrencies', 'Toate Monedele') },
                    ...dynamicCurrencies.map(c => ({ value: c, label: c })),
                ]} isDarkMode={isDarkMode}/>)}

                    {/* Amount Range Min/Max */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                        {t('finance.amountRange', 'Interval Sumă')}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" placeholder="Min" value={minAmount} onFocus={(e) => e.target.select()} onChange={(e) => setMinAmount(e.target.value.replace(/^0+(?=\d)/, ''))} className={`px-3 py-1.5 text-xs rounded-xl border outline-hidden ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'}`}/>
                        <input type="number" placeholder="Max" value={maxAmount} onFocus={(e) => e.target.select()} onChange={(e) => setMaxAmount(e.target.value.replace(/^0+(?=\d)/, ''))} className={`px-3 py-1.5 text-xs rounded-xl border outline-hidden ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'}`}/>
                      </div>
                    </div>
                  </div>
                </FilterPopover>

                {activeSubTab === 'expenses' && canWriteFinance && (<button onClick={() => setIsExpenseModalOpen(true)} className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer shrink-0">
                    <span>{t('finance.addExpense', 'Adaugă Cheltuială')}</span>
                  </button>)}

                {activeSubTab === 'stands' && canWriteFinance && (<button onClick={() => setIsStandModalOpen(true)} className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer shrink-0">
                    <span>{t('finance.submitEoD', 'Raport Stand (EoD)')}</span>
                  </button>)}

                {activeSubTab === 'other-incomes' && canWriteFinance && (<button onClick={() => setIsOtherIncomeModalOpen(true)} className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer shrink-0">
                    <span>{t('finance.addIncome', 'Adaugă Încasare')}</span>
                  </button>)}
              </div>
            </>) : undefined}/>

      {/* ----------------- TAB 1: EXPENSES SHEET ----------------- */}
      {activeSubTab === 'expenses' && (<div className={`flex-1 min-h-0 flex flex-col rounded-2xl border overflow-hidden ${bgCard}`}>
          {/* Mobile Card List View with explicit field headers */}
          <div className={`block md:hidden divide-y ${cardDivide} flex-1 min-h-0 overflow-y-auto no-scrollbar`}>
            {filteredExpenses.length === 0 ? (<div className="py-12 text-center text-xs font-semibold text-zinc-500 space-y-3">
                <p>{t('table.noData', 'Nu există înregistrări.')}</p>
                {canWriteFinance && (<button onClick={() => setIsExpenseModalOpen(true)} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer inline-flex items-center space-x-1.5">
                    <span>{t('finance.addExpense', 'Adaugă Cheltuială')}</span>
                  </button>)}
              </div>) : (filteredExpenses.map((e) => (<div key={e.id} className="p-4 space-y-3 text-xs">
                  {/* Top Row: Category + Name + Amount */}
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full font-semibold text-[10px] border ${isDarkMode ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-100 text-zinc-700 border-zinc-300'}`}>
                        {e.category}
                      </span>
                      <h4 className={`font-bold text-sm leading-snug truncate ${textTitle}`} title={e.name || e.description}>{e.name || e.description}</h4>
                      {e.name && e.description && (<p className={`text-xs truncate ${textSub}`} title={e.description}>{e.description}</p>)}
                    </div>
                    <span className="font-mono font-extrabold text-sm text-rose-400 shrink-0 text-right">
                      -{(e.amount ?? 0).toFixed(2)} {e.currency}
                    </span>
                  </div>

                  {/* Field Header Grid */}
                  <div className={`grid grid-cols-3 gap-2 pt-2.5 border-t ${cardInnerDivider}`}>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider truncate">
                        {t('table.date', 'Data')}
                      </p>
                      <p className={`font-mono text-xs font-medium mt-0.5 truncate ${textValue}`}>
                        {e.transactionDate}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider truncate">
                        {t('table.paymentMethod', 'Metodă Plată')}
                      </p>
                      <div className="mt-0.5 truncate">
                        {((e.paymentMethod || '').toLowerCase() === 'reimbursement' || (e.paymentMethod || '').toLowerCase() === 'reimbursed' || (e.paymentMethod || '').toLowerCase().includes('decont')) ? (
                          <button
                            type="button"
                            disabled={!canReimburseExpense}
                            onClick={() => handleToggleReimbursement(e)}
                            className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[10px] font-bold border transition select-none truncate ${
                              (e.paymentMethod || '').toLowerCase() === 'reimbursed'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-zinc-800/60 text-zinc-400 border-zinc-700/50'
                            } ${canReimburseExpense ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                            title={canReimburseExpense ? ((e.paymentMethod || '').toLowerCase() === 'reimbursed' ? t('finance.clickToMarkNotReimbursed', 'Apasă pentru a marca ca nedecontat') : t('finance.clickToMarkReimbursed', 'Apasă pentru a marca ca decontat')) : undefined}
                          >
                            {(e.paymentMethod || '').toLowerCase() === 'reimbursed' ? t('finance.reimbursed', 'Decontat') : t('finance.notReimbursed', 'Nedecontat')}
                          </button>
                        ) : (
                          <span className={`text-xs font-medium truncate block ${textValue}`}>
                            {e.paymentMethod}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider truncate">
                        {t('table.receiptInvoice', 'Bon / Factură')}
                      </p>
                      <div className="mt-0.5 truncate">
                        {e.receiptAttachment ? (<a href={e.receiptAttachment} target="_blank" rel="noreferrer" className="inline-flex items-center space-x-1 text-blue-400 hover:text-blue-300 transition text-xs font-semibold truncate"><span>{t('finance.viewReceipt', 'Vezi Bon')}</span>
                          </a>) : (<span className={`text-xs truncate block ${textSub}`}>{t('finance.noReceipt', 'Fără atașament')}</span>)}
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  {canWriteFinance && (<div className={`flex justify-end items-center gap-3 pt-2.5 border-t ${cardInnerDivider}`}>
                      <button onClick={() => setEditingExpense(e)} className="inline-flex items-center space-x-1.5 text-blue-400 hover:text-blue-300 text-xs font-semibold p-1 transition cursor-pointer">
                        <Pencil className="w-3.5 h-3.5"/>
                        <span>{t('general.edit', 'Editează')}</span>
                      </button>
                      <button onClick={() => handleDeleteExpense(e.id)} className="inline-flex items-center space-x-1.5 text-rose-400 hover:text-rose-300 text-xs font-semibold p-1 transition cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5"/>
                        <span>{t('general.delete', 'Șterge')}</span>
                      </button>
                    </div>)}
                </div>)))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block flex-1 min-h-0 overflow-auto no-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className={`sticky top-0 z-10 border-b text-[11px] font-bold uppercase tracking-wider ${tableHeader}`}>
                <tr>
                  <th className="py-3 px-4 whitespace-nowrap">{t('table.date', 'Data')}</th>
                  <th className="py-3 px-4 whitespace-nowrap">{t('table.category', 'Categorie')}</th>
                  <th className="py-3 px-4 whitespace-nowrap">{t('table.expenseName', 'Nume Cheltuială')}</th>
                  <th className="py-3 px-4 whitespace-nowrap">{t('table.expenseItems', 'Articole / Detalii')}</th>
                  <th className="py-3 px-4 whitespace-nowrap">{t('table.paymentMethod', 'Metodă Plată')}</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">{t('table.amountRon', 'Sumă (RON)')}</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">{t('table.receiptInvoice', 'Bon / Factură')}</th>
                  {canWriteFinance && <th className="py-3 px-4 text-center whitespace-nowrap">{t('table.actions', 'Acțiuni')}</th>}
                </tr>
              </thead>
              <tbody className={`divide-y ${divideLine}`}>
                {filteredExpenses.length === 0 ? (<tr>
                    <td colSpan={canWriteFinance ? 8 : 7} className="py-12 text-center text-zinc-500 font-medium">
                      <div className="space-y-3">
                        <p>{t('table.noData', 'Nu există înregistrări.')}</p>
                        {canWriteFinance && (<button onClick={() => setIsExpenseModalOpen(true)} className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer inline-block">
                            <span>{t('finance.addExpense', 'Adaugă Cheltuială')}</span>
                          </button>)}
                      </div>
                    </td>
                  </tr>) : (filteredExpenses.map((e) => (<tr key={e.id} className={`transition ${tableRowHover}`}>
                      <td className={`py-3 px-4 font-mono ${textSub}`}>{e.transactionDate}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-full font-semibold text-[11px] border ${isDarkMode ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-100 text-zinc-700 border-zinc-300'}`}>
                          {e.category}
                        </span>
                      </td>
                      <td className={`py-3 px-4 max-w-xs truncate font-bold ${textTitle}`} title={e.name || e.description}>{e.name || e.description}</td>
                      <td className={`py-3 px-4 max-w-xs truncate ${textSub}`} title={e.description || ''}>{e.description || '-'}</td>
                      <td className={`py-3 px-4 ${textSub}`}>
                        {((e.paymentMethod || '').toLowerCase() === 'reimbursement' || (e.paymentMethod || '').toLowerCase() === 'reimbursed' || (e.paymentMethod || '').toLowerCase().includes('decont')) ? (
                          <button
                            type="button"
                            disabled={!canReimburseExpense}
                            onClick={() => handleToggleReimbursement(e)}
                            className={`w-24 inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-bold border transition select-none ${
                              (e.paymentMethod || '').toLowerCase() === 'reimbursed'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-zinc-800/60 text-zinc-400 border-zinc-700/50'
                            } ${canReimburseExpense ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                            title={canReimburseExpense ? ((e.paymentMethod || '').toLowerCase() === 'reimbursed' ? t('finance.clickToMarkNotReimbursed', 'Apasă pentru a marca ca nedecontat') : t('finance.clickToMarkReimbursed', 'Apasă pentru a marca ca decontat')) : undefined}
                          >
                            {(e.paymentMethod || '').toLowerCase() === 'reimbursed' ? t('finance.reimbursed', 'Decontat') : t('finance.notReimbursed', 'Nedecontat')}
                          </button>
                        ) : (
                          <span>{e.paymentMethod}</span>
                        )}
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-bold ${textTitle}`}>
                        -{(e.amount ?? 0).toFixed(2)} {e.currency}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {e.receiptAttachment ? (<a href={e.receiptAttachment} target="_blank" rel="noreferrer" className="inline-flex items-center space-x-1 text-zinc-400 hover:text-zinc-200 transition text-[11px]"><span>{t('finance.viewReceipt', 'Vezi Bon')}</span>
                          </a>) : (<span className={`text-[10px] ${textSub}`}>{t('finance.noReceipt', 'Fără atașament')}</span>)}
                      </td>
                      {canWriteFinance && (<td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button onClick={() => setEditingExpense(e)} title={t('tooltip.edit', 'Editează')} className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition cursor-pointer">
                              <Pencil className="w-3.5 h-3.5"/>
                            </button>
                            <button onClick={() => handleDeleteExpense(e.id)} title={t('tooltip.delete', 'Șterge')} className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer">
                              <Trash2 className="w-3.5 h-3.5"/>
                            </button>
                          </div>
                        </td>)}
                    </tr>)))}
              </tbody>
            </table>
          </div>
        </div>)}

      {/* ----------------- TAB 2: ONLINE DONATIONS SHEET ----------------- */}
      {activeSubTab === 'online-donations' && (<div className={`flex-1 min-h-0 flex flex-col rounded-2xl border overflow-hidden ${bgCard}`}>
          {/* Mobile Card List View with explicit field headers */}
          <div className={`block md:hidden divide-y ${cardDivide} flex-1 min-h-0 overflow-y-auto no-scrollbar`}>
            {filteredOnlineDonations.length === 0 ? (<div className="py-10 text-center text-xs font-semibold text-zinc-500">
                {t('table.noData', 'Nu există înregistrări.')}
              </div>) : (filteredOnlineDonations.map((d) => (<div key={d.id} className="p-4 space-y-3 text-xs">
                  {/* Top Row: Donor + Status + Amount */}
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] border ${isDarkMode ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-100 text-zinc-700 border-zinc-300'}`}>
                        {d.status}
                      </span>
                      <h4 className={`font-bold text-sm leading-snug truncate ${textTitle}`} title={d.donorName}>{d.donorName}</h4>
                      {d.donorEmail && <p className={`text-[11px] truncate ${textSub}`} title={d.donorEmail}>{d.donorEmail}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-extrabold text-sm block text-emerald-400">
                        +{(d.amount ?? 0).toFixed(2)} {d.currency}
                      </span>
                      <span className={`text-[10px] font-mono ${textSub}`}>
                        -{(d.processingFee ?? 0).toFixed(2)} RON fee
                      </span>
                    </div>
                  </div>

                  {/* Field Header Grid */}
                  <div className={`grid grid-cols-2 gap-2 pt-2.5 border-t ${cardInnerDivider}`}>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider truncate">
                        {t('table.dateTime', 'Data & Ora')}
                      </p>
                      <p className={`font-mono text-xs font-medium mt-0.5 truncate ${textValue}`}>
                        {d.transactionDate}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider truncate">
                        {t('table.transactionId', 'ID Tranzacție')}
                      </p>
                      <p className={`font-mono text-[11px] font-medium mt-0.5 truncate ${textValue}`} title={d.transactionId}>
                        {d.transactionId}
                      </p>
                    </div>
                  </div>
                </div>)))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block flex-1 min-h-0 overflow-auto no-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className={`sticky top-0 z-10 border-b text-[11px] font-bold uppercase tracking-wider ${tableHeader}`}>
                <tr>
                  <th className="py-3 px-4 whitespace-nowrap">{t('table.dateTime', 'Data & Ora')}</th>
                  <th className="py-3 px-4 whitespace-nowrap">{t('table.transactionId', 'ID Tranzacție')}</th>
                  <th className="py-3 px-4 whitespace-nowrap">{t('table.donor', 'Donator')}</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">{t('table.donationAmount', 'Sumă Donație')}</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">{t('table.processorFee', 'Comision Processor')}</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">{t('table.status', 'Status')}</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${divideLine}`}>
                {filteredOnlineDonations.length === 0 ? (<tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500 font-medium">
                      {t('table.noData', 'Nu există înregistrări.')}
                    </td>
                  </tr>) : (filteredOnlineDonations.map((d) => (<tr key={d.id} className={`transition ${tableRowHover}`}>
                      <td className={`py-3 px-4 font-mono ${textSub}`}>{d.transactionDate}</td>
                      <td className={`py-3 px-4 font-mono text-[11px] ${textSub}`}>{d.transactionId}</td>
                      <td className="py-3 px-4">
                        <div className={`font-medium ${textTitle}`}>{d.donorName}</div>
                        <div className={`text-[10px] ${textSub}`}>{d.donorEmail}</div>
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-bold ${textTitle}`}>
                        +{(d.amount ?? 0).toFixed(2)} {d.currency}
                      </td>
                      <td className={`py-3 px-4 text-right font-mono text-[11px] ${textSub}`}>
                        -{(d.processingFee ?? 0).toFixed(2)} RON
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${isDarkMode ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-100 text-zinc-700 border-zinc-300'}`}>
                          {d.status}
                        </span>
                      </td>
                    </tr>)))}
              </tbody>
            </table>
          </div>
        </div>)}

      {/* ----------------- TAB 3: STANDS SHEET ----------------- */}
      {activeSubTab === 'stands' && (<div className={`flex-1 min-h-0 flex flex-col rounded-2xl border overflow-hidden ${bgCard}`}>
          {/* Mobile Card List View with explicit field headers */}
          <div className={`block md:hidden divide-y ${cardDivide} flex-1 min-h-0 overflow-y-auto no-scrollbar`}>
            {filteredStands.length === 0 ? (<div className="py-10 text-center text-xs font-semibold text-zinc-500">
                {t('table.noData', 'Nu există înregistrări.')}
              </div>) : (filteredStands.map((s) => (<div key={s.id} className="p-4 space-y-3 text-xs">
                  {/* Top Row: Location + Total Collected */}
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <h4 className={`font-bold text-sm leading-snug truncate ${textTitle}`} title={s.standLocation || 'Stand'}>{s.standLocation || 'Stand'}</h4>
                      <p className={`text-[11px] font-mono mt-0.5 truncate ${textSub}`}>{s.eventDate}</p>
                    </div>
                    <span className="font-mono font-extrabold text-sm text-emerald-400 shrink-0 text-right">
                      +{((s.cashCollected ?? 0) + (s.posCardCollected ?? 0)).toFixed(2)} RON
                    </span>
                  </div>

                  {/* Field Header Grid */}
                  <div className={`grid grid-cols-3 gap-2 pt-2.5 border-t ${cardInnerDivider}`}>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider truncate">
                        {t('table.financeResponsible', 'Responsabil')}
                      </p>
                      <p className={`text-xs font-medium mt-0.5 truncate ${textValue}`} title={s.financeResponsibleName || '-'}>
                        {s.financeResponsibleName || '-'}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider truncate">
                        {t('table.cashCollected', 'Cash')}
                      </p>
                      <p className={`font-mono text-xs font-medium mt-0.5 truncate ${textValue}`}>
                        {(s.cashCollected ?? 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider truncate">
                        {t('table.posCardCollected', 'POS Card')}
                      </p>
                      <p className={`font-mono text-xs font-medium mt-0.5 truncate ${textValue}`}>
                        {(s.posCardCollected ?? 0).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className={`flex justify-between items-center gap-3 pt-2.5 border-t ${cardInnerDivider}`}>
                    <button
                      type="button"
                      disabled={!canHandoverStand}
                      onClick={() => handleToggleStandHanded(s)}
                      className={`w-20 inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-bold border transition select-none truncate ${
                        s.status === 'HANDED'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-zinc-800/60 text-zinc-400 border-zinc-700/50'
                      } ${canHandoverStand ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                      title={canHandoverStand ? (s.status === 'HANDED' ? t('finance.clickToMarkNotHanded', 'Apasă pentru a marca ca nepredat') : t('finance.clickToMarkHanded', 'Apasă pentru a marca ca predat')) : undefined}
                    >
                      {s.status === 'HANDED' ? t('finance.handed', 'Predat') : t('finance.notHanded', 'Nepredat')}
                    </button>
                    {canWriteFinance && (<div className="flex items-center gap-3">
                        <button onClick={() => setEditingStand(s)} className="inline-flex items-center space-x-1.5 text-blue-400 hover:text-blue-300 text-xs font-semibold p-1 transition cursor-pointer">
                          <Pencil className="w-3.5 h-3.5"/>
                          <span>{t('general.edit', 'Editează')}</span>
                        </button>
                        <button onClick={() => handleDeleteStand(s.id, s.standLocation)} className="inline-flex items-center space-x-1.5 text-rose-400 hover:text-rose-300 text-xs font-semibold p-1 transition cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5"/>
                          <span>{t('general.delete', 'Șterge')}</span>
                        </button>
                      </div>)}
                  </div>
                </div>)))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block flex-1 min-h-0 overflow-auto no-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className={`sticky top-0 z-10 border-b text-[11px] font-bold uppercase tracking-wider ${tableHeader}`}>
                <tr>
                  <th className="py-3 px-4 whitespace-nowrap">{t('table.date', 'Data')}</th>
                  <th className="py-3 px-4 whitespace-nowrap">{t('finance.standLocation', 'Locație Stand')}</th>
                  <th className="py-3 px-4 whitespace-nowrap">{t('table.financeResponsible', 'Responsabil Financiar')}</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">{t('table.cashCollected', 'Cash Încasat')}</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">{t('table.posCardCollected', 'POS Card Încasat')}</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">{t('table.totalCollected', 'Total Colectat')}</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">{t('table.status', 'Status')}</th>
                  {canWriteFinance && <th className="py-3 px-4 text-center whitespace-nowrap">{t('table.actions', 'Acțiuni')}</th>}
                </tr>
              </thead>
              <tbody className={`divide-y ${divideLine}`}>
                {filteredStands.length === 0 ? (<tr>
                    <td colSpan={canWriteFinance ? 8 : 7} className="py-8 text-center text-zinc-500 font-medium">
                      {t('table.noData', 'Nu există înregistrări.')}
                    </td>
                  </tr>) : (filteredStands.map((s) => (<tr key={s.id} className={`transition ${tableRowHover}`}>
                      <td className={`py-3 px-4 font-mono ${textSub}`}>{s.eventDate}</td>
                      <td className={`py-3 px-4 font-bold ${textTitle}`}>{s.standLocation || 'Stand'}</td>
                      <td className={`py-3 px-4 font-medium ${textValue}`}>{s.financeResponsibleName || '-'}</td>
                      <td className={`py-3 px-4 text-right font-mono font-bold ${textTitle}`}>
                        {(s.cashCollected ?? 0).toFixed(2)} RON
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-bold ${textTitle}`}>
                        {(s.posCardCollected ?? 0).toFixed(2)} RON
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-bold ${textTitle}`}>
                        +{((s.cashCollected ?? 0) + (s.posCardCollected ?? 0)).toFixed(2)} RON
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          disabled={!canHandoverStand}
                          onClick={() => handleToggleStandHanded(s)}
                          className={`w-20 inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-bold border transition select-none ${
                            s.status === 'HANDED'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-zinc-800/60 text-zinc-400 border-zinc-700/50'
                          } ${canHandoverStand ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                          title={canHandoverStand ? (s.status === 'HANDED' ? t('finance.clickToMarkNotHanded', 'Apasă pentru a marca ca nepredat') : t('finance.clickToMarkHanded', 'Apasă pentru a marca ca predat')) : undefined}
                        >
                          {s.status === 'HANDED' ? t('finance.handed', 'Predat') : t('finance.notHanded', 'Nepredat')}
                        </button>
                      </td>
                      {canWriteFinance && (<td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button onClick={() => setEditingStand(s)} title={t('tooltip.edit', 'Editează')} className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition cursor-pointer">
                              <Pencil className="w-3.5 h-3.5"/>
                            </button>
                            <button onClick={() => handleDeleteStand(s.id, s.standLocation)} title={t('tooltip.delete', 'Șterge')} className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer">
                              <Trash2 className="w-3.5 h-3.5"/>
                            </button>
                          </div>
                        </td>)}
                    </tr>)))}
              </tbody>
            </table>
          </div>
        </div>)}

      {/* ----------------- TAB 4: SPONSORSHIPS SHEET ----------------- */}
      {activeSubTab === 'sponsorships' && (<div className={`flex-1 min-h-0 flex flex-col rounded-2xl border overflow-hidden ${bgCard}`}>
          {/* Mobile Card List View with explicit field headers */}
          <div className={`block md:hidden divide-y ${cardDivide} flex-1 min-h-0 overflow-y-auto no-scrollbar`}>
            {filteredSponsorships.length === 0 ? (<div className="py-10 text-center text-xs font-semibold text-zinc-500">
                {t('table.noData', 'Nu există înregistrări.')}
              </div>) : (filteredSponsorships.map((sp) => (<div key={sp.id} className="p-4 space-y-3 text-xs">
                  {/* Top Row: Sponsor + Tier + Agreed Amount */}
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-[10px] border ${isDarkMode ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-100 text-zinc-700 border-zinc-300'}`}>
                        {sp.tier}
                      </span>
                      <h4 className={`font-bold text-sm leading-snug truncate ${textTitle}`} title={sp.sponsorName}>{sp.sponsorName}</h4>
                      <p className={`text-[11px] truncate ${textSub}`} title={`${sp.contactPerson} ${sp.contactEmail ? `(${sp.contactEmail})` : ''}`}>{sp.contactPerson} {sp.contactEmail ? `(${sp.contactEmail})` : ''}</p>
                    </div>
                    <span className="font-mono font-extrabold text-sm text-emerald-400 shrink-0 text-right">
                      {(sp.agreedAmount ?? 0).toFixed(2)} {sp.currency}
                    </span>
                  </div>

                  {/* Field Header Grid */}
                  <div className={`grid grid-cols-3 gap-2 pt-2.5 border-t ${cardInnerDivider}`}>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider truncate">
                        {t('table.campaign', 'Campanie')}
                      </p>
                      <p className={`text-xs font-medium mt-0.5 truncate ${textValue}`} title={sp.campaign || '-'}>
                        {sp.campaign || '-'}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider truncate">
                        {t('table.paymentStatus', 'Status Plată')}
                      </p>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border mt-0.5 truncate max-w-full ${isDarkMode ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-100 text-zinc-700 border-zinc-300'}`} title={sp.paymentStatus}>
                        {sp.paymentStatus}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider truncate">
                        {t('table.contract', 'Contract')}
                      </p>
                      <div className="mt-0.5 truncate">
                        {sp.contractUrl ? (<a href={sp.contractUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 text-xs font-semibold inline-flex items-center space-x-1 transition truncate"><span>PDF</span>
                          </a>) : (<span className={`text-xs truncate block ${textSub}`}>-</span>)}
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  {canWriteFinance && (<div className={`flex justify-end items-center gap-3 pt-2.5 border-t ${cardInnerDivider}`}>
                      <button onClick={() => setEditingSponsorship(sp)} className="inline-flex items-center space-x-1.5 text-blue-400 hover:text-blue-300 text-xs font-semibold p-1 transition cursor-pointer">
                        <Pencil className="w-3.5 h-3.5"/>
                        <span>{t('general.edit', 'Editează')}</span>
                      </button>
                      <button onClick={() => handleDeleteSponsorship(sp.id)} className="inline-flex items-center space-x-1.5 text-rose-400 hover:text-rose-300 text-xs font-semibold p-1 transition cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5"/>
                        <span>{t('general.delete', 'Șterge')}</span>
                      </button>
                    </div>)}
                </div>)))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block flex-1 min-h-0 overflow-auto no-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className={`sticky top-0 z-10 border-b text-[11px] font-bold uppercase tracking-wider ${tableHeader}`}>
                <tr>
                  <th className="py-3 px-4 whitespace-nowrap">{t('table.sponsorCompany', 'Sponsor / Companie')}</th>
                  <th className="py-3 px-4 whitespace-nowrap">{t('table.contactPerson', 'Persoană Contact')}</th>
                  <th className="py-3 px-4 whitespace-nowrap">{t('table.sponsorshipTier', 'Tier Sponsorizare')}</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">{t('table.agreedAmount', 'Sumă Agreată')}</th>
                  <th className="py-3 px-4 whitespace-nowrap">{t('table.campaign', 'Campanie')}</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">{t('table.paymentStatus', 'Status Plată')}</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">{t('table.contract', 'Contract')}</th>
                  {canWriteFinance && <th className="py-3 px-4 text-center whitespace-nowrap">{t('table.actions', 'Acțiuni')}</th>}
                </tr>
              </thead>
              <tbody className={`divide-y ${divideLine}`}>
                {filteredSponsorships.length === 0 ? (<tr>
                    <td colSpan={canWriteFinance ? 8 : 7} className="py-8 text-center text-zinc-500 font-medium">
                      {t('table.noData', 'Nu există înregistrări.')}
                    </td>
                  </tr>) : (filteredSponsorships.map((sp) => (<tr key={sp.id} className={`transition ${tableRowHover}`}>
                      <td className={`py-3 px-4 font-bold ${textTitle}`}>{sp.sponsorName}</td>
                      <td className="py-3 px-4">
                        <div className={textValue}>{sp.contactPerson}</div>
                        <div className={`text-[10px] ${textSub}`}>{sp.contactEmail}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${isDarkMode ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-100 text-zinc-700 border-zinc-300'}`}>
                          {sp.tier}
                        </span>
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-bold ${textTitle}`}>
                        {(sp.agreedAmount ?? 0).toFixed(2)} {sp.currency}
                      </td>
                      <td className={`py-3 px-4 ${textSub}`}>{sp.campaign}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${isDarkMode ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-100 text-zinc-700 border-zinc-300'}`}>
                          {sp.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {sp.contractUrl ? (<a href={sp.contractUrl} target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-zinc-200 text-[11px] inline-flex items-center space-x-1 transition"><span>PDF</span>
                          </a>) : (<span className={`text-[10px] ${textSub}`}>-</span>)}
                      </td>
                      {canWriteFinance && (<td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button onClick={() => setEditingSponsorship(sp)} title={t('tooltip.edit', 'Editează')} className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition cursor-pointer">
                              <Pencil className="w-3.5 h-3.5"/>
                            </button>
                            <button onClick={() => handleDeleteSponsorship(sp.id)} title={t('tooltip.delete', 'Șterge')} className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer">
                              <Trash2 className="w-3.5 h-3.5"/>
                            </button>
                          </div>
                        </td>)}
                    </tr>)))}
              </tbody>
            </table>
          </div>
        </div>)}

      {/* ----------------- TAB 5: OTHER INCOMES SHEET ----------------- */}
      {activeSubTab === 'other-incomes' && (<div className={`flex-1 min-h-0 flex flex-col rounded-2xl border overflow-hidden ${bgCard}`}>
          {/* Mobile Card List View with explicit field headers */}
          <div className={`block md:hidden divide-y ${cardDivide} flex-1 min-h-0 overflow-y-auto no-scrollbar`}>
            {filteredOtherIncomes.length === 0 ? (<div className="py-10 text-center text-xs font-semibold text-zinc-500">
                {t('table.noData', 'Nu există înregistrări.')}
              </div>) : (filteredOtherIncomes.map((inc) => (<div key={inc.id} className="p-4 space-y-3 text-xs">
                  {/* Top Row: Source + Category + Amount */}
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full font-semibold text-[10px] border ${isDarkMode ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-100 text-zinc-700 border-zinc-300'}`}>
                        {inc.category}
                      </span>
                      <h4 className={`font-bold text-sm leading-snug truncate ${textTitle}`} title={inc.sourcePayer}>{inc.sourcePayer}</h4>
                      {inc.description && <p className={`text-[11px] truncate ${textValue}`} title={inc.description}>{inc.description}</p>}
                    </div>
                    <span className="font-mono font-extrabold text-sm text-emerald-400 shrink-0 text-right">
                      +{(inc.amount ?? 0).toFixed(2)} {inc.currency}
                    </span>
                  </div>

                  {/* Field Header Grid */}
                  <div className={`grid grid-cols-1 gap-2 pt-2.5 border-t ${cardInnerDivider}`}>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider truncate">
                        {t('table.date', 'Data')}
                      </p>
                      <p className={`font-mono text-xs font-medium mt-0.5 truncate ${textValue}`}>
                        {inc.transactionDate}
                      </p>
                    </div>
                  </div>

                  {/* Actions Row */}
                  {canWriteFinance && (<div className={`flex justify-end items-center gap-3 pt-2.5 border-t ${cardInnerDivider}`}>
                      <button onClick={() => setEditingOtherIncome(inc)} className="inline-flex items-center space-x-1.5 text-blue-400 hover:text-blue-300 text-xs font-semibold p-1 transition cursor-pointer">
                        <Pencil className="w-3.5 h-3.5"/>
                        <span>{t('general.edit', 'Editează')}</span>
                      </button>
                      <button onClick={() => handleDeleteOtherIncome(inc.id)} className="inline-flex items-center space-x-1.5 text-rose-400 hover:text-rose-300 text-xs font-semibold p-1 transition cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5"/>
                        <span>{t('general.delete', 'Șterge')}</span>
                      </button>
                    </div>)}
                </div>)))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block flex-1 min-h-0 overflow-auto no-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className={`sticky top-0 z-10 border-b text-[11px] font-bold uppercase tracking-wider ${tableHeader}`}>
                <tr>
                  <th className="py-3 px-4 whitespace-nowrap">{t('table.date', 'Data')}</th>
                  <th className="py-3 px-4 whitespace-nowrap">{t('table.sourcePayer', 'Sursă / Plătitor')}</th>
                  <th className="py-3 px-4 whitespace-nowrap">{t('table.category', 'Categorie')}</th>
                  <th className="py-3 px-4 whitespace-nowrap">{t('table.incomeDescription', 'Descriere')}</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">{t('table.amountCollected', 'Sumă Încasată')}</th>
                  {canWriteFinance && <th className="py-3 px-4 text-center whitespace-nowrap">{t('table.actions', 'Acțiuni')}</th>}
                </tr>
              </thead>
              <tbody className={`divide-y ${divideLine}`}>
                {filteredOtherIncomes.length === 0 ? (<tr>
                    <td colSpan={canWriteFinance ? 6 : 5} className="py-8 text-center text-zinc-500 font-medium">
                      {t('table.noData', 'Nu există înregistrări.')}
                    </td>
                  </tr>) : (filteredOtherIncomes.map((inc) => (<tr key={inc.id} className={`transition ${tableRowHover}`}>
                      <td className={`py-3 px-4 font-mono ${textSub}`}>{inc.transactionDate}</td>
                      <td className={`py-3 px-4 font-bold ${textTitle}`}>{inc.sourcePayer}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-full font-semibold text-[11px] border ${isDarkMode ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-100 text-zinc-700 border-zinc-300'}`}>
                          {inc.category}
                        </span>
                      </td>
                      <td className={`py-3 px-4 max-w-xs truncate ${textValue}`} title={inc.description || ''}>{inc.description || '-'}</td>
                      <td className={`py-3 px-4 text-right font-mono font-bold ${textTitle}`}>
                        +{(inc.amount ?? 0).toFixed(2)} {inc.currency}
                      </td>
                      {canWriteFinance && (<td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button onClick={() => setEditingOtherIncome(inc)} title={t('tooltip.edit', 'Editează')} className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition cursor-pointer">
                              <Pencil className="w-3.5 h-3.5"/>
                            </button>
                            <button onClick={() => handleDeleteOtherIncome(inc.id)} title={t('tooltip.delete', 'Șterge')} className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer">
                              <Trash2 className="w-3.5 h-3.5"/>
                            </button>
                          </div>
                        </td>)}
                    </tr>)))}
              </tbody>
            </table>
          </div>
        </div>)}

      {/* ----------------- TAB 6: STATISTICS VIEW ----------------- */}
      {activeSubTab === 'statistics' && (
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-4 pr-0.5">
          <FinanceStatisticsView
            stats={stats || undefined}
            expenses={expenses}
            onlineDonations={onlineDonations}
            stands={stands}
            sponsorships={sponsorships}
            otherIncomes={otherIncomes}
            isDarkMode={isDarkMode}
          />
        </div>
      )}

      {/* Modals */}
      <AddExpenseModal isOpen={isExpenseModalOpen || !!editingExpense} initialData={editingExpense} onClose={() => {
            setIsExpenseModalOpen(false);
            setEditingExpense(null);
        }} onAdd={handleSaveExpense} availableCategories={dynamicCategories} onAddCategory={handleAddCustomCategory} onRenameCategory={handleRenameCustomCategory} onDeleteCategory={handleDeleteCustomCategory} isDarkMode={isDarkMode}/>
<SubmitStandEoDModal isOpen={isStandModalOpen || !!editingStand} initialData={editingStand} onClose={() => {
            setIsStandModalOpen(false);
            setEditingStand(null);
        }} onSubmit={handleSaveStand} onDelete={handleDeleteStand} availablePosDevices={customPosDevices} onAddPosDevice={handleAddCustomPosDevice} onRenamePosDevice={handleRenameCustomPosDevice} onDeletePosDevice={handleDeleteCustomPosDevice} isDarkMode={isDarkMode}/>
<EditSponsorshipModal isOpen={!!editingSponsorship} initialData={editingSponsorship} onClose={() => setEditingSponsorship(null)} onSave={handleSaveSponsorship} isDarkMode={isDarkMode}/>
<AddOtherIncomeModal isOpen={isOtherIncomeModalOpen || !!editingOtherIncome} initialData={editingOtherIncome} onClose={() => {
            setIsOtherIncomeModalOpen(false);
            setEditingOtherIncome(null);
        }} onAdd={handleSaveOtherIncome} availableCategories={dynamicOtherIncomeCategories} onAddCategory={handleAddOtherIncomeCategory} onRenameCategory={handleRenameOtherIncomeCategory} onDeleteCategory={handleDeleteOtherIncomeCategory} isDarkMode={isDarkMode}/>
<ConfirmationModal isOpen={confirmDialog.isOpen} onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))} onConfirm={confirmDialog.onConfirm} title={confirmDialog.title} message={confirmDialog.message} variant="danger" isDarkMode={isDarkMode}/>
    </DashboardContainer>);
};
