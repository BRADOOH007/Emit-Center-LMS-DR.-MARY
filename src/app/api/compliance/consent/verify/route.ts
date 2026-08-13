import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, parseBody } from '@/lib/api-helpers';
import { isRateLimited, writeAuditLog } from '@/lib/security';

export async function POST(request: NextRequest) {
  if (isRateLimited(request)) return badRequest('Too many requests. Please try again later.');

  const body = await parseBody<{ token?: string }>(request).catch(() => null);
  if (!body?.token) return badRequest('Verification token is required');

  const record = await prisma.consentRecord.findFirst({
    where: { parentVerificationToken: body.token },
  });
  if (!record) return badRequest('Invalid or expired verification token');

  if (record.status === 'verified') return ok({ message: 'Already verified', record });

  const updated = await prisma.consentRecord.update({
    where: { id: record.id },
    data: { status: 'verified', verifiedAt: new Date() },
  });

  await writeAuditLog({
    userId: record.userId,
    action: 'consent.verified',
    resourceType: 'consent',
    resourceId: record.id,
  });

  return ok({ message: 'Parental consent verified successfully.', record: updated });
}
