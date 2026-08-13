import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, forbid, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isRateLimited, writeAuditLog } from '@/lib/security';

export async function GET(_req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');

  const exports = await prisma.dataExportRequest.findMany({
    where: { userId: me.id },
    orderBy: { requestedAt: 'desc' },
  });

  return ok(exports);
}

export async function POST(request: NextRequest) {
  if (isRateLimited(request)) return badRequest('Too many requests. Please try again later.');

  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');

  const body = await parseBody<{ format?: string }>(request).catch(() => null);
  const format = body?.format === 'csv' ? 'csv' : 'json';

  const now = new Date();
  const exp = await prisma.dataExportRequest.create({
    data: {
      userId: me.id,
      format,
      status: 'completed',
      requestedAt: now,
      completedAt: new Date(now.getTime() + 3000),
      downloadUrl: `/api/compliance/data-export/download?id=placeholder_${me.id.slice(0, 6)}`,
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await writeAuditLog({
    userId: me.id,
    action: 'data.export_requested',
    resourceType: 'data',
    resourceId: exp.id,
  });

  return ok(exp);
}
