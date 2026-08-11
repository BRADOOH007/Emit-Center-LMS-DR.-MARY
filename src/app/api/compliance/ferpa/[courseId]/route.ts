import { NextRequest } from 'next/server';
import { MOCK_USERS } from '@/lib/mock-data';
import { ok, forbid, notFound, badRequest } from '@/lib/api-helpers';
import { canInstructorAccessStudent, filterGradebookByEnrollment } from '@/lib/ferpa';
import { MOCK_GRADEBOOK } from '@/lib/mock-data';

export async function GET(request: NextRequest, { params }: { params: { courseId: string } }) {
  const { searchParams } = request.nextUrl;
  const instructorId = searchParams.get('instructorId') ?? 'usr_0002';
  const targetStudentId = searchParams.get('studentId');

  const instructor = MOCK_USERS.find((u) => u.id === instructorId);
  if (!instructor) return notFound('Instructor not found');

  if (targetStudentId) {
    const check = canInstructorAccessStudent(instructor, targetStudentId, params.courseId, 'gradebook');
    if (!check.allowed) return forbid(check.reason ?? 'Access denied by FERPA policy.');
    return ok({ allowed: true, studentId: targetStudentId, courseId: params.courseId });
  }

  const entries = filterGradebookByEnrollment(instructorId, MOCK_GRADEBOOK);
  const redacted = entries.map((e) => ({
    ...e,
    user: MOCK_USERS.find((u) => u.id === e.userId),
  }));

  return ok({
    allowed: true,
    instructorId,
    courseId: params.courseId,
    entries: redacted.length,
    data: redacted,
  });
}
