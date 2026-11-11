import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ArrowRight, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (range: DateRange) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
  isDarkMode?: boolean;
  className?: string;
  clearable?: boolean;
}

const MONTH_NAMES_RO = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
];

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK_RO = ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du'];
const DAYS_OF_WEEK_EN = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
  label,
  placeholder,
  required = false,
  disabled = false,
  minDate,
  maxDate,
  isDarkMode = true,
  className = '',
  clearable = true,
}) => {
  const { language, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [tempStart, setTempStart] = useState<string | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [popoverStyles, setPopoverStyles] = useState<React.CSSProperties>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const parseDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return new Date();
    return new Date(y, m - 1, d);
  };

  const initialDate = parseDate(startDate || endDate);
  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth());

  useEffect(() => {
    if (startDate) {
      const parsed = parseDate(startDate);
      setViewYear(parsed.getFullYear());
      setViewMonth(parsed.getMonth());
    }
  }, [startDate]);

  useEffect(() => {
    if (isOpen) {
      setTempStart(null);
      setHoverDate(null);
    }
  }, [isOpen]);

  const calculatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const popoverWidth = 288;
    const popoverHeight = 350;
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

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        if (tempStart) {
          onChange({ startDate: tempStart, endDate: tempStart });
          setTempStart(null);
          setHoverDate(null);
        }
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [tempStart, onChange]);

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

  // Handle ESC key
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

  const monthNames = language === 'ro' ? MONTH_NAMES_RO : MONTH_NAMES_EN;
  const dayNames = language === 'ro' ? DAYS_OF_WEEK_RO : DAYS_OF_WEEK_EN;

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const pad = (n: number) => n.toString().padStart(2, '0');

  const handleSelectDay = (day: number, monthOffset: number = 0) => {
    let targetYear = viewYear;
    let targetMonth = viewMonth + monthOffset;

    if (targetMonth < 0) {
      targetMonth = 11;
      targetYear -= 1;
    } else if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }

    const formatted = `${targetYear}-${pad(targetMonth + 1)}-${pad(day)}`;

    if (minDate && formatted < minDate) return;
    if (maxDate && formatted > maxDate) return;

    if (!tempStart) {
      // First click: select start date (wait for end date)
      setTempStart(formatted);
    } else {
      // Second click
      if (formatted >= tempStart) {
        // Clicked same date or later date -> range confirmed
        onChange({ startDate: tempStart, endDate: formatted });
        setIsOpen(false);
        setTempStart(null);
        setHoverDate(null);
      } else {
        // Clicked earlier date -> reset start to this new earlier date
        setTempStart(formatted);
      }
    }
  };

  const handleQuickPreset = (days: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const now = new Date();
    const startStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    if (days === 0) {
      onChange({ startDate: startStr, endDate: startStr });
    } else {
      const endTarget = new Date(now.getTime() + days * 86400000);
      const endStr = `${endTarget.getFullYear()}-${pad(endTarget.getMonth() + 1)}-${pad(endTarget.getDate())}`;
      onChange({ startDate: startStr, endDate: endStr });
    }

    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setIsOpen(false);
    setTempStart(null);
    setHoverDate(null);
  };

  const handleClearClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({ startDate: '', endDate: '' });
    setTempStart(null);
    setHoverDate(null);
    setIsOpen(false);
  };

  // Generate calendar grid
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // Monday = 0
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const prevMonthDays = [];
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    prevMonthDays.push(daysInPrevMonth - i);
  }

  const currentMonthDays = [];
  for (let i = 1; i <= daysInMonth; i++) {
    currentMonthDays.push(i);
  }

  const totalGridCount = prevMonthDays.length + currentMonthDays.length;
  const nextMonthDaysCount = totalGridCount % 7 === 0 ? 0 : 7 - (totalGridCount % 7);
  const nextMonthDays = [];
  for (let i = 1; i <= nextMonthDaysCount; i++) {
    nextMonthDays.push(i);
  }

  // Format display string
  const formatDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return dateStr;
    const monthName = monthNames[m - 1]?.substring(0, 3);
    return `${d} ${monthName} ${y}`;
  };

  const isDateDisabled = (dStr: string) => {
    if (minDate && dStr < minDate) return true;
    if (maxDate && dStr > maxDate) return true;
    return false;
  };

  const activeStart = tempStart || startDate;
  const activeEnd = tempStart
    ? (hoverDate && hoverDate >= tempStart ? hoverDate : tempStart)
    : (endDate || startDate);

  const hasRange = Boolean(startDate && endDate && startDate !== endDate);
  const hasValue = Boolean(startDate);

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

      {/* Trigger Button: exact same look as old DatePicker */}
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
        <div className="flex items-center space-x-2 truncate min-w-0">
          <CalendarIcon className="w-4 h-4 text-blue-500 shrink-0" />
          {tempStart ? (
            <div className="flex items-center space-x-1.5 truncate font-medium text-amber-400">
              <span>{formatDisplay(tempStart)}</span>
              <ArrowRight className="w-3 h-3 text-zinc-400 shrink-0" />
              <span className="text-zinc-500 text-[11px] italic">{t('common.selectEndDate', 'Selectează data de sfârșit')}</span>
            </div>
          ) : hasValue ? (
            hasRange ? (
              <div className="flex items-center space-x-1.5 truncate font-medium">
                <span>{formatDisplay(startDate)}</span>
                <ArrowRight className="w-3 h-3 text-zinc-400 shrink-0" />
                <span>{formatDisplay(endDate)}</span>
              </div>
            ) : (
              <span className="font-medium truncate">{formatDisplay(startDate)}</span>
            )
          ) : (
            <span className="text-zinc-500">{placeholder || t('common.selectDate', 'Selectează data')}</span>
          )}
        </div>

        <div className="flex items-center space-x-1 shrink-0">
          {clearable && hasValue && !disabled && (
            <button
              type="button"
              onClick={handleClearClick}
              className="p-0.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Popover Calendar */}
      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={popoverStyles}
            className={`rounded-2xl border p-3.5 shadow-2xl animate-in fade-in zoom-in-95 duration-100 ${popoverBg}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800/60">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-lg hover:bg-zinc-800/80 text-zinc-400 hover:text-white transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="text-xs font-bold tracking-tight">
                {monthNames[viewMonth]} {viewYear}
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-lg hover:bg-zinc-800/80 text-zinc-400 hover:text-white transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Days of Week */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
              {dayNames.map((d, i) => (
                <span key={i} className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider py-1">
                  {d}
                </span>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-y-1 gap-x-0">
              {/* Prev month days */}
              {prevMonthDays.map((d) => (
                <button
                  key={`prev-${d}`}
                  type="button"
                  onClick={() => handleSelectDay(d, -1)}
                  className="h-8 flex items-center justify-center text-[11px] text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/40 rounded-lg transition cursor-pointer"
                >
                  {d}
                </button>
              ))}

              {/* Current month days */}
              {currentMonthDays.map((d) => {
                const dStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(d)}`;
                const isDisabled = isDateDisabled(dStr);

                const isStart = activeStart === dStr;
                const isEnd = activeEnd === dStr;
                const isInRange = Boolean(activeStart && activeEnd && dStr > activeStart && dStr < activeEnd);
                const isSingleSelected = isStart && isEnd;

                let cellBg = '';
                let cellText = 'text-zinc-200 hover:bg-zinc-800 hover:text-white rounded-lg';

                if (isSingleSelected) {
                  cellBg = 'bg-blue-600 text-white font-bold rounded-xl shadow-md shadow-blue-500/20';
                  cellText = '';
                } else if (isStart) {
                  cellBg = 'bg-blue-600 text-white font-bold rounded-l-xl shadow-md shadow-blue-500/20';
                  cellText = '';
                } else if (isEnd) {
                  cellBg = 'bg-blue-600 text-white font-bold rounded-r-xl shadow-md shadow-blue-500/20';
                  cellText = '';
                } else if (isInRange) {
                  cellBg = 'bg-blue-500/20 text-blue-200 font-medium rounded-none';
                  cellText = '';
                }

                if (isDisabled) {
                  cellBg = '';
                  cellText = 'text-zinc-700 opacity-40 cursor-not-allowed';
                }

                return (
                  <button
                    key={`curr-${d}`}
                    type="button"
                    disabled={isDisabled}
                    onMouseEnter={() => {
                      if (tempStart) {
                        setHoverDate(dStr);
                      }
                    }}
                    onClick={() => handleSelectDay(d, 0)}
                    className={`h-8 flex items-center justify-center text-xs transition-colors cursor-pointer ${cellBg} ${cellText}`}
                  >
                    {d}
                  </button>
                );
              })}

              {/* Next month days */}
              {nextMonthDays.map((d) => (
                <button
                  key={`next-${d}`}
                  type="button"
                  onClick={() => handleSelectDay(d, 1)}
                  className="h-8 flex items-center justify-center text-[11px] text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/40 rounded-lg transition cursor-pointer"
                >
                  {d}
                </button>
              ))}
            </div>

            {/* Quick Presets */}
            <div className="pt-2.5 mt-2.5 border-t border-zinc-800/60 flex items-center justify-between flex-wrap gap-1 text-xs">
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={(e) => handleQuickPreset(0, e)}
                  className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer"
                >
                  {t('general.today', 'Azi')}
                </button>
                <button
                  type="button"
                  onClick={(e) => handleQuickPreset(3, e)}
                  className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer"
                >
                  +3 {t('common.days', 'zile')}
                </button>
                <button
                  type="button"
                  onClick={(e) => handleQuickPreset(7, e)}
                  className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer"
                >
                  +7 {t('common.days', 'zile')}
                </button>
              </div>

              {hasValue && clearable && (
                <button
                  type="button"
                  onClick={handleClearClick}
                  className="text-[10px] font-semibold text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                >
                  {t('common.clear', 'Șterge')}
                </button>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
