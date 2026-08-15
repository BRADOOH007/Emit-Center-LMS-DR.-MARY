import { NextResponse } from 'next/server';
import { ok, badRequest, parseBody } from '@/lib/api-helpers';
import { clearSessionCookies, createSessionCookie, getSession, verifyLogin } from '@/lib/auth';
import { isLoginRateLimited, writeAuditLog } from '@/lib/security';

export async function GET() {
  const session = await getSession();
  if (!session) return ok({ user: null });
  return ok({ user: session.user });
}

export async function POST(request: Request) {
  if (isLoginRateLimited(request)) {
    return badRequest('Too many attempts. Please wait a few minutes and try again.');
  }

  try {
    const body = await parseBody<{ email?: string; password?: string }>(request);
    if (!body.email || !body.password) {
      return badRequest('Email/username and password are required');
    }

    const user = await verifyLogin(body.email, body.password);
    if (!user) {
      return badRequest('Invalid email/username or password');
    }
    if (user.status === 'deactivated') {
      return badRequest('This account has been deactivated. Contact an administrator.');
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
  try {
    const session = await getSession();
    if (session?.user) {
      await writeAuditLog({ userId: session.user.id, action: 'auth.logout', resourceType: 'session' });
    }
  } catch {
    // Never let auditing block sign-out.
  }
  await clearSessionCookies();
  const response = ok({ signedOut: true });
  response.cookies.set('emit_session', '', { maxAge: 0, path: '/' });
  response.cookies.set('emit_role', '', { maxAge: 0, path: '/' });
  return response;
}
