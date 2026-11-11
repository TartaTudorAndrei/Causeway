import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmailTemplatesView } from '../../components/email/EmailTemplatesView';
import { LanguageProvider } from '../../context/LanguageContext';
import type { EmailTemplate } from '../../types/email';

const sampleTemplate: EmailTemplate = {
  id: 'tmpl-1',
  name: 'Sponsor Gold Invitation',
  department: 'fundraising',
  subject: 'Parteneriat 2026',
  blocks: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('EmailTemplatesView', () => {
  it('renders copy button and calls onCopyTemplate on click', () => {
    const handleCopy = vi.fn();

    render(
      <LanguageProvider>
        <EmailTemplatesView
          templates={[sampleTemplate]}
          onCopyTemplate={handleCopy}
          isDarkMode={true}
        />
      </LanguageProvider>
    );

    expect(screen.getAllByText('Sponsor Gold Invitation').length).toBeGreaterThan(0);

    // Query copy button by title
    const copyButtons = screen.getAllByTitle(/copie|copy/i);
    expect(copyButtons.length).toBeGreaterThan(0);

    fireEvent.click(copyButtons[0]);
    expect(handleCopy).toHaveBeenCalledTimes(1);
    expect(handleCopy).toHaveBeenCalledWith(sampleTemplate);
  });
});
