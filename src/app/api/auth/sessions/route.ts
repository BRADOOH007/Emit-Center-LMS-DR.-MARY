import { getSession, listUserSessions } from '@/lib/auth';
import { ok, forbid } from '@/lib/api-helpers';

export async function GET() {
  const session = await getSession();
  if (!session) return forbid('Sign in to view your sessions');

  const sessions = await listUserSessions(session.user.id, session.sessionId);

  return ok({
    sessions,
    currentSessionId: session.sessionId ?? null,
    idleTimeoutHours: Math.round((7 * 24 * 60 * 60 * 1000) / (60 * 60 * 1000)),
    maxAgeDays: 7,
  });
}