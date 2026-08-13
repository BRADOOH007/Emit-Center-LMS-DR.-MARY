import { NextResponse } from 'next/server';
import { hashSync } from 'bcryptjs';
import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, parseBody } from '@/lib/api-helpers';
import { isValidEmail, sanitizeInput } from '@/lib/validation';
import { isRateLimited } from '@/lib/security';
import { generateToken } from '@/lib/auth';
import type { SupportedCurrency, SupportedLocale, SupportedTimeZone } from '@/types';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export async function POST(request: Request) {
  if (isRateLimited(request)) {
    return badRequest('Too many attempts. Please try again later.');
  }

  try {
    const body = await parseBody<{
      fullName?: string;
      email?: string;
      password?: string;
      role?: string;
      timeZone?: string;
      locale?: string;
      currency?: string;
    }>(request);

    if (!body.email || !body.password || !body.fullName) {
      return badRequest('Full name, email, and password are required.');
    }
    if (!isValidEmail(body.email)) {
      return badRequest('Invalid email format.');
    }
    if (body.password.length < 8) {
      return badRequest('Password must be at least 8 characters.');
    }

    const email = body.email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return badRequest('An account with this email already exists.');
    }

    // Only students and parents may self-register. Instructors, administrators,
    // and super admins must be created by an administrator.
    const requestedRole = body.role as string;
    const selfServiceRoles = ['student', 'parent'];
    const finalRole = selfServiceRoles.includes(requestedRole) ? requestedRole : 'student';

    const passwordHash = hashSync(body.password, 12);

    const user = await prisma.user.create({
      data: {
        fullName: sanitizeInput(body.fullName).slice(0, 120),
        email,
        passwordHash,
        roles: [finalRole as 'student' | 'parent'],
        activeRole: finalRole as 'student' | 'parent',
        timezone: (body.timeZone as string) ?? 'America/New_York',
        locale: (body.locale as string) ?? 'en-US',
        currency: (body.currency as string) ?? 'USD',
      },
    });

    const verifyToken = generateToken();
    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(verifyToken),
        type: 'email',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const devVerifyUrl =
      process.env.NODE_ENV === 'production'
        ? undefined
        : `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/verify-email?token=${verifyToken}`;

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        activeRole: user.activeRole,
        emailVerified: false,
        ...(devVerifyUrl ? { verifyUrl: devVerifyUrl } : {}),
        message: 'Account created. Verify your email to access your dashboard.',
      },
    });
  } catch {
    return badRequest('Unable to create account. Please try again.');
  }
}
