import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, created, badRequest, forbid, serverError } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole } from '@/lib/security';
import type { QuizQuestion } from '@/types';

function canManageCourse(me: { id: string; roles: string[] }, course: { instructorId: string }): boolean {
  return isAdminRole(me.roles) || course.instructorId === me.id;
}

export async function GET(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');

  const courseId = request.nextUrl.searchParams.get('courseId');
  if (!courseId) return badRequest('courseId is required');

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return badRequest('Course not found');
  if (!canManageCourse(me, course)) return forbid('Instructor access required');

  const quizzes = await prisma.quiz.findMany({
    where: { courseId },
    orderBy: { createdAt: 'desc' },
    include: {
      attempts: {
        select: {
          id: true,
          userId: true,
          percentage: true,
          submittedAt: true,
          user: { select: { id: true, fullName: true, email: true } },
        },
      },
    },
  });

  return ok(
    quizzes.map((quiz) => ({
      id: quiz.id,
      courseId: quiz.courseId,
      title: quiz.title,
      description: quiz.description,
      timeLimit: quiz.timeLimit,
      totalPoints: quiz.totalPoints,
      isPublished: quiz.isPublished,
      createdAt: quiz.createdAt.toISOString(),
      questionCount: ((quiz.questionsJson as unknown as QuizQuestion[]) ?? []).length,
      attempts: quiz.attempts,
    })),
  );
}

export async function POST(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');

  let body: {
    courseId: string;
    title?: string;
    description?: string;
    timeLimit?: number;
    totalPoints?: number;
    questions?: QuizQuestion[];
  };
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  if (!body.courseId) return badRequest('courseId is required');

  const course = await prisma.course.findUnique({ where: { id: body.courseId } });
  if (!course) return badRequest('Course not found');
  if (!canManageCourse(me, course)) return forbid('Instructor access required');

  const questions = Array.isArray(body.questions) ? body.questions : [];
  if (questions.length === 0) return badRequest('At least one question is required');

  const sanitized: QuizQuestion[] = questions.map((q) => ({
    id: String(q.id || `q${Math.random().toString(36).slice(2, 8)}`),
    question: String(q.question ?? '').trim(),
    type: q.type,
    options: Array.isArray(q.options) ? q.options.slice(0, 4) : undefined,
    correctAnswer: q.correctAnswer,
    modelAnswer: q.modelAnswer,
    points: Number.isFinite(Number(q.points)) && Number(q.points) > 0 ? Math.round(Number(q.points)) : 1,
    required: q.required !== false,
  }));

  const totalPoints = body.totalPoints && body.totalPoints > 0
    ? Math.round(body.totalPoints)
    : sanitized.reduce((sum, q) => sum + q.points, 0);

  try {
    const quiz = await prisma.quiz.create({
      data: {
        courseId: body.courseId,
        title: (body.title || '').trim() || `${course.title} Assessment`,
        description: (body.description || '').trim() || null,
        timeLimit: body.timeLimit && body.timeLimit > 0 ? Math.round(body.timeLimit) : 15,
        questionsJson: sanitized as unknown as object,
        totalPoints,
        isPublished: true,
      },
    });
    return created({
      id: quiz.id,
      courseId: quiz.courseId,
      title: quiz.title,
    });
  } catch (err: any) {
    return serverError(err?.message || 'Failed to create quiz');
  }
}