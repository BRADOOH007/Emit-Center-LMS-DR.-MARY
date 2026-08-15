import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, notFound, badRequest, forbid, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole } from '@/lib/security';
import { gradeShortAnswer, gradeTrueFalse, letterForOption } from '@/lib/answer-evaluator';
import { gradeEssays } from '@/lib/exam-grading';
import { percentageToLetter } from '@/lib/grading';
import type { Quiz, QuizQuestion, QuizAttempt, QuizQuestionResult, LetterGrade } from '@/types';

function mapQuiz(
  row: {
    id: string;
    courseId: string;
    title: string;
    description: string | null;
    timeLimit: number;
    questionsJson: unknown;
    totalPoints: number;
    isPublished: boolean;
    createdAt: Date;
  },
  options?: { stripAnswers?: boolean },
): Quiz {
  const questions = (row.questionsJson as unknown as QuizQuestion[]) ?? [];
  return {
    id: row.id,
    courseId: row.courseId,
    title: row.title,
    description: row.description ?? '',
    timeLimit: row.timeLimit,
    questions: options?.stripAnswers
      ? questions.map((q) => ({
          ...q,
          correctAnswer: undefined,
          modelAnswer: undefined,
        }))
      : questions,
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
  questionResultsJson: unknown;
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
    questionResults: (row.questionResultsJson as unknown as QuizQuestionResult[]) ?? undefined,
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

  const course = await prisma.course.findUnique({ where: { id: quiz.courseId } });
  const isInstructorView =
    user != null &&
    !!course &&
    (isAdminRole(user.roles) || course.instructorId === user.id);

  const attempt = user
    ? await prisma.quizAttempt.findFirst({
        where: { quizId: params.quizId, userId: user.id },
        orderBy: { submittedAt: 'desc' },
      })
    : null;

  return ok({
    ...mapQuiz(quiz, { stripAnswers: !isInstructorView }),
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
    const answers = body.answers ?? {};

    // Deterministic grading for objective question types.
    const deterministicResults: QuizQuestionResult[] = [];
    const essaysToGrade: {
      questionId: string;
      question: string;
      yourAnswer: string;
      modelAnswer?: string;
      points: number;
    }[] = [];

    for (const question of questions) {
      const yourAnswer = answers[question.id] ?? '';
      const base: QuizQuestionResult = {
        questionId: question.id,
        type: question.type,
        question: question.question,
        points: question.points,
        earned: 0,
        yourAnswer,
        correct: false,
        aiGraded: false,
      };

      if (question.type === 'multiple-choice') {
        const chosen = letterForOption(question.options, yourAnswer);
        const expected = (question.correctAnswer || '').toUpperCase();
        const correct = chosen !== null && chosen === expected;
        base.earned = correct ? question.points : 0;
        base.correct = correct;
        base.correctAnswer = question.correctAnswer;
        deterministicResults.push(base);
      } else if (question.type === 'true-false') {
        const correct = gradeTrueFalse(yourAnswer, question.correctAnswer);
        base.earned = correct ? question.points : 0;
        base.correct = correct;
        base.correctAnswer = question.correctAnswer;
        deterministicResults.push(base);
      } else if (question.type === 'short-answer') {
        const correct = gradeShortAnswer(yourAnswer, question.modelAnswer ?? question.correctAnswer);
        base.earned = correct ? question.points : 0;
        base.correct = correct;
        base.correctAnswer = question.modelAnswer ?? question.correctAnswer;
        base.modelAnswer = question.modelAnswer ?? question.correctAnswer;
        base.aiGraded = false;
        deterministicResults.push(base);
      } else if (question.type === 'essay') {
        essaysToGrade.push({
          questionId: question.id,
          question: question.question,
          yourAnswer,
          modelAnswer: question.modelAnswer ?? question.correctAnswer,
          points: question.points,
        });
        base.correctAnswer = question.modelAnswer ?? question.correctAnswer;
        base.modelAnswer = question.modelAnswer ?? question.correctAnswer;
        deterministicResults.push(base);
      } else {
        // file-upload / rubric — not auto-gradable; leave for instructor review.
        base.correct = false;
        base.aiGraded = false;
        base.feedback = 'Requires instructor review.';
        deterministicResults.push(base);
      }
    }

    // AI grade the essays in one batch call.
    let essayGrades: Record<string, { earned: number; feedback: string }> = {};
    let essayAiFailed = false;
    if (essaysToGrade.length > 0) {
      try {
        const graded = await gradeEssays(essaysToGrade);
        for (const g of graded) {
          essayGrades[g.questionId] = { earned: g.earned, feedback: g.feedback };
        }
        const gradedIds = new Set(graded.map((g) => g.questionId));
        const missing = essaysToGrade.filter((e) => !gradedIds.has(e.questionId));
        if (missing.length > 0) essayAiFailed = true;
      } catch {
        essayAiFailed = true;
      }
    }

    const allResults: QuizQuestionResult[] = deterministicResults.map((r) => {
      if (r.type === 'essay') {
        const grade = essayGrades[r.questionId];
        if (grade) {
          return {
            ...r,
            earned: grade.earned,
            correct: grade.earned >= r.points * 0.6,
            aiGraded: true,
            feedback: grade.feedback,
          };
        }
        return {
          ...r,
          earned: 0,
          correct: false,
          aiGraded: false,
          feedback: 'Could not be auto-graded — flagged for instructor review.',
        };
      }
      return r;
    });

    const autoScore = allResults.reduce((sum, r) => sum + r.earned, 0);
    const totalPoints = quiz.totalPoints > 0 ? quiz.totalPoints : questions.reduce((sum, q) => sum + q.points, 0);
    const percentage = gradePercentage(autoScore, totalPoints);
    const letterGrade: LetterGrade = percentageToLetter(percentage);
    const fullyAutoGraded = essaysToGrade.length === 0 || !essayAiFailed;

    const created = await prisma.quizAttempt.create({
      data: {
        quizId: params.quizId,
        userId: user.id,
        answersJson: answers,
        score: autoScore,
        totalPoints,
        percentage,
        letterGrade,
        questionResultsJson: allResults as unknown as object,
        startedAt: new Date(),
        submittedAt: new Date(),
        autoGraded: fullyAutoGraded,
      },
    });

    // Sync the latest quiz result into the course gradebook.
    await syncGradebook(quiz.id, quiz.courseId, user.id, autoScore, totalPoints, percentage, letterGrade).catch(() => {});

    return ok(mapAttempt(created), 201);
  } catch (err: any) {
    return badRequest(err?.message || 'Invalid request body');
  }
}

async function syncGradebook(
  quizId: string,
  courseId: string,
  userId: string,
  score: number,
  total: number,
  percentage: number,
  letterGrade: LetterGrade,
): Promise<void> {
  const entry = await prisma.gradebookEntry.findUnique({
    where: { courseId_userId: { courseId, userId } },
  });

  const quizScores = Array.isArray(entry?.quizScoresJson) ? (entry!.quizScoresJson as Array<Record<string, unknown>>) : [];
  const existingIdx = quizScores.findIndex((q) => typeof q.quizId === 'string' && (q.quizId as string) === quizId);

  const nextQuizScores = [...quizScores];
  const upsert = { quizId, score, total, percentage, letterGrade };
  if (existingIdx >= 0) {
    nextQuizScores[existingIdx] = upsert;
  } else {
    nextQuizScores.push(upsert);
  }

  const assignmentScores = Array.isArray(entry?.assignmentScoresJson) ? (entry!.assignmentScoresJson as Array<Record<string, unknown>>) : [];
  const scores = [
    ...nextQuizScores.map((q) => (Number(q.total) ? (Number(q.score) / Number(q.total)) * 100 : Number(q.score) || 0)),
    ...assignmentScores.map((a) => (Number(a.total) ? (Number(a.score) / Number(a.total)) * 100 : Number(a.score) || 0)),
  ];
  if (entry && (entry.practicalScore ?? 0) > 0) scores.push(entry.practicalScore || 0);
  const overallPercentage = scores.length > 0 ? Math.round((scores.reduce((s, x) => s + x, 0) / scores.length) * 10) / 10 : percentage;
  const overallGrade = percentageToLetter(overallPercentage);

  await prisma.gradebookEntry.upsert({
    where: { courseId_userId: { courseId, userId } },
    update: {
      quizScoresJson: nextQuizScores as unknown as object,
      overallPercentage,
      letterGrade: overallGrade,
      lastUpdated: new Date(),
    },
    create: {
      courseId,
      userId,
      quizScoresJson: nextQuizScores as unknown as object,
      assignmentScoresJson: ([] as unknown as object),
      practicalScore: 0,
      overallPercentage,
      letterGrade: overallGrade,
    },
  });
}

export async function DELETE(request: NextRequest, { params }: { params: { quizId: string } }) {
  const user = await getSessionUser();
  if (!user) return forbid('Sign in required');
  if (!isAdminRole(user.roles) && !user.roles.includes('instructor')) {
    return forbid('Instructor access required');
  }

  const quiz = await prisma.quiz.findUnique({ where: { id: params.quizId } });
  if (!quiz) return notFound('Quiz not found');

  const course = await prisma.course.findUnique({ where: { id: quiz.courseId } });
  const canManage = isAdminRole(user.roles) || course?.instructorId === user.id;
  if (!canManage) return forbid('You do not have access to this quiz');

  await prisma.quizAttempt.deleteMany({ where: { quizId: params.quizId } });
  await prisma.quiz.delete({ where: { id: params.quizId } });

  return ok({ success: true });
}