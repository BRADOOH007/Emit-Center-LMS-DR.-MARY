import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, forbid } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole } from '@/lib/security';

export async function GET(_req: NextRequest, { params }: { params: { courseId: string } }) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');

  const course = await prisma.course.findUnique({ where: { id: params.courseId } });
  if (!course) return forbid('Course not found');

  const sections = await prisma.lessonSection.findMany({
    orderBy: { order: 'asc' },
    include: {
      contents: {
        where: { courseId: params.courseId },
        orderBy: { order: 'asc' },
      },
    },
  });

  return ok({ sections, courseId: params.courseId });
}
