import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, forbid, serverError, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole, writeAuditLog } from '@/lib/security';
import { checkAIUsageAllowed, recordAIUsage } from '@/lib/ai-usage';
import { stripLatex } from '@/lib/clean-ai-text';
import { generateCourseSyllabus, generateLessonContent } from '@/lib/course-content';
import type { Prisma } from '@prisma/client';

async function canAccessCourse(userId: string, roles: string[], courseId: string): Promise<boolean> {
  if (isAdminRole(roles)) return true;
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { instructorId: true, isPublished: true },
  });
  if (!course) return false;
  if (course.instructorId === userId) return true;
  if (!course.isPublished) return false;
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { status: true },
  });
  return enrollment?.status === 'active' || enrollment?.status === 'completed';
}

export async function POST(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');

  const body = await parseBody<{ courseId?: string; lessonId?: string; regenerate?: boolean; curriculum?: string | null }>(request).catch(() => null);
  if (!body || !body.courseId) return badRequest('courseId is required');

  if (!(await canAccessCourse(me.id, me.roles, body.courseId))) {
    return forbid('You must be enrolled in this course to access its lessons');
  }

  const usage = await checkAIUsageAllowed(me.id);
  if (!usage.allowed) return badRequest(usage.reason ?? 'AI usage limit reached');

  const course = await prisma.course.findUnique({
    where: { id: body.courseId },
    select: { id: true, title: true, description: true, subject: true, ageLevel: true },
  });
  if (!course) return badRequest('Course not found');

  // ── Lesson content generation ────────────────────────────────────────────
  if (body.lessonId) {
    const lesson = await prisma.courseLesson.findUnique({ where: { id: body.lessonId } });
    if (!lesson || lesson.courseId !== course.id) return badRequest('Lesson not found in this course');

    if (lesson.status === 'ready' && lesson.contentMarkdown && !body.regenerate) {
      return ok({
        lesson: serializeLesson(lesson),
        fromCache: true,
      });
    }

    const unit = await prisma.courseUnit.findUnique({ where: { id: lesson.unitId } });
    if (!unit) return badRequest('Lesson unit not found');

    await prisma.courseLesson.update({
      where: { id: lesson.id },
      data: { status: 'generating', error: null },
    });
    await prisma.courseLessonProgress.upsert({
      where: { userId_lessonId: { userId: me.id, lessonId: lesson.id } },
      update: { status: 'started', completedAt: null },
      create: { userId: me.id, lessonId: lesson.id, status: 'started' },
    }).catch(() => {});

    try {
      const payload = await generateLessonContent(
        { title: course.title, description: course.description, subject: course.subject, ageLevel: course.ageLevel },
        unit.title,
        lesson.title,
        { curriculum: body.curriculum || lesson.curriculum || 'us-generic' },
      );

      const updated = await prisma.courseLesson.update({
        where: { id: lesson.id },
        data: {
          contentMarkdown: stripLatex(payload.content),
          assessmentJson: JSON.stringify({ preview: payload.preview, recall: payload.recall }) as Prisma.InputJsonValue,
          status: 'ready',
          generatedAt: new Date(),
          curriculum: body.curriculum || lesson.curriculum || 'us-generic',
        },
      });

      recordAIUsage(me.id, 0).catch(() => {});
      await writeAuditLog({ userId: me.id, action: 'lesson.generated', resourceType: 'course_lesson', resourceId: lesson.id });

      return ok({ lesson: serializeLesson(updated), fromCache: false });
    } catch (err: any) {
      await prisma.courseLesson
        .update({
          where: { id: lesson.id },
          data: { status: 'error', error: (err?.message || 'Generation failed').slice(0, 500) },
        })
        .catch(() => {});
      console.error('[GenerateCourseContent] Lesson generation failed:', err);
      return serverError(err?.message || 'Failed to generate lesson content. Please try again.');
    }
  }

  // ── Course syllabus generation ───────────────────────────────────────────
  const existing = await prisma.courseUnit.findMany({
    where: { courseId: course.id },
    include: { lessons: { orderBy: { order: 'asc' } } },
    orderBy: { order: 'asc' },
  });

  if (existing.length > 0 && !body.regenerate) {
    return ok({ units: existing.map(serializeUnit), fromCache: true });
  }

  if (body.regenerate && existing.length > 0) {
    await prisma.courseLesson.deleteMany({ where: { courseId: course.id } }).catch(() => {});
    await prisma.courseUnit.deleteMany({ where: { courseId: course.id } }).catch(() => {});
  }

  try {
    const units = await generateCourseSyllabus(
      { title: course.title, description: course.description, subject: course.subject, ageLevel: course.ageLevel },
      { curriculum: body.curriculum || 'us-generic' },
    );

    const created: { id: string; title: string; description: string | null; order: number; lessons: { id: string; title: string; summary: string | null; order: number; status: string }[] }[] = [];

    for (let u = 0; u < units.length; u++) {
      const unit = units[u];
      const createdUnit = await prisma.courseUnit.create({
        data: {
          courseId: course.id,
          title: unit.title,
          description: unit.description,
          order: u + 1,
        },
      });
      const lessons: { id: string; title: string; summary: string | null; order: number; status: string }[] = [];
      for (let t = 0; t < unit.topics.length; t++) {
        const topic = unit.topics[t];
        const createdLesson = await prisma.courseLesson.create({
          data: {
            unitId: createdUnit.id,
            courseId: course.id,
            title: topic.title,
            summary: topic.summary,
            order: t + 1,
            status: 'pending',
            curriculum: body.curriculum || 'us-generic',
          },
        });
        lessons.push({
          id: createdLesson.id,
          title: createdLesson.title,
          summary: createdLesson.summary,
          order: createdLesson.order,
          status: createdLesson.status,
        });
      }
      created.push({ id: createdUnit.id, title: createdUnit.title, description: createdUnit.description, order: createdUnit.order, lessons });
    }

    recordAIUsage(me.id, 0).catch(() => {});
    await writeAuditLog({ userId: me.id, action: 'syllabus.generated', resourceType: 'course', resourceId: course.id });

    return ok({ units: created, fromCache: false });
  } catch (err: any) {
    console.error('[GenerateCourseContent] Syllabus generation failed:', err);
    return serverError(err?.message || 'Failed to generate course syllabus. Please try again.');
  }
}

