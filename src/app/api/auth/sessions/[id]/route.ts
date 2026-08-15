import { NextRequest } from 'next/server';
import { getSession, revokeUserSession } from '@/lib/auth';
import { ok, forbid, badRequest, notFound } from '@/lib/api-helpers';
import { writeAuditLog } from '@/lib/security';

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return forbid('Sign in to manage your sessions');

  if (session.sessionId === params.id) {
    return badRequest('Use Sign out to end your current session');
  }

  const revoked = await revokeUserSession(session.user.id, params.id);
  if (!revoked) return notFound('Session not found or already ended');

  await writeAuditLog({ userId: session.user.id, action: 'auth.session_revoked', resourceType: 'session', resourceId: params.id });

  return ok({ revoked: true });
}