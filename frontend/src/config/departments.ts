import type { DepartmentItem } from '../types/general';

export const DEFAULT_DEPARTMENTS: DepartmentItem[] = [
    { id: 'general', name: 'General', key: 'general.deptGeneral', fallback: 'General', displayOrder: 1 },
    { id: 'finance', name: 'Finanțe', key: 'general.deptFinance', fallback: 'Finances', displayOrder: 2 },
    { id: 'it', name: 'IT & Securitate', key: 'general.deptIT', fallback: 'IT', displayOrder: 3 },
    { id: 'fundraising', name: 'Fundraising', key: 'general.deptFundraising', fallback: 'Fundraising', displayOrder: 4 },
    { id: 'logistics', name: 'Logistică', key: 'general.deptLogistics', fallback: 'Logistics', displayOrder: 5 },
    { id: 'hr', name: 'Resurse Umane', key: 'general.deptHR', fallback: 'HR', displayOrder: 6 },
    { id: 'legal', name: 'Legal', key: 'general.deptLegal', fallback: 'Legal', displayOrder: 7 },
    { id: 'marketing', name: 'Marketing', key: 'general.deptMarketing', fallback: 'Marketing', displayOrder: 8 },
];

export const DEPARTMENTS = DEFAULT_DEPARTMENTS;
