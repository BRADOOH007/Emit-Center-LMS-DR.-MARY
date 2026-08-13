import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, parseBody } from '@/lib/api-helpers';
import { setUserPassword, requirePasswordComplexity, revokeAllUserSessions } from '@/lib/auth';
import { isRateLimited, writeAuditLog } from '@/lib/security';
import { createHash } from 'crypto';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export async function POST(request: NextRequest) {
  if (isRateLimited(request)) {
    return badRequest('Too many attempts. Please try again later.');
  }

  const body = await parseBody<{ token?: string; password?: string }>(request).catch(() => null);
  if (!body?.token || !body?.password) {
    return badRequest('Token and new password are required.');
  }
  if (!requirePasswordComplexity(body.password)) {
    return badRequest('Password must be at least 8 characters with upper/lowercase and a number.');
  }

  const tokenHash = sha256(body.token);
  const reset = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!reset || reset.usedAt || reset.expiresAt.getTime() < Date.now()) {
    return badRequest('This reset link is invalid or has expired.');
  }

  await prisma.passwordResetToken.update({
    where: { id: reset.id },
    data: { usedAt: new Date() },
  });

  const { setUserPassword: setPassword } = await import('@/lib/auth');
  await setPassword(reset.userId, body.password);
  await revokeAllUserSessions(reset.userId);

  await writeAuditLog({
    userId: reset.userId,
    action: 'auth.password_reset',
    resourceType: 'user',
  });

  return ok({ reset: true });
}
