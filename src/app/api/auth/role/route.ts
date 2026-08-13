import { NextRequest } from 'next/server';
import { ok, badRequest, forbid } from '@/lib/api-helpers';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ROLES } from '@/config/roles';
import { getRoleHome } from '@/lib/roles';
import type { Role } from '@/types';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return forbid('Sign in to switch roles');

  let body: { role?: string };
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid request body');
  }

  const nextRole = body.role as Role;
  if (!ROLES.includes(nextRole)) return badRequest('Invalid role');

  if (!session.user.roles.includes(nextRole)) {
    return forbid(`You do not have the ${nextRole} role`);
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { activeRole: nextRole },
  });

  const response = ok({
    userId: user.id,
    activeRole: nextRole,
    home: getRoleHome(nextRole),
  });

  response.cookies.set('emit_role', nextRole, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    path: '/',
  });

  return response;
}