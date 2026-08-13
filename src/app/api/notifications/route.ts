import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, forbid, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');

  const { searchParams } = request.nextUrl;
  const unreadOnly = searchParams.get('unreadOnly') === '1';

  const notifications = await prisma.notification.findMany({
    where: { userId: me.id, ...(unreadOnly ? { isRead: false } : {}) },
    orderBy: { createdAt: 'desc' },
  });

  return ok(notifications);
}

export async function PATCH(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');

  const body = await parseBody<{ notificationIds?: string[]; markAll?: boolean }>(request).catch(() => null);
  if (!body) return badRequest('Invalid request body');

  if (body.markAll) {
    await prisma.notification.updateMany({
      where: { userId: me.id, isRead: false },
      data: { isRead: true },
    });
    return ok({ markedAll: true });
  }

  if (body.notificationIds?.length) {
    const result = await prisma.notification.updateMany({
      where: { id: { in: body.notificationIds }, userId: me.id },
      data: { isRead: true },
    });
    return ok({ markedCount: result.count });
  }

  return badRequest('Provide notificationIds or markAll');
}
