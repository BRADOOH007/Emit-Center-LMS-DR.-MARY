import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, forbid, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isRateLimited, writeAuditLog } from '@/lib/security';
import { sanitizeInput } from '@/lib/validation';

export async function GET(_req: NextRequest, { params }: { params: { courseId: string } }) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');

  const assignments = await prisma.assignment.findMany({
    where: { courseId: params.courseId },
    orderBy: { dueDate: 'asc' },
  });

  const submissions = await prisma.submission.findMany({
    where: { assignment: { courseId: params.courseId } },
    include: { user: { select: { id: true, fullName: true, email: true } } },
  });

  return ok({
    assignments: assignments.map((a) => ({
      id: a.id,
      courseId: a.courseId,
      title: a.title,
      description: a.description,
      dueDate: a.dueDate.toISOString(),
      points: a.points,
      allowedFormats: JSON.parse(a.allowedFormats as unknown as string),
      isPublished: a.isPublished,
      createdAt: a.createdAt.toISOString(),
      submissions: submissions.filter((s) => s.assignmentId === a.id),
    })),
  });
}

export async function POST(request: NextRequest) {
  if (isRateLimited(request)) return badRequest('Too many requests. Please try again later.');

  const me = await getSessionUser();
  if (!me) return forbid('Sign in to submit');

  const body = await parseBody<{
    assignmentId?: string;
    fileName?: string;
    fileSize?: number;
    textAnswer?: string;
  }>(request).catch(() => null);

  if (!body?.assignmentId) return badRequest('assignmentId is required');

  const assignment = await prisma.assignment.findUnique({ where: { id: body.assignmentId } });
  if (!assignment) return badRequest('Assignment not found');

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: me.id, courseId: assignment.courseId } },
  });
  if (!enrollment || enrollment.status !== 'active') {
    return forbid('You must be enrolled in this course to submit');
  }

  const submission = await prisma.submission.upsert({
    where: { assignmentId_userId: { assignmentId: assignment.id, userId: me.id } },
    update: {
      fileName: sanitizeInput(body.fileName ?? '').slice(0, 255) || 'text-submission.txt',
      fileSize: body.fileSize ?? 0,
      status: 'submitted',
      submittedAt: new Date(),
      score: null,
      feedback: null,
      letterGrade: null,
    },
    create: {
      assignmentId: assignment.id,
      userId: me.id,
      fileName: sanitizeInput(body.fileName ?? '').slice(0, 255) || 'text-submission.txt',
      fileSize: body.fileSize ?? 0,
      status: 'submitted',
    },
  });

  await writeAuditLog({
    userId: me.id,
    action: 'submission.created',
    resourceType: 'assignment',
    resourceId: assignment.id,
  });

  return ok(submission);
}
