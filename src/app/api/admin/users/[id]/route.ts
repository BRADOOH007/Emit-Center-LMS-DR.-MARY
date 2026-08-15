import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, notFound, forbid, serverError, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole, writeAuditLog } from '@/lib/security';
import type { Role } from '@/types';

const VALID_ROLES: Role[] = ['super_admin', 'administrator', 'instructor', 'student', 'parent'];

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!isAdminRole(me.roles)) return forbid('Administrator access required');

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      enrollments: {
        include: { course: { select: { id: true, title: true, subject: true, isPublished: true, enrolledCount: true } } },
        orderBy: { createdAt: 'desc' },
      },
      courses: {
        select: { id: true, title: true, subject: true, isPublished: true, enrolledCount: true },
      },
      parentLinks: {
        include: {
          parent: { select: { id: true, fullName: true, email: true } },
          student: { select: { id: true, fullName: true, email: true } },
        },
      },
      studentLinks: {
        include: {
          parent: { select: { id: true, fullName: true, email: true } },
          student: { select: { id: true, fullName: true, email: true } },
        },
      },
      sessions: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, createdAt: true, expiresAt: true, revokedAt: true, ipAddress: true, userAgent: true },
      },
      auditLogs: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
      _count: {
        select: {
          payments: true,
          certificates: true,
          quizAttempts: true,
          submissions: true,
        },
      },
    },
  });

  if (!user) return notFound('User not found');

  return ok({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    username: user.username,
    avatarUrl: user.avatarUrl,
    phone: user.phone,
    countryCode: user.countryCode,
    timezone: user.timezone,
    locale: user.locale,
    currency: user.currency,
    roles: user.roles,
    activeRole: user.activeRole,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    enrollments: user.enrollments.map((e) => ({
      id: e.id,
      status: e.status,
      createdAt: e.createdAt.toISOString(),
      course: e.course,
    })),
    coursesTaught: user.courses,
    parentLinks: user.parentLinks.map((l) => ({
      id: l.id,
      relationshipType: l.relationshipType,
      parent: l.parent,
      student: l.student,
    })),
    studentLinks: user.studentLinks.map((l) => ({
      id: l.id,
      relationshipType: l.relationshipType,
      parent: l.parent,
      student: l.student,
    })),
    recentSessions: user.sessions,
    auditLogs: user.auditLogs,
    counts: user._count,
  });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!isAdminRole(me.roles)) return forbid('Administrator access required');

  const body = await parseBody<{ roles?: Role[]; activeRole?: Role }>(request).catch(() => null);
  if (!body) return badRequest('Invalid request');

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return notFound('User not found');

  if (params.id === me.id) return badRequest('You cannot change your own roles');

  const meIsSuper = me.roles.includes('super_admin');
  if (!meIsSuper && body.roles?.some((r) => r === 'super_admin')) {
    return forbid('Only a super admin can grant the super admin role');
  }
  if (!meIsSuper && target.roles.includes('super_admin') && body.roles && !body.roles.includes('super_admin')) {
    return forbid('Only a super admin can revoke the super admin role');
  }

  const nextRoles = body.roles
    ? [...new Set(body.roles)].filter((r): r is Role => VALID_ROLES.includes(r))
    : (target.roles as Role[]);
  if (nextRoles.length === 0) return badRequest('A user must have at least one role');

  const activeRole = body.activeRole ?? (target.activeRole as Role);
  if (!nextRoles.includes(activeRole)) {
    return badRequest('Active role must be one of the user\'s roles');
  }

  try {
    const updated = await prisma.user.update({
      where: { id: target.id },
      data: { roles: nextRoles, activeRole },
    });
    await writeAuditLog({
      userId: me.id,
      action: 'admin.user.role_changed',
      resourceType: 'user',
      resourceId: target.id,
    });
    return ok({ id: updated.id, roles: updated.roles, activeRole: updated.activeRole });
  } catch {
    return serverError('Failed to update user roles');
  }
}
