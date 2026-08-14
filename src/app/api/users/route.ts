import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, forbid } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import type { User } from '@/types';

function mapUser(row: {
  id: string;
  fullName: string;
  email: string;
  username: string | null;
  avatarUrl: string | null;
  phone: string | null;
  countryCode: string;
  timezone: string;
  locale: string;
  currency: string;
  roles: string[];
  activeRole: string;
  createdAt: Date;
}): User {
  return {
    id: row.id,
    fullName: row.fullName,
    name: row.fullName,
    email: row.email,
    username: row.username ?? undefined,
    avatarUrl: row.avatarUrl ?? undefined,
    phone: row.phone ?? undefined,
    countryCode: row.countryCode,
    roles: row.roles as User['roles'],
    activeRole: row.activeRole as User['activeRole'],
    locale: row.locale as User['locale'],
    timeZone: row.timezone as User['timeZone'],
    currency: row.currency as User['currency'],
    createdAt: row.createdAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');

  const { searchParams } = request.nextUrl;
  const role = searchParams.get('role');
  const q = searchParams.get('q')?.toLowerCase();

  const users = await prisma.user.findMany({
    where: {
      ...(role ? { roles: { has: role as User['roles'][number] } } : {}),
      ...(q ? { OR: [{ fullName: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });

  return ok(users.map(mapUser));
}