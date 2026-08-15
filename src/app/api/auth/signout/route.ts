import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookies, getSession } from '@/lib/auth';
import { writeAuditLog } from '@/lib/security';

async function recordLogout(): Promise<void> {
  try {
    const session = await getSession();
    if (session?.user) {
      await writeAuditLog({ userId: session.user.id, action: 'auth.logout', resourceType: 'session' });
    }
  } catch {
    // Never let auditing block sign-out.
  }
}

export async function GET(request: NextRequest) {
  await recordLogout();
  await clearSessionCookies();
  return NextResponse.redirect(new URL('/login', request.url));
}

export async function POST(request: NextRequest) {
  await recordLogout();
  await clearSessionCookies();
  return NextResponse.redirect(new URL('/login', request.url));
}