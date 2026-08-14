import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, notFound, forbid, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole, writeAuditLog } from '@/lib/security';
import { slugify, sanitizeInput } from '@/lib/validation';
import { appSubjectToDb, dbSubjectToApp } from '@/lib/course-mappers';
import type { CourseSubject, DeliveryFormat } from '@/types';

const ALLOWED_SUBJECTS: CourseSubject[] = ['robotics', 'coding', 'design', 'life-skills', 'engineering', 'career'];
const ALLOWED_STATUS: string[] = ['active', 'archived'];

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!isAdminRole(me.roles)) return forbid('Administrator access required');

  const existing = await prisma.program.findUnique({ where: { id: params.id } });
  if (!existing) return notFound('Program not found');

  const body = await parseBody<{
    name?: string;
    description?: string;
    subject?: CourseSubject;
    status?: string;
    startDate?: string;
    endDate?: string;
    courseIds?: string[] | null;
  }>(request).catch(() => null);

  if (!body) return badRequest('Invalid request body');
  if (body.name !== undefined && !body.name.trim()) return badRequest('Program name cannot be empty');
  if (body.subject !== undefined && !ALLOWED_SUBJECTS.includes(body.subject)) return badRequest('Invalid subject');
  if (body.status !== undefined && !ALLOWED_STATUS.includes(body.status)) return badRequest('Invalid status');

  let slug = existing.slug;
  let name = existing.name;
  if (body.name !== undefined) {
    name = sanitizeInput(body.name.trim()).slice(0, 160);
    const baseSlug = slugify(name);
    if (baseSlug !== existing.slug) {
      const clash = await prisma.program.findUnique({ where: { slug: baseSlug } });
      slug = clash ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;
    }
  }

  let startDate = existing.startDate;
  let endDate = existing.endDate;
  if (body.startDate !== undefined) startDate = new Date(body.startDate);
  if (body.endDate !== undefined) endDate = new Date(body.endDate);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return badRequest('Invalid dates');

  const program = await prisma.$transaction(async (tx) => {
    if (body.courseIds !== undefined) {
      const cleaned = [...new Set((body.courseIds ?? []).filter((id) => typeof id === 'string' && id.trim()))];
      const found = cleaned.length
        ? await tx.course.findMany({ where: { id: { in: cleaned } }, select: { id: true } })
        : [];
      const finalIds = found.map((c) => c.id);
      await tx.course.updateMany({ where: { programId: existing.id }, data: { programId: null } });
      if (finalIds.length) {
        await tx.course.updateMany({ where: { id: { in: finalIds } }, data: { programId: existing.id } });
      }
    }

    return tx.program.update({
      where: { id: existing.id },
      data: {
        name,
        slug,
        ...(body.description !== undefined ? { description: sanitizeInput(body.description).slice(0, 5000) } : {}),
        ...(body.subject !== undefined ? { subject: appSubjectToDb(body.subject) } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        startDate,
        endDate,
      },
      include: {
        courses: {
          select: { id: true, title: true, subject: true, format: true, enrolledCount: true, scheduleJson: true },
        },
      },
    });
  }, { timeout: 30000 });

  const formats = Array.from(new Set(program.courses.map((c) => c.format))) as DeliveryFormat[];

  await writeAuditLog({
    userId: me.id,
    action: 'program.updated',
    resourceType: 'program',
    resourceId: existing.id,
  });

  return ok({
    id: program.id,
    name: program.name,
    slug: program.slug,
    description: program.description,
    subject: dbSubjectToApp(program.subject),
    status: program.status,
    startDate: program.startDate.toISOString(),
    endDate: program.endDate.toISOString(),
    courseCount: program.courses.length,
    enrolledCount: program.courses.reduce((sum, c) => sum + c.enrolledCount, 0),
    formats,
    createdAt: program.createdAt.toISOString(),
  });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!isAdminRole(me.roles)) return forbid('Administrator access required');

  const existing = await prisma.program.findUnique({ where: { id: params.id } });
  if (!existing) return notFound('Program not found');

  await prisma.program.delete({ where: { id: params.id } });

  await writeAuditLog({
    userId: me.id,
    action: 'program.deleted',
    resourceType: 'program',
    resourceId: params.id,
  });

  return ok({ deleted: true });
}