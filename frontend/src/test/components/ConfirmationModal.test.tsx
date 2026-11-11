import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { LanguageProvider } from '../../context/LanguageContext';

describe('ConfirmationModal component', () => {
  it('does not render when isOpen is false', () => {
    render(
      <LanguageProvider>
        <ConfirmationModal
          isOpen={false}
          title="Delete Item"
          message="Are you sure?"
          onConfirm={vi.fn()}
          onClose={vi.fn()}
        />
      </LanguageProvider>
    );
    expect(screen.queryByText('Delete Item')).toBeNull();
  });

  it('renders correctly and calls callbacks on user clicks', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <LanguageProvider>
        <ConfirmationModal
          isOpen={true}
          title="Confirm Action"
          message="Are you sure you want to proceed?"
          confirmText="Yes, Do It"
          cancelText="No, Cancel"
          onConfirm={onConfirm}
          onClose={onClose}
          variant="danger"
        />
      </LanguageProvider>
    );

    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();

    const cancelBtn = screen.getByText('No, Cancel');
    cancelBtn.click();
    expect(onClose).toHaveBeenCalledTimes(1);

    const confirmBtn = screen.getByText('Yes, Do It');
    confirmBtn.click();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('requires confirmation text to enable confirm button when requireConfirmationText is set', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    const { rerender } = render(
      <LanguageProvider>
        <ConfirmationModal
          isOpen={true}
          title="Delete Account"
          message="This action is permanent."
          confirmText="Delete"
          cancelText="Cancel"
          requireConfirmationText="confirm"
          confirmationPrompt="Type confirm to proceed:"
          onConfirm={onConfirm}
          onClose={onClose}
          variant="danger"
        />
      </LanguageProvider>
    );

    const confirmBtn = screen.getByText('Delete') as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);

    const input = screen.getByTestId('confirmation-input') as HTMLInputElement;
    expect(input).toBeInTheDocument();

    // Type wrong text
    fireEvent.change(input, { target: { value: 'wrong' } });
    expect(confirmBtn.disabled).toBe(true);

    // Type matching confirmation (case-insensitive)
    fireEvent.change(input, { target: { value: 'CONFIRM' } });
    expect(confirmBtn.disabled).toBe(false);

    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
