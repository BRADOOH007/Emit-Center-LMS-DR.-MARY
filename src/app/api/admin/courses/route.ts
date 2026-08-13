import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, created, badRequest, notFound, forbid, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole, writeAuditLog } from '@/lib/security';
import { slugify, sanitizeInput } from '@/lib/validation';
import { appAgeLevelToDb, appFormatToDb, appSubjectToDb, dbAgeLevelToApp, dbFormatToApp, dbSubjectToApp } from '@/lib/course-mappers';
import type { AgeLevel, CourseSubject, DeliveryFormat, SupportedCurrency } from '@/types';

const ALLOWED_FORMATS: DeliveryFormat[] = ['onsite', 'online', 'hybrid'];
const ALLOWED_AGE_LEVELS: AgeLevel[] = ['elementary', 'middle', 'high', 'adult', 'all'];
const ALLOWED_SUBJECTS: CourseSubject[] = ['robotics', 'coding', 'design', 'life-skills', 'engineering', 'career'];

export async function GET(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!isAdminRole(me.roles) && !me.roles.includes('instructor')) return forbid('Not authorized');

  const courses = await prisma.course.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      pricing: true,
      instructor: { select: { id: true, fullName: true, email: true } },
      enrollments: { select: { status: true } },
    },
  });

  const data = courses.map((c) => ({
    id: c.id,
    title: c.title,
    slug: c.slug,
    description: c.description,
    format: dbFormatToApp(c.format),
    ageLevel: dbAgeLevelToApp(c.ageLevel),
    subject: dbSubjectToApp(c.subject),
    schedule: JSON.parse(c.scheduleJson),
    onsiteLocation: c.onsiteLocation,
    virtualLink: c.virtualLink,
    maxSeats: c.maxSeats,
    enrolledCount: c.enrolledCount,
    instructorId: c.instructorId,
    instructor: c.instructor,
    pricing: c.pricing.map((p) => ({ id: p.id, currency: p.currency, amount: p.amount })),
    isPublished: c.isPublished,
    createdAt: c.createdAt.toISOString(),
  }));

  return ok(data);
}

export async function POST(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!isAdminRole(me.roles)) return forbid('Administrator access required');

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
    isPublished?: boolean;
  }>(request).catch(() => null);

  if (!body) return badRequest('Invalid request body');
  if (!body.title || !body.description) return badRequest('Title and description are required');
  if (!body.format || !ALLOWED_FORMATS.includes(body.format)) return badRequest('Invalid format');
  if (!body.ageLevel || !ALLOWED_AGE_LEVELS.includes(body.ageLevel)) return badRequest('Invalid age level');
  if (!body.subject || !ALLOWED_SUBJECTS.includes(body.subject)) return badRequest('Invalid subject');

  const instructorId = body.instructorId ?? me.id;
  const instructor = await prisma.user.findUnique({ where: { id: instructorId } });
  if (!instructor || !(instructor.roles.includes('instructor') || isAdminRole(instructor.roles))) {
    return badRequest('Selected instructor is not valid');
  }

  const baseSlug = slugify(body.title);
  const slug = await uniqueSlug(baseSlug);

  const schedule = {
    days: body.schedule?.days?.length ? body.schedule.days : ['Monday'],
    startDate: body.schedule?.startDate ?? new Date().toISOString(),
    endDate: body.schedule?.endDate ?? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    timeSlots: body.schedule?.timeSlots?.length
      ? body.schedule.timeSlots
      : [{ start: '16:00', end: '17:30', timezone: 'America/New_York' }],
  };

  const course = await prisma.course.create({
    data: {
      title: sanitizeInput(body.title).slice(0, 160),
      slug,
      description: sanitizeInput(body.description).slice(0, 5000),
      format: appFormatToDb(body.format),
      ageLevel: appAgeLevelToDb(body.ageLevel),
      subject: appSubjectToDb(body.subject),
      scheduleJson: JSON.stringify(schedule),
      onsiteLocation: body.onsiteLocation ? sanitizeInput(body.onsiteLocation).slice(0, 300) : null,
      virtualLink: body.virtualLink ? sanitizeInput(body.virtualLink).slice(0, 500) : null,
      maxSeats: Math.min(500, Math.max(1, body.maxSeats ?? 20)),
      instructorId,
      isPublished: body.isPublished ?? false,
      pricing: {
        create: (body.pricing ?? [{ currency: 'USD' as const, amount: 0 }]).map((p) => ({
          currency: p.currency,
          amount: Math.max(0, Math.round(p.amount)),
        })),
      },
    },
    include: { pricing: true, instructor: { select: { id: true, fullName: true, email: true } } },
  });

  await writeAuditLog({
    userId: me.id,
    action: 'course.created',
    resourceType: 'course',
    resourceId: course.id,
  });

  return created(course);
}

async function uniqueSlug(baseSlug: string): Promise<string> {
  if (!baseSlug) baseSlug = 'course';
  const existing = await prisma.course.findUnique({ where: { slug: baseSlug } });
  if (!existing) return baseSlug;
  return `${baseSlug}-${Date.now().toString(36)}`;
}
