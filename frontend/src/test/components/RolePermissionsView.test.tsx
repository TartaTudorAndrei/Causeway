import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RolePermissionsView } from '../../components/admin/RolePermissionsView';
import { adminSettingsService } from '../../services/adminSettingsService';
import { LanguageProvider } from '../../context/LanguageContext';

vi.mock('../../hooks/usePermission', () => ({
  usePermission: () => ({
    user: { email: 'admin@charity.org', role: 'ADMIN', roles: ['ADMIN'] },
    isAuthenticated: true,
    hasPermission: () => true,
    isSuperAdmin: true,
  }),
}));

vi.mock('../../services/adminSettingsService', () => ({
  adminSettingsService: {
    getRolesWithPermissions: vi.fn(),
    getAllPermissions: vi.fn(),
    updateRolePermissions: vi.fn(),
  },
  itSettingsService: {
    getRolesWithPermissions: vi.fn(),
    getAllPermissions: vi.fn(),
    updateRolePermissions: vi.fn(),
  },
}));

const mockRoles = [
  {
    id: 'role-admin',
    name: 'ADMIN',
    isSystem: true,
    permissionIds: ['p-hr-1', 'p-fin-1'],
    permissionCodes: ['hr:read', 'finance:read'],
  },
  {
    id: 'role-hr-head',
    name: 'HR_HEAD',
    isSystem: false,
    parentRoleId: 'role-admin',
    permissionIds: ['p-hr-1'],
    permissionCodes: ['hr:read'],
  },
];

const mockPermissions = [
  {
    id: 'p-hr-1',
    code: 'hr:read',
    description: 'Vizualizare profiluri voluntari',
    category: 'HR',
  },
  {
    id: 'p-hr-2',
    code: 'hr:write',
    description: 'Gestionare membri și ture',
    category: 'HR',
  },
  {
    id: 'p-fin-1',
    code: 'finance:read',
    description: 'Vizualizare finanțe',
    category: 'FINANCE',
  },
];

describe('RolePermissionsView', () => {
  const onToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminSettingsService.getRolesWithPermissions).mockResolvedValue(mockRoles);
    vi.mocked(adminSettingsService.getAllPermissions).mockResolvedValue(mockPermissions);
    vi.mocked(adminSettingsService.updateRolePermissions).mockResolvedValue();
  });

  it('renders roles and allows toggling permissions and saving', async () => {
    render(
      <LanguageProvider>
        <RolePermissionsView isDarkMode={true} canWrite={true} onToast={onToast} />
      </LanguageProvider>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getAllByText('HR_HEAD').length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getAllByText('ADMIN').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('hr:read')).toBeInTheDocument();
    expect(screen.getByText('hr:write')).toBeInTheDocument();

    // Toggle hr:write for HR_HEAD
    const hrWriteCode = screen.getByText('hr:write');
    fireEvent.click(hrWriteCode);

    // Save button should now be enabled
    const saveBtn = screen.getByText('Salvează');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(adminSettingsService.updateRolePermissions).toHaveBeenCalledWith(
        'role-hr-head',
        expect.arrayContaining(['p-hr-1', 'p-hr-2'])
      );
      expect(onToast).toHaveBeenCalledWith(expect.any(String), 'success');
    });
  });
});
