import { NextResponse } from 'next/server';
import { ok, badRequest, parseBody } from '@/lib/api-helpers';
import { clearSessionCookies, createSessionCookie, verifyLogin } from '@/lib/auth';
import { isValidEmail } from '@/lib/validation';

export async function POST(request: Request) {
  try {
    const body = await parseBody<{ email?: string; password?: string }>(request);
    if (!body.email || !body.password) {
      return badRequest('Email and password are required');
    }
    if (!isValidEmail(body.email)) {
      return badRequest('Invalid email format');
    }

    const user = await verifyLogin(body.email, body.password);
    if (!user) {
      return badRequest('Invalid email or password');
    }

    const session = {
      user,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    const response = NextResponse.json({ success: true, data: session });
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
    return badRequest('Invalid request');
  }
}

export async function DELETE() {
  await clearSessionCookies();
  const response = ok({ signedOut: true });
  response.cookies.set('emit_session', '', { maxAge: 0, path: '/' });
  response.cookies.set('emit_role', '', { maxAge: 0, path: '/' });
  return response;
}
