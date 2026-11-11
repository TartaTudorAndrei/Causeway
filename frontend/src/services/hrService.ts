import type {
  HrMember, HrStandRole, HrStand, HrShift, HrShiftAssignment, HrStats, HrLocation,
  AttendanceCheckinResult, StandQrCodeInfo
} from '../types/hr';
import { auditService } from './auditService';
import { fetchWithCsrf } from './apiClient';

const API_BASE = '/api/admin/hr';

export const normalizeEventDateStr = (rawDate?: string | number[] | string[] | null): string => {
  if (!rawDate) return '';
  if (Array.isArray(rawDate) && rawDate.length >= 3) {
    const y = rawDate[0];
    const m = String(rawDate[1]).padStart(2, '0');
    const d = String(rawDate[2]).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof rawDate === 'string') {
    return rawDate.includes('T')
      ? rawDate.split('T')[0]
      : rawDate.includes(' ')
      ? rawDate.split(' ')[0]
      : rawDate.trim();
  }
  return String(rawDate || '').trim();
};

export const isShiftExpiredClient = (eventDateStr?: any, endTime?: string): boolean => {
  const dateStr = normalizeEventDateStr(eventDateStr);
  if (!dateStr) return false;
  const now = new Date();
  const parts = dateStr.split('-');
  if (parts.length !== 3) return false;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return false;

  let hours = 23;
  let minutes = 59;
  if (endTime && typeof endTime === 'string' && endTime.includes(':')) {
    const timeParts = endTime.trim().split(':');
    hours = parseInt(timeParts[0], 10) || 0;
    minutes = parseInt(timeParts[1], 10) || 0;
  }

  const shiftEnd = new Date(year, month, day, hours, minutes, 0, 0);
  return now.getTime() > shiftEnd.getTime();
};

export const isStandExpiredClient = (stand?: HrStand | null): boolean => {
  if (!stand || !stand.eventDate) return false;
  if (!stand.shifts || stand.shifts.length === 0) {
    return isShiftExpiredClient(stand.eventDate, '23:59');
  }
  return stand.shifts.every(sh => isShiftExpiredClient(stand.eventDate, sh?.endTime));
};

export const isStandStartedClient = (stand?: HrStand | null, now: Date = new Date()): boolean => {
  if (!stand || !stand.eventDate) return false;
  const dateStr = normalizeEventDateStr(stand.eventDate);
  if (!dateStr) return false;

  const parts = dateStr.split('-');
  if (parts.length !== 3) return false;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return false;

  let earliestStartTime = '00:00';
  if (stand.shifts && Array.isArray(stand.shifts) && stand.shifts.length > 0) {
    const shiftStartTimes = stand.shifts
      .map(s => s && s.startTime ? String(s.startTime).trim() : '')
      .filter((st): st is string => Boolean(st));
    if (shiftStartTimes.length > 0) {
      shiftStartTimes.sort();
      earliestStartTime = shiftStartTimes[0];
    }
  }

  let hours = 0;
  let minutes = 0;
  if (typeof earliestStartTime === 'string' && earliestStartTime.includes(':')) {
    const timeParts = earliestStartTime.split(':');
    hours = parseInt(timeParts[0], 10) || 0;
    minutes = parseInt(timeParts[1], 10) || 0;
  }

  const standStart = new Date(year, month, day, hours, minutes, 0, 0);
  return now.getTime() >= standStart.getTime();
};

