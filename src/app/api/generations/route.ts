import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, forbid, badRequest } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole } from '@/lib/security';

const TYPES = ['exam', 'assignment', 'presentation'];

export async function GET(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!isAdminRole(me.roles) && !me.roles.includes('instructor')) {
    return forbid('Instructor access required');
  }

  const type = request.nextUrl.searchParams.get('type');
  const courseId = request.nextUrl.searchParams.get('courseId');
  const search = request.nextUrl.searchParams.get('search')?.toLowerCase().trim();

  const where: Record<string, unknown> = {
    userId: me.id,
    ...(type && TYPES.includes(type) ? { type } : {}),
    ...(courseId ? { courseId } : {}),
    ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
  };

  const rows = await prisma.aIGeneratedContent.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return ok(
    rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      courseId: row.courseId,
      metadata: row.metadata,
      createdAt: row.createdAt.toISOString(),
    })),
  );
}