function serializeLesson(lesson: {
  id: string;
  unitId: string;
  courseId: string;
  title: string;
  order: number;
  summary: string | null;
  contentMarkdown: string | null;
  assessmentJson: unknown;
  status: string;
  error: string | null;
  generatedAt: Date | null;
  curriculum: string;
  grade: string | null;
}) {
  let assessment = null;
  if (lesson.assessmentJson) {
    try {
      assessment = typeof lesson.assessmentJson === 'string' ? JSON.parse(lesson.assessmentJson) : lesson.assessmentJson;
    } catch {
      assessment = null;
    }
  }
  return {
    id: lesson.id,
    unitId: lesson.unitId,
    courseId: lesson.courseId,
    title: lesson.title,
    order: lesson.order,
    summary: lesson.summary,
    content: lesson.contentMarkdown,
    assessment,
    status: lesson.status,
    error: lesson.error,
    generatedAt: lesson.generatedAt?.toISOString() ?? null,
    curriculum: lesson.curriculum,
    grade: lesson.grade,
  };
}

function serializeUnit(unit: {
  id: string;
  title: string;
  description: string | null;
  order: number;
  lessons: {
    id: string;
    title: string;
    summary: string | null;
    order: number;
    status: string;
  }[];
}) {
  return {
    id: unit.id,
    title: unit.title,
    description: unit.description,
    order: unit.order,
    lessons: unit.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      summary: l.summary,
      order: l.order,
      status: l.status,
    })),
  };
}
