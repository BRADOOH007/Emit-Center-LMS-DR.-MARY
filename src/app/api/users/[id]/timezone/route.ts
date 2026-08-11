import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, notFound, forbid } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import type { SupportedTimeZone, User } from '@/types';

function mapUser(row: {
  id: string;
  fullName: string;
  email: string;
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

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in to update your timezone');
  if (me.id !== params.id && !me.roles.includes('administrator') && !me.roles.includes('super_admin')) {
    return forbid('You can only update your own timezone');
  }

  try {
    const body = (await request.json()) as { timezone?: string };
    if (!body.timezone) return notFound('timezone is required');

    const user = await prisma.user.update({
      where: { id: params.id },
      data: { timezone: body.timezone as SupportedTimeZone },
    });

    return ok({
      userId: params.id,
      timeZone: user.timezone,
      synchronizedAt: new Date().toISOString(),
    });
  } catch {
    return notFound('Invalid request body');
  }
}