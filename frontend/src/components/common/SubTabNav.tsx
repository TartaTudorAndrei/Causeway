import React from 'react';
import { Lock } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export interface SubTabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  color?: string;
  disabled?: boolean;
  disabledReason?: string;
}

export interface SubTabNavProps<T extends string = string> {
  tabs: SubTabItem<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  actionSlot?: React.ReactNode;
  isDarkMode?: boolean;
  className?: string;
}

export const SubTabNav = <T extends string = string>({
  tabs,
  activeTab,
  onChange,
  actionSlot,
  isDarkMode = true,
  className = '',
}: SubTabNavProps<T>) => {
  const { t } = useLanguage();
  const navBg = isDarkMode ? 'bg-zinc-900/40 border-zinc-800/50' : 'bg-zinc-100/80 border-zinc-200';

  return (
    <div
      className={`p-1 sm:p-2 rounded-xl sm:rounded-2xl border flex items-center justify-between gap-1.5 sm:gap-2 shrink-0 ${navBg} ${className}`}
    >
      <div className="flex items-center space-x-1 sm:space-x-1.5 overflow-x-auto no-scrollbar py-0.5 min-w-0 flex-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isDisabled = !!tab.disabled;

          return (
            <button
              key={tab.id}
              type="button"
              disabled={isDisabled}
              title={isDisabled ? (tab.disabledReason || t('common.noTabAccess', 'Nu ai acces la acest tab')) : undefined}
              onClick={() => {
                if (!isDisabled) onChange(tab.id);
              }}
              className={`flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3.5 py-1 sm:py-2 min-h-[30px] sm:min-h-[36px] rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition whitespace-nowrap shrink-0 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-hidden ${
                isDisabled
                  ? 'opacity-40 cursor-not-allowed text-zinc-500 border border-transparent'
                  : isActive
                  ? isDarkMode
                    ? 'bg-zinc-800 text-white shadow-xs border border-zinc-700 cursor-pointer'
                    : 'bg-white text-zinc-900 shadow-xs border border-zinc-200 cursor-pointer'
                  : isDarkMode
                  ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30 cursor-pointer'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60 cursor-pointer'
              }`}
            >
              {isDisabled ? (
                <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 opacity-70" />
              ) : (
                Icon && (
                  <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${tab.color || (isActive ? 'text-amber-500' : 'text-zinc-400')}`} />
                )
              )}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {actionSlot && (
        <div className="flex items-center space-x-1 sm:space-x-2 shrink-0 justify-end min-w-0">
          {actionSlot}
        </div>
      )}
    </div>
  );
};
