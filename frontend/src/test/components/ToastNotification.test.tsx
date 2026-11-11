import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastNotification, calculateReadingDuration } from '../../components/common/ToastNotification';

describe('ToastNotification component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calculates reading duration based on word count with bounds', () => {
    // 4 words: 1200 + 4 * 250 = 2200ms
    expect(calculateReadingDuration('Înscriere realizată cu succes!')).toBe(2200);

    // Short message: clamped at min 1800ms
    expect(calculateReadingDuration('OK')).toBe(1800);

    // Long message: clamped at max 3200ms
    expect(
      calculateReadingDuration(
        'Acesta este un mesaj foarte lung care depășește numărul normal de cuvinte pentru a testa plafonarea superioară'
      )
    ).toBe(3200);
  });

  it('does not render when toast is null', () => {
    render(<ToastNotification toast={null} />);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('renders toast text and auto-dismisses after calculated reading duration', () => {
    const onClose = vi.fn();
    render(
      <ToastNotification
        toast={{ text: 'Înscriere realizată cu succes!', type: 'success' }}
        onClose={onClose}
      />
    );

    expect(screen.getByText('Înscriere realizată cu succes!')).toBeInTheDocument();

    // Advance right before calculated duration (2200ms)
    act(() => {
      vi.advanceTimersByTime(2100);
    });
    expect(screen.getByText('Înscriere realizată cu succes!')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    // Advance past reading duration
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Înscriere realizată cu succes!')).toBeNull();
  });

  it('dismisses immediately when user clicks any button in the document', () => {
    const onClose = vi.fn();
    render(
      <div>
        <button data-testid="any-btn">Click me</button>
        <ToastNotification
          toast={{ text: 'Înscriere realizată cu succes!', type: 'success' }}
          onClose={onClose}
        />
      </div>
    );

    expect(screen.getByText('Înscriere realizată cu succes!')).toBeInTheDocument();

    // Pass initial 200ms grace period so click is recognized as subsequent interaction
    act(() => {
      vi.advanceTimersByTime(250);
    });

    const anyButton = screen.getByTestId('any-btn');
    act(() => {
      fireEvent.click(anyButton);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Înscriere realizată cu succes!')).toBeNull();
  });

  it('dismisses when user clicks element with role="button" or tab', () => {
    const onClose = vi.fn();
    render(
      <div>
        <div role="button" data-testid="custom-btn">Custom role button</div>
        <ToastNotification
          toast={{ text: 'Operatiune reusita', type: 'info' }}
          onClose={onClose}
        />
      </div>
    );

    act(() => {
      vi.advanceTimersByTime(250);
    });

    const customBtn = screen.getByTestId('custom-btn');
    act(() => {
      fireEvent.click(customBtn);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Operatiune reusita')).toBeNull();
  });

  it('dismisses when user clicks directly on the toast notification', () => {
    const onClose = vi.fn();
    render(
      <ToastNotification
        toast={{ text: 'Eroare la salvare', type: 'error' }}
        onClose={onClose}
      />
    );

    const toastEl = screen.getByRole('alert');
    act(() => {
      vi.advanceTimersByTime(250);
    });

    act(() => {
      fireEvent.click(toastEl);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Eroare la salvare')).toBeNull();
  });

  it('ignores clicks within the first 200ms grace period to avoid instant dismiss from triggering action', () => {
    const onClose = vi.fn();
    render(
      <div>
        <button data-testid="trigger-btn">Trigger</button>
        <ToastNotification
          toast={{ text: 'Salvat', type: 'success' }}
          onClose={onClose}
        />
      </div>
    );

    // Click immediately within grace period (< 200ms)
    const triggerBtn = screen.getByTestId('trigger-btn');
    act(() => {
      vi.advanceTimersByTime(50);
      fireEvent.click(triggerBtn);
    });

    // Toast must still be visible
    expect(screen.getByText('Salvat')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    // Now advance past grace period and click again
    act(() => {
      vi.advanceTimersByTime(200);
      fireEvent.click(triggerBtn);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Salvat')).toBeNull();
  });
});
