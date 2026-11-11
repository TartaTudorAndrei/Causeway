import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface PasswordFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const PasswordField: React.FC<PasswordFieldProps> = ({ label, error, ...props }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-1 text-left">
      <label className="block text-xs font-bold uppercase tracking-wider text-brand-primary/70 dark:text-brand-cream/70">
        {label}
      </label>
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          className={`w-full px-4 py-2.5 bg-white dark:bg-brand-charcoal border ${
            error ? 'border-brand-red focus:ring-brand-red/20' : 'border-brand-accent/30 focus:ring-brand-accent/20'
          } rounded-xl text-brand-charcoal dark:text-brand-cream focus:outline-none focus:ring-4 transition-all pr-10 text-sm`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-primary/50 dark:text-brand-cream/50 hover:text-brand-primary dark:hover:text-brand-cream transition-colors"
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-brand-red mt-1 font-medium">{error}</p>}
    </div>
  );
};

export default PasswordField;
