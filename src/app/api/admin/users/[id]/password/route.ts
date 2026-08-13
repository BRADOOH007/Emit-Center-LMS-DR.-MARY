import { NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { ok, notFound, forbid, serverError } from '@/lib/api-helpers';
import { getSessionUser, revokeAllUserSessions, setUserPassword } from '@/lib/auth';
import { isAdminRole, writeAuditLog } from '@/lib/security';

function generateSecurePassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*';
  let password = '';
  const bytes = randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!isAdminRole(me.roles)) return forbid('Administrator access required');

  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) return notFound('User not found');

  const newPassword = generateSecurePassword();
  try {
    await setUserPassword(user.id, newPassword);
    await revokeAllUserSessions(user.id);
    await writeAuditLog({
      userId: me.id,
      action: 'admin.user.password_reset',
      resourceType: 'user',
      resourceId: user.id,
    });
  } catch {
    return serverError('Failed to reset password');
  }

  return ok({ password: newPassword });
}
