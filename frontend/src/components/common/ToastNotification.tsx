import React, { useEffect, useState, useRef, useCallback } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export interface ToastMessage {
  text: string;
  type?: 'success' | 'error' | 'info';
}

export interface ToastNotificationProps {
  toast: ToastMessage | null;
  onClose?: () => void;
  duration?: number;
}

/**
 * Calculates reading duration tailored to message length.
 * Base: 1200ms recognition time
 * ~250ms per word (average reading speed ~240 wpm)
 * Clamped between 1800ms (1.8s) and 3200ms (3.2s)
 */
export const calculateReadingDuration = (text: string): number => {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.min(3200, Math.max(1800, 1200 + words * 250));
};

export const ToastNotification: React.FC<ToastNotificationProps> = ({
  toast,
  onClose,
  duration,
}) => {
  const [activeToast, setActiveToast] = useState<ToastMessage | null>(toast);
  const shownAtRef = useRef<number>(0);
  const isDismissingRef = useRef<boolean>(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const dismiss = useCallback(() => {
    if (isDismissingRef.current) return;
    isDismissingRef.current = true;
    setActiveToast(null);
    onCloseRef.current?.();
  }, []);

  // Sync with prop updates
  useEffect(() => {
    if (toast) {
      isDismissingRef.current = false;
      setActiveToast(toast);
      shownAtRef.current = Date.now();
    } else {
      isDismissingRef.current = true;
      setActiveToast(null);
    }
  }, [toast]);

  // Reading timer auto-dismiss
  useEffect(() => {
    if (!activeToast) return;

    const timeoutMs = duration ?? calculateReadingDuration(activeToast.text);
    const timer = setTimeout(() => {
      dismiss();
    }, timeoutMs);

    return () => clearTimeout(timer);
  }, [activeToast, duration, dismiss]);

  // Dismiss immediately when user interacts with ANY button, action, or tab
  useEffect(() => {
    if (!activeToast) return;

    const handleInteraction = (e: Event) => {
      // Ignore click that triggered the toast in initial 200ms grace period
      if (Date.now() - shownAtRef.current < 200) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const isButton = !!target.closest(
        'button, [role="button"], [role="tab"], [role="menuitem"], input[type="button"], input[type="submit"], a'
      );
      const isToast = !!target.closest('[data-toast-notification]');

      if (isButton || isToast) {
        dismiss();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (Date.now() - shownAtRef.current < 200) return;

      if (e.key === 'Escape') {
        dismiss();
        return;
      }

      if (e.key === 'Enter' || e.key === ' ') {
        const target = e.target as HTMLElement | null;
        if (
          target?.closest(
            'button, [role="button"], [role="tab"], [role="menuitem"], input[type="button"], input[type="submit"], a'
          )
        ) {
          dismiss();
        }
      }
    };

    window.addEventListener('click', handleInteraction, { capture: true });
    window.addEventListener('pointerdown', handleInteraction, { capture: true });
    window.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener('click', handleInteraction, { capture: true });
      window.removeEventListener('pointerdown', handleInteraction, { capture: true });
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [activeToast, dismiss]);

  if (!activeToast) return null;

  return (
    <div
      data-toast-notification="true"
      role="alert"
      onClick={dismiss}
      className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-3 text-xs font-bold border transition-all animate-in fade-in slide-in-from-top-2 cursor-pointer select-none ${
        activeToast.type === 'error'
          ? 'bg-rose-600 text-white border-rose-500'
          : activeToast.type === 'info'
          ? 'bg-blue-600 text-white border-blue-500'
          : 'bg-emerald-600 text-white border-emerald-500'
      }`}
    >
      {activeToast.type === 'error' ? (
        <AlertCircle className="w-4 h-4 shrink-0" />
      ) : (
        <CheckCircle2 className="w-4 h-4 shrink-0" />
      )}
      <span>{activeToast.text}</span>
    </div>
  );
};
