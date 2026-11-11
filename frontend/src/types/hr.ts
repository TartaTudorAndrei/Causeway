export type StandStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type AttendanceStatus = 'WAITING' | 'PRESENT' | 'ABSENT' | 'LATE';
export type OnboardingStatus = 'Pending' | 'Onboarding' | 'Active' | 'Inactive';
export type RoleCategory = 'LEADERSHIP' | 'FINANCE' | 'LOGISTICS' | 'GENERAL';

export interface HrMember {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  department: string;
  role: string;
  onboardingStatus: OnboardingStatus;
  availability?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  // Auth Integration
  authUserId?: string;
  authStatus?: string;
  authRole?: string;
  organizationType?: string;
  organizationDetails?: string;
}

export interface HrStandRole {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  category: RoleCategory;
  createdAt?: string;
  updatedAt?: string;
}

export interface HrLocation {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export type AssignmentApprovalStatus = 'CONFIRMED' | 'PENDING_APPROVAL' | 'CANCELLED';

export interface HrShiftAssignment {
  id: string;
  shiftId: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  memberPhone?: string;
  memberClub?: string;
  roleId: string;
  roleName: string;
  attendanceStatus: AttendanceStatus;
  eodSubmitted: boolean;
  assignmentStatus?: AssignmentApprovalStatus;
  expiresAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  checkedInAt?: string;
  checkinMethod?: 'MANUAL' | 'GPS' | 'QR' | string;
  checkinLat?: number;
  checkinLng?: number;
}

export interface HrShift {
  id: string;
  standId: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  neededVolunteers?: number;
  neededLogistics?: number;
  neededFinance?: number;
  assignments: HrShiftAssignment[];
}

export interface HrStand {
  id: string;
  locationName: string;
  eventName: string;
  eventDate: string;
  status: StandStatus;
  notes?: string;
  qrCodeToken?: string;
  shifts: HrShift[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AttendanceCheckinResult {
  success: boolean;
  message: string;
  attendanceStatus?: AttendanceStatus;
  standName?: string;
  shiftName?: string;
  memberName?: string;
  distanceMeters?: number;
}

export interface StandQrCodeInfo {
  standId: string;
  locationName: string;
  eventName: string;
  eventDate: string;
  qrToken: string;
}

export interface HrStats {
  shiftCoverageRate: number;
  totalVolunteerHoursLogged: number;
  totalStandsCount: number;
  totalMembersCount: number;
  activeMembersCount: number;
  attendanceByStand: Record<string, number>;
  roleDistribution: Record<string, number>;
  onboardingStatusBreakdown: Record<string, number>;
}

// --- Volunteer Feedback & Complaints Types ---
export type FeedbackType = 'COMPLAINT' | 'REVIEW' | 'SUGGESTION' | 'OTHER';
export type FeedbackStatus = 'NEW' | 'IN_REVIEW' | 'RESOLVED' | 'ARCHIVED';
export type FeedbackTargetType = 'GENERAL' | 'STAND' | 'EVENT';

export interface HrFeedbackCategory {
  id: string;
  name: string;
  createdAt?: string;
}

export interface VolunteerFeedback {
  id: string;
  userId?: string;
  submitterName?: string;
  submitterEmail?: string;
  categoryId?: string;
  categoryName?: string;
  type: FeedbackType;
  isAnonymous: boolean;
  isPublicSubmission: boolean;
  targetType: FeedbackTargetType;
  targetId?: string;
  content: string;
  status: FeedbackStatus;
  internalNotes?: string;
  createdAt?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolverName?: string;
}

export interface FeedbackTheme {
  theme: string;
  count: number;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  summary: string;
  isNewCategory?: boolean;
  feedbackIds?: string[];
}

export interface FeedbackSummary {
  totalSubmissions: number;
  unresolvedCount: number;
  topCategory: string;
  dominantTheme: string;
  countByType: Record<string, number>;
  countByStatus: Record<string, number>;
  countByCategory: Record<string, number>;
  clusteredThemes: FeedbackTheme[];
}

export interface FeedbackFilters {
  status?: string;
  type?: string;
  categoryId?: string;
  isAnonymous?: boolean;
  isPublicSubmission?: boolean;
  search?: string;
  startDate?: string;
  endDate?: string;
}
