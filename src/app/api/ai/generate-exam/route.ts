import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, forbid, serverError } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole } from '@/lib/security';
import { checkAIUsageAllowed, recordAIUsage } from '@/lib/ai-usage';
import { generateExam, type ExamGenerationParams } from '@/lib/exam-generator';

export async function POST(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!isAdminRole(me.roles) && !me.roles.includes('instructor')) {
    return forbid('Instructor access required');
  }

  let body: ExamGenerationParams & { courseId?: string; subjectExtra?: string };
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const { courseId, ...genParams } = body;

  if (courseId) {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return badRequest('Course not found');
    const canManage = isAdminRole(me.roles) || course.instructorId === me.id;
    if (!canManage) return forbid('You do not have access to this course');
    genParams.supportingContext = `${course.title} — ${course.subject}`;
    if (!genParams.subject || !genParams.subject.trim()) genParams.subject = course.subject;
  }

  const usage = await checkAIUsageAllowed(me.id);
  if (!usage.allowed) return badRequest(usage.reason ?? 'AI usage limit reached');

  try {
    const exam = await generateExam(genParams);
    if (me.roles.includes('instructor') || isAdminRole(me.roles)) {
      recordAIUsage(me.id, 1500).catch(() => {});
    }

    const saved = await prisma.aIGeneratedContent.create({
      data: {
        userId: me.id,
        courseId: courseId ?? null,
        type: 'exam',
        title: exam.title,
        content: exam as unknown as object,
        metadata: {
          subject: genParams.subject,
          topic: genParams.topic,
          grade: genParams.grade ?? null,
          difficulty: genParams.difficulty ?? 'medium',
          totalPoints: exam.totalPoints,
          questionCount: exam.questions.length,
        },
      },
    });

    return ok({ exam, generationId: saved.id });
  } catch (err: any) {
    return serverError(err?.message || 'Failed to generate exam');
  }
}