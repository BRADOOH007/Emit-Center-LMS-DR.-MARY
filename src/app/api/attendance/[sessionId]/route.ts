import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, forbid, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole, isRateLimited, writeAuditLog } from '@/lib/security';

const VALID_STATUSES = ['present', 'absent', 'late', 'excused'];
const VALID_METHODS = ['manual', 'qr', 'auto'];

export async function GET(_req: NextRequest, { params }: { params: { sessionId: string } }) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');

  const records = await prisma.attendanceRecord.findMany({
    where: { sessionId: params.sessionId },
    include: { user: { select: { id: true, fullName: true, email: true } } },
  });

  return ok(records);
}

export async function POST(request: NextRequest, { params }: { params: { sessionId: string } }) {
  if (isRateLimited(request)) return badRequest('Too many requests. Please try again later.');

  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');

  const body = await parseBody<{ userId?: string; status?: string; checkInMethod?: string }>(request).catch(() => null);
  if (!body?.userId || !body?.status) return badRequest('userId and status are required');
  if (!VALID_STATUSES.includes(body.status)) return badRequest('Invalid status');
  if (body.checkInMethod && !VALID_METHODS.includes(body.checkInMethod)) return badRequest('Invalid check-in method');

  const session = await prisma.courseSession.findUnique({ where: { id: params.sessionId } });
  if (!session) return badRequest('Session not found');

  // Only the session instructor, an admin, or the student themselves can mark attendance.
  const isAuthorized =
    session.instructorId === me.id ||
    isAdminRole(me.roles) ||
    me.id === body.userId;
  if (!isAuthorized) return forbid('Not authorized to record attendance');

  const existing = await prisma.attendanceRecord.findUnique({
    where: { sessionId_userId: { sessionId: params.sessionId, userId: body.userId } },
  });

  const record = existing
    ? await prisma.attendanceRecord.update({
        where: { id: existing.id },
        data: {
          status: body.status,
          checkInMethod: (body.checkInMethod ?? existing.checkInMethod) as 'manual' | 'qr' | 'auto',
          checkInTime: new Date(),
        },
      })
    : await prisma.attendanceRecord.create({
        data: {
          sessionId: params.sessionId,
          userId: body.userId,
          status: body.status,
          checkInMethod: (body.checkInMethod ?? 'manual') as 'manual' | 'qr' | 'auto',
        },
      });

  await writeAuditLog({
    userId: me.id,
    action: 'attendance.recorded',
    resourceType: 'session',
    resourceId: params.sessionId,
  });

  return ok(record);
}
