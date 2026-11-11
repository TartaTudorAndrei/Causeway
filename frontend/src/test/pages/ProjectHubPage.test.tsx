import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProjectHubPage } from '../../pages/ProjectHubPage';
import { LanguageProvider } from '../../context/LanguageContext';
import { TenantProvider } from '../../context/TenantContext';
import { SyncStatusProvider } from '../../context/SyncStatusContext';

vi.mock('../../services/projectService', () => ({
  projectService: {
    listProjects: vi.fn().mockResolvedValue([
      { id: 'proj-1', name: 'Test Proiect', slug: 'test-proiect', createdAt: '2026-01-01T00:00:00Z', createdByName: 'Admin' }
    ]),
    deleteProject: vi.fn(),
  },
}));

vi.mock('../../services/adminAuthService', () => ({
  adminAuthService: {
    getMe: vi.fn().mockResolvedValue({
      id: 'usr-1',
      name: 'Super Admin',
      email: 'admin@charity.org',
      role: 'superadmin',
      permissions: ['*'],
    }),
    getClubs: vi.fn().mockResolvedValue([]),
    signOut: vi.fn(),
  },
}));

vi.mock('../../services/adminConfigService', () => ({
  adminConfigService: {
    getStatus: vi.fn().mockResolvedValue({ uiConfigEnabled: true }),
  },
}));

vi.mock('../../components/project/HubVolunteersView', () => ({
  HubVolunteersView: () => <div data-testid="hub-volunteers-view">Volunteers Component Mock</div>,
}));

vi.mock('../../components/admin/AdminConfigView', () => ({
  AdminConfigView: () => <div data-testid="hub-config-view">Config Component Mock</div>,
}));

describe('ProjectHubPage Routing', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('adminUser', JSON.stringify({
      id: 'usr-1',
      name: 'Super Admin',
      email: 'admin@charity.org',
      role: 'superadmin',
      permissions: ['*'],
    }));
    vi.clearAllMocks();
  });

  const renderWithProviders = (initialUrl: string) => {
    return render(
      <TenantProvider>
        <LanguageProvider>
          <SyncStatusProvider>
            <MemoryRouter initialEntries={[initialUrl]}>
              <Routes>
                <Route path="/dashboard/hub/:section" element={<ProjectHubPage />} />
                <Route path="/dashboard/hub/:section/:subTab" element={<ProjectHubPage />} />
              </Routes>
            </MemoryRouter>
          </SyncStatusProvider>
        </LanguageProvider>
      </TenantProvider>
    );
  };

  it('renders General section and projects when accessing /dashboard/hub/general', async () => {
    renderWithProviders('/dashboard/hub/general');

    await waitFor(() => {
      const elements = screen.getAllByText('Test Proiect');
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  it('renders Admin section and volunteers view when accessing /dashboard/hub/admin/volunteers', async () => {
    renderWithProviders('/dashboard/hub/admin/volunteers');

    await waitFor(() => {
      expect(screen.getByTestId('hub-volunteers-view')).toBeInTheDocument();
    });
  });

  it('renders Admin section and config view when accessing /dashboard/hub/admin/config', async () => {
    renderWithProviders('/dashboard/hub/admin/config');

    await waitFor(() => {
      expect(screen.getByTestId('hub-config-view')).toBeInTheDocument();
    });
  });
});
