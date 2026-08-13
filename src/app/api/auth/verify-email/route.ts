import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, badRequest } from '@/lib/api-helpers';
import { isRateLimited } from '@/lib/security';
import { createHash } from 'crypto';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export async function POST(request: NextRequest) {
  if (isRateLimited(request)) {
    return badRequest('Too many attempts. Please try again later.');
  }

  const body = await request.json().catch(() => null);
  const token = body?.token as string | undefined;
  if (!token) return badRequest('Verification token is required.');

  const tokenHash = sha256(token);
  const record = await prisma.verificationToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
    return badRequest('This verification link is invalid or has expired.');
  }

  await prisma.$transaction([
    prisma.verificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    }),
  ]);

  return ok({ verified: true, email: record.user.email });
}
