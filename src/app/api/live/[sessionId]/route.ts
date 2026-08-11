import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, notFound, badRequest, forbid, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { sanitizeInput } from '@/lib/validation';
import type { LiveSession, ChatMessage } from '@/types';

function mapLiveSession(row: {
  id: string;
  courseId: string;
  title: string;
  platform: string;
  joinUrl: string;
  hostKey: string | null;
  status: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  agendaJson: unknown;
  recordingsJson: unknown;
}): LiveSession {
  return {
    id: row.id,
    courseId: row.courseId,
    title: row.title,
    platform: row.platform as LiveSession['platform'],
    joinUrl: row.joinUrl,
    hostKey: row.hostKey ?? undefined,
    agenda: (row.agendaJson as string[]) ?? [],
    status: row.status as LiveSession['status'],
    scheduledStart: row.scheduledStart.toISOString(),
    scheduledEnd: row.scheduledEnd.toISOString(),
    recordings: (row.recordingsJson as LiveSession['recordings']) ?? [],
  };
}

function mapChatMessage(row: { id: string; userId: string; userName: string; content: string; timestamp: Date }): ChatMessage {
  return {
    id: row.id,
    userId: row.userId,
    userName: row.userName,
    content: row.content,
    timestamp: row.timestamp.toISOString(),
  };
}

export async function GET(_req: NextRequest, { params }: { params: { sessionId: string } }) {
  const session = await prisma.liveSession.findUnique({ where: { id: params.sessionId } });
  if (!session) return notFound('Live session not found');

  const messages = await prisma.chatMessage.findMany({
    where: { sessionId: params.sessionId },
    orderBy: { timestamp: 'asc' },
  });

  return ok({ ...mapLiveSession(session), messages: messages.map(mapChatMessage) });
}

export async function POST(request: NextRequest, { params }: { params: { sessionId: string } }) {
  const session = await prisma.liveSession.findUnique({ where: { id: params.sessionId } });
  if (!session) return notFound('Live session not found');

  const user = await getSessionUser();
  if (!user) return forbid('Sign in to join the conversation');

  try {
    const body = await parseBody<{ content: string }>(request);
    if (!body.content?.trim()) return badRequest('content is required');

    const created = await prisma.chatMessage.create({
      data: {
        sessionId: params.sessionId,
        userId: user.id,
        userName: user.fullName,
        content: sanitizeInput(body.content).slice(0, 2000),
      },
    });

    return ok(mapChatMessage(created), 201);
  } catch {
    return badRequest('Invalid request body');
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { sessionId: string } }) {
  const session = await prisma.liveSession.findUnique({ where: { id: params.sessionId } });
  if (!session) return notFound('Live session not found');

  try {
    const body = await parseBody<{ status?: string }>(request);
    const status = body.status;
    if (!status || !['upcoming', 'live', 'ended'].includes(status)) {
      return badRequest('status must be upcoming, live, or ended');
    }

    const updated = await prisma.liveSession.update({
      where: { id: params.sessionId },
      data: { status },
    });

    return ok(mapLiveSession(updated));
  } catch {
    return badRequest('Invalid request body');
  }
}