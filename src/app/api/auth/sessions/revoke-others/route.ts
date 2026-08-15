import { getSession, revokeOtherUserSessions } from '@/lib/auth';
import { ok, forbid } from '@/lib/api-helpers';
import { writeAuditLog } from '@/lib/security';

export async function POST() {
  const session = await getSession();
  if (!session || !session.sessionId) return forbid('Sign in to manage your sessions');

  const count = await revokeOtherUserSessions(session.user.id, session.sessionId);

  await writeAuditLog({ userId: session.user.id, action: 'auth.sessions_revoked_others', resourceType: 'session', resourceId: count ? String(count) : undefined });

  return ok({ revoked: count });
}