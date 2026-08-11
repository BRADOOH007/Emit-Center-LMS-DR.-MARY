import type {
  Course,
  CourseSchedule,
  User,
  AttendanceRecord,
  ChatMessage,
  ClassSession,
  FacilityRoom,
  LessonContent,
  LessonSection,
  LiveSession,
  Recording,
  ResourceBooking,
  ResourceItem,
  Assignment,
  Certificate,
  GradebookEntry,
  Quiz,
  QuizAttempt,
  Rubric,
  Submission,
  AnalyticsMetrics,
  DirectMessage,
  DiscussionReply,
  DiscussionThread,
  Notification,
  AccountDeletionRequest,
  ConsentRecord,
  DataExportRequest,
  FerpaAccessLog,
  AuditLog,
} from '@/types';

const DEFAULT_SCHEDULE: CourseSchedule = {
  days: ['Monday', 'Wednesday'],
  startDate: '2026-09-07T00:00:00.000Z',
  endDate: '2026-12-18T00:00:00.000Z',
  timeSlots: [{ start: '15:00', end: '16:30', timezone: 'America/New_York' }],
};

export const DEFAULT_SCHEDULE_SHARED = DEFAULT_SCHEDULE;

export const MOCK_USERS: User[] = [];

export const MOCK_COURSES: Course[] = [];

export const MOCK_PARENT_LINKS: { id: string; parentId: string; studentId: string; relationshipType: 'mother' | 'father' | 'guardian'; createdAt: string }[] = [];

export const MOCK_ROOMS: FacilityRoom[] = [];

export const MOCK_RESOURCES: ResourceItem[] = [];

export const MOCK_SESSIONS: ClassSession[] = [];

export const MOCK_ATTENDANCE_RECORDS: AttendanceRecord[] = [];

export const MOCK_BOOKINGS: ResourceBooking[] = [];

export const MOCK_LESSON_SECTIONS: LessonSection[] = [];

export const MOCK_LESSON_CONTENTS: LessonContent[] = [];

export const MOCK_LIVE_SESSIONS: LiveSession[] = [];

export const MOCK_CHAT_MESSAGES: ChatMessage[] = [];

export const MOCK_QUIZZES: Quiz[] = [];

export const MOCK_QUIZ_ATTEMPTS: QuizAttempt[] = [];

export const MOCK_ASSIGNMENTS: Assignment[] = [];

export const MOCK_RUBRICS: Rubric[] = [];

export const MOCK_SUBMISSIONS: Submission[] = [];

export const MOCK_GRADEBOOK: GradebookEntry[] = [];

export const MOCK_CERTIFICATES: Certificate[] = [];

export const MOCK_ANALYTICS: AnalyticsMetrics = {
  activeEnrollments: 0,
  totalStudents: 0,
  onsiteAttendanceRate: 0,
  onlineAttendanceRate: 0,
  overallAttendanceRate: 0,
  courseCompletionRate: 0,
  atRiskCount: 0,
  atRiskStudents: [],
  enrollmentTrend: [],
  attendanceTrend: [],
  gradeDistribution: [],
};

export const MOCK_DISCUSSION_THREADS: DiscussionThread[] = [];

export const MOCK_DISCUSSION_REPLIES: DiscussionReply[] = [];

export const MOCK_DIRECT_MESSAGES: DirectMessage[] = [];

export const MOCK_NOTIFICATIONS: Notification[] = [];

export const MOCK_CONSENT_RECORDS: ConsentRecord[] = [];

export const MOCK_DATA_EXPORT_REQUESTS: DataExportRequest[] = [];

export const MOCK_DELETION_REQUESTS: AccountDeletionRequest[] = [];

export const MOCK_FERPA_LOGS: FerpaAccessLog[] = [];

export const MOCK_AUDIT_LOGS: AuditLog[] = [];

export type MockRecordingPlaceholder = Recording;