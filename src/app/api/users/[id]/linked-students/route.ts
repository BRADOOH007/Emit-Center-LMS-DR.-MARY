import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, notFound, forbid } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import type { User } from '@/types';

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
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');

  const isAdmin = me.roles.includes('administrator') || me.roles.includes('super_admin');
  if (!isAdmin && me.id !== params.id) {
    return forbid('You can only view your own linked students');
  }

  const userExists = await prisma.user.findUnique({ where: { id: params.id } });
  if (!userExists) return notFound('User not found');

  const links = await prisma.parentStudentLink.findMany({
    where: { OR: [{ parentId: params.id }, { studentId: params.id }] },
    include: {
      parent: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
      student: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
    },
  });

  const enriched = links.map((link) => ({
    id: link.id,
    parentId: link.parentId,
    studentId: link.studentId,
    relationshipType: link.relationshipType,
    createdAt: link.createdAt.toISOString(),
    parent: link.parent ? { id: link.parent.id, fullName: link.parent.fullName, email: link.parent.email, avatarUrl: link.parent.avatarUrl } : undefined,
    student: link.student ? { id: link.student.id, fullName: link.student.fullName, email: link.student.email, avatarUrl: link.student.avatarUrl } : undefined,
  }));

  return ok(enriched);
}