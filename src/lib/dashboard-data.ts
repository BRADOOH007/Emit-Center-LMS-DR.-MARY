import {
  MOCK_COURSES,
  MOCK_GRADEBOOK,
  MOCK_PARENT_LINKS,
  MOCK_SESSIONS,
  MOCK_SUBMISSIONS,
  MOCK_USERS,
} from '@/lib/mock-data';
import type {
  AnnouncementData,
  Enrollment,
  Payment,
  Program,
} from '@/types/dashboard';

const STUDENT_IDS = ['usr_0004', 'usr_0007', 'usr_0001'];
const ALL_STUDENT_IDS = [...STUDENT_IDS, 'usr_0008', 'usr_0009', 'usr_0010', 'usr_0011', 'usr_0012'];

const ENROLLMENT_STATUSES = ['active', 'active', 'completed', 'pending', 'active', 'cancelled'] as const;
const PAYMENT_STATUSES = ['succeeded', 'succeeded', 'succeeded', 'processing', 'refunded', 'failed'] as const;

export function getMockIdentity(
  sessionUser: { user: { id: string; fullName?: string; name?: string; email: string } } | null | undefined,
): { id: string; name: string; email: string } {
  if (sessionUser?.user) {
    return {
      id: sessionUser.user.id,
      name: sessionUser.user.fullName ?? sessionUser.user.name ?? sessionUser.user.email,
      email: sessionUser.user.email,
    };
  }
  return { id: '', name: '', email: '' };
}

export function getEnrollments(): Enrollment[] {
  return [];
}

export function getPayments(): Payment[] {
  return [];
}

export function getPrograms(): Program[] {
  return [];
}

export function getAnnouncements(): AnnouncementData[] {
  return [];
}

export function getStudentCourseIds(studentId: string): string[] {
  return getEnrollments()
    .filter((e) => e.userId === studentId && e.status === 'active')
    .map((e) => e.courseId);
}

export function getStudentEnrollments(studentId: string): Enrollment[] {
  return getEnrollments().filter((e) => e.userId === studentId);
}

export function getStudentPayments(studentId: string): Payment[] {
  return getPayments().filter((p) => p.userId === studentId);
}

export function getGradebookForStudent(studentId: string) {
  return MOCK_GRADEBOOK.filter((entry) => entry.userId === studentId);
}

export function getLinkedStudentIds(parentId: string): string[] {
  const links = MOCK_PARENT_LINKS.filter((link) => link.parentId === parentId);
  return links.map((link) => link.studentId);
}

export function getInstructorCourses(instructorId: string) {
  return MOCK_COURSES.filter((c) => c.instructorId === instructorId);
}

export function getRosterForCourse(courseId: string) {
  return getEnrollments()
    .filter((e) => e.courseId === courseId && e.status === 'active')
    .map((enrollment) => {
      const grade = MOCK_GRADEBOOK.find((g) => g.userId === enrollment.userId && g.courseId === courseId);
      const submissions = MOCK_SUBMISSIONS.filter((s) => s.userId === enrollment.userId);
      return {
        ...enrollment,
        grade: grade?.letterGrade ?? '—',
        attendancePct: 0,
        submissions,
      };
    });
}

export function sessionsForCourse(courseId: string) {
  return MOCK_SESSIONS.filter((s) => s.courseId === courseId);
}

export function studentSessionCount(studentId: string): number {
  return getStudentCourseIds(studentId).length;
}
