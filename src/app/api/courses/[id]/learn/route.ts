import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, forbid, notFound, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole, writeAuditLog } from '@/lib/security';

async function loadLearnState(courseId: string, userId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      subject: true,
      ageLevel: true,
      imageUrl: true,
    },
  });
  if (!course) return null;

  const [units, progress] = await Promise.all([
    prisma.courseUnit.findMany({
      where: { courseId },
      include: { lessons: { orderBy: { order: 'asc' }, select: { id: true, title: true, summary: true, order: true, status: true, contentMarkdown: true, grade: true } } },
      orderBy: { order: 'asc' },
    }),
    prisma.courseLessonProgress.findMany({
      where: { userId, lesson: { courseId } },
      select: { lessonId: true, status: true, score: true, completedAt: true },
    }),
  ]);

  const progressMap = new Map(progress.map((p) => [p.lessonId, p]));
  let completedCount = 0;
  let totalCount = 0;

  const serializedUnits = units.map((u) => ({
    id: u.id,
    title: u.title,
    description: u.description,
    order: u.order,
    lessons: u.lessons.map((l) => {
      totalCount += 1;
      const p = progressMap.get(l.id);
      const done = p?.status === 'completed' || p?.completedAt != null;
      if (done) completedCount += 1;
      return {
        id: l.id,
        title: l.title,
        summary: l.summary,
        order: l.order,
        status: l.status,
        hasContent: Boolean(l.contentMarkdown),
        progress: p
          ? { status: p.status, score: p.score, completedAt: p.completedAt?.toISOString() ?? null }
          : null,
      };
    }),
  }));

  return {
    course: {
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      subject: course.subject,
      ageLevel: course.ageLevel,
      imageUrl: course.imageUrl,
    },
    units: serializedUnits,
    percentComplete: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    completedCount,
    totalCount,
  };
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');

  const state = await loadLearnState(params.id, me.id);
  if (!state) return notFound('Course not found');

  const course = await prisma.course.findUnique({
    where: { id: params.id },
    select: { instructorId: true, isPublished: true },
  });
  if (!course) return notFound('Course not found');

  const isStaff = isAdminRole(me.roles) || course.instructorId === me.id;
  if (!isStaff && !course.isPublished) return forbid('Course is not published');

  if (!isStaff) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: me.id, courseId: params.id } },
      select: { status: true },
    });
    if (!enrollment || (enrollment.status !== 'active' && enrollment.status !== 'completed')) {
      return forbid('You must be enrolled in this course to access its lessons');
    }
  }

  return ok(state);
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');

  const body = await parseBody<{ lessonId?: string; status?: string; score?: number | null }>(request).catch(() => null);
  if (!body || !body.lessonId) return badRequest('lessonId is required');

  const lesson = await prisma.courseLesson.findUnique({
    where: { id: body.lessonId },
    select: { id: true, courseId: true },
  });
  if (!lesson || lesson.courseId !== params.id) return badRequest('Lesson not found in this course');

  const status = body.status === 'completed' ? 'completed' : body.status === 'started' ? 'started' : null;
  if (!status) return badRequest('status must be "started" or "completed"');

  const completed = status === 'completed';
  const score = completed && typeof body.score === 'number' ? Math.max(0, Math.min(100, Math.round(body.score))) : null;

  await prisma.courseLessonProgress.upsert({
    where: { userId_lessonId: { userId: me.id, lessonId: lesson.id } },
    update: {
      status,
      score: score ?? undefined,
      completedAt: completed ? new Date() : null,
    },
    create: {
      userId: me.id,
      lessonId: lesson.id,
      status,
      score,
      completedAt: completed ? new Date() : null,
    },
  });

  await writeAuditLog({ userId: me.id, action: `lesson.${status}`, resourceType: 'course_lesson', resourceId: lesson.id });

  const state = await loadLearnState(params.id, me.id);
  return ok({ status, score, percentComplete: state?.percentComplete ?? 0, completedCount: state?.completedCount ?? 0, totalCount: state?.totalCount ?? 0 });
}
