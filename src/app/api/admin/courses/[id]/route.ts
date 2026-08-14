import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, notFound, forbid, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole, writeAuditLog } from '@/lib/security';
import { sanitizeInput } from '@/lib/validation';
import { appAgeLevelToDb, appFormatToDb, appSubjectToDb } from '@/lib/course-mappers';
import type { AgeLevel, CourseSubject, DeliveryFormat, SupportedCurrency } from '@/types';

function normalizeStandards(list: { authority: string; code: string; description?: string }[]) {
  const seen = new Set<string>();
  const out: { authority: string; code: string; description?: string }[] = [];
  for (const s of list) {
    const authority = sanitizeInput((s.authority || '').trim()).slice(0, 80);
    const code = sanitizeInput((s.code || '').trim()).slice(0, 80);
    const description = sanitizeInput((s.description || '').trim()).slice(0, 400);
    if (!authority || !code) continue;
    const key = `${authority.toLowerCase()}|${code.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ authority, code, description: description || undefined });
  }
  return out;
}

const ALLOWED_FORMATS: DeliveryFormat[] = ['onsite', 'online', 'hybrid'];
const ALLOWED_AGE_LEVELS: AgeLevel[] = ['elementary', 'middle', 'high', 'adult', 'all'];
const ALLOWED_SUBJECTS: CourseSubject[] = ['robotics', 'coding', 'design', 'life-skills', 'engineering', 'career'];

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!isAdminRole(me.roles)) return forbid('Administrator access required');

  const existing = await prisma.course.findUnique({ where: { id: params.id } });
  if (!existing) return notFound('Course not found');

  const body = await parseBody<{
    title?: string;
    description?: string;
    format?: DeliveryFormat;
    ageLevel?: AgeLevel;
    subject?: CourseSubject;
    schedule?: { days?: string[]; startDate?: string; endDate?: string; timeSlots?: { start: string; end: string; timezone: string }[] };
    onsiteLocation?: string;
    virtualLink?: string;
    maxSeats?: number;
    instructorId?: string;
    pricing?: { currency: SupportedCurrency; amount: number }[];
    prerequisiteIds?: string[];
    standards?: { authority: string; code: string; description?: string }[];
    isPublished?: boolean;
  }>(request).catch(() => null);

  if (!body) return badRequest('Invalid request body');

  if (body.format && !ALLOWED_FORMATS.includes(body.format)) return badRequest('Invalid format');
  if (body.ageLevel && !ALLOWED_AGE_LEVELS.includes(body.ageLevel)) return badRequest('Invalid age level');
  if (body.subject && !ALLOWED_SUBJECTS.includes(body.subject)) return badRequest('Invalid subject');

  let instructorId = existing.instructorId;
  if (body.instructorId) {
    const instructor = await prisma.user.findUnique({ where: { id: body.instructorId } });
    if (!instructor || !(instructor.roles.includes('instructor') || isAdminRole(instructor.roles))) {
      return badRequest('Selected instructor is not valid');
    }
    instructorId = body.instructorId;
  }

  const course = await prisma.$transaction(async (tx) => {
    if (body.pricing) {
      await tx.coursePrice.deleteMany({ where: { courseId: existing.id } });
      await tx.coursePrice.createMany({
        data: body.pricing!.map((p) => ({
          courseId: existing.id,
          currency: p.currency,
          amount: Math.max(0, Math.round(p.amount)),
        })),
      });
    }

    if (body.prerequisiteIds) {
      const cleaned = [...new Set(body.prerequisiteIds.filter((id) => typeof id === 'string' && id.trim()))];
      const found = cleaned.length
        ? await tx.course.findMany({ where: { id: { in: cleaned } }, select: { id: true } })
        : [];
      const foundSet = new Set(found.map((c) => c.id));
      const finalIds = cleaned.filter((id) => foundSet.has(id) && id !== existing.id);

      await tx.coursePrerequisite.deleteMany({ where: { courseId: existing.id } });
      if (finalIds.length) {
        await tx.coursePrerequisite.createMany({
          data: finalIds.map((id) => ({ courseId: existing.id, prerequisiteId: id, required: true })),
        });
      }
    }

    if (body.standards) {
      await tx.courseStandard.deleteMany({ where: { courseId: existing.id } });
      await tx.courseStandard.createMany({
        data: normalizeStandards(body.standards).map((s) => ({ ...s, courseId: existing.id })),
      });
    }

    const data: {
      title?: string;
      description?: string;
      format?: 'onsite' | 'online' | 'hybrid';
      ageLevel?: 'elementary' | 'middle' | 'high' | 'adult' | 'all';
      subject?: 'robotics' | 'coding' | 'design' | 'life_skills' | 'engineering' | 'career';
      scheduleJson?: string;
      onsiteLocation?: string | null;
      virtualLink?: string | null;
      maxSeats?: number;
      instructorId?: string;
      isPublished?: boolean;
    } = {};

    if (body.title !== undefined) data.title = sanitizeInput(body.title).slice(0, 160);
    if (body.description !== undefined) data.description = sanitizeInput(body.description).slice(0, 5000);
    if (body.format !== undefined) data.format = appFormatToDb(body.format);
    if (body.ageLevel !== undefined) data.ageLevel = appAgeLevelToDb(body.ageLevel);
    if (body.subject !== undefined) data.subject = appSubjectToDb(body.subject);
    if (body.schedule !== undefined) data.scheduleJson = JSON.stringify(body.schedule);
    if (body.onsiteLocation !== undefined) data.onsiteLocation = body.onsiteLocation ? sanitizeInput(body.onsiteLocation).slice(0, 300) : null;
    if (body.virtualLink !== undefined) data.virtualLink = body.virtualLink ? sanitizeInput(body.virtualLink).slice(0, 500) : null;
    if (body.maxSeats !== undefined) data.maxSeats = Math.min(500, Math.max(1, body.maxSeats));
    if (instructorId !== existing.instructorId) data.instructorId = instructorId;
    if (body.isPublished !== undefined) data.isPublished = body.isPublished;

    return tx.course.update({
      where: { id: existing.id },
      data,
      include: {
        pricing: true,
        instructor: { select: { id: true, fullName: true, email: true } },
        prerequisites: { include: { prerequisite: { select: { id: true, title: true, subject: true } } } },
        standards: true,
      },
    });
  }, { timeout: 30000 });

  await writeAuditLog({
    userId: me.id,
    action: 'course.updated',
    resourceType: 'course',
    resourceId: existing.id,
  });

  return ok(course);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!isAdminRole(me.roles)) return forbid('Administrator access required');

  const existing = await prisma.course.findUnique({ where: { id: params.id } });
  if (!existing) return notFound('Course not found');

  const activeEnrollments = await prisma.enrollment.count({
    where: { courseId: params.id, status: { in: ['active', 'pending'] } },
  });
  if (activeEnrollments > 0) {
    return badRequest('Cannot delete a course with active enrollments. Unpublish it instead.');
  }

  await prisma.course.delete({ where: { id: params.id } });

  await writeAuditLog({
    userId: me.id,
    action: 'course.deleted',
    resourceType: 'course',
    resourceId: params.id,
  });

  return ok({ deleted: true });
}
