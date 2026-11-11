import { describe, it, expect } from 'vitest';
import { buildGeneralDeepSearchIndex } from '../../utils/generalDeepSearch';
import type { CalendarEvent, TaskItem, LocationItem } from '../../types/general';
import type { HrStand, HrMember } from '../../types/hr';
import type { Club } from '../../types/adminAuth';

describe('generalDeepSearch utility', () => {
  const mockClubs: Club[] = [
    { id: 'c1', name: 'Visio', organizationType: 'ROTARACT' },
    { id: 'c2', name: 'Interact Cetatuia', organizationType: 'INTERACT' },
  ];

  const mockMembers: HrMember[] = [
    {
      id: 'm1',
      fullName: 'Andrei Popescu',
      email: 'andrei.popescu@example.com',
      department: 'general',
      role: 'VOLUNTEER',
      onboardingStatus: 'Active',
      organizationDetails: 'Visio',
      organizationType: 'ROTARACT',
    },
    {
      id: 'm2',
      fullName: 'Maria Ionescu',
      email: 'maria@example.com',
      department: 'general',
      role: 'VOLUNTEER',
      onboardingStatus: 'Active',
      organizationDetails: 'Interact Cetatuia',
      organizationType: 'INTERACT',
    },
    {
      id: 'm3',
      fullName: 'Radu Dan',
      email: 'radu@example.com',
      department: 'general',
      role: 'VOLUNTEER',
      onboardingStatus: 'Active',
      organizationDetails: 'None',
    },
  ];

  const mockStands: HrStand[] = [
    {
      id: 'stand-1',
      eventName: 'Targul de Craciun',
      locationName: 'Piata Unirii',
      eventDate: '2026-12-01',
      status: 'ACTIVE',
      shifts: [
        {
          id: 'shift-1',
          standId: 'stand-1',
          date: '2026-12-01',
          startTime: '10:00',
          endTime: '14:00',
          maxVolunteers: 2,
          assignments: [
            {
              id: 'a1',
              shiftId: 'shift-1',
              memberId: 'm1',
              memberName: 'Andrei Popescu',
              memberEmail: 'andrei.popescu@example.com',
              roleId: 'r1',
              roleName: 'Volunteer',
              attendanceStatus: 'WAITING',
              eodSubmitted: false,
            },
          ],
        },
      ],
    },
    {
      id: 'stand-2',
      eventName: 'Concert Caritabil',
      locationName: 'Iulius Parc',
      eventDate: '2026-12-02',
      status: 'PLANNED',
      shifts: [
        {
          id: 'shift-2',
          standId: 'stand-2',
          date: '2026-12-02',
          startTime: '14:00',
          endTime: '18:00',
          maxVolunteers: 2,
          assignments: [
            {
              id: 'a2',
              shiftId: 'shift-2',
              memberId: 'm2',
              memberName: 'Maria Ionescu',
              memberEmail: 'maria@example.com',
              roleId: 'r1',
              roleName: 'Volunteer',
              attendanceStatus: 'WAITING',
              eodSubmitted: false,
            },
          ],
        },
      ],
    },
  ];

  const mockTasks: TaskItem[] = [
    {
      id: 'task-1',
      title: 'Cumpara pahare',
      description: 'Pahare carton',
      department: 'logistics',
      priority: 'high',
      status: 'todo',
      assignee: 'Andrei Popescu',
      assigneeIds: ['m1'],
      dueDate: '2026-12-01',
      createdBy: 'Admin',
    },
    {
      id: 'task-2',
      title: 'Trimite invitatii',
      description: 'Invitatii pentru concert',
      department: 'marketing',
      priority: 'medium',
      status: 'in_progress',
      assignee: 'Maria Ionescu',
      assigneeIds: ['m2'],
      dueDate: '2026-12-02',
      createdBy: 'Admin',
    },
  ];

  const mockEvents: CalendarEvent[] = [
    {
      id: 'evt-1',
      title: 'Sedinta de coordonare Andrei',
      description: 'Sedinta organizata de Andrei',
      date: '2026-12-01',
      time: '18:00',
      department: 'general',
      createdBy: 'andrei.popescu@example.com',
    },
    {
      id: 'evt-2',
      title: 'Training Voluntari',
      description: 'Sesiune de inductie',
      date: '2026-12-03',
      time: '19:00',
      department: 'hr',
      createdBy: 'Admin',
    },
  ];

  const mockLocations: LocationItem[] = [
    {
      id: 'loc-1',
      name: 'Piata Unirii',
      type: 'STAND',
      address: 'Piata Unirii 1',
    },
    {
      id: 'loc-2',
      name: 'Iulius Parc',
      type: 'STAND',
      address: 'Str. Alexandru Vaida Voevod',
    },
  ];

  it('returns all items when query is empty', () => {
    const index = buildGeneralDeepSearchIndex({
      query: '',
      stands: mockStands,
      tasks: mockTasks,
      events: mockEvents,
      locations: mockLocations,
      members: mockMembers,
      clubs: mockClubs,
    });

    expect(index.isSearching).toBe(false);
    expect(index.filteredStands).toHaveLength(2);
    expect(index.filteredTasks).toHaveLength(2);
    expect(index.filteredEvents).toHaveLength(2);
    expect(index.filteredLocations).toHaveLength(2);
  });

  it('finds items deeply related to "Andrei"', () => {
    const index = buildGeneralDeepSearchIndex({
      query: 'Andrei',
      stands: mockStands,
      tasks: mockTasks,
      events: mockEvents,
      locations: mockLocations,
      members: mockMembers,
      clubs: mockClubs,
    });

    expect(index.isSearching).toBe(true);

    // Stand 1 has Andrei on shift-1 -> matches
    expect(index.filteredStands.map(s => s.id)).toEqual(['stand-1']);

    // Task 1 has Andrei as assignee -> matches
    expect(index.filteredTasks.map(t => t.id)).toEqual(['task-1']);

    // Event 1 has Andrei in title and createdBy -> matches
    expect(index.filteredEvents.map(e => e.id)).toEqual(['evt-1']);

    // Location 1 hosts Stand 1 where Andrei is assigned -> matches
    expect(index.filteredLocations.map(l => l.id)).toEqual(['loc-1']);
  });

  it('finds items deeply related to club "visio"', () => {
    const index = buildGeneralDeepSearchIndex({
      query: 'visio',
      stands: mockStands,
      tasks: mockTasks,
      events: mockEvents,
      locations: mockLocations,
      members: mockMembers,
      clubs: mockClubs,
    });

    expect(index.isSearching).toBe(true);

    // Member m1 belongs to Visio. Stand 1 has m1 on shift -> Stand 1 matches!
    expect(index.filteredStands.map(s => s.id)).toEqual(['stand-1']);

    // Task 1 is assigned to m1 (from Visio) -> Task 1 matches!
    expect(index.filteredTasks.map(t => t.id)).toEqual(['task-1']);

    // Stand 2 has Maria (Interact Cetatuia) -> Stand 2 does NOT match
    expect(index.matchesStand(mockStands[1])).toBe(false);

    // Location 1 hosts Stand 1 (with Visio volunteer) -> matches!
    expect(index.filteredLocations.map(l => l.id)).toEqual(['loc-1']);
  });
});
