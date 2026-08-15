import { cookies, headers } from 'next/headers';
import { compareSync, hashSync } from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import type { Session, SessionRecord, User } from '@/types';
import { getRoleHome } from '@/lib/roles';

const SESSION_COOKIE = 'emit_session';
const ROLE_COOKIE = 'emit_role';
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days absolute
export const SESSION_IDLE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days idle
export const SESSION_TOUCH_THROTTLE_MS = 5 * 60 * 1000; // persist activity at most every 5 min

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
  username: string | null;
  avatarUrl: string | null;
  phone: string | null;
  countryCode: string;
  timezone: string;
  locale: string;
  currency: string;
  roles: string[];
  activeRole: string;
  status: string;
  emailVerifiedAt: Date | null;
  createdAt: Date;
}): User {
  return {
    id: dbUser.id,
    fullName: dbUser.fullName,
    name: dbUser.fullName,
    email: dbUser.email,
    username: dbUser.username ?? undefined,
    avatarUrl: dbUser.avatarUrl ?? undefined,
    phone: dbUser.phone ?? undefined,
    countryCode: dbUser.countryCode,
    roles: dbUser.roles as User['roles'],
    activeRole: dbUser.activeRole as User['activeRole'],
    status: dbUser.status as User['status'],
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
    if (dbSession.user.status === 'deactivated') return null;

    // Idle timeout: sessions expire when unused for too long, independent of the
    // absolute TTL. A lazily-purged expired session is indistinguishable from a
    // missing one to the client, so we can skip writing to the DB on that path.
    if (Date.now() - dbSession.lastUsedAt.getTime() > SESSION_IDLE_TTL_MS) return null;

    void touchSession(dbSession.id, dbSession.lastUsedAt);

    return {
      user: mapPrismaUser(dbSession.user),
      expiresAt: dbSession.expiresAt.toISOString(),
      sessionId: dbSession.id,
      lastUsedAt: dbSession.lastUsedAt.toISOString(),
    };
  } catch {
    return null;
  }
}

async function touchSession(sessionId: string, lastUsedAt: Date): Promise<void> {
  const now = Date.now();
  if (now - lastUsedAt.getTime() < SESSION_TOUCH_THROTTLE_MS) return;
  await prisma.session
    .updateMany({
      where: { id: sessionId, revokedAt: null, lastUsedAt: { lt: new Date(now - SESSION_TOUCH_THROTTLE_MS) } },
      data: { lastUsedAt: new Date(now) },
    })
    .catch(() => undefined);
}

export async function getSessionUser(): Promise<User | null> {
  const session = await getSession();
  return session?.user ?? null;
}

export function sessionRoleHome(session: Session): string {
  return getRoleHome(session.user.activeRole);
}

export async function verifyLogin(identifier: string, password: string): Promise<User | null> {
  try {
    const normalized = identifier.trim().toLowerCase();
    let dbUser = await prisma.user.findUnique({ where: { email: normalized } });
    if (!dbUser) {
      dbUser = await prisma.user.findUnique({ where: { username: normalized } });
    }
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

export async function listUserSessions(userId: string, currentSessionId?: string): Promise<SessionRecord[]> {
  const rows = await prisma.session.findMany({
    where: { userId, revokedAt: null },
    orderBy: { lastUsedAt: 'desc' },
    take: 50,
  });
  const now = Date.now();
  return rows
    .filter((row) => row.expiresAt.getTime() > now && now - row.lastUsedAt.getTime() <= SESSION_IDLE_TTL_MS)
    .map((row) => ({
      id: row.id,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      createdAt: row.createdAt.toISOString(),
      lastUsedAt: row.lastUsedAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      isCurrent: row.id === currentSessionId,
    }));
}

export async function revokeUserSession(userId: string, sessionId: string): Promise<boolean> {
  const result = await prisma.session.updateMany({
    where: { id: sessionId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return result.count > 0;
}

export async function revokeOtherUserSessions(userId: string, currentSessionId: string): Promise<number> {
  const result = await prisma.session.updateMany({
    where: { userId, revokedAt: null, id: { not: currentSessionId } },
    data: { revokedAt: new Date() },
  });
  return result.count;
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
