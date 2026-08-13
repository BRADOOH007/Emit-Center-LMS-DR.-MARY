import { ok } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const me = await getSessionUser();
  if (!me) return ok({ messages: [] });

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get('limit')) || 20, 50);

  const rows = await prisma.chatMessage.findMany({
    where: { userId: me.id },
    orderBy: { timestamp: 'desc' },
    take: limit,
  });

  const messages = rows
    .reverse()
    .map((m) => ({ id: m.id, role: 'user' as const, content: m.content, timestamp: m.timestamp.toISOString() }));

  return ok({ messages });
}