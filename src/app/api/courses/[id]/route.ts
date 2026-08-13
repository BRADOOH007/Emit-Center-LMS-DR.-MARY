import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, notFound } from '@/lib/api-helpers';
import { dbAgeLevelToApp, dbFormatToApp, dbSubjectToApp } from '@/lib/course-mappers';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const course = await prisma.course.findFirst({
    where: { OR: [{ id: params.id }, { slug: params.id }] },
    include: {
      pricing: true,
      instructor: { select: { id: true, fullName: true, email: true } },
      sessions: {
        orderBy: { date: 'asc' },
        take: 20,
        include: { instructor: { select: { id: true, fullName: true } } },
      },
      quizzes: {
        where: { isPublished: true },
        select: { id: true, title: true, timeLimit: true, totalPoints: true },
      },
    },
  });

  if (!course) return notFound('Course not found');

  return ok({
    id: course.id,
    title: course.title,
    slug: course.slug,
    description: course.description,
    format: dbFormatToApp(course.format),
    ageLevel: dbAgeLevelToApp(course.ageLevel),
    subject: dbSubjectToApp(course.subject),
    schedule: JSON.parse(course.scheduleJson),
    onsiteLocation: course.onsiteLocation,
    virtualLink: course.virtualLink,
    maxSeats: course.maxSeats,
    enrolledCount: course.enrolledCount,
    instructorId: course.instructorId,
    instructor: course.instructor,
    pricing: course.pricing.map((p) => ({ id: p.id, currency: p.currency, amount: p.amount })),
    isPublished: course.isPublished,
    createdAt: course.createdAt.toISOString(),
  });
}
