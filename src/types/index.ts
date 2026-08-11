export type { SupportedLocale, SupportedTimeZone, SupportedCurrency, LocaleConfig } from './locale';

import type { SupportedLocale, SupportedTimeZone, SupportedCurrency } from './locale';

export type Role = 'super_admin' | 'administrator' | 'instructor' | 'student' | 'parent';

export type Permission =
  | 'portal.access'
  | 'portal.super_admin'
  | 'dashboard.admin'
  | 'dashboard.instructor'
  | 'dashboard.student'
  | 'dashboard.parent'
  | 'courses.view'
  | 'courses.manage'
  | 'classes.view'
  | 'classes.manage'
  | 'enroll.self'
  | 'enroll.manage'
  | 'users.manage'
  | 'students.view'
  | 'instructors.manage'
  | 'grades.view'
  | 'grades.manage'
  | 'payments.view'
  | 'payments.manage'
  | 'reports.view'
  | 'settings.manage'
  | 'announcements.manage';

export interface User {
  id: string;
  fullName: string;
  name: string;
  email: string;
  avatarUrl?: string;
  phone?: string;
  countryCode?: string;
  roles: Role[];
  activeRole: Role;
  locale: SupportedLocale;
  timeZone: SupportedTimeZone;
  currency: SupportedCurrency;
  createdAt?: string;
}

export interface Session {
  user: User;
  expiresAt: string;
}

export type DeliveryFormat = 'onsite' | 'online' | 'hybrid';
export type AgeLevel = 'elementary' | 'middle' | 'high' | 'adult' | 'all';
export type CourseSubject = 'robotics' | 'coding' | 'design' | 'life-skills' | 'engineering' | 'career';
export type EnrollmentStatus = 'pending' | 'active' | 'completed' | 'cancelled' | 'refunded';
export type RelationshipType = 'guardian' | 'mother' | 'father' | 'sponsor';
export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded';

export interface CoursePrice {
  id: string;
  courseId: string;
  currency: SupportedCurrency;
  amount: number;
}

export interface CourseSchedule {
  days: string[];
  startDate: string;
  endDate: string;
  timeSlots: { start: string; end: string; timezone: string }[];
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  format: DeliveryFormat;
  ageLevel: AgeLevel;
  subject: CourseSubject;
  imageUrl?: string;
  schedule: CourseSchedule;
  onsiteLocation?: string;
  virtualLink?: string;
  maxSeats: number;
  enrolledCount: number;
  instructorId: string;
  instructor?: User;
  pricing: CoursePrice[];
  isPublished: boolean;
  createdAt: string;
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  status: EnrollmentStatus;
  createdAt: string;
  updatedAt: string;
  user?: User;
  course?: Course;
}

export interface Payment {
  id: string;
  userId: string;
  courseId: string;
  enrollmentId: string;
  amount: number;
  currency: SupportedCurrency;
  stripePaymentIntentId: string;
  status: PaymentStatus;
  createdAt: string;
}

export interface ParentStudentLink {
  id: string;
  parentId: string;
  studentId: string;
  relationshipType: RelationshipType;
  createdAt: string;
  parent?: User;
  student?: User;
}

