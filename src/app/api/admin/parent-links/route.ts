import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { created, badRequest, notFound, forbid, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole, writeAuditLog } from '@/lib/security';
import { generateId } from '@/lib/validation';
import type { RelationshipType } from '@/types';

const RELATIONSHIP_TYPES: RelationshipType[] = ['guardian', 'mother', 'father', 'sponsor'];

export async function POST(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!isAdminRole(me.roles)) return forbid('Administrator access required');

  const body = await parseBody<{
    parentId?: string;
    studentId?: string;
    relationshipType?: RelationshipType;
  }>(request).catch(() => null);

  if (!body) return badRequest('Invalid request body');
  if (!body.parentId || !body.studentId) return badRequest('Parent and student are required');

  const parent = await prisma.user.findUnique({ where: { id: body.parentId } });
  if (!parent || !parent.roles.includes('parent')) return notFound('Parent account not found');

  const student = await prisma.user.findUnique({ where: { id: body.studentId } });
  if (!student || !student.roles.includes('student')) return notFound('Student account not found');

  const relationshipType = body.relationshipType && RELATIONSHIP_TYPES.includes(body.relationshipType)
    ? body.relationshipType
    : 'guardian';

  const existingLink = await prisma.parentStudentLink.findUnique({
    where: { parentId_studentId: { parentId: parent.id, studentId: student.id } },
  });
  if (existingLink) return badRequest('This parent is already linked to the student.');

  const link = await prisma.parentStudentLink.create({
    data: {
      id: generateId('pl'),
      parentId: parent.id,
      studentId: student.id,
      relationshipType,
    },
    include: {
      parent: { select: { id: true, fullName: true, email: true } },
      student: { select: { id: true, fullName: true, email: true } },
    },
  });

  await writeAuditLog({
    userId: me.id,
    action: 'admin.parent.link_created',
    resourceType: 'parent_student_link',
    resourceId: link.id,
  });

  return created({
    id: link.id,
    parentId: link.parentId,
    studentId: link.studentId,
    relationshipType: link.relationshipType,
    parent: link.parent,
    student: link.student,
  });
}