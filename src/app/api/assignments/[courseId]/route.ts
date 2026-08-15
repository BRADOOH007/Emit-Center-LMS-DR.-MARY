import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { ok, badRequest, forbid, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isRateLimited, writeAuditLog, isAdminRole } from '@/lib/security';
import { sanitizeInput } from '@/lib/validation';
import { gradeEssays } from '@/lib/exam-grading';
import { percentageToLetter } from '@/lib/grading';
import type { AssignmentQuestion, AssignmentQuestionResult, LetterGrade } from '@/types';

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

function normalize(value: string): string {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?'"()]/g, '');
}

function serializeSubmission(row: {
  id: string;
  assignmentId: string;
  userId: string;
  fileName: string;
  fileSize: number;
  fileUrl: string | null;
  fileKey: string | null;
  submittedAt: Date;
  score: number | null;
  feedback: string | null;
  letterGrade: string | null;
  status: string;
  answersJson: unknown;
  autoGraded: boolean;
  gradedAt: Date | null;
}) {
  return {
    id: row.id,
    assignmentId: row.assignmentId,
    userId: row.userId,
    fileName: row.fileName,
    fileSize: row.fileSize,
    fileUrl: row.fileUrl,
    fileKey: row.fileKey,
    submittedAt: row.submittedAt.toISOString(),
    score: row.score,
    feedback: row.feedback,
    letterGrade: row.letterGrade,
    status: row.status,
    answers: toArray<AssignmentQuestionResult>(row.answersJson),
    autoGraded: row.autoGraded,
    gradedAt: row.gradedAt?.toISOString() ?? null,
  };
}

function serializeQuestions(questions: AssignmentQuestion[], stripAnswers: boolean): AssignmentQuestion[] {
  if (stripAnswers) {
    return questions.map((q) => ({
      id: q.id,
      question: q.question,
      type: q.type,
      options: q.options,
      points: q.points,
    }));
  }
  return questions;
}

