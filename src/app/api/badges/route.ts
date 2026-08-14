import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, forbid } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole } from '@/lib/security';
import { getUserBadges, getAllBadges } from '@/lib/badges';

export async function GET(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');

  const userId = request.nextUrl.searchParams.get('userId');
  const all = request.nextUrl.searchParams.get('all');

  if (all === '1' && isAdminRole(me.roles)) {
    return ok(await getAllBadges());
  }

  const target = userId && (userId === me.id || isAdminRole(me.roles) || me.roles.includes('instructor')) ? userId : me.id;
  return ok(await getUserBadges(target));
}
