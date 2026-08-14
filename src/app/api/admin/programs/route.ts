import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, created, badRequest, forbid, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole, writeAuditLog } from '@/lib/security';
import { slugify, sanitizeInput } from '@/lib/validation';
import { appSubjectToDb, dbSubjectToApp } from '@/lib/course-mappers';
import type { CourseSubject, DeliveryFormat } from '@/types';

const ALLOWED_SUBJECTS: CourseSubject[] = ['robotics', 'coding', 'design', 'life-skills', 'engineering', 'career'];
const ALLOWED_STATUS: string[] = ['active', 'archived'];

export async function GET(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!isAdminRole(me.roles)) return forbid('Not authorized');

  const programs = await prisma.program.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      courses: {
        select: {
          id: true,
          title: true,
          subject: true,
          format: true,
          enrolledCount: true,
          isPublished: true,
          scheduleJson: true,
        },
      },
    },
  });

  const data = programs.map((p) => {
    const formats = Array.from(new Set(p.courses.map((c) => c.format))) as DeliveryFormat[];
    const startDates = p.courses
      .map((c) => (() => { try { return JSON.parse(c.scheduleJson).startDate; } catch { return null; } })())
      .filter((d): d is string => Boolean(d))
      .sort();
    const endDates = p.courses
      .map((c) => (() => { try { return JSON.parse(c.scheduleJson).endDate; } catch { return null; } })())
      .filter((d): d is string => Boolean(d))
      .sort();
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      subject: dbSubjectToApp(p.subject),
      status: p.status,
      startDate: startDates[0] ?? p.startDate.toISOString(),
      endDate: endDates[endDates.length - 1] ?? p.endDate.toISOString(),
      courseCount: p.courses.length,
      enrolledCount: p.courses.reduce((sum, c) => sum + c.enrolledCount, 0),
      formats,
      createdAt: p.createdAt.toISOString(),
    };
  });

  return ok(data);
}

export async function POST(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!isAdminRole(me.roles)) return forbid('Administrator access required');

  const body = await parseBody<{
    name?: string;
    description?: string;
    subject?: CourseSubject;
    status?: string;
    startDate?: string;
    endDate?: string;
  }>(request).catch(() => null);

  if (!body) return badRequest('Invalid request body');
  if (!body.name || !body.name.trim()) return badRequest('Program name is required');
  if (!body.subject || !ALLOWED_SUBJECTS.includes(body.subject)) return badRequest('Invalid subject');
  if (body.status && !ALLOWED_STATUS.includes(body.status)) return badRequest('Invalid status');

  const name = sanitizeInput(body.name.trim()).slice(0, 160);
  const baseSlug = slugify(name);
  const slug = await uniqueSlug(baseSlug);

  const startDate = body.startDate ? new Date(body.startDate) : new Date();
  const endDate = body.endDate ? new Date(body.endDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return badRequest('Invalid dates');

  const program = await prisma.program.create({
    data: {
      name,
      slug,
      description: sanitizeInput(body.description ?? '').slice(0, 5000),
      subject: appSubjectToDb(body.subject),
      status: body.status ?? 'active',
      startDate,
      endDate,
    },
    include: { courses: { select: { id: true } } },
  });

  await writeAuditLog({
    userId: me.id,
    action: 'program.created',
    resourceType: 'program',
    resourceId: program.id,
  });

  return created({
    id: program.id,
    name: program.name,
    slug: program.slug,
    description: program.description,
    subject: dbSubjectToApp(program.subject),
    status: program.status,
    startDate: program.startDate.toISOString(),
    endDate: program.endDate.toISOString(),
    courseCount: program.courses.length,
    enrolledCount: 0,
    formats: [] as DeliveryFormat[],
  });
}

async function uniqueSlug(baseSlug: string): Promise<string> {
  if (!baseSlug) baseSlug = 'program';
  const existing = await prisma.program.findUnique({ where: { slug: baseSlug } });
  if (!existing) return baseSlug;
  return `${baseSlug}-${Date.now().toString(36)}`;
}
