import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';
  isDarkMode?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  zIndex?: string;
}

const MAX_WIDTH_MAP: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  full: 'max-w-full',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  iconColor = 'text-blue-500',
  maxWidth = '2xl',
  isDarkMode = true,
  children,
  footer,
  className = '',
  zIndex = 'z-50',
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClass = MAX_WIDTH_MAP[maxWidth] || 'max-w-2xl';

  const modalBorder = isDarkMode ? 'border-zinc-800' : 'border-zinc-200';

  return createPortal(
    <div
      className={`fixed inset-0 ${zIndex} flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150`}
      onClick={onClose}
    >
      <div
        className={`w-full h-full sm:h-auto sm:max-h-[90vh] ${maxWidthClass} rounded-none sm:rounded-2xl border-0 sm:border shadow-2xl overflow-hidden flex flex-col pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] sm:pt-0 sm:pb-0 transition-all transform scale-100 animate-in zoom-in-95 duration-150 ${
          isDarkMode ? 'bg-black text-white border-zinc-800 shadow-2xl' : 'bg-white text-zinc-900 border-zinc-200 shadow-xl'
        } ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        {(title || Icon) && (
          <>
            <div
              className="px-5 sm:px-6 pt-5 pb-3.5 flex items-center justify-between shrink-0"
            >
              <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
                {Icon && (
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 ${
                      isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${iconColor}`} />
                  </div>
                )}
                <div className="min-w-0">
                  {title && (
                    <h2 className="text-base sm:text-lg font-bold tracking-tight truncate">
                      {title}
                    </h2>
                  )}
                  {subtitle && (
                    <p
                      className={`text-xs truncate ${
                        isDarkMode ? 'text-zinc-400' : 'text-zinc-500'
                      }`}
                    >
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Închide"
                className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ml-2 ${
                  isDarkMode
                    ? 'hover:bg-zinc-900 text-zinc-400 hover:text-white'
                    : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className={`mx-5 sm:mx-6 border-b ${modalBorder}`} />
          </>
        )}

        {/* Modal Body */}
        <div className="px-5 sm:px-6 py-4 overflow-y-auto flex-1">{children}</div>

        {/* Modal Footer */}
        {footer && (
          <>
            <div className={`mx-5 sm:mx-6 border-t ${modalBorder}`} />
            <div
              className="px-5 sm:px-6 py-3.5 flex items-center justify-end space-x-2 shrink-0"
            >
              {footer}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};
