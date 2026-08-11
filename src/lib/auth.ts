import { cookies } from 'next/headers';
import { compareSync } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import type { Session, User } from '@/types';
import { getRoleHome } from '@/lib/roles';

const SESSION_COOKIE = 'emit_session';
const ROLE_COOKIE = 'emit_role';

function mapPrismaUser(dbUser: {
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
    id: dbUser.id,
    fullName: dbUser.fullName,
    name: dbUser.fullName,
    email: dbUser.email,
    avatarUrl: dbUser.avatarUrl ?? undefined,
    phone: dbUser.phone ?? undefined,
    countryCode: dbUser.countryCode,
    roles: dbUser.roles as User['roles'],
    activeRole: dbUser.activeRole as User['activeRole'],
    locale: dbUser.locale as User['locale'],
    timeZone: dbUser.timezone as User['timeZone'],
    currency: dbUser.currency as User['currency'],
    createdAt: dbUser.createdAt.toISOString(),
  };
}

export async function getSession(): Promise<Session | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const dbUser = await prisma.user.findUnique({ where: { id: token } });
    if (!dbUser) return null;

    return {
      user: mapPrismaUser(dbUser),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<User | null> {
  const session = await getSession();
  return session?.user ?? null;
}

export function sessionRoleHome(session: Session): string {
  return getRoleHome(session.user.activeRole);
}

export async function verifyLogin(email: string, password: string): Promise<User | null> {
  try {
    const dbUser = await prisma.user.findUnique({ where: { email } });
    if (!dbUser) return null;

    const valid = compareSync(password, dbUser.passwordHash);
    if (!valid) return null;

    return mapPrismaUser(dbUser);
  } catch {
    return null;
  }
}

export async function createSessionCookie(user: User): Promise<string> {
  cookies().set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    path: '/',
  });
  cookies().set(ROLE_COOKIE, user.activeRole, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    path: '/',
  });
  return user.id;
}

export async function clearSessionCookies(): Promise<void> {
  cookies().set(SESSION_COOKIE, '', { maxAge: 0, path: '/' });
  cookies().set(ROLE_COOKIE, '', { maxAge: 0, path: '/' });
}
