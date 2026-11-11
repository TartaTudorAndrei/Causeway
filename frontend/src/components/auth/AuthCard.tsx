import React from 'react';

export interface AuthCardProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export const AuthCard: React.FC<AuthCardProps> = ({ children, title, subtitle }) => {
  return (
    <div className="w-full max-w-md bg-white/95 dark:bg-brand-charcoal/95 backdrop-blur-md rounded-3xl border border-brand-accent/25 p-8 sm:p-10 shadow-2xl relative overflow-hidden text-center transition-all select-none">
      <div className="absolute top-0 left-0 right-0 h-1 bg-brand-accent/40" />
      <div className="absolute inset-0 bg-argyle-light opacity-5 pointer-events-none rounded-3xl" />
      <div className="relative z-10 space-y-6">
        <div className="space-y-2">
          <h2 className="font-display text-2xl sm:text-3xl font-black text-brand-primary dark:text-brand-cream tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-brand-charcoal/70 dark:text-brand-cream/70 font-medium leading-relaxed max-w-xs mx-auto">
              {subtitle}
            </p>
          )}
        </div>
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
};

export default AuthCard;
