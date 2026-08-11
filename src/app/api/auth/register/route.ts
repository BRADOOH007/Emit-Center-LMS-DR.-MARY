import { NextResponse } from 'next/server';
import { hashSync } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, parseBody } from '@/lib/api-helpers';
import { isValidEmail } from '@/lib/validation';
import type { SupportedCurrency, SupportedLocale, SupportedTimeZone } from '@/types';

export async function POST(request: Request) {
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
    if (body.password.length < 6) {
      return badRequest('Password must be at least 6 characters.');
    }

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      return badRequest('An account with this email already exists.');
    }

    const role = body.role as string;
    const allowedRoles = ['student', 'instructor', 'parent'];
    const finalRole = allowedRoles.includes(role) ? role : 'student';

    const passwordHash = hashSync(body.password, 12);

    const user = await prisma.user.create({
      data: {
        fullName: body.fullName,
        email: body.email,
        passwordHash,
        roles: [finalRole as 'student' | 'instructor' | 'parent'],
        activeRole: finalRole as 'student' | 'instructor' | 'parent',
        timezone: (body.timeZone as string) ?? 'America/New_York',
        locale: (body.locale as string) ?? 'en-US',
        currency: (body.currency as string) ?? 'USD',
      },
    });

    const response = NextResponse.json({
      success: true,
      data: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        activeRole: user.activeRole,
      },
    });

    response.cookies.set('emit_session', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    });
    response.cookies.set('emit_role', user.activeRole, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    });

    return response;
  } catch {
    return badRequest('Unable to create account. Please try again.');
  }
}
