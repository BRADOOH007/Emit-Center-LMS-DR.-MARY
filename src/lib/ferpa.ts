import { MOCK_FERPA_LOGS } from '@/lib/mock-data';
import type { User } from '@/types';

const MOCK_ENROLLMENTS = [
  { id: 'enr_0001', userId: 'usr_0004', courseId: 'crs_0001', status: 'active' as const },
  { id: 'enr_0002', userId: 'usr_0007', courseId: 'crs_0001', status: 'active' as const },
  { id: 'enr_0003', userId: 'usr_0001', courseId: 'crs_0001', status: 'active' as const },
];

export function isEnrolledInCourse(studentId: string, courseId: string): boolean {
  return MOCK_ENROLLMENTS.some(
    (e) => e.userId === studentId && e.courseId === courseId && e.status === 'active',
  );
}

export function getInstructorCourseIds(instructorId: string): string[] {
  const unique = new Set<string>();
  MOCK_ENROLLMENTS.forEach((e) => unique.add(e.courseId));
  return Array.from(unique);
}

export function canInstructorAccessStudent(
  instructor: User,
  studentId: string,
  courseId: string,
  resourceType: 'gradebook' | 'assignment' | 'attendance' | 'profile',
): { allowed: boolean; reason?: string } {
  if (!instructor.roles.includes('instructor') && !instructor.roles.includes('administrator') && !instructor.roles.includes('super_admin')) {
    return { allowed: false, reason: 'Role not authorized to access student data.' };
  }

  if (instructor.roles.includes('super_admin')) {
    return { allowed: true };
  }

  if (instructor.roles.includes('administrator')) {
    return { allowed: true };
  }

  const enrolled = isEnrolledInCourse(studentId, courseId);
  if (!enrolled) {
    return { allowed: false, reason: `Student is not enrolled in course ${courseId}.` };
  }

  MOCK_FERPA_LOGS.push({
    id: `fpa_${Date.now()}`,
    instructorId: instructor.id,
    studentId,
    courseId,
    resourceType,
    accessedAt: new Date().toISOString(),
    ipAddress: '0.0.0.0',
  });

  return { allowed: true };
}

export function redactStudentData<T extends Record<string, unknown>>(
  data: T,
  allowedFields: (keyof T)[],
): Partial<T> {
  const result: Partial<T> = {};
  allowedFields.forEach((field) => {
    if (field in data) {
      result[field] = data[field];
    }
  });
  return result;
}

export function filterGradebookByEnrollment<T extends { courseId?: string; userId?: string }>(
  instructorId: string,
  entries: T[],
): T[] {
  const allowedCourseIds = getInstructorCourseIds(instructorId);
  return entries.filter(
    (entry) =>
      entry.courseId && allowedCourseIds.includes(entry.courseId) && entry.userId && isEnrolledInCourse(entry.userId, entry.courseId),
  );
}
