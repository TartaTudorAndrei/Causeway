import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export interface SelectOption {
  value: string;
  label: string;
}

export interface CustomSelectProps {
  label?: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: (string | SelectOption)[];
  placeholder?: string;
  isDarkMode?: boolean;
  disabled?: boolean;
  className?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  label,
  required = false,
  value,
  onChange,
  options,
  placeholder,
  isDarkMode = true,
  disabled = false,
  className = '',
}) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyles, setDropdownStyles] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const normalizedOptions: SelectOption[] = options.map((opt) => {
    if (typeof opt === 'string') {
      return { value: opt, label: opt };
    }
    return opt;
  });

  const calculatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dropdownHeight = 224;
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
    const maxHeight = Math.min(220, Math.max(100, openUpward ? spaceAbove : spaceBelow));
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8));

    const styles: React.CSSProperties = {
      position: 'fixed',
      left: `${left}px`,
      width: `${rect.width}px`,
      maxHeight: `${maxHeight}px`,
      zIndex: 99999,
    };

    if (openUpward) {
      styles.bottom = `${window.innerHeight - rect.top + 6}px`;
    } else {
      styles.top = `${rect.bottom + 6}px`;
    }

    setDropdownStyles(styles);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : (placeholder || t('common.select', 'Selectează...'));

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  const isDark = isDarkMode;
  const inputBg = isDark
    ? 'bg-zinc-900 border-zinc-800 text-white hover:border-zinc-700'
    : 'bg-zinc-100 border-zinc-300 text-zinc-900 hover:border-zinc-400';
  const dropdownBg = isDark ? 'bg-zinc-900 border-zinc-800 text-white shadow-2xl' : 'bg-white border-zinc-200 text-zinc-900 shadow-2xl';
  const itemHover = isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100';
  const textSub = isDark ? 'text-zinc-400' : 'text-zinc-500';

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          } else if (e.key === 'Escape') {
            setIsOpen(false);
          }
        }}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full min-h-[38px] px-3 py-2 rounded-xl border text-xs flex items-center justify-between transition cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-hidden ${inputBg} ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${isOpen ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
      >
        <span className={!selectedOption && !value ? textSub : 'font-medium truncate'}>{displayLabel}</span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 shrink-0 ${textSub} ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            style={dropdownStyles}
            className={`rounded-xl border shadow-2xl overflow-y-auto animate-in fade-in zoom-in-95 duration-100 ${dropdownBg}`}
          >
            <div className="py-1">
              {normalizedOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition cursor-pointer ${itemHover} ${
                      isSelected ? (isDark ? 'bg-blue-600/15 text-blue-400 font-semibold' : 'bg-blue-50 text-blue-600 font-semibold') : ''
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-blue-500" />}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
