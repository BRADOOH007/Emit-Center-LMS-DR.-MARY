import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, forbid, notFound, badRequest } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole } from '@/lib/security';

export async function GET(request: NextRequest, { params }: { params: { courseId: string } }) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');

  const isAdmin = isAdminRole(me.roles);
  const isInstructor = await prisma.course
    .findFirst({ where: { id: params.courseId, instructorId: me.id } })
    .then(Boolean);

  if (!isAdmin && !isInstructor) {
    return forbid('Only the course instructor or an administrator may access student records.');
  }

  const { searchParams } = request.nextUrl;
  const targetStudentId = searchParams.get('studentId');

  if (targetStudentId) {
    const enrolled = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: targetStudentId, courseId: params.courseId } },
    });
    if (!enrolled || enrolled.status !== 'active') {
      return forbid('Student is not enrolled in this course.');
    }
    // FERPA — FerpaAccessLog tracks instructor access to student records.
    // Commented out; restore this block when needed:
    // await prisma.ferpaAccessLog.create({
    //   data: {
    //     instructorId: me.id,
    //     studentId: targetStudentId,
    //     courseId: params.courseId,
    //     resourceType: 'gradebook',
    //     ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    //   },
    // });
    return ok({ allowed: true, studentId: targetStudentId, courseId: params.courseId });
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId: params.courseId, status: 'active' },
    select: { userId: true },
  });

  const entries = await prisma.gradebookEntry.findMany({
    where: { courseId: params.courseId, userId: { in: enrollments.map((e) => e.userId) } },
    include: { user: { select: { id: true, fullName: true, email: true } } },
  });

  return ok({
    allowed: true,
    instructorId: me.id,
    courseId: params.courseId,
    entries: entries.length,
    data: entries,
  });
}
