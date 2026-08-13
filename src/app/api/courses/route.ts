import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok } from '@/lib/api-helpers';
import { dbAgeLevelToApp, dbFormatToApp, dbSubjectToApp } from '@/lib/course-mappers';
import type { AgeLevel, CourseSubject, DeliveryFormat } from '@/types';

const ALLOWED_FORMATS: DeliveryFormat[] = ['onsite', 'online', 'hybrid'];
const ALLOWED_AGE_LEVELS: AgeLevel[] = ['elementary', 'middle', 'high', 'adult', 'all'];
const ALLOWED_SUBJECTS: CourseSubject[] = ['robotics', 'coding', 'design', 'life-skills', 'engineering', 'career'];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const format = searchParams.getAll('format').filter((f): f is DeliveryFormat => ALLOWED_FORMATS.includes(f as DeliveryFormat));
  const ageLevel = searchParams.getAll('ageLevel').filter((a): a is AgeLevel => ALLOWED_AGE_LEVELS.includes(a as AgeLevel));
  const subject = searchParams.getAll('subject').filter((s): s is CourseSubject => ALLOWED_SUBJECTS.includes(s as CourseSubject));
  const timezone = searchParams.get('timezone');
  const search = searchParams.get('search')?.toLowerCase();
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '12', 10)));

  const where: Record<string, unknown> = { isPublished: true };

  if (format.length > 0) where.format = { in: format };
  if (ageLevel.length > 0) where.ageLevel = { in: ageLevel };
  if (subject.length > 0) {
    where.subject = { in: subject.map((s) => (s === 'life-skills' ? 'life_skills' : s)) };
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { subject: { contains: search, mode: 'insensitive' } },
    ];
  }

  let courses = await prisma.course.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      pricing: true,
      instructor: { select: { id: true, fullName: true } },
    },
  });

  if (timezone) {
    courses = courses.filter((c) => {
      try {
        const schedule = JSON.parse(c.scheduleJson) as { timeSlots?: { timezone?: string }[] };
        return schedule.timeSlots?.some((slot) => slot.timezone === timezone) ?? false;
      } catch {
        return false;
      }
    });
  }

  const total = courses.length;
  const start = (page - 1) * pageSize;
  const data = courses.slice(start, start + pageSize).map((c) => ({
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

  return ok({ data, total, page, pageSize });
}
