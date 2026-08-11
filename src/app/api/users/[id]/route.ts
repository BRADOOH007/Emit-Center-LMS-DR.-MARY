import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, notFound, forbid, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { sanitizeInput } from '@/lib/validation';
import type { SupportedLocale, SupportedTimeZone, SupportedCurrency, User } from '@/types';

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

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) return notFound('User not found');
  return ok(mapUser(user));
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in to update your profile');
  if (me.id !== params.id && !me.roles.includes('administrator') && !me.roles.includes('super_admin')) {
    return forbid('You can only update your own profile');
  }

  try {
    const body = await parseBody<{
      fullName?: string;
      phone?: string;
      countryCode?: string;
      locale?: string;
      timeZone?: string;
      currency?: string;
    }>(request);

    const user = await prisma.user.update({
      where: { id: params.id },
      data: {
        ...(body.fullName !== undefined ? { fullName: sanitizeInput(body.fullName) } : {}),
        ...(body.phone !== undefined ? { phone: sanitizeInput(body.phone) || null } : {}),
        ...(body.countryCode !== undefined ? { countryCode: sanitizeInput(body.countryCode) } : {}),
        ...(body.timeZone !== undefined ? { timezone: body.timeZone as SupportedTimeZone } : {}),
        ...(body.locale !== undefined ? { locale: body.locale as SupportedLocale } : {}),
        ...(body.currency !== undefined ? { currency: body.currency as SupportedCurrency } : {}),
      },
    });

    return ok(mapUser(user));
  } catch {
    return badRequest('Invalid request body');
  }
}