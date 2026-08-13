import { NextRequest } from 'next/server';
import { hashSync } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { created, badRequest, forbid, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole, writeAuditLog } from '@/lib/security';
import { generateId, isValidEmail, sanitizeInput } from '@/lib/validation';
import type { RelationshipType, Role } from '@/types';

const CREATEABLE_ROLES: Role[] = ['student', 'parent', 'instructor', 'administrator'];
const RELATIONSHIP_TYPES: RelationshipType[] = ['guardian', 'mother', 'father', 'sponsor'];

function mapCreatedUser(user: {
  id: string;
  fullName: string;
  email: string;
  roles: string[];
  activeRole: string;
  createdAt: Date;
  emailVerifiedAt: Date | null;
}) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    roles: user.roles as Role[],
    activeRole: user.activeRole as Role,
    emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function POST(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!isAdminRole(me.roles)) return forbid('Administrator access required');

  const body = await parseBody<{
    fullName?: string;
    email?: string;
    password?: string;
    role?: Role;
    phone?: string;
    timezone?: string;
    locale?: string;
    currency?: string;
    parentEmail?: string;
    parentFullName?: string;
    relationshipType?: RelationshipType;
    courseIds?: string[];
  }>(request).catch(() => null);

  if (!body) return badRequest('Invalid request body');
  if (!body.fullName?.trim()) return badRequest('Full name is required');
  if (!body.email || !isValidEmail(body.email)) return badRequest('A valid email address is required');
  if (!body.role || !CREATEABLE_ROLES.includes(body.role)) return badRequest('Invalid role');
  if (body.password !== undefined && body.password.length < 8) {
    return badRequest('Password must be at least 8 characters');
  }

  const email = body.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return badRequest('An account with this email already exists.');

  const role = body.role;
  const password = body.password?.trim() ? body.password : 'ChangeMe123!';
  const passwordHash = hashSync(password, 12);

  const user = await prisma.user.create({
    data: {
      fullName: sanitizeInput(body.fullName).slice(0, 120),
      email,
      passwordHash,
      roles: [role as 'student' | 'parent' | 'instructor' | 'administrator'],
      activeRole: role as 'student' | 'parent' | 'instructor' | 'administrator',
      phone: body.phone ? sanitizeInput(body.phone).slice(0, 40) : null,
      timezone: body.timezone ?? 'America/New_York',
      locale: body.locale ?? 'en-US',
      currency: body.currency ?? 'USD',
      emailVerifiedAt: new Date(),
    },
  });

  // Link a parent/guardian to a newly created student. If the parent email does
  // not yet exist, create the parent account on the spot.
  if (role === 'student' && body.parentEmail && isValidEmail(body.parentEmail)) {
    await linkParent({
      parentEmail: body.parentEmail.trim().toLowerCase(),
      parentFullName: body.parentFullName?.trim(),
      relationshipType: body.relationshipType,
      studentId: user.id,
    });
  }

  // Assign an instructor to the selected courses.
  if (role === 'instructor' && body.courseIds?.length) {
    const courses = await prisma.course.findMany({
      where: { id: { in: body.courseIds } },
      select: { id: true },
    });
    if (courses.length) {
      await prisma.$transaction(async (tx) => {
        for (const course of courses) {
          await tx.course.update({
            where: { id: course.id },
            data: { instructorId: user.id },
          });
        }
      });
    }
  }

  await writeAuditLog({
    userId: me.id,
    action: `admin.user.${role}.created`,
    resourceType: 'user',
    resourceId: user.id,
  });

  return created({
    ...mapCreatedUser(user),
    tempPassword: body.password?.trim() ? undefined : password,
  });
}

async function linkParent(params: {
  parentEmail: string;
  parentFullName?: string;
  relationshipType?: RelationshipType;
  studentId: string;
}): Promise<void> {
  const relationshipType = params.relationshipType && RELATIONSHIP_TYPES.includes(params.relationshipType)
    ? params.relationshipType
    : 'guardian';

  const parentName = params.parentFullName?.trim() ? sanitizeInput(params.parentFullName).slice(0, 120) : null;

  const existingParent = await prisma.user.findUnique({ where: { email: params.parentEmail } });

  let parentId = existingParent?.id;
  if (!parentId) {
    const createdParent = await prisma.user.create({
      data: {
        fullName: parentName ?? sanitizeInput(params.parentEmail).slice(0, 120),
        email: params.parentEmail,
        passwordHash: hashSync('ChangeMe123!', 12),
        roles: ['parent'],
        activeRole: 'parent',
        emailVerifiedAt: new Date(),
      },
    });
    parentId = createdParent.id;
  }

  const existingLink = await prisma.parentStudentLink.findUnique({
    where: { parentId_studentId: { parentId, studentId: params.studentId } },
  });
  if (!existingLink) {
    await prisma.parentStudentLink.create({
      data: {
        id: generateId('pl'),
        parentId,
        studentId: params.studentId,
        relationshipType,
      },
    });
  }
}