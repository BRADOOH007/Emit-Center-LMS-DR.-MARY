import { NextRequest } from 'next/server';
import { MOCK_NOTIFICATIONS } from '@/lib/mock-data';
import { ok, badRequest, parseBody } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const userId = searchParams.get('userId') ?? 'usr_0004';
  const unreadOnly = searchParams.get('unreadOnly') === '1';

  let notifications = MOCK_NOTIFICATIONS.filter((n) => n.userId === userId);
  if (unreadOnly) notifications = notifications.filter((n) => !n.isRead);

  notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return ok(notifications);
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await parseBody<{ notificationIds?: string[]; markAll?: boolean; userId?: string }>(request);
    if (body.markAll && body.userId) {
      MOCK_NOTIFICATIONS.forEach((n) => { if (n.userId === body.userId) n.isRead = true; });
      return ok({ markedAll: true });
    }
    if (body.notificationIds) {
      body.notificationIds.forEach((id) => {
        const item = MOCK_NOTIFICATIONS.find((n) => n.id === id);
        if (item) item.isRead = true;
      });
      return ok({ markedCount: body.notificationIds.length });
    }
    return badRequest('Provide notificationIds or markAll');
  } catch {
    return badRequest('Invalid request body');
  }
}
