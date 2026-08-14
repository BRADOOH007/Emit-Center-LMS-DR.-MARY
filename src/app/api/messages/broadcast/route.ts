import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, forbid, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole, writeAuditLog } from '@/lib/security';
import { sanitizeInput } from '@/lib/validation';
import { sendEmail, sendSms, logDelivery } from '@/lib/delivery';

export async function POST(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!isAdminRole(me.roles) && !me.roles.includes('instructor')) {
    return forbid('Only instructors and administrators can broadcast messages');
  }

  const body = await parseBody<{ courseId?: string; subject?: string; content?: string }>(request).catch(() => null);
  if (!body?.courseId || !body?.subject || !body?.content) {
    return badRequest('courseId, subject, and content are required');
  }

  const course = await prisma.course.findUnique({ where: { id: body.courseId } });
  if (!course) return badRequest('Course not found');
  if (course.instructorId !== me.id && !isAdminRole(me.roles)) {
    return forbid('Only the course instructor or an administrator can broadcast');
  }

  const enrolled = await prisma.enrollment.findMany({
    where: { courseId: course.id, status: { in: ['active', 'completed'] } },
    select: { userId: true },
  });
  const userIds = enrolled.map((e) => e.userId);

  if (userIds.length === 0) return badRequest('No enrolled students to message');

  const subject = sanitizeInput(body.subject).slice(0, 200);
  const content = sanitizeInput(body.content).slice(0, 5000);

  await prisma.directMessage.createMany({
    data: userIds.map((receiverId) => ({
      senderId: me.id,
      receiverId,
      subject,
      content,
    })),
  });

  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type: 'message',
      title: `Message from ${me.fullName}`,
      body: subject,
      actionUrl: '/messages',
    })),
  });

  const recipients = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, phone: true },
  });

  await Promise.all(
    recipients.map(async (r) => {
      if (r.email) {
        await sendEmail({ to: r.email, subject, text: content }).catch(() => {});
        await logDelivery(r.id, 'email.broadcast', 'course', course.id).catch(() => {});
      }
      if (r.phone) {
        await sendSms({ to: r.phone, body: `${subject}: ${content.slice(0, 140)}` }).catch(() => {});
      }
    }),
  );

  await writeAuditLog({
    userId: me.id,
    action: 'message.broadcast',
    resourceType: 'course',
    resourceId: course.id,
  });

  return ok({ recipients: userIds.length, courseId: course.id });
}
