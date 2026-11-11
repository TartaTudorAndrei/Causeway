import React from 'react';

export interface MetricCardProps {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  subtext?: string;
  iconBgColor?: string;
  iconTextColor?: string;
  isDarkMode?: boolean;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  icon: Icon,
  label,
  value,
  subtext,
  iconBgColor = 'bg-blue-500/10 border-blue-500/20',
  iconTextColor = 'text-blue-500',
  isDarkMode = true,
  className = '',
}) => {
  return (
    <div
      className={`p-4 rounded-2xl border ${Icon ? 'flex items-center space-x-4' : 'space-y-1'} ${
        isDarkMode
          ? 'bg-zinc-950 border-zinc-850'
          : 'bg-white border-zinc-200 shadow-xs'
      } ${className}`}
    >
      {Icon && (
        <div
          className={`p-3 rounded-xl border shrink-0 ${iconBgColor} ${iconTextColor}`}
        >
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
      )}
      <div className="min-w-0">
        <p
          className={`text-[11px] font-bold uppercase tracking-wider truncate ${
            isDarkMode ? 'text-zinc-400' : 'text-zinc-500'
          }`}
        >
          {label}
        </p>
        <h3
          className={`text-xl sm:text-2xl font-black truncate leading-tight mt-0.5 ${
            isDarkMode ? 'text-white' : 'text-zinc-900'
          }`}
        >
          {value}
        </h3>
        {subtext && (
          <p
            className={`text-[11px] mt-0.5 truncate ${
              isDarkMode ? 'text-zinc-500' : 'text-zinc-400'
            }`}
          >
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
};
