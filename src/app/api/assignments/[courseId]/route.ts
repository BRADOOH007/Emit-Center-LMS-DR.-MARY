import { NextRequest } from 'next/server';
import { MOCK_ASSIGNMENTS, MOCK_SUBMISSIONS, MOCK_RUBRICS } from '@/lib/mock-data';
import { ok, badRequest, parseBody } from '@/lib/api-helpers';
import { generateId } from '@/lib/validation';

export async function GET(_req: NextRequest, { params }: { params: { courseId: string } }) {
  const assignments = MOCK_ASSIGNMENTS.filter((a) => a.courseId === params.courseId);
  const submissions = MOCK_SUBMISSIONS;
  const rubrics = MOCK_RUBRICS;

  return ok({
    assignments: assignments.map((a) => ({
      ...a,
      rubric: rubrics.find((r) => r.assignmentId === a.id),
      submissions: submissions.filter((s) => s.assignmentId === a.id),
    })),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await parseBody<{
      assignmentId: string;
      userId: string;
      fileName?: string;
      fileSize?: number;
      textAnswer?: string;
    }>(request);
    if (!body.assignmentId || !body.userId) return badRequest('assignmentId and userId are required');

    const submission = {
      id: generateId('sub'),
      assignmentId: body.assignmentId,
      userId: body.userId,
      fileName: body.fileName,
      fileSize: body.fileSize,
      textAnswer: body.textAnswer,
      submittedAt: new Date().toISOString(),
      status: 'submitted' as const,
    };

    MOCK_SUBMISSIONS.push(submission);
    return ok(submission);
  } catch {
    return badRequest('Invalid request body');
  }
}
