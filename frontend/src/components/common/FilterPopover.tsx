import React, { useState, useRef, useEffect } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
export interface FilterPopoverProps {
    activeCount?: number;
    onReset?: () => void;
    title?: string;
    label?: string;
    isDarkMode?: boolean;
    children: React.ReactNode;
    className?: string;
    align?: 'left' | 'right';
}
export const FilterPopover: React.FC<FilterPopoverProps> = ({ activeCount = 0, onReset, title, label, isDarkMode = true, children, className = '', }) => {
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const displayLabel = label || t('common.filters', 'Filtre');
    const displayTitle = title || t('common.filterOptions', 'Opțiuni Filtrare');
    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);
    // Handle ESC key to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);
    const tCss = {
        triggerBtn: isDarkMode
            ? 'border-zinc-800 bg-zinc-900/90 text-zinc-300 hover:text-white hover:bg-zinc-850 hover:border-zinc-700'
            : 'border-zinc-200 bg-white text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 hover:border-zinc-300 shadow-xs',
        triggerActive: isDarkMode
            ? 'border-blue-500/50 bg-blue-500/10 text-blue-400 font-bold'
            : 'border-blue-400 bg-blue-50 text-blue-600 font-bold',
    };
    const modalBorder = isDarkMode ? 'border-zinc-800' : 'border-zinc-200';
    const modalBg = isDarkMode ? 'bg-black text-white border-zinc-800 shadow-2xl' : 'bg-white text-zinc-900 border-zinc-200 shadow-xl';
    return (
      <div className={`relative inline-block ${className}`}>
        {/* Filter Trigger Button */}
        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className={`flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-1.5 rounded-xl border text-[11px] sm:text-xs font-semibold transition-all cursor-pointer select-none whitespace-nowrap shrink-0 ${activeCount > 0 ? tCss.triggerActive : tCss.triggerBtn}`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
            <span className={label ? 'hidden sm:inline' : ''}>{displayLabel}</span>
            {label && <span className="inline sm:hidden">{t('common.filters', 'Filtre')}</span>}
            {activeCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-extrabold shrink-0">
                {activeCount}
              </span>
            )}
          </button>

          {activeCount > 0 && onReset && (
            <button
              type="button"
              onClick={onReset}
              title={t('common.clearFilters', 'Resetează filtrele')}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
            />
          )}
        </div>

        {/* Centered Modal with Blurred Backdrop across ALL devices */}
        {isOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsOpen(false);
              }
            }}
          >
            <div
              ref={modalRef}
              onClick={(e) => e.stopPropagation()}
              className={`w-full h-full sm:h-auto sm:max-h-[90vh] max-w-lg rounded-none sm:rounded-2xl border-0 sm:border shadow-2xl flex flex-col overflow-hidden transition-all transform scale-100 animate-in zoom-in-95 duration-150 ${modalBg}`}
            >
              {/* Modal Header */}
              <div className="px-5 sm:px-6 pt-5 pb-3.5 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-2.5 min-w-0 pr-3">
                  <h3 className="font-bold text-base sm:text-lg tracking-tight truncate">
                    {displayTitle}
                  </h3>
                  {activeCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                      {activeCount} {t('common.active', 'active')}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label={t('common.close', 'Închide')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                    isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className={`mx-5 sm:mx-6 border-b ${modalBorder}`} />

              {/* Modal Scrollable Filter Body */}
              <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-4 text-sm">
                {children}
              </div>

              <div className={`mx-5 sm:mx-6 border-t ${modalBorder}`} />

              {/* Modal Footer Actions: Reset (left) & Apply (right) */}
              <div className="px-5 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
                <div>
                  {onReset && (
                    <button
                      type="button"
                      onClick={() => onReset()}
                      className="px-3.5 py-1.5 rounded-xl border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold transition cursor-pointer"
                    >
                      <span>{t('common.reset', 'Resetează')}</span>
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer flex items-center space-x-1.5 shrink-0"
                >
                  <span>{t('common.applyFilters', 'Aplică Filtre')}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
};