export async function GET(_req: NextRequest, { params }: { params: { courseId: string } }) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');

  const course = await prisma.course.findUnique({ where: { id: params.courseId } });
  if (!course) return badRequest('Course not found');

  const isStaff = isAdminRole(me.roles) || me.roles.includes('instructor') || course.instructorId === me.id;

  if (!isStaff) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: me.id, courseId: params.courseId } },
      select: { status: true },
    });
    if (!enrollment || (enrollment.status !== 'active' && enrollment.status !== 'completed')) {
      return forbid('You must be enrolled in this course to access its assignments');
    }
  }

  const [assignments, submissions] = await Promise.all([
    prisma.assignment.findMany({
      where: { courseId: params.courseId },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.submission.findMany({
      where: isStaff
        ? { assignment: { courseId: params.courseId } }
        : { assignment: { courseId: params.courseId }, userId: me.id },
      include: { user: { select: { id: true, fullName: true, email: true } } },
    }),
  ]);

  const now = Date.now();
  const nowIso = new Date().toISOString();

  return ok({
    assignments: assignments.map((a) => {
      const questions = toArray<AssignmentQuestion>(a.questionsJson);
      const own = submissions.filter((s) => s.assignmentId === a.id && s.userId === me.id)[0];
      return {
        id: a.id,
        courseId: a.courseId,
        title: a.title,
        description: a.description,
        dueDate: a.dueDate.toISOString(),
        points: a.points,
        allowedFormats: toArray<string>(a.allowedFormats),
        isPublished: a.isPublished,
        createdAt: a.createdAt.toISOString(),
        questionCount: a.questionCount,
        questions: questions.length > 0 ? serializeQuestions(questions, !isStaff) : undefined,
        pastDue: new Date(a.dueDate).getTime() < now,
        now: nowIso,
        submissions: isStaff ? submissions.filter((s) => s.assignmentId === a.id) : undefined,
        mySubmission: own ? serializeSubmission(own) : null,
      };
    }),
  });
}

export async function POST(request: NextRequest, { params }: { params: { courseId: string } }) {
  if (isRateLimited(request)) return badRequest('Too many requests. Please try again later.');

  const me = await getSessionUser();
  if (!me) return forbid('Sign in to submit');

  const body = await parseBody<{
    assignmentId?: string;
    answers?: { questionId?: string; answer?: string }[];
    fileName?: string;
    fileSize?: number;
    fileUrl?: string;
    fileKey?: string;
    textAnswer?: string;
  }>(request).catch(() => null);

  if (!body?.assignmentId) return badRequest('assignmentId is required');

  const assignment = await prisma.assignment.findUnique({ where: { id: body.assignmentId } });
  if (!assignment) return badRequest('Assignment not found');
  if (assignment.courseId !== params.courseId) return badRequest('Assignment does not belong to this course');

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: me.id, courseId: assignment.courseId } },
  });
  if (!enrollment || enrollment.status !== 'active') {
    return forbid('You must be enrolled in this course to submit');
  }

  const now = Date.now();
  const dueTime = new Date(assignment.dueDate).getTime();
  if (dueTime < now) {
    return badRequest('This assignment is past due and can no longer be submitted.');
  }

  const questions = toArray<AssignmentQuestion>(assignment.questionsJson);

  // ── Legacy file-upload submissions for assignments without questions ──
  if (questions.length === 0) {
    const fileName = sanitizeInput(body.fileName ?? '').slice(0, 255) || 'text-submission.txt';

    const submission = await prisma.submission.upsert({
      where: { assignmentId_userId: { assignmentId: assignment.id, userId: me.id } },
      update: {
        fileName,
        fileSize: body.fileSize ?? 0,
        fileUrl: body.fileUrl ?? null,
        fileKey: body.fileKey ?? null,
        status: 'submitted',
        submittedAt: new Date(),
        score: null,
        feedback: null,
        letterGrade: null,
        answersJson: Prisma.JsonNull,
        autoGraded: false,
        gradedAt: null,
      },
      create: {
        assignmentId: assignment.id,
        userId: me.id,
        fileName,
        fileSize: body.fileSize ?? 0,
        fileUrl: body.fileUrl ?? null,
        fileKey: body.fileKey ?? null,
        status: 'submitted',
      },
    });

    await writeAuditLog({
      userId: me.id,
      action: 'submission.created',
      resourceType: 'assignment',
      resourceId: assignment.id,
    });

    return ok(serializeSubmission(submission));
  }

  // ── Quiz-style assignment: grade the answers ──
  const answers = Array.isArray(body.answers) ? body.answers : [];
  const answerMap = new Map<string, string>();
  for (const a of answers) {
    if (a?.questionId && typeof a.answer === 'string') answerMap.set(a.questionId, a.answer.trim());
  }

  const results: AssignmentQuestionResult[] = [];
  const shortToGrade: { questionId: string; question: string; yourAnswer: string; modelAnswer?: string; points: number }[] = [];

  for (const q of questions) {
    const yourAnswer = answerMap.get(q.id) ?? '';
    const base: AssignmentQuestionResult = {
      questionId: q.id,
      type: q.type,
      question: q.question,
      points: q.points,
      earned: 0,
      yourAnswer,
      correctAnswer: q.correctAnswer,
      modelAnswer: q.modelAnswer,
      explanation: q.explanation,
      correct: false,
      aiGraded: false,
    };

    if (q.type === 'mcq') {
      const expected = normalize(q.correctAnswer ?? '');
      const given = normalize(yourAnswer);
      const correct = Boolean(expected && given === expected);
      base.earned = correct ? q.points : 0;
      base.correct = correct;
      if (!correct && q.explanation) base.feedback = q.explanation;
    } else {
      if (yourAnswer) {
        shortToGrade.push({
          questionId: q.id,
          question: q.question,
          yourAnswer,
          modelAnswer: q.modelAnswer ?? q.correctAnswer,
          points: q.points,
        });
      } else {
        base.feedback = 'No answer provided.';
      }
    }
    results.push(base);
  }

  let shortGrades: Record<string, { earned: number; feedback: string }> = {};
  let shortAiFailed = false;
  if (shortToGrade.length > 0) {
    try {
      const graded = await gradeEssays(shortToGrade);
      for (const g of graded) {
        shortGrades[g.questionId] = { earned: g.earned, feedback: g.feedback };
      }
      if (graded.length < shortToGrade.length) shortAiFailed = true;
    } catch {
      shortAiFailed = true;
    }
  }

  const finalResults: AssignmentQuestionResult[] = results.map((r) => {
    if (r.type === 'short') {
      const grade = shortGrades[r.questionId];
      if (grade) {
        return {
          ...r,
          earned: grade.earned,
          correct: grade.earned >= r.points * 0.6,
          aiGraded: true,
          feedback: grade.feedback || r.explanation,
        };
      }
      return { ...r, earned: 0, correct: false, aiGraded: false, feedback: r.feedback || 'Could not be auto-graded — flagged for review.' };
    }
    return r;
  });

  const score = finalResults.reduce((s, r) => s + r.earned, 0);
  const totalPoints = assignment.points > 0 ? assignment.points : questions.reduce((s, q) => s + q.points, 0);
  const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 1000) / 10 : 0;
  const letterGrade: LetterGrade = percentageToLetter(percentage);
  const autoGraded = shortToGrade.length === 0 || !shortAiFailed;

  const summary = `Scored ${score}/${totalPoints} (${percentage}%, ${letterGrade})${
    autoGraded ? '' : ' — some answers need instructor review.'
  }`;

  const submission = await prisma.submission.upsert({
    where: { assignmentId_userId: { assignmentId: assignment.id, userId: me.id } },
    update: {
      fileName: 'online-assignment-submission.txt',
      fileSize: 0,
      fileUrl: null,
      fileKey: null,
      status: 'graded',
      submittedAt: new Date(),
      score,
      feedback: summary,
      letterGrade,
      answersJson: finalResults as unknown as object,
      autoGraded,
      gradedAt: new Date(),
    },
    create: {
      assignmentId: assignment.id,
      userId: me.id,
      fileName: 'online-assignment-submission.txt',
      fileSize: 0,
      status: 'graded',
      submittedAt: new Date(),
      score,
      feedback: summary,
      letterGrade,
      answersJson: finalResults as unknown as object,
      autoGraded,
      gradedAt: new Date(),
    },
  });

  await writeAuditLog({
    userId: me.id,
    action: 'submission.graded',
    resourceType: 'assignment',
    resourceId: assignment.id,
  });

  await syncGradebook(assignment.id, assignment.courseId, me.id, score, totalPoints, percentage, letterGrade).catch(() => {});

  return ok({
    ...serializeSubmission(submission),
    percentage,
    totalPoints,
  });
}

