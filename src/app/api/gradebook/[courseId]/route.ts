import { NextRequest } from 'next/server';
import { MOCK_GRADEBOOK, MOCK_USERS } from '@/lib/mock-data';
import { ok, notFound, badRequest, parseBody } from '@/lib/api-helpers';
import type { LetterGrade } from '@/types';

export async function GET(_req: NextRequest, { params }: { params: { courseId: string } }) {
  const entries = MOCK_GRADEBOOK
    .filter((e) => e.courseId === params.courseId)
    .map((e) => ({
      ...e,
      user: MOCK_USERS.find((u) => u.id === e.userId),
    }));

  return ok(entries);
}

export async function PATCH(request: NextRequest, { params }: { params: { courseId: string } }) {
  try {
    const body = await parseBody<{
      userId: string;
      practicalScore?: number;
      comments?: string;
      quizScores?: { quizId: string; score: number }[];
      assignmentScores?: { assignmentId: string; score: number; feedback?: string }[];
    }>(request);

    const entry = MOCK_GRADEBOOK.find((e) => e.courseId === params.courseId && e.userId === body.userId);
    if (!entry) return notFound('Gradebook entry not found');

    if (body.practicalScore !== undefined) entry.practicalScore = body.practicalScore;
    if (body.comments !== undefined) entry.comments = body.comments;
    if (body.quizScores) body.quizScores.forEach((qs) => { const existing = entry.quizScores.find((e) => e.quizId === qs.quizId); if (existing) { existing.score = qs.score; existing.percentage = (qs.score / 80) * 100; } });
    if (body.assignmentScores) body.assignmentScores.forEach((as) => { const existing = entry.assignmentScores.find((e) => e.assignmentId === as.assignmentId); if (existing) { existing.score = as.score; existing.percentage = (as.score / 100) * 100; } });

    const allScores = [...entry.quizScores.map((q) => q.percentage), ...entry.assignmentScores.map((a) => a.percentage), entry.practicalScore];
    entry.overallPercentage = Math.round(allScores.reduce((sum, s) => sum + s, 0) / allScores.length * 10) / 10;
    entry.letterGrade = percentageToLetter(entry.overallPercentage);
    entry.lastUpdated = new Date().toISOString();

    return ok(entry);
  } catch {
    return badRequest('Invalid request body');
  }
}

function percentageToLetter(pct: number): LetterGrade {
  if (pct >= 97) return 'A+';
  if (pct >= 93) return 'A';
  if (pct >= 90) return 'A-';
  if (pct >= 87) return 'B+';
  if (pct >= 83) return 'B';
  if (pct >= 80) return 'B-';
  if (pct >= 77) return 'C+';
  if (pct >= 73) return 'C';
  if (pct >= 70) return 'C-';
  if (pct >= 60) return 'D';
  return 'F';
}
