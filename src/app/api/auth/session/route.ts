import { NextResponse } from 'next/server';
import { ok, badRequest, parseBody } from '@/lib/api-helpers';
import { clearSessionCookies, createSessionCookie, verifyLogin } from '@/lib/auth';
import { isValidEmail } from '@/lib/validation';
import { isLoginRateLimited, writeAuditLog } from '@/lib/security';

export async function POST(request: Request) {
  if (isLoginRateLimited(request)) {
    return badRequest('Too many attempts. Please wait a few minutes and try again.');
  }

  try {
    const body = await parseBody<{ email?: string; password?: string }>(request);
    if (!body.email || !body.password) {
      return badRequest('Email and password are required');
    }
    if (!isValidEmail(body.email)) {
      return badRequest('Invalid email format');
    }

    const user = await verifyLogin(body.email.trim().toLowerCase(), body.password);
    if (!user) {
      return badRequest('Invalid email or password');
    }

    const token = await createSessionCookie(user);
    await writeAuditLog({
      userId: user.id,
      action: 'auth.login',
      resourceType: 'session',
    });

    const session = {
      user,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    return NextResponse.json({ success: true, data: session });
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
