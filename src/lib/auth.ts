import { cookies, headers } from 'next/headers';
import { compareSync, hashSync } from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import type { Session, User } from '@/types';
import { getRoleHome } from '@/lib/roles';

const SESSION_COOKIE = 'emit_session';
const ROLE_COOKIE = 'emit_role';
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

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
  emailVerifiedAt: Date | null;
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
    emailVerifiedAt: dbUser.emailVerifiedAt ? dbUser.emailVerifiedAt.toISOString() : null,
    createdAt: dbUser.createdAt.toISOString(),
  };
}

export async function getSession(): Promise<Session | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const tokenHash = sha256(token);
    const dbSession = await prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!dbSession) return null;
    if (dbSession.revokedAt) return null;
    if (dbSession.expiresAt.getTime() < Date.now()) return null;

    return {
      user: mapPrismaUser(dbSession.user),
      expiresAt: dbSession.expiresAt.toISOString(),
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
  const token = generateToken();
  const tokenHash = sha256(token);

  const requestHeaders = headers();
  const ipAddress = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const userAgent = requestHeaders.get('user-agent')?.slice(0, 512) ?? null;

  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash,
      ipAddress,
      userAgent,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TTL_MS / 1000,
    path: '/',
  });
  cookies().set(ROLE_COOKIE, user.activeRole, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TTL_MS / 1000,
    path: '/',
  });
  return token;
}

export async function clearSessionCookies(): Promise<void> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) {
    const tokenHash = sha256(token);
    await prisma.session
      .updateMany({ where: { tokenHash, revokedAt: null }, data: { revokedAt: new Date() } })
      .catch(() => undefined);
  }
  cookies().set(SESSION_COOKIE, '', { maxAge: 0, path: '/' });
  cookies().set(ROLE_COOKIE, '', { maxAge: 0, path: '/' });
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function setUserPassword(userId: string, password: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hashSync(password, 12) },
  });
}

export function requirePasswordComplexity(password: string): boolean {
  if (password.length < 8) return false;
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) return false;
  if (!/\d/.test(password)) return false;
  return true;
}