export const hrService = {
  // --- STANDS & SHIFTS ---
  getStands: async (): Promise<HrStand[]> => {
    const res = await fetchWithCsrf(`${API_BASE}/stands`, {
      cacheKey: 'hr:stands',
    } as any);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  getStandById: async (id: string): Promise<HrStand | null> => {
    const res = await fetchWithCsrf(`${API_BASE}/stands/${id}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  publicStandSignup: async (standId: string, payload: {
    fullName: string;
    email: string;
    password?: string;
    phone: string;
    orgType?: string;
    orgDetails?: string;
    shiftId: string;
    roleId: string;
    availability?: string;
  }): Promise<{ success: boolean; message?: string }> => {
    const res = await fetchWithCsrf(`${API_BASE}/stands/${standId}/public-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || (data && data.success === false)) {
      throw new Error(data?.message || 'Eroare la înregistrarea pe tură. Vă rugăm să reîncercați.');
    }
    return data;
  },

  createStand: async (payload: Partial<HrStand>): Promise<HrStand> => {
    const res = await fetchWithCsrf(`${API_BASE}/stands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Eroare la crearea standului pe server.');
    }
    const created: HrStand = await res.json();

    await auditService.recordAuditLog({
      department: 'HR',
      actionType: 'CREATE',
      resourceType: 'Stand',
      resourceId: created.id,
      resourceName: created.locationName,
      summary: `Stand nou creat: ${created.locationName} (${created.eventName || 'Eveniment'})`,
      details: created.notes,
      stateChanges: created,
    });

    return created;
  },

  updateStand: async (id: string, payload: Partial<HrStand>): Promise<void> => {
    const res = await fetchWithCsrf(`${API_BASE}/stands/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Eroare la actualizarea standului pe server.');
    }
    
    await auditService.recordAuditLog({
      department: 'HR',
      actionType: 'UPDATE',
      resourceType: 'Stand',
      resourceId: id,
      resourceName: payload.locationName || `Stand #${id}`,
      summary: `Stand actualizat: ${payload.locationName || `Stand #${id}`}`,
      stateChanges: payload,
    });
  },

  deleteStand: async (id: string): Promise<void> => {
    const res = await fetchWithCsrf(`${API_BASE}/stands/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Eroare la ștergerea standului pe server.');
    }

    await auditService.recordAuditLog({
      department: 'HR',
      actionType: 'DELETE',
      resourceType: 'Stand',
      resourceId: id,
      resourceName: `Stand #${id.substring(0, 8)}`,
      summary: `Stand șters: ${id}`,
    });
  },

  copyStand: async (id: string): Promise<HrStand> => {
    const res = await fetchWithCsrf(`${API_BASE}/stands/${id}/copy`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Eroare la duplicarea standului pe server.');
    }
    return await res.json();
  },

  addShift: async (
    standId: string,
    shiftName: string,
    startTime: string,
    endTime: string,
    neededVolunteers: number = 1,
    neededLogistics: number = 1,
    neededFinance: number = 1
  ): Promise<HrShift> => {
    const res = await fetchWithCsrf(`${API_BASE}/stands/${standId}/shifts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shiftName,
        startTime,
        endTime,
        neededVolunteers,
        neededLogistics,
        neededFinance
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Eroare la adăugarea turei pe server.');
    }
    return await res.json();
  },

  deleteShift: async (shiftId: string): Promise<void> => {
    const res = await fetchWithCsrf(`${API_BASE}/shifts/${shiftId}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Eroare la ștergerea turei pe server.');
    }
  },

  updateShift: async (
    shiftId: string,
    shiftName: string,
    startTime: string,
    endTime: string,
    neededVolunteers: number = 1,
    neededLogistics: number = 1,
    neededFinance: number = 1
  ): Promise<HrShift> => {
    const res = await fetchWithCsrf(`${API_BASE}/shifts/${shiftId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shiftName,
        startTime,
        endTime,
        neededVolunteers,
        neededLogistics,
        neededFinance
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Eroare la actualizarea turei pe server.');
    }
    return await res.json();
  },

  assignMember: async (shiftId: string, memberId: string, roleId: string): Promise<HrShiftAssignment> => {
    const res = await fetchWithCsrf(`${API_BASE}/shifts/${shiftId}/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, roleId })
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.message || errJson?.error || `Eroare la asignarea membrului pe tură (${res.status})`);
    }
    return await res.json();
  },

  removeAssignment: async (assignmentId: string): Promise<void> => {
    const res = await fetchWithCsrf(`${API_BASE}/assignments/${assignmentId}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Eroare la eliminarea asignării pe server.');
    }
  },

  approveShiftAssignment: async (assignmentId: string): Promise<void> => {
    const res = await fetchWithCsrf(`${API_BASE}/assignments/${assignmentId}/approve`, { method: 'PUT' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Eroare la aprobarea asignării.');
    }
  },

  rejectShiftAssignment: async (assignmentId: string): Promise<void> => {
    const res = await fetchWithCsrf(`${API_BASE}/assignments/${assignmentId}/reject`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Eroare la respingerea asignării.');
    }
  },

  updateAttendance: async (assignmentId: string, status: string): Promise<void> => {
    const res = await fetchWithCsrf(`${API_BASE}/assignments/${assignmentId}/attendance`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
      domain: 'hr',
      isOfflineCapable: true,
    } as any);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Eroare la actualizarea prezenței.');
    }
  },

  getStandQrCode: async (standId: string): Promise<StandQrCodeInfo> => {
    const res = await fetchWithCsrf(`${API_BASE}/stands/${standId}/qr-code`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Eroare la obținerea codului QR pentru stand.');
    }
    return await res.json();
  },

  gpsCheckin: async (payload: {
    standId?: string;
    shiftId?: string;
    latitude: number;
    longitude: number;
  }): Promise<AttendanceCheckinResult> => {
    const res = await fetchWithCsrf(`${API_BASE}/attendance/gps-checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      domain: 'hr',
      isOfflineCapable: true,
    } as any);
    const data = await res.json().catch(() => null);
    if (!res.ok || (data && data.success === false)) {
      throw new Error(data?.message || 'Eroare la confirmarea prezenței prin GPS.');
    }
    return data;
  },

  qrCheckin: async (payload: {
    qrToken: string;
    standId?: string;
    shiftId?: string;
  }): Promise<AttendanceCheckinResult> => {
    const res = await fetchWithCsrf(`${API_BASE}/attendance/qr-checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      domain: 'hr',
      isOfflineCapable: true,
    } as any);
    const data = await res.json().catch(() => null);
    if (!res.ok || (data && data.success === false)) {
      throw new Error(data?.message || 'Eroare la confirmarea prezenței prin cod QR.');
    }
    return data;
  },

  submitStandEoD: async (assignmentId: string, eodPayload: unknown): Promise<void> => {
    const res = await fetchWithCsrf(`${API_BASE}/assignments/${assignmentId}/eod-submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eodPayload),
      domain: 'hr',
      isOfflineCapable: true,
    } as any);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Eroare la trimiterea raportului EoD.');
    }
  },

  deleteStandEoD: async (assignmentId: string): Promise<void> => {
    const res = await fetchWithCsrf(`${API_BASE}/assignments/${assignmentId}/eod-submit`, {
      method: 'DELETE',
      domain: 'hr',
      isOfflineCapable: true,
    } as any);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Eroare la ștergerea raportului EoD.');
    }
  },

  // --- STAND LOCATIONS ---
  getLocations: async (): Promise<HrLocation[]> => {
    const res = await fetchWithCsrf(`${API_BASE}/locations`, {
      cacheKey: 'hr:locations',
    } as any);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  createLocation: async (name: string): Promise<HrLocation> => {
    const res = await fetchWithCsrf(`${API_BASE}/locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Eroare la crearea locației.');
    }
    return await res.json();
  },

  updateLocation: async (id: string, name: string): Promise<HrLocation> => {
    const res = await fetchWithCsrf(`${API_BASE}/locations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Eroare la actualizarea locației.');
    }
    return await res.json();
  },

  deleteLocation: async (id: string): Promise<void> => {
    const res = await fetchWithCsrf(`${API_BASE}/locations/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || data.error || 'Eroare la ștergerea locației.');
    }
  },

  // --- STAND ROLES ---
  getRoles: async (): Promise<HrStandRole[]> => {
    const res = await fetchWithCsrf(`${API_BASE}/roles`, {
      cacheKey: 'hr:roles',
    } as any);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  createRole: async (payload: Partial<HrStandRole>): Promise<HrStandRole> => {
    const res = await fetchWithCsrf(`${API_BASE}/roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Eroare la crearea rolului.');
    }
    return await res.json();
  },

  updateRole: async (id: string, payload: Partial<HrStandRole>): Promise<void> => {
    const res = await fetchWithCsrf(`${API_BASE}/roles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Eroare la actualizarea rolului.');
    }
  },

  deleteRole: async (id: string): Promise<void> => {
    const res = await fetchWithCsrf(`${API_BASE}/roles/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Eroare la ștergerea rolului.');
    }
  },

  // --- MEMBER DIRECTORY ---
  getMembers: async (): Promise<HrMember[]> => {
    const res = await fetchWithCsrf(`${API_BASE}/members`, {
      cacheKey: 'hr:members',
    } as any);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  createMember: async (payload: Partial<HrMember>): Promise<HrMember> => {
    const res = await fetchWithCsrf(`${API_BASE}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Eroare la adăugarea membrului pe server.');
    }
    const created: HrMember = await res.json();

    await auditService.recordAuditLog({
      department: 'HR',
      actionType: 'CREATE',
      resourceType: 'Member',
      resourceId: created.id,
      resourceName: created.fullName,
      summary: `Membru nou adăugat: ${created.fullName} (${created.department} - ${created.role})`,
      details: `Email: ${created.email} | Auth Rol: ${payload.authRole || 'Fără Cont'}`,
      stateChanges: created,
    });

    return created;
  },

  updateMember: async (id: string, payload: Partial<HrMember>): Promise<void> => {
    const res = await fetchWithCsrf(`${API_BASE}/members/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Eroare la actualizarea profilului membrului.');
    }

    await auditService.recordAuditLog({
      department: 'HR',
      actionType: 'UPDATE',
      resourceType: 'Member',
      resourceId: id,
      resourceName: payload.fullName || id,
      summary: `Profil membru actualizat: ${payload.fullName || id}`,
      stateChanges: payload,
    });
  },

  deleteMember: async (id: string): Promise<void> => {
    const res = await fetchWithCsrf(`${API_BASE}/members/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Eroare la ștergerea membrului de pe server.');
    }

    await auditService.recordAuditLog({
      department: 'HR',
      actionType: 'DELETE',
      resourceType: 'Member',
      resourceId: id,
      resourceName: `Membru #${id}`,
      summary: `Membru șters: ${id}`,
    });
  },

  // --- STATISTICS ---
  getStats: async (): Promise<HrStats> => {
    const res = await fetchWithCsrf(`${API_BASE}/stats`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // --- FEEDBACK & COMPLAINTS SYSTEM ---
  getFeedbackCategories: async (): Promise<import('../types/hr').HrFeedbackCategory[]> => {
    const res = await fetchWithCsrf(`${API_BASE}/feedback/categories`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  createFeedbackCategory: async (name: string): Promise<import('../types/hr').HrFeedbackCategory> => {
    const res = await fetchWithCsrf(`${API_BASE}/feedback/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Eroare la crearea categoriei.');
    }
    const created = await res.json();
    await auditService.recordAuditLog({
      department: 'HR',
      actionType: 'CREATE',
      resourceType: 'FeedbackCategory',
      resourceId: created.id,
      resourceName: name,
      summary: `Categorie feedback creată: ${name}`,
    });
    return created;
  },

  updateFeedbackCategory: async (id: string, name: string): Promise<import('../types/hr').HrFeedbackCategory> => {
    const res = await fetchWithCsrf(`${API_BASE}/feedback/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Eroare la actualizarea categoriei.');
    }
    const updated = await res.json();
    await auditService.recordAuditLog({
      department: 'HR',
      actionType: 'UPDATE',
      resourceType: 'FeedbackCategory',
      resourceId: id,
      resourceName: name,
      summary: `Categorie feedback redenumită: ${name}`,
    });
    return updated;
  },

  deleteFeedbackCategory: async (id: string): Promise<void> => {
    const res = await fetchWithCsrf(`${API_BASE}/feedback/categories/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Eroare la ștergerea categoriei.');
    }
    await auditService.recordAuditLog({
      department: 'HR',
      actionType: 'DELETE',
      resourceType: 'FeedbackCategory',
      resourceId: id,
      resourceName: id,
      summary: `Categorie feedback ștearsă: ${id}`,
    });
  },

  submitFeedback: async (payload: Partial<import('../types/hr').VolunteerFeedback>): Promise<any> => {
    const res = await fetchWithCsrf(`${API_BASE}/feedback/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Eroare la trimiterea feedback-ului.');
    }
    return res.json();
  },

  getFeedbackList: async (filters: import('../types/hr').FeedbackFilters = {}): Promise<import('../types/hr').VolunteerFeedback[]> => {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== 'ALL') params.append('status', filters.status);
    if (filters.type && filters.type !== 'ALL') params.append('type', filters.type);
    if (filters.categoryId && filters.categoryId !== 'ALL') params.append('categoryId', filters.categoryId);
    if (filters.isAnonymous !== undefined) params.append('isAnonymous', String(filters.isAnonymous));
    if (filters.isPublicSubmission !== undefined) params.append('isPublicSubmission', String(filters.isPublicSubmission));
    if (filters.search) params.append('search', filters.search);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const qs = params.toString();
    const url = `${API_BASE}/feedback${qs ? `?${qs}` : ''}`;
    const res = await fetchWithCsrf(url);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  getFeedbackSummary: async (startDate?: string, endDate?: string): Promise<import('../types/hr').FeedbackSummary> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const qs = params.toString();
    const url = `${API_BASE}/feedback/summary${qs ? `?${qs}` : ''}`;
    const res = await fetchWithCsrf(url);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  updateFeedbackStatus: async (id: string, status?: string, categoryId?: string, internalNotes?: string): Promise<void> => {
    const res = await fetchWithCsrf(`${API_BASE}/feedback/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, categoryId, internalNotes }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Eroare la actualizarea feedback-ului.');
    }
    await auditService.recordAuditLog({
      department: 'HR',
      actionType: 'UPDATE',
      resourceType: 'VolunteerFeedback',
      resourceId: id,
      summary: `Feedback #${id} actualizat la status: ${status}`,
    });
  },

  deleteFeedback: async (id: string): Promise<void> => {
    const res = await fetchWithCsrf(`${API_BASE}/feedback/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Eroare la ștergerea feedback-ului.');
    }
    await auditService.recordAuditLog({
      department: 'HR',
      actionType: 'DELETE',
      resourceType: 'VolunteerFeedback',
      resourceId: id,
      summary: `Înregistrare feedback ștearsă: #${id}`,
    });
  }
};
