import type { CalendarEvent, TaskItem, LocationItem } from '../types/general';
import type { HrStand, HrMember } from '../types/hr';
import type { Club } from '../types/adminAuth';

export interface DeepSearchIndex {
  query: string;
  isSearching: boolean;
  matchesStand: (stand: HrStand) => boolean;
  matchesTask: (task: TaskItem) => boolean;
  matchesEvent: (event: CalendarEvent) => boolean;
  matchesLocation: (location: LocationItem) => boolean;
  filteredStands: HrStand[];
  filteredTasks: TaskItem[];
  filteredEvents: CalendarEvent[];
  filteredLocations: LocationItem[];
}

export interface BuildDeepSearchParams {
  query: string;
  stands: HrStand[];
  tasks: TaskItem[];
  events: CalendarEvent[];
  locations: LocationItem[];
  members?: HrMember[];
  clubs?: Club[];
}

export function buildGeneralDeepSearchIndex({
  query,
  stands,
  tasks,
  events,
  locations,
  members = [],
  clubs = [],
}: BuildDeepSearchParams): DeepSearchIndex {
  const trimmed = query.trim().toLowerCase();

  if (!trimmed) {
    return {
      query: '',
      isSearching: false,
      matchesStand: () => true,
      matchesTask: () => true,
      matchesEvent: () => true,
      matchesLocation: () => true,
      filteredStands: stands,
      filteredTasks: tasks,
      filteredEvents: events,
      filteredLocations: locations,
    };
  }

  // 1. Resolve matching Clubs
  const matchingClubNames = new Set<string>();
  for (const c of clubs) {
    const cName = (c.name || '').trim().toLowerCase();
    const cType = (c.organizationType || '').trim().toLowerCase();
    if (cName.includes(trimmed) || cType.includes(trimmed)) {
      if (cName) matchingClubNames.add(cName);
    }
  }

  // 2. Member Lookups and Matching
  const memberById = new Map<string, HrMember>();
  const memberByEmail = new Map<string, HrMember>();
  const memberByAuthId = new Map<string, HrMember>();
  const memberByName = new Map<string, HrMember>();

  const matchingMemberIds = new Set<string>();
  const matchingMemberEmails = new Set<string>();
  const matchingMemberAuthIds = new Set<string>();

  for (const m of members) {
    if (m.id) memberById.set(m.id, m);
    if (m.authUserId) memberByAuthId.set(m.authUserId, m);
    const mEmail = (m.email || '').trim().toLowerCase();
    if (mEmail) memberByEmail.set(mEmail, m);
    const mName = (m.fullName || '').trim().toLowerCase();
    if (mName) memberByName.set(mName, m);

    const mOrgDetails = (m.organizationDetails || '').trim().toLowerCase();
    const mOrgType = (m.organizationType || '').trim().toLowerCase();
    const mPhone = (m.phone || '').trim().toLowerCase();
    const mRole = (m.role || '').trim().toLowerCase();
    const mDept = (m.department || '').trim().toLowerCase();

    const isDirectMatch =
      mName.includes(trimmed) ||
      mEmail.includes(trimmed) ||
      mPhone.includes(trimmed) ||
      mRole.includes(trimmed) ||
      mDept.includes(trimmed) ||
      mOrgDetails.includes(trimmed) ||
      mOrgType.includes(trimmed);

    const isClubMatch = mOrgDetails && matchingClubNames.has(mOrgDetails);

    if (isDirectMatch || isClubMatch) {
      if (m.id) matchingMemberIds.add(m.id);
      if (m.authUserId) matchingMemberAuthIds.add(m.authUserId);
      if (mEmail) matchingMemberEmails.add(mEmail);
    }
  }

  const isMemberMatch = (
    memberId?: string,
    memberName?: string,
    memberEmail?: string
  ): boolean => {
    if (memberId && (matchingMemberIds.has(memberId) || matchingMemberAuthIds.has(memberId))) {
      return true;
    }
    const cleanEmail = (memberEmail || '').trim().toLowerCase();
    if (cleanEmail && matchingMemberEmails.has(cleanEmail)) {
      return true;
    }
    const cleanName = (memberName || '').trim().toLowerCase();
    if (cleanName && cleanName.includes(trimmed)) {
      return true;
    }
    if (cleanEmail && cleanEmail.includes(trimmed)) {
      return true;
    }

    // Lookup member by ID, Email, or Name to verify club association
    const resolved =
      (memberId ? memberById.get(memberId) || memberByAuthId.get(memberId) : undefined) ||
      (cleanEmail ? memberByEmail.get(cleanEmail) : undefined) ||
      (cleanName ? memberByName.get(cleanName) : undefined);

    if (resolved) {
      const orgDetails = (resolved.organizationDetails || '').trim().toLowerCase();
      const orgType = (resolved.organizationType || '').trim().toLowerCase();
      if (orgDetails.includes(trimmed) || orgType.includes(trimmed)) return true;
      if (orgDetails && matchingClubNames.has(orgDetails)) return true;
    }

    return false;
  };

  // 3. Stand Matching
  const matchesStand = (s: HrStand): boolean => {
    const locName = (s.locationName || '').toLowerCase();
    const evtName = (s.eventName || '').toLowerCase();
    const notes = (s.notes || '').toLowerCase();

    if (
      locName.includes(trimmed) ||
      evtName.includes(trimmed) ||
      notes.includes(trimmed)
    ) {
      return true;
    }

    if (s.shifts && s.shifts.length > 0) {
      for (const sh of s.shifts) {
        if ((sh.shiftName || '').toLowerCase().includes(trimmed)) {
          return true;
        }
        if (sh.assignments && sh.assignments.length > 0) {
          for (const a of sh.assignments) {
            if (isMemberMatch(a.memberId, a.memberName, a.memberEmail)) {
              return true;
            }
            if ((a.roleName || '').toLowerCase().includes(trimmed)) {
              return true;
            }
          }
        }
      }
    }

    return false;
  };

  // 4. Task Matching
  const matchesTask = (t: TaskItem): boolean => {
    const title = (t.title || '').toLowerCase();
    const desc = (t.description || '').toLowerCase();
    const dept = (t.department || '').toLowerCase();
    const createdBy = (t.createdBy || '').toLowerCase();
    const assignee = (t.assignee || '').toLowerCase();

    if (
      title.includes(trimmed) ||
      desc.includes(trimmed) ||
      dept.includes(trimmed) ||
      createdBy.includes(trimmed) ||
      assignee.includes(trimmed)
    ) {
      return true;
    }

    if (t.assigneeIds && t.assigneeIds.length > 0) {
      for (const aId of t.assigneeIds) {
        if (isMemberMatch(aId)) return true;
      }
    }

    // Check if assignee string refers to any member in a matching club
    if (assignee && matchingClubNames.size > 0) {
      for (const m of members) {
        const mOrg = (m.organizationDetails || '').trim().toLowerCase();
        if (mOrg && matchingClubNames.has(mOrg)) {
          const mName = (m.fullName || '').trim().toLowerCase();
          if (mName && assignee.includes(mName)) {
            return true;
          }
        }
      }
    }

    return false;
  };

  // 5. Event Matching
  const matchesEvent = (e: CalendarEvent): boolean => {
    const title = (e.title || '').toLowerCase();
    const desc = (e.description || '').toLowerCase();
    const dept = (e.department || '').toLowerCase();
    const createdBy = (e.createdBy || '').toLowerCase();
    const tag = (e.demandTag || '').toLowerCase();

    if (
      title.includes(trimmed) ||
      desc.includes(trimmed) ||
      dept.includes(trimmed) ||
      createdBy.includes(trimmed) ||
      tag.includes(trimmed)
    ) {
      return true;
    }

    if (isMemberMatch(undefined, createdBy, createdBy)) {
      return true;
    }

    return false;
  };

  // Pre-filter stands to support deep location matching
  const matchingStands = stands.filter(matchesStand);
  const matchingLocationNames = new Set<string>();
  for (const st of matchingStands) {
    const lName = (st.locationName || '').trim().toLowerCase();
    if (lName) matchingLocationNames.add(lName);
  }

  // 6. Location Matching
  const matchesLocation = (loc: LocationItem): boolean => {
    const name = (loc.name || '').toLowerCase();
    const addr = (loc.address || '').toLowerCase();
    const desc = (loc.description || '').toLowerCase();
    const code = (loc.code || '').toLowerCase();

    if (
      name.includes(trimmed) ||
      addr.includes(trimmed) ||
      desc.includes(trimmed) ||
      code.includes(trimmed)
    ) {
      return true;
    }

    // Deep match: check if a matching stand is scheduled at this location
    const cleanLocName = (loc.name || '').trim().toLowerCase();
    if (cleanLocName && matchingLocationNames.has(cleanLocName)) {
      return true;
    }

    return false;
  };

  return {
    query: trimmed,
    isSearching: true,
    matchesStand,
    matchesTask,
    matchesEvent,
    matchesLocation,
    filteredStands: matchingStands,
    filteredTasks: tasks.filter(matchesTask),
    filteredEvents: events.filter(matchesEvent),
    filteredLocations: locations.filter(matchesLocation),
  };
}
