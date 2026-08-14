import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, created, forbid, badRequest, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole } from '@/lib/security';

const ACTIONS = ['login', 'live_join', 'lesson_view'];

export async function GET(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');

  const { searchParams } = request.nextUrl;
  const courseId = searchParams.get('courseId');
  const userId = searchParams.get('userId');

  if (userId && userId !== me.id && !isAdminRole(me.roles) && !me.roles.includes('instructor')) {
    return forbid('You can only view your own participation');
  }

  const where: Record<string, unknown> = {};
  if (userId) where.userId = userId;
  else if (!isAdminRole(me.roles) && !me.roles.includes('instructor')) where.userId = me.id;
  if (courseId) where.courseId = courseId;

  const logs = await prisma.participationLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return ok(
    logs.map((l) => ({
      id: l.id,
      userId: l.userId,
      courseId: l.courseId,
      liveSessionId: l.liveSessionId,
      action: l.action,
      createdAt: l.createdAt.toISOString(),
    })),
  );
}

export async function POST(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');

  const body = await parseBody<{ action?: string; courseId?: string; liveSessionId?: string }>(request).catch(() => null);
  if (!body || !body.action || !ACTIONS.includes(body.action)) return badRequest('Valid action required');

  const log = await prisma.participationLog.create({
    data: {
      userId: me.id,
      action: body.action,
      courseId: body.courseId ?? null,
      liveSessionId: body.liveSessionId ?? null,
    },
  });

  return created({
    id: log.id,
    userId: log.userId,
    courseId: log.courseId,
    liveSessionId: log.liveSessionId,
    action: log.action,
    createdAt: log.createdAt.toISOString(),
  });
}
