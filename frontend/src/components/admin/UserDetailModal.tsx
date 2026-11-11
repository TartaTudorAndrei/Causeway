import React from 'react';
import type { PlatformUser } from '../../types/adminSettings';
import { useLanguage } from '../../context/LanguageContext';
import { Modal } from '../common';
interface UserDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: PlatformUser | null;
    isDarkMode: boolean;
}
export const UserDetailModal: React.FC<UserDetailModalProps> = ({ isOpen, onClose, user, isDarkMode }) => {
    const { language, t } = useLanguage();
    if (!user)
        return null;
    const dCss = {
        cardBg: isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200',
        textMuted: isDarkMode ? 'text-zinc-400' : 'text-zinc-500',
    };
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{t('status.APPROVED', 'Aprobat')}</span>;
            case 'PENDING_APPROVAL':
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">{t('status.PENDING_APPROVAL', 'În Așteptare Aprobare')}</span>;
            case 'PENDING_EMAIL':
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">{t('status.PENDING_EMAIL', 'Confirmare Email')}</span>;
            case 'REJECTED':
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">{t('status.REJECTED', 'Respins')}</span>;
            case 'SUSPENDED':
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">{t('status.SUSPENDED', 'Suspendat')}</span>;
            default:
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">{status}</span>;
        }
    };
    return (<Modal isOpen={isOpen} onClose={onClose} title={<div className="flex items-center space-x-2">
          <span>{user.fullName}</span>
          {getStatusBadge(user.status)}
        </div>} subtitle={user.email} maxWidth="xl" isDarkMode={isDarkMode}>
      <div className="space-y-5">
          
          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
<div className={`p-3.5 rounded-xl border flex items-start space-x-3 ${dCss.cardBg}`}><div className="min-w-0">
                <p className={`text-[11px] font-semibold uppercase tracking-wider ${dCss.textMuted}`}>{t('account.emailAddress', 'Adresă Email')}</p>
                <p className="text-xs font-bold truncate">{user.email}</p>
              </div>
            </div>
<div className={`p-3.5 rounded-xl border flex items-start space-x-3 ${dCss.cardBg}`}><div className="min-w-0">
                <p className={`text-[11px] font-semibold uppercase tracking-wider ${dCss.textMuted}`}>{t('it.phone', 'Număr Telefon')}</p>
                <p className="text-xs font-bold truncate">{user.phone || t('it.unspecified', 'Nespecificat')}</p>
              </div>
            </div>
<div className={`p-3.5 rounded-xl border flex items-start space-x-3 ${dCss.cardBg}`}><div className="min-w-0">
                <p className={`text-[11px] font-semibold uppercase tracking-wider ${dCss.textMuted}`}>{t('it.orgTeam', 'Organizație / Echipa')}</p>
                <p className="text-xs font-bold truncate">{user.organizationType || t('it.noSpec', 'Fără specificație')}</p>
                {user.organizationDetails && <p className="text-[11px] text-zinc-400 truncate">{user.organizationDetails}</p>}
              </div>
            </div>
<div className={`p-3.5 rounded-xl border flex items-start space-x-3 ${dCss.cardBg}`}><div className="min-w-0">
                <p className={`text-[11px] font-semibold uppercase tracking-wider ${dCss.textMuted}`}>{t('it.regDate', 'Data Înregistrării')}</p>
                <p className="text-xs font-bold">{new Date(user.createdAt).toLocaleDateString(language === 'en' ? 'en-US' : 'ro-RO', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
</div>

          {/* Role & Memberships Summary */}
          <div className={`p-4 rounded-xl border space-y-3 ${dCss.cardBg}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2"><h4 className="text-xs font-bold uppercase tracking-wider text-blue-400">{t('it.primaryRole', 'Rol Principal')}: {user.primaryRole}</h4>
              </div>
              <span className={`text-[11px] ${dCss.textMuted}`}>
                {(user.roles && user.roles.length > 0 ? user.roles.length : 1)} {t('it.rolesAssignedCount', 'roluri atribuite')}
              </span>
            </div>

            {/* Roles badges */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {(user.roles && user.roles.length > 0 ? user.roles : [user.primaryRole]).map((r, rIdx) => (<span key={rIdx} className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${r === user.primaryRole
                ? 'bg-blue-600/20 text-blue-400 border-blue-500/40'
                : isDarkMode
                    ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
                    : 'bg-zinc-200 text-zinc-800 border-zinc-300'}`}>
                  {r}
                  {r === user.primaryRole && <span className="ml-1.5 text-[9px] px-1 py-0.2 rounded bg-blue-500/30 text-blue-200 uppercase font-sans">{t('it.primaryBadge', 'Primary')}</span>}
                </span>))}
            </div>

            {user.memberships && user.memberships.length > 0 ? (<div className="space-y-2 pt-1">
                {user.memberships.map((m, idx) => (<div key={idx} className={`p-3 rounded-lg border text-xs space-y-1 ${isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                    <div className="flex justify-between items-center font-bold">
                      <span>{m.roleName}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 font-mono">{m.scopeType} {m.scopeId ? `(${m.scopeId})` : ''}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {m.permissions.map((p, pIdx) => (<span key={pIdx} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-300 font-mono">{p}</span>))}
                    </div>
                  </div>))}
              </div>) : (<p className={`text-xs ${dCss.textMuted}`}>{t('it.noExtraMemberships', 'Fără scopuri/membri adiționale asociate.')}</p>)}
          </div>

          {/* Notes & Activity */}
          {user.notes && (<div className={`p-4 rounded-xl border space-y-1 ${dCss.cardBg}`}>
              <div className="flex items-center space-x-2 text-zinc-400 mb-1"><span className="text-[11px] font-bold uppercase tracking-wider">{t('it.adminNotes', 'Note Administrare')}</span>
              </div>
              <p className="text-xs leading-relaxed">{user.notes}</p>
            </div>)}

          {user.lastLoginAt && (<div className="flex items-center space-x-2 text-xs text-zinc-400 pt-1"><span>{t('it.lastLogin', 'Ultima autentificare')}: {new Date(user.lastLoginAt).toLocaleString('ro-RO')}</span>
            </div>)}

        </div>
    </Modal>);
};
