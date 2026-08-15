import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, notFound, forbid, serverError, parseBody } from '@/lib/api-helpers';
import { getSessionUser, revokeAllUserSessions } from '@/lib/auth';
import { isAdminRole, writeAuditLog } from '@/lib/security';
import type { UserStatus } from '@/types';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!isAdminRole(me.roles)) return forbid('Administrator access required');

  const body = await parseBody<{ status?: UserStatus }>(request).catch(() => null);
  if (!body || (body.status !== 'active' && body.status !== 'deactivated')) {
    return badRequest('Invalid account status');
  }

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return notFound('User not found');

  if (params.id === me.id) return badRequest('You cannot change your own account status');
  if (target.roles.includes('super_admin')) {
    return badRequest('Super admin accounts cannot be deactivated');
  }

  const status = body.status;
  try {
    await prisma.user.update({ where: { id: target.id }, data: { status } });
    if (status === 'deactivated') {
      await revokeAllUserSessions(target.id);
    }
    await writeAuditLog({
      userId: me.id,
      action: status === 'deactivated' ? 'admin.user.deactivated' : 'admin.user.reactivated',
      resourceType: 'user',
      resourceId: target.id,
    });
  } catch {
    return serverError('Failed to update account status');
  }

  return ok({ id: target.id, status });
}
