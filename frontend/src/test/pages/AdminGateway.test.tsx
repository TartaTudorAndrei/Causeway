import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminGateway from '../../pages/AdminGateway';
import { LanguageProvider } from '../../context/LanguageContext';
import { GoogleOAuthProvider } from '@react-oauth/google';

vi.mock('../../services/adminAuthService', () => ({
  adminAuthService: {
    getMe: vi.fn().mockResolvedValue(null),
    getClubs: vi.fn().mockResolvedValue([]),
    login: vi.fn(),
    loginWithGoogle: vi.fn(),
    verifyTwoFactorLogin: vi.fn(),
  },
}));

describe('AdminGateway Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders login screen with email and password inputs', async () => {
    const { container } = render(
      <GoogleOAuthProvider clientId="dummy-client-id">
        <LanguageProvider>
          <BrowserRouter>
            <AdminGateway />
          </BrowserRouter>
        </LanguageProvider>
      </GoogleOAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    });

    const submitBtn = container.querySelector('button[type="submit"]');
    expect(submitBtn).toBeInTheDocument();
  });
});
