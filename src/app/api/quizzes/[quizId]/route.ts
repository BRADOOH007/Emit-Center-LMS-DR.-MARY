import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, notFound, badRequest, forbid, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import type { Quiz, QuizQuestion, QuizAttempt, LetterGrade } from '@/types';

function mapQuiz(row: {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  timeLimit: number;
  questionsJson: unknown;
  totalPoints: number;
  isPublished: boolean;
  createdAt: Date;
}): Quiz {
  return {
    id: row.id,
    courseId: row.courseId,
    title: row.title,
    description: row.description ?? '',
    timeLimit: row.timeLimit,
    questions: (row.questionsJson as unknown as QuizQuestion[]) ?? [],
    totalPoints: row.totalPoints,
    isPublished: row.isPublished,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapAttempt(row: {
  id: string;
  quizId: string;
  userId: string;
  answersJson: unknown;
  score: number;
  totalPoints: number;
  percentage: number;
  letterGrade: string;
  startedAt: Date;
  submittedAt: Date;
  autoGraded: boolean;
}): QuizAttempt {
  return {
    id: row.id,
    quizId: row.quizId,
    userId: row.userId,
    answers: (row.answersJson as Record<string, string>) ?? {},
    score: row.score,
    totalPoints: row.totalPoints,
    percentage: row.percentage,
    letterGrade: row.letterGrade as LetterGrade,
    startedAt: row.startedAt.toISOString(),
    submittedAt: row.submittedAt.toISOString(),
    autoGraded: row.autoGraded,
  };
}

function gradePercentage(score: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((score / total) * 1000) / 10;
}

export async function GET(_req: NextRequest, { params }: { params: { quizId: string } }) {
  const quiz = await prisma.quiz.findUnique({ where: { id: params.quizId } });
  if (!quiz) return notFound('Quiz not found');

  const user = await getSessionUser();

  const attempt = user
    ? await prisma.quizAttempt.findFirst({
        where: { quizId: params.quizId, userId: user.id },
        orderBy: { submittedAt: 'desc' },
      })
    : null;

  return ok({
    ...mapQuiz(quiz),
    attempts: attempt ? [mapAttempt(attempt)] : [],
  });
}

export async function POST(request: NextRequest, { params }: { params: { quizId: string } }) {
  const quiz = await prisma.quiz.findUnique({ where: { id: params.quizId } });
  if (!quiz) return notFound('Quiz not found');

  const user = await getSessionUser();
  if (!user) return forbid('Sign in to submit a quiz');

  try {
    const body = await parseBody<{ answers: Record<string, string> }>(request);
    if (!body.answers) return badRequest('answers are required');

    const questions = (quiz.questionsJson as unknown as QuizQuestion[]) ?? [];
    let autoScore = 0;
    questions.forEach((question) => {
      if (question.type === 'multiple-choice' && question.correctAnswer) {
        if (body.answers[question.id] === question.correctAnswer) {
          autoScore += question.points;
        }
      }
    });

    const totalPoints = quiz.totalPoints > 0 ? quiz.totalPoints : questions.reduce((sum, q) => sum + q.points, 0);
    const percentage = gradePercentage(autoScore, totalPoints);

    let letterGrade: LetterGrade = 'F';
    if (percentage >= 97) letterGrade = 'A+';
    else if (percentage >= 93) letterGrade = 'A';
    else if (percentage >= 90) letterGrade = 'A-';
    else if (percentage >= 87) letterGrade = 'B+';
    else if (percentage >= 83) letterGrade = 'B';
    else if (percentage >= 80) letterGrade = 'B-';
    else if (percentage >= 77) letterGrade = 'C+';
    else if (percentage >= 73) letterGrade = 'C';
    else if (percentage >= 70) letterGrade = 'C-';
    else if (percentage >= 60) letterGrade = 'D';

    const created = await prisma.quizAttempt.create({
      data: {
        quizId: params.quizId,
        userId: user.id,
        answersJson: body.answers,
        score: autoScore,
        totalPoints,
        percentage,
        letterGrade,
        startedAt: new Date(),
        submittedAt: new Date(),
        autoGraded: true,
      },
    });

    return ok(mapAttempt(created), 201);
  } catch {
    return badRequest('Invalid request body');
  }
}