import { ok } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const me = await getSessionUser();
  if (!me) return ok({ messages: [], lastQuestion: null });

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get('limit')) || 20, 50);

  const rows = await prisma.chatMessage.findMany({
    where: { userId: me.id, sessionId: null },
    orderBy: { timestamp: 'desc' },
    take: limit,
  });

  const messages = rows
    .reverse()
    .map((m) => ({
      id: m.id,
      role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.content,
      timestamp: m.timestamp.toISOString(),
    }));

  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');

  return ok({
    messages,
    lastQuestion: lastUserMessage
      ? lastUserMessage.content.length > 200
        ? `${lastUserMessage.content.slice(0, 200)}…`
        : lastUserMessage.content
      : null,
  });
}