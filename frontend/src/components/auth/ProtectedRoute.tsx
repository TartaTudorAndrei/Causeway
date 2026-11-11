import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { adminAuthService } from '../../services/adminAuthService';
import type { AdminUser } from '../../types/adminAuth';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission: string;
  scopeType?: 'GLOBAL' | 'PROJECT' | 'DEPARTMENT';
  scopeId?: string | null;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  scopeType = 'GLOBAL',
  scopeId = null,
}) => {
  const { t } = useLanguage();
  const [user, setUser] = useState<AdminUser | null>(() => {
    const stored = localStorage.getItem('adminUser');
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const syncUser = () => {
      const stored = localStorage.getItem('adminUser');
      if (!stored) {
        setUser(null);
        return;
      }
      try {
        setUser(JSON.parse(stored));
      } catch {
        setUser(null);
      }
    };

    // Validate active session against backend on mount
    adminAuthService.getMe().then((freshUser) => {
      if (freshUser) {
        setUser(freshUser);
      } else {
        syncUser();
      }
    });

    const handleVisibilityAndFocus = () => {
      if (document.visibilityState === 'visible') {
        adminAuthService.getMe().then((freshUser) => {
          if (freshUser) {
            setUser(freshUser);
          } else {
            syncUser();
          }
        });
      }
    };

    window.addEventListener('authChange', syncUser);
    window.addEventListener('storage', syncUser);
    window.addEventListener('focus', handleVisibilityAndFocus);
    document.addEventListener('visibilitychange', handleVisibilityAndFocus);

    return () => {
      window.removeEventListener('authChange', syncUser);
      window.removeEventListener('storage', syncUser);
      window.removeEventListener('focus', handleVisibilityAndFocus);
      document.removeEventListener('visibilitychange', handleVisibilityAndFocus);
    };
  }, []);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Verify permission
  let hasAccess = false;
  if (requiredPermission === 'ANY') {
    hasAccess = !!(user && user.memberships && user.memberships.length > 0);
  } else if (user && user.memberships) {
    for (const membership of user.memberships) {
      if (membership.scopeType === 'GLOBAL') {
        if (membership.permissions.includes(requiredPermission) || membership.permissions.includes('*')) {
          hasAccess = true;
          break;
        }
      }
      if (membership.scopeType === scopeType) {
        if (!scopeId || membership.scopeId === scopeId) {
          if (membership.permissions.includes(requiredPermission) || membership.permissions.includes('*')) {
            hasAccess = true;
            break;
          }
        }
      }
    }
  }

  if (!hasAccess) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 select-none">
        <div className="w-full max-w-md bg-white dark:bg-brand-charcoal border border-brand-accent/25 rounded-3xl p-8 text-center space-y-6 shadow-md">
          <div className="w-16 h-16 bg-brand-secondary/10 text-brand-secondary rounded-2xl border border-brand-secondary/25 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-9 h-9" />
          </div>
          <div className="space-y-2">
            <h2 className="font-display text-xl font-bold text-brand-primary">{t('auth.accessDeniedTitle')}</h2>
            <p className="text-xs text-brand-charcoal/70 dark:text-brand-cream/70 leading-relaxed">
              {t('auth.accessDeniedDesc')} ({requiredPermission})
            </p>
          </div>
          <div className="pt-2">
            <a
              href="/login"
              className="inline-block bg-brand-primary hover:bg-brand-primary/90 text-brand-cream px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider transition-all"
            >
              {t('auth.backToLogin')}
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