async function syncGradebook(
  assignmentId: string,
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

  const assignmentScores = Array.isArray(entry?.assignmentScoresJson) ? (entry!.assignmentScoresJson as Array<Record<string, unknown>>) : [];
  const existingIdx = assignmentScores.findIndex((a) => typeof a.assignmentId === 'string' && (a.assignmentId as string) === assignmentId);

  const nextAssignmentScores = [...assignmentScores];
  const upsert = { assignmentId, score, total, percentage, letterGrade };
  if (existingIdx >= 0) {
    nextAssignmentScores[existingIdx] = upsert;
  } else {
    nextAssignmentScores.push(upsert);
  }

  const quizScores = Array.isArray(entry?.quizScoresJson) ? (entry!.quizScoresJson as Array<Record<string, unknown>>) : [];
  const scores = [
    ...quizScores.map((q) => (Number(q.total) ? (Number(q.score) / Number(q.total)) * 100 : Number(q.score) || 0)),
    ...nextAssignmentScores.map((a) => (Number(a.total) ? (Number(a.score) / Number(a.total)) * 100 : Number(a.score) || 0)),
  ];
  if (entry) scores.push(entry.practicalScore || 0);
  const overallPercentage = scores.length > 0 ? Math.round((scores.reduce((s, x) => s + x, 0) / scores.length) * 10) / 10 : percentage;
  const overallGrade = percentageToLetter(overallPercentage);

  await prisma.gradebookEntry.upsert({
    where: { courseId_userId: { courseId, userId } },
    update: {
      assignmentScoresJson: nextAssignmentScores as unknown as object,
      overallPercentage,
      letterGrade: overallGrade,
      lastUpdated: new Date(),
    },
    create: {
      courseId,
      userId,
      quizScoresJson: ([] as unknown as object),
      assignmentScoresJson: nextAssignmentScores as unknown as object,
      practicalScore: 0,
      overallPercentage,
      letterGrade: overallGrade,
    },
  });
}

export async function DELETE(request: NextRequest, { params }: { params: { courseId: string } }) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!me.roles.some((r) => r === 'administrator' || r === 'instructor' || r === 'super_admin')) {
    return forbid('Only instructors and admins can delete assignments');
  }

  const body = await parseBody<{ assignmentId?: string }>(request).catch(() => null);
  if (!body?.assignmentId) return badRequest('assignmentId is required');

  const assignment = await prisma.assignment.findUnique({ where: { id: body.assignmentId } });
  if (!assignment) return badRequest('Assignment not found');
  if (assignment.courseId !== params.courseId) return badRequest('Assignment does not belong to this course');

  const course = await prisma.course.findUnique({ where: { id: params.courseId }, select: { instructorId: true } });
  const isOwner = me.roles.includes('administrator') || me.roles.includes('super_admin') || course?.instructorId === me.id;
  if (!isOwner) return forbid('You do not have permission to delete this assignment');

  await prisma.assignment.delete({ where: { id: body.assignmentId } });

  await writeAuditLog({
    userId: me.id,
    action: 'assignment.deleted',
    resourceType: 'assignment',
    resourceId: body.assignmentId,
  });

  return ok({ success: true });
}
