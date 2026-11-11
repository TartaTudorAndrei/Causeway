import { fetchWithCsrf } from './apiClient';
import type { CalendarEvent, TaskItem, LocationItem, DepartmentItem, DashboardSectionInfo } from '../types/general';

export type { CalendarEvent, TaskItem, LocationItem, DepartmentItem, DashboardSectionInfo };

const API_BASE = '/api/admin/general';

export const generalService = {
  // ================= DEPARTMENTS =================
  async getDepartments(): Promise<DepartmentItem[]> {
    const res = await fetchWithCsrf(`${API_BASE}/departments`);
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(err || `Failed to load departments: ${res.status}`);
    }
    return res.json();
  },

  async createDepartment(department: Partial<DepartmentItem>): Promise<DepartmentItem> {
    const res = await fetchWithCsrf(`${API_BASE}/departments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(department),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(err || `Failed to create department: ${res.status}`);
    }
    return res.json();
  },

  async updateDepartment(id: string, department: Partial<DepartmentItem>): Promise<DepartmentItem> {
    const res = await fetchWithCsrf(`${API_BASE}/departments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(department),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(err || `Failed to update department: ${res.status}`);
    }
    return res.json();
  },

  async deleteDepartment(id: string): Promise<void> {
    const res = await fetchWithCsrf(`${API_BASE}/departments/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(err || `Failed to delete department: ${res.status}`);
    }
  },

  // ================= EVENTS =================
  async getEvents(): Promise<CalendarEvent[]> {
    const res = await fetchWithCsrf(`${API_BASE}/events`);
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(err || `Failed to load events: ${res.status}`);
    }
    return res.json();
  },

  async createEvent(event: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const res = await fetchWithCsrf(`${API_BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(err || `Failed to create event: ${res.status}`);
    }
    return res.json();
  },

  async updateEvent(id: string, event: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const res = await fetchWithCsrf(`${API_BASE}/events/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(err || `Failed to update event: ${res.status}`);
    }
    return res.json();
  },

  async deleteEvent(id: string): Promise<void> {
    const res = await fetchWithCsrf(`${API_BASE}/events/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(err || `Failed to delete event: ${res.status}`);
    }
  },

  // ================= TASKS =================
  async getTasks(): Promise<TaskItem[]> {
    const res = await fetchWithCsrf(`${API_BASE}/tasks`);
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(err || `Failed to load tasks: ${res.status}`);
    }
    return res.json();
  },

  async createTask(task: Partial<TaskItem>): Promise<TaskItem> {
    const res = await fetchWithCsrf(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(err || `Failed to create task: ${res.status}`);
    }
    return res.json();
  },

  async updateTask(id: string, task: Partial<TaskItem>): Promise<TaskItem> {
    const res = await fetchWithCsrf(`${API_BASE}/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(err || `Failed to update task: ${res.status}`);
    }
    return res.json();
  },

  async deleteTask(id: string): Promise<void> {
    const res = await fetchWithCsrf(`${API_BASE}/tasks/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(err || `Failed to delete task: ${res.status}`);
    }
  },

  // ================= LOCATIONS =================
  async getLocations(): Promise<LocationItem[]> {
    const res = await fetchWithCsrf(`${API_BASE}/locations`);
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(err || `Failed to load locations: ${res.status}`);
    }
    return res.json();
  },

  async createLocation(location: Partial<LocationItem>): Promise<LocationItem> {
    const res = await fetchWithCsrf(`${API_BASE}/locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(location),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      try {
        const json = JSON.parse(errText);
        throw new Error(json.message || json.error || errText);
      } catch (e: any) {
        if (e.message && !e.message.startsWith('Unexpected token') && !e.message.startsWith('JSON.parse')) throw e;
        throw new Error(errText || `Failed to create location: ${res.status}`);
      }
    }
    return res.json();
  },

  async updateLocation(id: string, location: Partial<LocationItem>): Promise<LocationItem> {
    const res = await fetchWithCsrf(`${API_BASE}/locations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(location),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      try {
        const json = JSON.parse(errText);
        throw new Error(json.message || json.error || errText);
      } catch (e: any) {
        if (e.message && !e.message.startsWith('Unexpected token') && !e.message.startsWith('JSON.parse')) throw e;
        throw new Error(errText || `Failed to update location: ${res.status}`);
      }
    }
    return res.json();
  },

  async deleteLocation(id: string): Promise<void> {
    const res = await fetchWithCsrf(`${API_BASE}/locations/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      try {
        const json = JSON.parse(errText);
        throw new Error(json.message || json.error || errText);
      } catch (e: any) {
        if (e.message && !e.message.startsWith('Unexpected token') && !e.message.startsWith('JSON.parse')) throw e;
        throw new Error(errText || `Failed to delete location: ${res.status}`);
      }
    }
  },

  // ================= SECTION INFO =================
  async getAllSectionInfo(): Promise<DashboardSectionInfo[]> {
    const res = await fetchWithCsrf(`${API_BASE}/info`);
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(err || `Failed to fetch section info: ${res.status}`);
    }
    return res.json();
  },

  async getSectionInfoByKey(sectionKey: string): Promise<DashboardSectionInfo> {
    const res = await fetchWithCsrf(`${API_BASE}/info/${sectionKey}`);
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(err || `Failed to fetch section info for ${sectionKey}: ${res.status}`);
    }
    return res.json();
  },

  async updateSectionInfo(sectionKey: string, payload: Partial<DashboardSectionInfo>): Promise<DashboardSectionInfo> {
    const res = await fetchWithCsrf(`${API_BASE}/info/${sectionKey}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(err || `Failed to update section info: ${res.status}`);
    }
    return res.json();
  },

  async proxyGoogleDocHtml(url: string): Promise<string> {
    const res = await fetchWithCsrf(`${API_BASE}/info/proxy-gdoc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(err || `Failed to export Google Doc: ${res.status}`);
    }
    return res.text();
  },
};
