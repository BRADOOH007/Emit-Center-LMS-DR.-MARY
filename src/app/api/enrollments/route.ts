import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, forbid, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole, isRateLimited } from '@/lib/security';

async function isLinkedParent(parentId: string, studentId: string): Promise<boolean> {
  const link = await prisma.parentStudentLink.findUnique({
    where: { parentId_studentId: { parentId, studentId } },
  });
  return Boolean(link);
}

export async function GET(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');

  const { searchParams } = request.nextUrl;
  const userId = searchParams.get('userId');

  const isAdmin = isAdminRole(me.roles);

  if (userId && userId !== me.id && !isAdmin && !(await isLinkedParent(me.id, userId))) {
    return forbid('You can only view your own enrollments');
  }

  const enrollments = await prisma.enrollment.findMany({
    where: userId ? { userId } : isAdmin ? {} : { userId: me.id },
    orderBy: { createdAt: 'desc' },
    include: {
      course: {
        include: { pricing: true, instructor: { select: { id: true, fullName: true } } },
      },
      user: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
      payment: true,
    },
  });

  return ok(enrollments);
}

export async function PATCH(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!isAdminRole(me.roles)) return forbid('Administrator access required');

  const body = await parseBody<{ id?: string; status?: string }>(request).catch(() => null);
  if (!body?.id || !body?.status) return badRequest('id and status are required');

  const validStatuses = ['active', 'pending', 'completed', 'cancelled'];
  if (!validStatuses.includes(body.status)) return badRequest('Invalid status');

  const existing = await prisma.enrollment.findUnique({ where: { id: body.id } });
  if (!existing) return badRequest('Enrollment not found');

  const enrollment = await prisma.enrollment.update({
    where: { id: body.id },
    data: { status: body.status as 'active' | 'pending' | 'completed' | 'cancelled' },
    include: {
      course: { include: { pricing: true, instructor: { select: { id: true, fullName: true } } } },
      user: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
      payment: true,
    },
  });

  return ok(enrollment);
}

export async function POST(request: NextRequest) {
  if (isRateLimited(request)) return badRequest('Too many requests. Please try again later.');

  const me = await getSessionUser();
  if (!me) return forbid('Sign in to enroll');

  const body = await parseBody<{ courseId?: string }>(request).catch(() => null);
  if (!body?.courseId) return badRequest('courseId is required');

  const course = await prisma.course.findUnique({ where: { id: body.courseId } });
  if (!course) return badRequest('Course not found');
  if (!course.isPublished) return badRequest('This course is not open for enrollment');

  const activeCount = await prisma.enrollment.count({
    where: { courseId: course.id, status: { in: ['active', 'pending'] } },
  });
  if (activeCount >= course.maxSeats) return badRequest('This course is full');

  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: me.id, courseId: course.id } },
  });
  if (existing) return badRequest('You are already enrolled in this course');

  const enrollment = await prisma.enrollment.create({
    data: { userId: me.id, courseId: course.id, status: 'pending' },
  });

  await prisma.course.update({
    where: { id: course.id },
    data: { enrolledCount: { increment: 1 } },
  });

  return ok(enrollment);
}
