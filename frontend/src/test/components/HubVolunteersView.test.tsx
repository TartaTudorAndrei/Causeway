import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { HubVolunteersView } from '../../components/project/HubVolunteersView';
import { LanguageProvider } from '../../context/LanguageContext';
import { adminSettingsService } from '../../services/adminSettingsService';

vi.mock('../../services/adminSettingsService', () => ({
  adminSettingsService: {
    getUsers: vi.fn(),
    approveUser: vi.fn(),
    rejectUser: vi.fn(),
    updateUserRolesAndMemberships: vi.fn(),
  },
}));

describe('HubVolunteersView Component', () => {
  const mockOnToast = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('adminUser', JSON.stringify({
      id: 'admin-1',
      name: 'Super Admin',
      email: 'admin@charity.org',
      role: 'ADMIN',
      roles: ['ADMIN'],
      permissions: ['*'],
    }));
    vi.clearAllMocks();
  });

  const mockUsers = [
    {
      id: 'u-1',
      fullName: 'Ion Popescu',
      email: 'ion@example.com',
      phone: '0712345678',
      status: 'PENDING_APPROVAL' as const,
      primaryRole: 'VOLUNTEER',
      roles: ['VOLUNTEER'],
      memberships: [],
      createdAt: '2026-01-01T10:00:00Z',
    },
    {
      id: 'u-2',
      fullName: 'Maria Ionescu',
      email: 'maria@example.com',
      phone: '0798765432',
      status: 'APPROVED' as const,
      primaryRole: 'VOLUNTEER',
      roles: ['VOLUNTEER', 'CONFIG_INHERITOR'],
      memberships: [],
      createdAt: '2026-01-02T10:00:00Z',
    },
  ];

  it('renders volunteers with Moștenire Config and Status & Acțiuni columns', async () => {
    vi.mocked(adminSettingsService.getUsers).mockResolvedValue(mockUsers);

    render(
      <LanguageProvider>
        <HubVolunteersView isDarkMode={true} onToast={mockOnToast} />
      </LanguageProvider>
    );

    await waitFor(() => {
      const names = screen.getAllByText('Ion Popescu');
      expect(names.length).toBeGreaterThan(0);
    });

    // Check headers
    expect(screen.getAllByText('Moștenire Config').length).toBeGreaterThan(0);
    expect(screen.getByText('Status & Acțiuni')).toBeInTheDocument();

    // Check action buttons for pending user
    const approveButtons = screen.getAllByRole('button', { name: /Aprobă/i });
    expect(approveButtons.length).toBeGreaterThan(0);

    const rejectButtons = screen.getAllByRole('button', { name: /Respinge/i });
    expect(rejectButtons.length).toBeGreaterThan(0);
  });

  it('approves a pending volunteer into the application when clicking Approve', async () => {
    vi.mocked(adminSettingsService.getUsers).mockResolvedValue(mockUsers);
    vi.mocked(adminSettingsService.approveUser).mockResolvedValue({
      ...mockUsers[0],
      status: 'APPROVED',
    });

    render(
      <LanguageProvider>
        <HubVolunteersView isDarkMode={true} onToast={mockOnToast} />
      </LanguageProvider>
    );

    await waitFor(() => {
      const names = screen.getAllByText('Ion Popescu');
      expect(names.length).toBeGreaterThan(0);
    });

    const approveButtons = screen.getAllByRole('button', { name: /Aprobă/i });
    fireEvent.click(approveButtons[0]);

    await waitFor(() => {
      expect(adminSettingsService.approveUser).toHaveBeenCalledWith('u-1');
      expect(mockOnToast).toHaveBeenCalledWith(
        expect.stringContaining('Ion Popescu'),
        'success'
      );
    });
  });

  it('toggles inherit config for a volunteer', async () => {
    vi.mocked(adminSettingsService.getUsers).mockResolvedValue(mockUsers);
    vi.mocked(adminSettingsService.updateUserRolesAndMemberships).mockResolvedValue({
      ...mockUsers[0],
      roles: ['CONFIG_INHERITOR'],
    });

    render(
      <LanguageProvider>
        <HubVolunteersView isDarkMode={true} onToast={mockOnToast} />
      </LanguageProvider>
    );

    await waitFor(() => {
      const names = screen.getAllByText('Ion Popescu');
      expect(names.length).toBeGreaterThan(0);
    });

    // For Ion Popescu, inherit config is Nepermis
    const toggleButtons = screen.getAllByRole('button', { name: /Nepermis/i });
    fireEvent.click(toggleButtons[0]);

    await waitFor(() => {
      expect(adminSettingsService.updateUserRolesAndMemberships).toHaveBeenCalledWith(
        'u-1',
        'CONFIG_INHERITOR',
        expect.arrayContaining(['CONFIG_INHERITOR']),
        expect.any(Array)
      );
    });
  });
});
