import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, notFound, forbid } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole } from '@/lib/security';

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
    avatarUrl: user.avatarUrl,
    phone: user.phone,
    countryCode: user.countryCode,
    timezone: user.timezone,
    locale: user.locale,
    currency: user.currency,
    roles: user.roles,
    activeRole: user.activeRole,
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
