import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StandVolunteersModal } from '../../components/hr/StandVolunteersModal';
import { LanguageProvider } from '../../context/LanguageContext';
import type { HrStand } from '../../types/hr';

const mockStand: HrStand = {
  id: 'stand-1',
  locationName: 'Piața Unirii',
  eventName: 'Târgul de Crăciun',
  eventDate: '2026-12-15',
  startTime: '10:00',
  endTime: '22:00',
  status: 'active',
  neededVolunteers: 4,
  assignedVolunteers: 2,
  shifts: [
    {
      id: 'shift-1',
      standId: 'stand-1',
      shiftName: 'Tura de Dimineață',
      startTime: '10:00',
      endTime: '14:00',
      assignments: [
        {
          id: 'as-1',
          shiftId: 'shift-1',
          memberId: 'm-1',
          memberName: 'Ion Popescu',
          memberEmail: 'ion.popescu@example.com',
          memberPhone: '+40712345678',
          memberClub: 'Rotaract Cetățuie',
          roleId: 'role-1',
          roleName: 'Lead Stand',
          attendanceStatus: 'PRESENT',
          eodSubmitted: false,
          assignmentStatus: 'CONFIRMED'
        },
        {
          id: 'as-2',
          shiftId: 'shift-1',
          memberId: 'm-2',
          memberName: 'Maria Ionescu',
          memberEmail: 'maria.ionescu@example.com',
          memberPhone: '+40798765432',
          memberClub: 'Interact Visio',
          roleId: 'role-2',
          roleName: 'Casier',
          attendanceStatus: 'WAITING',
          eodSubmitted: false,
          assignmentStatus: 'CONFIRMED'
        }
      ]
    }
  ]
};

describe('StandVolunteersModal component', () => {
  it('displays volunteer name, role, club, and phone number, but omits email and shift name from item rows', () => {
    render(
      <LanguageProvider>
        <StandVolunteersModal
          isOpen={true}
          onClose={vi.fn()}
          stand={mockStand}
        />
      </LanguageProvider>
    );

    // Verify volunteer name & role are present
    expect(screen.getByText('Ion Popescu')).toBeInTheDocument();
    expect(screen.getAllByText('Lead Stand').length).toBeGreaterThanOrEqual(1);

    // Verify club and phone are present
    expect(screen.getByText('Rotaract Cetățuie')).toBeInTheDocument();
    expect(screen.getByText('+40712345678')).toBeInTheDocument();

    expect(screen.getByText('Maria Ionescu')).toBeInTheDocument();
    expect(screen.getAllByText('Casier').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Interact Visio')).toBeInTheDocument();
    expect(screen.getByText('+40798765432')).toBeInTheDocument();

    // Verify member emails are NOT displayed
    expect(screen.queryByText('ion.popescu@example.com')).toBeNull();
    expect(screen.queryByText('maria.ionescu@example.com')).toBeNull();

    // Verify shift name is not displayed inside volunteer card subtext
    // (Only in shift filter dropdown, not in volunteer list rows)
    const shiftMatches = screen.queryAllByText(/Tura de Dimineață \(10:00 - 14:00\)/);
    // The only match should be the <option> in the shift select filter
    expect(shiftMatches.length).toBe(1);
    expect(shiftMatches[0].tagName.toLowerCase()).toBe('option');
  });

  it('filters volunteers by club and phone in search input', () => {
    render(
      <LanguageProvider>
        <StandVolunteersModal
          isOpen={true}
          onClose={vi.fn()}
          stand={mockStand}
        />
      </LanguageProvider>
    );

    const searchInput = screen.getByPlaceholderText(/Căutare nume, club, telefon, rol/);

    // Filter by club
    fireEvent.change(searchInput, { target: { value: 'Cetățuie' } });
    expect(screen.getByText('Ion Popescu')).toBeInTheDocument();
    expect(screen.queryByText('Maria Ionescu')).toBeNull();

    // Filter by phone
    fireEvent.change(searchInput, { target: { value: '798765' } });
    expect(screen.getByText('Maria Ionescu')).toBeInTheDocument();
    expect(screen.queryByText('Ion Popescu')).toBeNull();
  });
});
