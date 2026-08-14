import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, parseBody } from '@/lib/api-helpers';
import { generateToken } from '@/lib/auth';
import { isValidEmail } from '@/lib/validation';
import { isRateLimited } from '@/lib/security';
import { sendPasswordResetEmail } from '@/lib/emails';
import { createHash } from 'crypto';

const RESET_TTL_MS = 60 * 60 * 1000;

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export async function POST(request: NextRequest) {
  if (isRateLimited(request)) {
    return badRequest('Too many attempts. Please try again later.');
  }

  const body = await parseBody<{ email?: string }>(request).catch(() => null);
  if (!body?.email || !isValidEmail(body.email)) {
    return badRequest('Enter a valid email address.');
  }

  const email = body.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success to avoid user enumeration.
  if (!user) return ok({ sent: true });

  const token = generateToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    },
  });

  const devResetUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/reset-password?token=${token}`;
  const resetUrl = process.env.NODE_ENV === 'production' ? devResetUrl : devResetUrl;

  // Send the reset link by email in all environments. In development the link
  // is also returned in the response so the flow is testable end-to-end.
  sendPasswordResetEmail(email, user.fullName, resetUrl).catch(() => {});

  return ok({
    sent: true,
    ...(process.env.NODE_ENV !== 'production' ? { resetUrl } : {}),
  });
}
