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

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in to view user details');

  const isSelf = me.id === params.id;
  const isAdmin = me.roles.includes('administrator') || me.roles.includes('super_admin');
  if (!isSelf && !isAdmin) return forbid('You can only view your own profile');

  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) return notFound('User not found');

  const mapped = mapUser(user);

  // Redact contact details unless viewing yourself or acting as an administrator.
  if (!isSelf && !isAdmin) {
    delete (mapped as Partial<typeof mapped>).phone;
    delete (mapped as Partial<typeof mapped>).countryCode;
  }

  return ok(mapped);
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
      avatarUrl?: string;
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
        ...(body.avatarUrl !== undefined
          ? {
              avatarUrl:
                typeof body.avatarUrl === 'string' && body.avatarUrl.trim()
                  ? sanitizeInput(body.avatarUrl).slice(0, 2_000_000)
                  : null,
            }
          : {}),
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