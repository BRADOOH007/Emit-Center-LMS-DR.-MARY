import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, notFound, badRequest, forbid, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { sanitizeInput } from '@/lib/validation';
import type { DiscussionThread, DiscussionReply, User } from '@/types';

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

function mapReply(row: {
  id: string;
  threadId: string;
  content: string;
  authorId: string;
  isModeratorReply: boolean;
  isEndorsed: boolean;
  createdAt: Date;
  author?: { id: string; fullName: string; email: string; avatarUrl: string | null } | null;
}): DiscussionReply {
  return {
    id: row.id,
    threadId: row.threadId,
    content: row.content,
    authorId: row.authorId,
    author: row.author ? mapUser(row.author) : undefined,
    isModeratorReply: row.isModeratorReply,
    isEndorsed: row.isEndorsed,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function GET(_req: NextRequest, { params }: { params: { courseId: string; threadId: string } }) {
  const thread = await prisma.discussionThread.findFirst({
    where: { id: params.threadId, courseId: params.courseId },
    include: { author: { select: { id: true, fullName: true, email: true, avatarUrl: true } } },
  });
  if (!thread) return notFound('Thread not found');

  await prisma.discussionThread.update({
    where: { id: thread.id },
    data: { viewCount: { increment: 1 } },
  });

  const replies = await prisma.discussionReply.findMany({
    where: { threadId: params.threadId },
    include: { author: { select: { id: true, fullName: true, email: true, avatarUrl: true } } },
    orderBy: { createdAt: 'asc' },
  });

  const enriched = { ...thread, viewCount: thread.viewCount + 1 };
  return ok({ thread: mapThread(enriched), replies: replies.map(mapReply) });
}

export async function POST(request: NextRequest, { params }: { params: { courseId: string; threadId: string } }) {
  const thread = await prisma.discussionThread.findFirst({
    where: { id: params.threadId, courseId: params.courseId },
  });
  if (!thread) return notFound('Thread not found');
  if (thread.isLocked) return badRequest('This thread is locked');

  const user = await getSessionUser();
  if (!user) return forbid('Sign in to reply');

  try {
    const body = await parseBody<{ content: string }>(request);
    if (!body.content?.trim()) return badRequest('content is required');

    const isModeratorReply = ['super_admin', 'administrator', 'instructor'].includes(user.activeRole);

    const created = await prisma.discussionReply.create({
      data: {
        threadId: params.threadId,
        content: sanitizeInput(body.content),
        authorId: user.id,
        isModeratorReply,
        isEndorsed: false,
      },
      include: { author: { select: { id: true, fullName: true, email: true, avatarUrl: true } } },
    });

    await prisma.discussionThread.update({
      where: { id: params.threadId },
      data: { replyCount: { increment: 1 }, lastReplyAt: new Date(), updatedAt: new Date() },
    });

    return ok(mapReply(created), 201);
  } catch {
    return badRequest('Invalid request body');
  }
}