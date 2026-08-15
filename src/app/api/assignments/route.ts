import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, created, badRequest, forbid, serverError } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole } from '@/lib/security';
import { sanitizeInput } from '@/lib/validation';
import { writeAuditLog } from '@/lib/security';
import type { AssignmentQuestion } from '@/types';
import type { Prisma } from '@prisma/client';

export async function POST(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!isAdminRole(me.roles) && !me.roles.includes('instructor')) {
    return forbid('Instructor access required');
  }

  let body: {
    courseId: string;
    title?: string;
    description?: string;
    dueDate?: string;
    points?: number;
    allowedFormats?: string[];
    isPublished?: boolean;
    questions?: AssignmentQuestion[];
  };
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  if (!body.courseId) return badRequest('courseId is required');

  const course = await prisma.course.findUnique({ where: { id: body.courseId } });
  if (!course) return badRequest('Course not found');
  const canManage = isAdminRole(me.roles) || course.instructorId === me.id;
  if (!canManage) return forbid('Instructor access required');

  const title = sanitizeInput((body.title || '').trim());
  if (!title) return badRequest('Title is required');

  const description = sanitizeInput((body.description || '').trim());
  const points = Number.isFinite(Number(body.points)) && Number(body.points) > 0 ? Math.round(Number(body.points)) : 100;
  const dueDate = body.dueDate && !Number.isNaN(Date.parse(body.dueDate)) ? new Date(body.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const allowedFormats = Array.isArray(body.allowedFormats)
    ? body.allowedFormats.filter((f) => String(f).trim())
    : ['pdf', 'doc', 'docx', 'zip'];

  const questions = Array.isArray(body.questions)
    ? body.questions.filter((q) => q && typeof q.question === 'string' && q.question.trim()).slice(0, 12)
    : [];

  const questionPoints = questions.reduce((sum, q) => sum + (Number.isFinite(Number(q.points)) && Number(q.points) > 0 ? Math.round(Number(q.points)) : 0), 0);

  try {
    const assignment = await prisma.assignment.create({
      data: {
        courseId: body.courseId,
        title,
        description,
        dueDate,
        points: questionPoints > 0 ? questionPoints : points,
        allowedFormats: questions.length > 0 ? (['quiz'] as unknown as Prisma.InputJsonValue) : (allowedFormats as unknown as Prisma.InputJsonValue),
        isPublished: body.isPublished !== false,
        questionsJson: questions.length > 0 ? (questions as unknown as Prisma.InputJsonValue) : undefined,
        questionCount: questions.length,
      },
    });

    writeAuditLog({
      userId: me.id,
      action: 'assignment.created',
      resourceType: 'assignment',
      resourceId: assignment.id,
    }).catch(() => {});

    return created({ id: assignment.id, courseId: assignment.courseId, title: assignment.title, questionCount: assignment.questionCount });
  } catch (err: any) {
    return serverError(err?.message || 'Failed to create assignment');
  }
}