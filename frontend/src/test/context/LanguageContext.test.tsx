import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LanguageProvider, useLanguage } from '../../context/LanguageContext';

const TestComponent = () => {
  const { language, setLanguage, t } = useLanguage();
  return (
    <div>
      <span data-testid="current-lang">{language}</span>
      <span data-testid="translated-title">{t('account.logout')}</span>
      <button onClick={() => setLanguage('en')}>Switch EN</button>
      <button onClick={() => setLanguage('ro')}>Switch RO</button>
    </div>
  );
};

describe('LanguageContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders with default language and updates translations upon switch', async () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    const langSpan = screen.getByTestId('current-lang');
    expect(langSpan.textContent).toBe('ro');

    const titleSpan = screen.getByTestId('translated-title');
    expect(titleSpan.textContent).toBe('Deconectare');

    const switchEnBtn = screen.getByText('Switch EN');
    await act(async () => {
      switchEnBtn.click();
    });

    expect(screen.getByTestId('current-lang').textContent).toBe('en');
    expect(screen.getByTestId('translated-title').textContent).toMatch(/Sign Out|Log Out|Logout/i);
  });
});
