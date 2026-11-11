export type LocationType = 'STAND' | 'DEPOSIT';

export interface DepartmentItem {
  id: string;
  name: string;
  key?: string;
  fallback?: string;
  color?: string;
  displayOrder?: number;
}

export interface LocationItem {
  id: string;
  name: string;
  code?: string;
  type: LocationType;
  description?: string;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  isSystem?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD (start date)
  endDate?: string; // YYYY-MM-DD (end date for interval)
  time: string; // HH:mm
  department: string;
  createdBy: string;
  isSpecialDemand?: boolean;
  demandMultiplier?: number;
  demandTag?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  department: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in_progress' | 'done';
  reminderCount?: number;
  assignee: string;
  assigneeIds?: string[];
  startDate?: string; // YYYY-MM-DD (start date)
  dueDate: string; // YYYY-MM-DD (deadline / due date)
  createdBy: string;
}

export interface DashboardSectionInfo {
  sectionKey: string;
  title: string;
  contentMarkdown: string;
  googleDocUrl?: string | null;
  updatedBy?: string | null;
  updatedAt?: string | null;
}