export interface CourseFilters {
  format?: DeliveryFormat[];
  ageLevel?: AgeLevel[];
  subject?: CourseSubject[];
  timezone?: string;
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export type ClassSessionStatus = 'scheduled' | 'live' | 'completed' | 'cancelled';
export type SessionType = 'lecture' | 'lab' | 'workshop' | 'office-hours';

export interface ClassSession {
  id: string;
  courseId: string;
  title: string;
  format: DeliveryFormat;
  date: string;
  startTime: string;
  endTime: string;
  hostTimezone: string;
  instructorId: string;
  roomId?: string;
  meetingLink?: string;
  meetingPlatform?: 'zoom' | 'google_meet' | 'teams';
  status: ClassSessionStatus;
  sessionType: SessionType;
  course?: Course;
  instructor?: User;
  room?: FacilityRoom;
}

export type ResourceType = 'robotics_kit' | 'laptop' | 'lab_equipment' | 'microscope' | '3d_printer';
export type ResourceStatus = 'available' | 'in_use' | 'maintenance' | 'retired';

export interface FacilityRoom {
  id: string;
  name: string;
  building: string;
  floor: number;
  capacity: number;
  amenities: string[];
  imageUrl?: string;
  status: 'open' | 'closed' | 'maintenance';
}

export interface ResourceItem {
  id: string;
  name: string;
  type: ResourceType;
  quantity: number;
  available: number;
  status: ResourceStatus;
  location: string;
  iconName?: string;
}

export interface ResourceBooking {
  id: string;
  resourceId: string;
  roomId?: string;
  userId: string;
  courseId: string;
  sessionId: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'approved' | 'active' | 'completed' | 'cancelled';
  resource?: ResourceItem;
  room?: FacilityRoom;
  user?: User;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type CheckInMethod = 'manual' | 'qr' | 'auto';

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  userId: string;
  status: AttendanceStatus;
  checkInMethod: CheckInMethod;
  checkInTime?: string;
  notes?: string;
  user?: User;
}

export interface AttendanceSession {
  session: ClassSession;
  records: AttendanceRecord[];
  totalEnrolled: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
}

export type ContentType = 'video' | 'document' | 'assignment' | 'scorm' | 'quiz' | 'discussion';
export type LivePlatform = 'zoom' | 'google_meet' | 'teams' | 'jitsi';

export interface LessonSection {
  id: string;
  title: string;
  order: number;
  contentType: ContentType;
  duration?: string;
}

export interface LessonContent {
  id: string;
  sectionId: string;
  courseId: string;
  title: string;
  type: ContentType;
  embedUrl?: string;
  fileUrl?: string;
  scormManifestUrl?: string;
  duration?: string;
  isCompleted?: boolean;
  order: number;
}

export interface LiveSession {
  id: string;
  courseId: string;
  title: string;
  platform: LivePlatform;
  joinUrl: string;
  hostKey?: string;
  agenda: string[];
  status: 'upcoming' | 'live' | 'ended';
  scheduledStart: string;
  scheduledEnd: string;
  startedAt?: string;
  endedAt?: string;
  recordings?: Recording[];
}

export interface Recording {
  id: string;
  sessionId: string;
  title: string;
  url: string;
  duration: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: string;
}

export type QuizQuestionType = 'multiple-choice' | 'short-answer' | 'file-upload' | 'rubric';
export type LetterGrade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F' | 'INC';

export interface QuizQuestion {
  id: string;
  question: string;
  type: QuizQuestionType;
  options?: string[];
  correctAnswer?: string;
  points: number;
  required: boolean;
}

export interface Quiz {
  id: string;
  courseId: string;
  title: string;
  description: string;
  timeLimit?: number;
  questions: QuizQuestion[];
  totalPoints: number;
  isPublished: boolean;
  createdAt: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  answers: Record<string, string>;
  score: number;
  totalPoints: number;
  percentage: number;
  letterGrade: LetterGrade;
  startedAt: string;
  submittedAt: string;
  autoGraded: boolean;
  user?: User;
}

export interface Assignment {
  id: string;
  courseId: string;
  title: string;
  description: string;
  dueDate: string;
  points: number;
  allowedFormats: string[];
  isPublished: boolean;
  createdAt: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  userId: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  textAnswer?: string;
  submittedAt: string;
  score?: number;
  feedback?: string;
  letterGrade?: LetterGrade;
  status: 'draft' | 'submitted' | 'graded' | 'returned';
  user?: User;
  assignment?: Assignment;
}

export interface RubricCriterion {
  id: string;
  label: string;
  maxPoints: number;
  descriptors: { score: number; description: string }[];
}

export interface Rubric {
  id: string;
  assignmentId: string;
  criteria: RubricCriterion[];
}

export interface GradebookEntry {
  id: string;
  courseId: string;
  userId: string;
  quizScores: { quizId: string; score: number; percentage: number; letterGrade: LetterGrade }[];
  assignmentScores: { assignmentId: string; score: number; percentage: number; letterGrade: LetterGrade }[];
  practicalScore: number;
  overallPercentage: number;
  letterGrade: LetterGrade;
  comments: string;
  lastUpdated: string;
  user?: User;
}

export interface Certificate {
  id: string;
  userId: string;
  courseId: string;
  studentName: string;
  courseTitle: string;
  completionDate: string;
  verificationHash: string;
  issuedAt: string;
}

export interface AnalyticsMetrics {
  activeEnrollments: number;
  totalStudents: number;
  onsiteAttendanceRate: number;
  onlineAttendanceRate: number;
  overallAttendanceRate: number;
  courseCompletionRate: number;
  atRiskCount: number;
  atRiskStudents: { userId: string; name: string; courseName: string; riskLevel: 'low' | 'medium' | 'high'; attendancePct: number; gradePct: number }[];
  enrollmentTrend: { date: string; count: number }[];
  attendanceTrend: { date: string; onsitePct: number; onlinePct: number }[];
  gradeDistribution: { grade: LetterGrade; count: number }[];
}

export type DiscussionFlagReason = 'inappropriate' | 'spam' | 'off-topic' | 'other';
export type NotificationType =
  | 'assignment_due'
  | 'class_reminder'
  | 'grade_published'
  | 'discussion_reply'
  | 'message_received'
  | 'announcement';

export interface DiscussionThread {
  id: string;
  courseId: string;
  unitId?: string;
  title: string;
  content: string;
  authorId: string;
  author?: User;
  isPinned: boolean;
  isEndorsed: boolean;
  isLocked: boolean;
  replyCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  lastReplyAt?: string;
}

export interface DiscussionReply {
  id: string;
  threadId: string;
  content: string;
  authorId: string;
  author?: User;
  isModeratorReply: boolean;
  isEndorsed: boolean;
  parentReplyId?: string;
  createdAt: string;
  parentReply?: DiscussionReply;
}

export interface ThreadFlag {
  id: string;
  threadId?: string;
  replyId?: string;
  flaggedBy: string;
  reason: DiscussionFlagReason;
  description?: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  createdAt: string;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  subject: string;
  content: string;
  parentStudentId?: string;
  isRead: boolean;
  createdAt: string;
  sender?: User;
  receiver?: User;
}

export interface MessageThread {
  id: string;
  participants: string[];
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export type ConsentType = 'coppa' | 'gdpr_data' | 'gdpr_marketing' | 'tos';
export type ConsentStatus = 'pending' | 'verified' | 'declined' | 'expired';
export type ExportFormat = 'json' | 'csv';
export type DeletionStatus = 'pending' | 'grace_period' | 'completed' | 'cancelled';
export type AuditAction =
  | 'user.login'
  | 'user.logout'
  | 'user.created'
  | 'grade.viewed'
  | 'grade.updated'
  | 'data.exported'
  | 'data.export_requested'
  | 'account.deletion_requested'
  | 'account.deleted'
  | 'consent.verified';

export interface ConsentRecord {
  id: string;
  userId: string;
  type: ConsentType;
  status: ConsentStatus;
  parentEmail?: string;
  parentVerificationToken?: string;
  verifiedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface DataExportRequest {
  id: string;
  userId: string;
  format: ExportFormat;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: string;
  completedAt?: string;
  downloadUrl?: string;
  expiresAt?: string;
}

export interface AccountDeletionRequest {
  id: string;
  userId: string;
  status: DeletionStatus;
  reason?: string;
  requestedAt: string;
  gracePeriodEnd: string;
  completedAt?: string;
  cancelledAt?: string;
}

export interface FerpaAccessLog {
  id: string;
  instructorId: string;
  studentId: string;
  courseId: string;
  resourceType: 'gradebook' | 'assignment' | 'attendance' | 'profile';
  accessedAt: string;
  ipAddress?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, string>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}
