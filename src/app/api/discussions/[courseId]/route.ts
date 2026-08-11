import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, forbid, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { sanitizeInput } from '@/lib/validation';
import type { DiscussionThread, User } from '@/types';

function mapUser(row: { id: string; fullName: string; email: string; avatarUrl: string | null }): User {
  return {
    id: row.id,
    fullName: row.fullName,
    name: row.fullName,
    email: row.email,
    avatarUrl: row.avatarUrl ?? undefined,
    roles: [],
    activeRole: 'student',
    locale: 'en-US',
    timeZone: 'America/New_York',
    currency: 'USD',
  };
}

function mapThread(row: {
  id: string;
  courseId: string;
  unitId: string | null;
  title: string;
  content: string;
  authorId: string;
  isPinned: boolean;
  isEndorsed: boolean;
  isLocked: boolean;
  replyCount: number;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
  lastReplyAt: Date | null;
  author?: { id: string; fullName: string; email: string; avatarUrl: string | null } | null;
}): DiscussionThread {
  return {
    id: row.id,
    courseId: row.courseId,
    unitId: row.unitId ?? undefined,
    title: row.title,
    content: row.content,
    authorId: row.authorId,
    author: row.author ? mapUser(row.author) : undefined,
    isPinned: row.isPinned,
    isEndorsed: row.isEndorsed,
    isLocked: row.isLocked,
    replyCount: row.replyCount,
    viewCount: row.viewCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastReplyAt: row.lastReplyAt?.toISOString(),
  };
}

export async function GET(_req: NextRequest, { params }: { params: { courseId: string } }) {
  const threads = await prisma.discussionThread.findMany({
    where: { courseId: params.courseId },
    include: { author: { select: { id: true, fullName: true, email: true, avatarUrl: true } } },
  });

  const sorted = [...threads].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    const aTime = a.lastReplyAt ?? a.createdAt;
    const bTime = b.lastReplyAt ?? b.createdAt;
    return bTime.getTime() - aTime.getTime();
  });

  return ok(sorted.map(mapThread));
}

export async function POST(request: NextRequest, { params }: { params: { courseId: string } }) {
  const user = await getSessionUser();
  if (!user) return forbid('Sign in to start a thread');

  try {
    const body = await parseBody<{ title: string; content: string; unitId?: string }>(request);
    if (!body.title?.trim() || !body.content?.trim()) {
      return badRequest('title and content are required');
    }

    const now = new Date();
    const thread = await prisma.discussionThread.create({
      data: {
        courseId: params.courseId,
        unitId: body.unitId || null,
        title: sanitizeInput(body.title).slice(0, 200),
        content: sanitizeInput(body.content),
        authorId: user.id,
        isPinned: false,
        isEndorsed: false,
        isLocked: false,
        replyCount: 0,
        viewCount: 0,
        createdAt: now,
        updatedAt: now,
      },
      include: { author: { select: { id: true, fullName: true, email: true, avatarUrl: true } } },
    });

    return ok(mapThread(thread), 201);
  } catch {
    return badRequest('Invalid request body');
  }
}