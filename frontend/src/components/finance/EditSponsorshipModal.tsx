import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { FinanceSponsorship } from '../../types/finance';
import { useLanguage } from '../../context/LanguageContext';
import { CustomSelect } from '../common';
interface EditSponsorshipModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (sponsorship: Partial<FinanceSponsorship>) => void;
    initialData: FinanceSponsorship | null;
    isDarkMode: boolean;
}
export const EditSponsorshipModal: React.FC<EditSponsorshipModalProps> = ({ isOpen, onClose, onSave, initialData, isDarkMode, }) => {
    const { t } = useLanguage();
    const [sponsorName, setSponsorName] = useState(initialData?.sponsorName || '');
    const [contactPerson, setContactPerson] = useState(initialData?.contactPerson || '');
    const [contactEmail, setContactEmail] = useState(initialData?.contactEmail || '');
    const [tier, setTier] = useState<FinanceSponsorship['tier']>(initialData?.tier || 'Gold');
    const [agreedAmount, setAgreedAmount] = useState<number | ''>(initialData?.agreedAmount ?? '');
    const [currency, setCurrency] = useState(initialData?.currency || 'RON');
    const [paymentStatus, setPaymentStatus] = useState<FinanceSponsorship['paymentStatus']>(initialData?.paymentStatus || 'Contract Signed');
    const [campaign, setCampaign] = useState(initialData?.campaign || 'Crăciun 2026');
    const [contractUrl, setContractUrl] = useState(initialData?.contractUrl || '');
    useEffect(() => {
        if (initialData) {
            setSponsorName(initialData.sponsorName || '');
            setContactPerson(initialData.contactPerson || '');
            setContactEmail(initialData.contactEmail || '');
            setTier(initialData.tier || 'Gold');
            setAgreedAmount(initialData.agreedAmount ?? '');
            setCurrency(initialData.currency || 'RON');
            setPaymentStatus(initialData.paymentStatus || 'Contract Signed');
            setCampaign(initialData.campaign || 'Crăciun 2026');
            setContractUrl(initialData.contractUrl || '');
        }
    }, [initialData, isOpen]);

    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        setError('');
        setFieldErrors({});
    }, [initialData, isOpen]);

    // Keyboard Escape listener
    React.useEffect(() => {
        if (!isOpen)
            return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape')
                onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !initialData)
        return null;

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};
        if (!sponsorName.trim()) {
            errors.sponsorName = t('finance.errorSponsorName', 'Introduceți numele sponsorului.');
        }
        if (!agreedAmount || Number(agreedAmount) <= 0) {
            errors.agreedAmount = t('finance.errorAmount', 'Introduceți suma agreată.');
        }
        if (!campaign.trim()) {
            errors.campaign = t('finance.errorCampaign', 'Introduceți campania.');
        }
        setFieldErrors(errors);
        if (Object.keys(errors).length > 0) {
            setError(t('common.fillRequiredFields', 'Completați câmpurile obligatorii marcate.'));
            return false;
        }
        setError('');
        return true;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm())
            return;
        onSave({
            sponsorName: sponsorName.trim(),
            contactPerson: contactPerson.trim(),
            contactEmail: contactEmail.trim(),
            tier,
            agreedAmount: Number(agreedAmount),
            currency,
            paymentStatus,
            campaign: campaign.trim(),
            contractUrl: contractUrl.trim() || undefined,
        });
        onClose();
    };

    const modalBorder = isDarkMode ? 'border-zinc-800' : 'border-zinc-200';
    const modalBg = isDarkMode ? 'bg-black text-white border-zinc-800 shadow-2xl' : 'bg-white text-zinc-900 border-zinc-200 shadow-xl';
    const inputBg = isDarkMode
        ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700 focus:border-zinc-700'
        : 'bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400 focus:border-zinc-400';
    const inputErrorBorder = 'border-rose-500/80 focus:border-rose-500 ring-1 ring-rose-500/40';
    const textSub = isDarkMode ? 'text-zinc-400' : 'text-zinc-500';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150" onClick={onClose}>
            <div className={`w-full h-full sm:h-auto sm:max-h-[90vh] max-w-lg rounded-none sm:rounded-2xl border-0 sm:border shadow-2xl flex flex-col overflow-hidden transition-all transform scale-100 animate-in zoom-in-95 duration-150 ${modalBg}`} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="px-5 sm:px-6 pt-5 pb-3.5 flex items-center justify-between shrink-0">
                    <h3 className="font-bold text-base sm:text-lg tracking-tight">
                        {t('finance.editSponsorship', 'Editează Sponsorizare')}
                    </h3>
                    <button onClick={onClose} aria-label={t('common.close', 'Închide')} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}>
                        <X className="w-5 h-5"/>
                    </button>
                </div>
                <div className={`mx-5 sm:mx-6 border-b ${modalBorder}`} />

                {/* Scrollable Form Body */}
                <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-4 text-sm">
                    <form id="edit-sponsorship-form" noValidate onSubmit={handleSubmit} className="space-y-4 text-sm">
                        <div>
                            <label className={`block text-xs font-semibold mb-1 ${textSub}`}>{t('finance.sponsorName', 'Nume Sponsor / Companie')}</label>
                            <input type="text" placeholder="Ex: Banca Transilvania" value={sponsorName} onChange={(e) => {
                                setSponsorName(e.target.value);
                                if (fieldErrors.sponsorName) setFieldErrors(prev => ({ ...prev, sponsorName: '' }));
                            }} className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputBg} ${fieldErrors.sponsorName ? inputErrorBorder : ''}`}/>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className={`block text-xs font-semibold mb-1 ${textSub}`}>{t('finance.contactPerson', 'Persoană Contact')}</label>
                                <input type="text" placeholder="..." value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputBg}`}/>
                            </div>
                            <div>
                                <label className={`block text-xs font-semibold mb-1 ${textSub}`}>{t('finance.contactEmail', 'Email Contact')}</label>
                                <input type="email" placeholder="contact@company.ro" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputBg}`}/>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <CustomSelect label={t('finance.sponsorshipTier', 'Tier Sponsorizare')} value={tier} onChange={(val) => setTier(val as any)} options={['Platinum', 'Gold', 'Silver', 'Custom']} isDarkMode={isDarkMode}/>
                            </div>
                            <div>
                                <label className={`block text-xs font-semibold mb-1 ${textSub}`}>{t('finance.agreedAmount', 'Sumă Agreată')} & {t('finance.currency', 'Monedă')}</label>
                                <div className="flex space-x-2">
                                    <input type="number" step="0.01" placeholder="0.00" value={agreedAmount} onFocus={(e) => e.target.select()} onChange={(e) => {
                                        const clean = e.target.value.replace(/^0+(?=\d)/, '');
                                        setAgreedAmount(clean === '' ? '' : Number(clean));
                                        if (fieldErrors.agreedAmount) setFieldErrors(prev => ({ ...prev, agreedAmount: '' }));
                                    }} className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputBg} ${fieldErrors.agreedAmount ? inputErrorBorder : ''}`}/>
                                    <div className="w-24 shrink-0">
                                        <CustomSelect value={currency} onChange={(val) => setCurrency(val)} options={['RON', 'EUR', 'USD']} isDarkMode={isDarkMode}/>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <CustomSelect label={t('finance.paymentStatus', 'Status Plată')} value={paymentStatus} onChange={(val) => setPaymentStatus(val as any)} options={[
                                    'Lead Identified',
                                    'Contacted',
                                    'Proposal Sent',
                                    'Negotiating',
                                    'Contract Signed',
                                    'Funds Received',
                                ]} isDarkMode={isDarkMode}/>
                            </div>
                            <div>
                                <label className={`block text-xs font-semibold mb-1 ${textSub}`}>{t('header.campaigns', 'Campanie')}</label>
                                <input type="text" value={campaign} onChange={(e) => {
                                    setCampaign(e.target.value);
                                    if (fieldErrors.campaign) setFieldErrors(prev => ({ ...prev, campaign: '' }));
                                }} className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputBg} ${fieldErrors.campaign ? inputErrorBorder : ''}`}/>
                            </div>
                        </div>

                        <div>
                            <label className={`block text-xs font-semibold mb-1 ${textSub}`}>{t('finance.contractUrl', 'Link Contract')}</label>
                            <div className="relative">
                                <input type="text" placeholder="https://drive.google.com/..." value={contractUrl} onChange={(e) => setContractUrl(e.target.value)} className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputBg}`}/>
                            </div>
                        </div>
                    </form>
                </div>

                <div className={`mx-5 sm:mx-6 border-t ${modalBorder}`} />

                {/* Footer */}
                <div className="px-5 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
                    <div className="min-w-0 pr-3">
                        {error && (
                            <p className="text-xs text-rose-400 font-medium truncate">{error}</p>
                        )}
                    </div>
                    <button form="edit-sponsorship-form" type="submit" className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer shrink-0">
                        {t('common.saveChanges', 'Salvează Modificările')}
                    </button>
                </div>
            </div>
        </div>
    );
};
