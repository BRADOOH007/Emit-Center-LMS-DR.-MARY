import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, forbid, notFound, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole, writeAuditLog } from '@/lib/security';
import { sanitizeInput } from '@/lib/validation';

export async function GET(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');

  const { searchParams } = request.nextUrl;
  const courseId = searchParams.get('courseId');

  if (courseId) {
    const announcements = await prisma.announcement.findMany({
      where: { courseId },
      include: { author: { select: { id: true, fullName: true, email: true, avatarUrl: true } } },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    });
    return ok(announcements);
  }

  // Course-wide feed: announcements for courses the user teaches or is enrolled in.
  const [taught, enrolled] = await Promise.all([
    prisma.course.findMany({ where: { instructorId: me.id }, select: { id: true } }),
    prisma.enrollment.findMany({
      where: { userId: me.id, status: { in: ['active', 'completed'] } },
      select: { courseId: true },
    }),
  ]);
  const courseIds = [...new Set([...taught.map((c) => c.id), ...enrolled.map((e) => e.courseId)])];

  const announcements = await prisma.announcement.findMany({
    where: { courseId: { in: courseIds } },
    include: { author: { select: { id: true, fullName: true, email: true, avatarUrl: true } } },
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    take: 50,
  });

  return ok(announcements);
}

export async function POST(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!isAdminRole(me.roles) && !me.roles.includes('instructor')) {
    return forbid('Only instructors and administrators can post announcements');
  }

  const body = await parseBody<{ courseId?: string; title?: string; body?: string; pinned?: boolean }>(request).catch(
    () => null,
  );
  if (!body?.courseId || !body?.title || !body?.body) return badRequest('courseId, title, and body are required');

  const course = await prisma.course.findUnique({ where: { id: body.courseId } });
  if (!course) return notFound('Course not found');
  if (course.instructorId !== me.id && !isAdminRole(me.roles)) {
    return forbid('Only the course instructor or an administrator can post announcements');
  }

  const announcement = await prisma.announcement.create({
    data: {
      courseId: body.courseId,
      authorId: me.id,
      title: sanitizeInput(body.title).slice(0, 200),
      body: sanitizeInput(body.body).slice(0, 5000),
      pinned: body.pinned ?? false,
    },
    include: { author: { select: { id: true, fullName: true, email: true, avatarUrl: true } } },
  });

  await writeAuditLog({
    userId: me.id,
    action: 'announcement.created',
    resourceType: 'course',
    resourceId: body.courseId,
  });

  return ok(announcement, 201);
}
