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
    fileUrl?: string;
    fileKey?: string;
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

  return ok(submission);
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
