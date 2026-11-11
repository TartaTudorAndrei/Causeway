import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Clock } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export interface TimePickerProps {
  value: string; // Format: 'HH:mm'
  onChange: (time: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  isDarkMode?: boolean;
  className?: string;
  minuteStep?: 5 | 10 | 15 | 30;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  label,
  placeholder,
  required = false,
  disabled = false,
  isDarkMode = true,
  className = '',
  minuteStep = 15,
}) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [popoverStyles, setPopoverStyles] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hourListRef = useRef<HTMLDivElement>(null);
  const minuteListRef = useRef<HTMLDivElement>(null);

  const [currentHour, currentMinute] = (value || '08:00').split(':');
  const minutes = Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) =>
    (i * minuteStep).toString().padStart(2, '0')
  );

  const calculatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const popoverWidth = 256;
    const popoverHeight = 240;
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openUpward = spaceBelow < popoverHeight && spaceAbove > spaceBelow;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - popoverWidth - 8));

    const styles: React.CSSProperties = {
      position: 'fixed',
      left: `${left}px`,
      width: `${popoverWidth}px`,
      zIndex: 99999,
    };

    if (openUpward) {
      styles.bottom = `${window.innerHeight - rect.top + 6}px`;
    } else {
      styles.top = `${rect.bottom + 6}px`;
    }

    setPopoverStyles(styles);
  }, []);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    calculatePosition();

    const handleUpdate = () => calculatePosition();
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [isOpen, calculatePosition]);

  // Handle ESC
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

  // Scroll active elements into view when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (hourListRef.current) {
          const selectedHourEl = hourListRef.current.querySelector('[data-selected="true"]') as HTMLElement;
          if (selectedHourEl) {
            hourListRef.current.scrollTop = selectedHourEl.offsetTop - hourListRef.current.offsetHeight / 2 + 16;
          }
        }
        if (minuteListRef.current) {
          const selectedMinEl = minuteListRef.current.querySelector('[data-selected="true"]') as HTMLElement;
          if (selectedMinEl) {
            minuteListRef.current.scrollTop = selectedMinEl.offsetTop - minuteListRef.current.offsetHeight / 2 + 16;
          }
        }
      }, 50);
    }
  }, [isOpen]);

  const handleHourSelect = (h: string) => {
    const min = currentMinute || '00';
    onChange(`${h}:${min}`);
  };

  const handleMinuteSelect = (m: string) => {
    const h = currentHour || '08';
    onChange(`${h}:${m}`);
  };

  const inputStyle = isDarkMode
    ? 'bg-zinc-900 border-zinc-800 text-white hover:border-zinc-700'
    : 'bg-zinc-50 border-zinc-300 text-zinc-900 hover:border-zinc-400';

  const popoverBg = isDarkMode
    ? 'bg-zinc-950 border-zinc-800 text-white shadow-2xl'
    : 'bg-white border-zinc-200 text-zinc-900 shadow-2xl';

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold mb-1 text-zinc-400">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <div
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
        className={`w-full flex items-center justify-between px-3 py-2 min-h-[38px] text-xs rounded-xl border transition cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-hidden ${inputStyle} ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${isOpen ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
      >
        <div className="flex items-center space-x-2 truncate">
          <Clock className="w-4 h-4 text-blue-500 shrink-0" />
          <span className={`font-mono ${value ? 'font-semibold' : 'text-zinc-500'}`}>
            {value || placeholder || t('common.selectTime', 'Selectează ora')}
          </span>
        </div>
      </div>

      {/* Dropdown Popover */}
      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            style={popoverStyles}
            className={`rounded-2xl border p-3 shadow-2xl animate-in fade-in zoom-in-95 duration-100 ${popoverBg}`}
          >
            {/* Hour & Minute Column Selectors */}
            <div className="grid grid-cols-2 gap-2">
              {/* Hours Column */}
              <div>
                <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-center mb-1">
                  {t('common.hour', 'Oră')}
                </span>
                <div
                  ref={hourListRef}
                  className="h-44 overflow-y-auto space-y-0.5 rounded-xl bg-zinc-900/60 p-1 border border-zinc-800/40 scrollbar-thin scrollbar-thumb-zinc-700"
                >
                  {HOURS.map((h) => {
                    const isSelected = currentHour === h;
                    return (
                      <button
                        key={h}
                        type="button"
                        data-selected={isSelected}
                        onClick={() => handleHourSelect(h)}
                        className={`w-full py-1.5 text-xs font-mono rounded-lg flex items-center justify-between px-2 transition cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white font-bold shadow-xs'
                            : 'text-zinc-300 hover:bg-zinc-800/70 hover:text-white'
                        }`}
                      >
                        <span>{h}:00</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Minutes Column */}
              <div>
                <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-center mb-1">
                  {t('common.minute', 'Minut')}
                </span>
                <div
                  ref={minuteListRef}
                  className="h-44 overflow-y-auto space-y-0.5 rounded-xl bg-zinc-900/60 p-1 border border-zinc-800/40 scrollbar-thin scrollbar-thumb-zinc-700"
                >
                  {minutes.map((m) => {
                    const isSelected = currentMinute === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        data-selected={isSelected}
                        onClick={() => handleMinuteSelect(m)}
                        className={`w-full py-1.5 text-xs font-mono rounded-lg flex items-center justify-between px-2 transition cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white font-bold shadow-xs'
                            : 'text-zinc-300 hover:bg-zinc-800/70 hover:text-white'
                        }`}
                      >
                        <span>:{m}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Done Button */}
            <div className="pt-2 mt-2 border-t border-zinc-800/60 flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold shadow-xs transition cursor-pointer"
              >
                {t('common.apply', 'Gata')}
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
