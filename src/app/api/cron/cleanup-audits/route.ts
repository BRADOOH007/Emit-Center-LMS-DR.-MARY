import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok } from '@/lib/api-helpers';
import { purgeExpiredAuditLogs, AUDIT_RETENTION_HOURS } from '@/lib/audit-retention';

// Triggered by the Vercel cron defined in vercel.json. Also callable manually
// with ?secret=<CRON_SECRET> for local smoke tests.
export async function GET(request: NextRequest) {
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get('x-cron-secret') ?? request.nextUrl.searchParams.get('secret');

  const authorized = isVercelCron || (Boolean(secret) && provided === secret);
  if (!authorized) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const deleted = await purgeExpiredAuditLogs();
  const remaining = await prisma.auditLog.count().catch(() => 0);
  return ok({ ok: true, deleted, remaining, retentionHours: AUDIT_RETENTION_HOURS });
}