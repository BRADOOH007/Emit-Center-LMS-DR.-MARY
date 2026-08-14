import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, forbid, notFound, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole, writeAuditLog } from '@/lib/security';
import { sanitizeInput } from '@/lib/validation';
import { sendEmail, logDelivery } from '@/lib/delivery';

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

  // Notify enrolled students (in-app + email delivery).
  notifyEnrolled(body.courseId, body.title, body.body, me.id).catch(() => {});

  return ok(announcement, 201);
}

async function notifyEnrolled(courseId: string, title: string, bodyText: string, authorId: string) {
  const enrolled = await prisma.enrollment.findMany({
    where: { courseId, status: { in: ['active', 'completed'] } },
    select: { userId: true },
  });
  const userIds = enrolled.map((e) => e.userId);

  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type: 'announcement',
      title: `New announcement: ${title}`,
      body: bodyText.slice(0, 500),
      actionUrl: `/dashboard/student/courses`,
    })),
  });

  const recipients = await prisma.user.findMany({
    where: { id: { in: userIds }, emailVerifiedAt: { not: null } },
    select: { id: true, email: true },
  });

  await Promise.all(
    recipients.map(async (r) => {
      await sendEmail({
        to: r.email,
        subject: `EMIT Center: ${title}`,
        text: `${bodyText}\n\n— Your instructor`,
      }).catch(() => {});
      await logDelivery(r.id, 'email.notification', 'announcement', courseId).catch(() => {});
    }),
  );
}
