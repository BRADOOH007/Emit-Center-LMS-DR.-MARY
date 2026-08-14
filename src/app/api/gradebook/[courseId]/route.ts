import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, notFound, badRequest, forbid, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole, writeAuditLog } from '@/lib/security';
import { percentageToLetter } from '@/lib/grading';

function toArray<T = Record<string, unknown>>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function GET(_req: NextRequest, { params }: { params: { courseId: string } }) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');

  const course = await prisma.course.findUnique({ where: { id: params.courseId } });
  if (!course) return notFound('Course not found');

  const isInstructor = course.instructorId === me.id || isAdminRole(me.roles);
  const isEnrolled = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: me.id, courseId: params.courseId } },
  });

  if (isInstructor || isEnrolled) {
    const entries = await prisma.gradebookEntry.findMany({
      where: { courseId: params.courseId },
      include: { user: { select: { id: true, fullName: true, email: true } } },
      orderBy: { lastUpdated: 'desc' },
    });

    const data = entries.map((e) => ({
      id: e.id,
      courseId: e.courseId,
      userId: e.userId,
      quizScores: toArray(e.quizScoresJson),
      assignmentScores: toArray(e.assignmentScoresJson),
      practicalScore: e.practicalScore,
      overallPercentage: e.overallPercentage,
      letterGrade: e.letterGrade,
      comments: e.comments,
      lastUpdated: e.lastUpdated.toISOString(),
      user: e.user,
    }));

    return ok(data);
  }

  const linkedStudents = await prisma.parentStudentLink.findMany({
    where: { parentId: me.id },
    select: { studentId: true },
  });
  const linkedIds = linkedStudents.map((l) => l.studentId);
  const enrolled = await prisma.enrollment.findFirst({
    where: { courseId: params.courseId, userId: { in: linkedIds }, status: { in: ['active', 'completed', 'pending'] } },
  });
  if (!enrolled) return forbid('You are not enrolled in this course');

  const entries = await prisma.gradebookEntry.findMany({
    where: { courseId: params.courseId, userId: { in: linkedIds } },
    include: { user: { select: { id: true, fullName: true, email: true } } },
    orderBy: { lastUpdated: 'desc' },
  });

  const data = entries.map((e) => ({
    id: e.id,
    courseId: e.courseId,
    userId: e.userId,
    quizScores: JSON.parse(e.quizScoresJson as unknown as string),
    assignmentScores: JSON.parse(e.assignmentScoresJson as unknown as string),
    practicalScore: e.practicalScore,
    overallPercentage: e.overallPercentage,
    letterGrade: e.letterGrade,
    comments: e.comments,
    lastUpdated: e.lastUpdated.toISOString(),
    user: e.user,
  }));

  return ok(data);
}

export async function PATCH(request: NextRequest, { params }: { params: { courseId: string } }) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');

  const course = await prisma.course.findUnique({ where: { id: params.courseId } });
  if (!course) return notFound('Course not found');
  if (course.instructorId !== me.id && !isAdminRole(me.roles)) {
    return forbid('Only the course instructor or an administrator can grade');
  }

  try {
    const body = await parseBody<{
      userId: string;
      practicalScore?: number;
      comments?: string;
      quizScores?: { quizId: string; score: number }[];
      assignmentScores?: { assignmentId: string; score: number; feedback?: string }[];
    }>(request);

    if (!body.userId) return badRequest('userId is required');

    const existing = await prisma.gradebookEntry.findUnique({
      where: { courseId_userId: { courseId: params.courseId, userId: body.userId } },
    });

    if (!existing) return notFound('Gradebook entry not found');

    const quizScores = toArray<{ quizId: string; score: number; total?: number }>(existing.quizScoresJson);
    const assignmentScores = toArray<{ assignmentId: string; score: number; total?: number }>(
      existing.assignmentScoresJson,
    );

    if (body.quizScores) {
      body.quizScores.forEach((qs) => {
        const item = quizScores.find((e) => e.quizId === qs.quizId);
        if (item) item.score = qs.score;
      });
    }
    if (body.assignmentScores) {
      body.assignmentScores.forEach((as) => {
        const item = assignmentScores.find((e) => e.assignmentId === as.assignmentId);
        if (item) item.score = as.score;
      });
    }

    const scores = [
      ...quizScores.map((q: { score: number; total?: number }) => (q.total ? (q.score / q.total) * 100 : q.score)),
      ...assignmentScores.map((a: { score: number; total?: number }) => (a.total ? (a.score / a.total) * 100 : a.score)),
      body.practicalScore !== undefined ? body.practicalScore : existing.practicalScore,
    ];

    const overallPercentage = Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 10) / 10;

    const entry = await prisma.gradebookEntry.update({
      where: { id: existing.id },
      data: {
        practicalScore: body.practicalScore ?? existing.practicalScore,
        comments: body.comments !== undefined ? body.comments : existing.comments,
        quizScoresJson: quizScores as unknown as object,
        assignmentScoresJson: assignmentScores as unknown as object,
        overallPercentage,
        letterGrade: percentageToLetter(overallPercentage),
      },
      include: { user: { select: { id: true, fullName: true, email: true } } },
    });

    await writeAuditLog({
      userId: me.id,
      action: 'gradebook.updated',
      resourceType: 'course',
      resourceId: params.courseId,
    });

    return ok(entry);
  } catch {
    return badRequest('Invalid request body');
  }
}
