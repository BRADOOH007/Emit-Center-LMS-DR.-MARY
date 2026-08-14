import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, forbid, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole, isRateLimited, writeAuditLog } from '@/lib/security';
import { isProtectedAccount } from '@/lib/protected-accounts';

export async function GET(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');

  const { searchParams } = request.nextUrl;
  const userId = searchParams.get('userId');

  if (userId && userId !== me.id && !isAdminRole(me.roles)) return forbid('Not authorized');

  const requests = await prisma.accountDeletionRequest.findMany({
    where: { userId: userId ?? me.id },
    orderBy: { requestedAt: 'desc' },
  });

  return ok(requests);
}

export async function POST(request: NextRequest) {
  if (isRateLimited(request)) return badRequest('Too many requests. Please try again later.');

  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (isProtectedAccount(me.email)) return forbid('This account is protected and cannot be deleted.');

  const body = await parseBody<{ reason?: string }>(request).catch(() => null);

  const existing = await prisma.accountDeletionRequest.findFirst({
    where: { userId: me.id, status: { in: ['pending', 'grace_period'] } },
  });
  if (existing) return badRequest('A deletion request is already in progress.');

  const now = new Date();
  const graceEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const deletionRequest = await prisma.accountDeletionRequest.create({
    data: {
      userId: me.id,
      status: 'grace_period',
      reason: body?.reason ?? null,
      requestedAt: now,
      gracePeriodEnd: graceEnd,
    },
  });

  await prisma.consentRecord.updateMany({
    where: { userId: me.id, status: { not: 'expired' } },
    data: { status: 'expired' },
  });

  await writeAuditLog({
    userId: me.id,
    action: 'account.deletion_requested',
    resourceType: 'account',
    resourceId: me.id,
  });

  return ok(deletionRequest);
}

export async function DELETE(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (isProtectedAccount(me.email)) return forbid('This account is protected and cannot be deleted.');

  const deletionRequest = await prisma.accountDeletionRequest.findFirst({
    where: { userId: me.id, status: 'grace_period' },
  });
  if (!deletionRequest) return badRequest('No active grace-period deletion request found.');

  const now = new Date();
  const graceEnd = deletionRequest.gracePeriodEnd
    ? new Date(deletionRequest.gracePeriodEnd)
    : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (now < graceEnd) {
    return badRequest('Grace period has not expired. Deletion will proceed automatically on the scheduled date.');
  }

  await prisma.accountDeletionRequest.update({
    where: { id: deletionRequest.id },
    data: { status: 'completed' },
  });

  await prisma.auditLog.deleteMany({ where: { userId: me.id } });
  await prisma.user.delete({ where: { id: me.id } });

  await writeAuditLog({
    userId: me.id,
    action: 'account.deleted',
    resourceType: 'account',
    resourceId: me.id,
  });

  return ok({ message: 'Account permanently deleted.' });
}
