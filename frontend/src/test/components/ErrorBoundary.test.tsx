import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';

const ProblemChild = () => {
  throw new Error('Crash in render');
};

describe('ErrorBoundary component', () => {
  it('renders children when there are no errors', () => {
    render(
      <ErrorBoundary>
        <div>Normal content rendered</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Normal content rendered')).toBeInTheDocument();
  });

  it('catches render error and displays fallback UI', () => {
    // Suppress React boundary console.error in test log
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary fallbackTitle="Custom Fallback Title" fallbackMessage="Custom Error Message">
        <ProblemChild />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom Fallback Title')).toBeInTheDocument();
    expect(screen.getByText('Custom Error Message')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
