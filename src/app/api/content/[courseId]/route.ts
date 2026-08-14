import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, created, badRequest, notFound, forbid, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole, writeAuditLog } from '@/lib/security';
import { sanitizeInput } from '@/lib/validation';

const CONTENT_TYPES = ['video', 'document', 'assignment', 'scorm', 'quiz', 'discussion'];

async function canManageCourse(userId: string, roles: string[], courseId: string): Promise<boolean> {
  if (isAdminRole(roles)) return true;
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { instructorId: true } });
  return course?.instructorId === userId;
}

export async function GET(_req: NextRequest, { params }: { params: { courseId: string } }) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');

  const course = await prisma.course.findUnique({ where: { id: params.courseId } });
  if (!course) return forbid('Course not found');

  const sections = await prisma.lessonSection.findMany({
    orderBy: { order: 'asc' },
    include: {
      contents: {
        where: { courseId: params.courseId },
        orderBy: { order: 'asc' },
      },
    },
  });

  return ok({ sections, courseId: params.courseId });
}

export async function POST(request: NextRequest, { params }: { params: { courseId: string } }) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!(await canManageCourse(me.id, me.roles, params.courseId))) {
    return forbid('Only the course instructor or an admin can manage content');
  }

  const body = await parseBody<{
    kind?: 'section' | 'content';
    sectionId?: string;
    title?: string;
    type?: string;
    contentType?: string;
    duration?: string;
    order?: number;
    embedUrl?: string;
    fileUrl?: string;
    scormManifestUrl?: string;
  }>(request).catch(() => null);

  if (!body || !body.kind) return badRequest('kind is required');

  if (body.kind === 'section') {
    const title = sanitizeInput((body.title || '').trim()).slice(0, 200);
    if (!title) return badRequest('Section title is required');
    const maxOrder = await prisma.lessonSection.aggregate({ _max: { order: true } });
    const order = body.order ?? (maxOrder._max.order ?? 0) + 1;
    const section = await prisma.lessonSection.create({
      data: { title, order, contentType: body.contentType || 'video', duration: body.duration ? sanitizeInput(body.duration).slice(0, 50) : null },
    });
    await writeAuditLog({ userId: me.id, action: 'content.section.created', resourceType: 'lesson', resourceId: section.id });
    return created(section);
  }

  // kind === 'content'
  const title = sanitizeInput((body.title || '').trim()).slice(0, 300);
  if (!title) return badRequest('Content title is required');
  const sectionId = body.sectionId;
  if (!sectionId) return badRequest('sectionId is required');
  const section = await prisma.lessonSection.findUnique({ where: { id: sectionId } });
  if (!section) return badRequest('Section not found');
  const type = CONTENT_TYPES.includes(body.type ?? '') ? (body.type as string) : 'document';

  const sectionContents = await prisma.lessonContent.findMany({
    where: { sectionId, courseId: params.courseId },
    orderBy: { order: 'asc' },
  });
  const order = body.order ?? sectionContents.length + 1;

  const content = await prisma.lessonContent.create({
    data: {
      sectionId,
      courseId: params.courseId,
      title,
      type,
      order,
      duration: body.duration ? sanitizeInput(body.duration).slice(0, 50) : null,
      embedUrl: body.embedUrl ? sanitizeInput(body.embedUrl).slice(0, 1000) : null,
      fileUrl: body.fileUrl ? sanitizeInput(body.fileUrl).slice(0, 1000) : null,
      scormManifestUrl: body.scormManifestUrl ? sanitizeInput(body.scormManifestUrl).slice(0, 1000) : null,
    },
  });

  await writeAuditLog({ userId: me.id, action: 'content.item.created', resourceType: 'lesson', resourceId: content.id });
  return created(content);
}

export async function PATCH(request: NextRequest, { params }: { params: { courseId: string } }) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!(await canManageCourse(me.id, me.roles, params.courseId))) {
    return forbid('Only the course instructor or an admin can manage content');
  }

  const body = await parseBody<{
    kind?: 'section' | 'content';
    id?: string;
    title?: string;
    type?: string;
    contentType?: string;
    duration?: string;
    order?: number;
    embedUrl?: string;
    fileUrl?: string;
    scormManifestUrl?: string;
  }>(request).catch(() => null);

  if (!body || !body.kind || !body.id) return badRequest('kind and id are required');

  if (body.kind === 'section') {
    const data: { title?: string; order?: number; contentType?: string; duration?: string | null } = {};
    if (body.title !== undefined) data.title = sanitizeInput(body.title).slice(0, 200);
    if (body.order !== undefined) data.order = body.order;
    if (body.contentType !== undefined) data.contentType = body.contentType;
    if (body.duration !== undefined) data.duration = body.duration ? sanitizeInput(body.duration).slice(0, 50) : null;
    const section = await prisma.lessonSection.update({ where: { id: body.id }, data });
    return ok(section);
  }

  const data: {
    title?: string;
    type?: string;
    order?: number;
    duration?: string | null;
    embedUrl?: string | null;
    fileUrl?: string | null;
    scormManifestUrl?: string | null;
  } = {};
  if (body.title !== undefined) data.title = sanitizeInput(body.title).slice(0, 300);
  if (body.type !== undefined && CONTENT_TYPES.includes(body.type)) data.type = body.type;
  if (body.order !== undefined) data.order = body.order;
  if (body.duration !== undefined) data.duration = body.duration ? sanitizeInput(body.duration).slice(0, 50) : null;
  if (body.embedUrl !== undefined) data.embedUrl = body.embedUrl ? sanitizeInput(body.embedUrl).slice(0, 1000) : null;
  if (body.fileUrl !== undefined) data.fileUrl = body.fileUrl ? sanitizeInput(body.fileUrl).slice(0, 1000) : null;
  if (body.scormManifestUrl !== undefined) data.scormManifestUrl = body.scormManifestUrl ? sanitizeInput(body.scormManifestUrl).slice(0, 1000) : null;

  const content = await prisma.lessonContent.update({ where: { id: body.id }, data });
  return ok(content);
}

export async function DELETE(request: NextRequest, { params }: { params: { courseId: string } }) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!(await canManageCourse(me.id, me.roles, params.courseId))) {
    return forbid('Only the course instructor or an admin can manage content');
  }

  const body = await parseBody<{ kind?: 'section' | 'content'; id?: string }>(request).catch(() => null);
  if (!body || !body.kind || !body.id) return badRequest('kind and id are required');

  if (body.kind === 'section') {
    const existing = await prisma.lessonSection.findUnique({ where: { id: body.id } });
    if (!existing) return notFound('Section not found');
    await prisma.lessonSection.delete({ where: { id: body.id } });
    await writeAuditLog({ userId: me.id, action: 'content.section.deleted', resourceType: 'lesson', resourceId: body.id });
    return ok({ deleted: true });
  }

  const existing = await prisma.lessonContent.findUnique({ where: { id: body.id } });
  if (!existing) return notFound('Content not found');
  if (existing.courseId !== params.courseId) return badRequest('Content does not belong to this course');
  await prisma.lessonContent.delete({ where: { id: body.id } });
  await writeAuditLog({ userId: me.id, action: 'content.item.deleted', resourceType: 'lesson', resourceId: body.id });
  return ok({ deleted: true });
}
