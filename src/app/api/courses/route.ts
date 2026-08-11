import { NextRequest } from 'next/server';
import { MOCK_COURSES } from '@/lib/mock-data';
import { ok } from '@/lib/api-helpers';
import type { AgeLevel, CourseSubject, DeliveryFormat } from '@/types';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const format = searchParams.getAll('format') as DeliveryFormat[];
  const ageLevel = searchParams.getAll('ageLevel') as AgeLevel[];
  const subject = searchParams.getAll('subject') as CourseSubject[];
  const timezone = searchParams.get('timezone');
  const search = searchParams.get('search')?.toLowerCase();
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '12', 10)));

  let filtered = MOCK_COURSES.filter((course) => course.isPublished);

  if (format.length > 0) filtered = filtered.filter((course) => format.includes(course.format));
  if (ageLevel.length > 0) filtered = filtered.filter((course) => ageLevel.includes(course.ageLevel));
  if (subject.length > 0) filtered = filtered.filter((course) => subject.includes(course.subject));
  if (search) {
    filtered = filtered.filter(
      (course) =>
        course.title.toLowerCase().includes(search) ||
        course.description.toLowerCase().includes(search) ||
        course.subject.includes(search),
    );
  }
  if (timezone) {
    filtered = filtered.filter((course) =>
      course.schedule.timeSlots.some((slot) => slot.timezone === timezone),
    );
  }

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const data = filtered.slice(start, start + pageSize);

  return ok({ data, total, page, pageSize });
}
