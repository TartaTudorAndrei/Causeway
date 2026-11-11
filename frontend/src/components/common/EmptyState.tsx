import React from 'react';
export interface EmptyStateProps {
    icon?: React.ComponentType<{
        className?: string;
    }>;
    title: string;
    description?: string;
    action?: React.ReactNode;
    isDarkMode?: boolean;
    className?: string;
}
export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action, isDarkMode = true, className = '', }) => {
    return (<div className={`p-10 text-center flex flex-col items-center justify-center rounded-2xl border ${isDarkMode
            ? 'bg-zinc-950/60 border-zinc-850 text-zinc-400'
            : 'bg-white border-zinc-200 text-zinc-500 shadow-xs'} ${className}`}>
      {Icon && (
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 border ${isDarkMode
              ? 'bg-zinc-900 border-zinc-800 text-zinc-500'
              : 'bg-zinc-100 border-zinc-200 text-zinc-400'}`}>
          <Icon className="w-6 h-6"/>
        </div>
      )}
      <h3 className={`text-sm font-bold mb-1 ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>
        {title}
      </h3>
      {description && (<p className="text-xs max-w-sm mb-4 leading-relaxed">{description}</p>)}
      {action && <div className="mt-2">{action}</div>}
    </div>);
};
