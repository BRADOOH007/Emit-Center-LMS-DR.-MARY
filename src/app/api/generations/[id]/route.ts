import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, notFound, forbid } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole } from '@/lib/security';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!isAdminRole(me.roles) && !me.roles.includes('instructor')) {
    return forbid('Instructor access required');
  }

  const row = await prisma.aIGeneratedContent.findUnique({ where: { id: params.id } });
  if (!row) return notFound('Generation not found');
  if (row.userId !== me.id && !isAdminRole(me.roles)) {
    return forbid('You do not have access to this generation');
  }

  return ok({
    id: row.id,
    type: row.type,
    title: row.title,
    courseId: row.courseId,
    content: row.content,
    metadata: row.metadata,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!isAdminRole(me.roles) && !me.roles.includes('instructor')) {
    return forbid('Instructor access required');
  }

  const row = await prisma.aIGeneratedContent.findUnique({ where: { id: params.id } });
  if (!row) return notFound('Generation not found');
  if (row.userId !== me.id && !isAdminRole(me.roles)) {
    return forbid('You do not have access to this generation');
  }

  await prisma.aIGeneratedContent.delete({ where: { id: params.id } });
  return ok({ success: true });
}