import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, forbid, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole, isRateLimited, writeAuditLog } from '@/lib/security';
import { generateId } from '@/lib/validation';

export async function GET(_req: NextRequest, { params }: { params: { userId: string } }) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (me.id !== params.userId && !isAdminRole(me.roles)) return forbid('Not authorized');

  const records = await prisma.consentRecord.findMany({
    where: { userId: params.userId },
    orderBy: { createdAt: 'desc' },
  });

  return ok(records);
}

export async function POST(request: NextRequest, { params }: { params: { userId: string } }) {
  if (isRateLimited(request)) return badRequest('Too many requests. Please try again later.');

  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (me.id !== params.userId && !isAdminRole(me.roles)) return forbid('Not authorized');

  const body = await parseBody<{ type?: string; parentEmail?: string }>(request).catch(() => null);
  if (!body?.type) return badRequest('type is required');

  const record = await prisma.consentRecord.create({
    data: {
      userId: params.userId,
      type: body.type,
      status: 'pending',
      parentEmail: body.parentEmail ?? null,
      parentVerificationToken: body.parentEmail ? `COPPA-v-${generateId('')}` : null,
    },
  });

  await writeAuditLog({
    userId: params.userId,
    action: 'consent.requested',
    resourceType: 'consent',
    resourceId: record.id,
  });

  return ok(record);
}
