import { NextRequest } from 'next/server';
import { MOCK_DIRECT_MESSAGES, MOCK_USERS } from '@/lib/mock-data';
import { ok, badRequest, parseBody } from '@/lib/api-helpers';
import { generateId } from '@/lib/validation';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const userId = searchParams.get('userId') ?? 'usr_0001';

  const messages = MOCK_DIRECT_MESSAGES
    .filter((m) => m.senderId === userId || m.receiverId === userId)
    .map((m) => ({
      ...m,
      sender: MOCK_USERS.find((u) => u.id === m.senderId),
      receiver: MOCK_USERS.find((u) => u.id === m.receiverId),
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const threads = new Map<string, { id: string; participant: typeof MOCK_USERS[0]; messages: typeof messages; unread: number }>();

  messages.forEach((msg) => {
    const otherId = msg.senderId === userId ? msg.receiverId : msg.senderId;
    if (!threads.has(otherId)) {
      const participant = (MOCK_USERS.find((u) => u.id === otherId) ?? msg.sender ?? msg.receiver)!;
      threads.set(otherId, {
        id: `mt_${otherId}`,
        participant,
        messages: [],
        unread: 0,
      });
    }
    const thread = threads.get(otherId)!;
    thread.messages.push(msg);
    if (!msg.isRead && msg.receiverId === userId) thread.unread++;
  });

  const threadList = Array.from(threads.values())
    .sort((a, b) => new Date(b.messages[0].createdAt).getTime() - new Date(a.messages[0].createdAt).getTime());

  return ok(threadList);
}

export async function POST(request: NextRequest) {
  try {
    const body = await parseBody<{
      senderId: string;
      receiverId: string;
      subject: string;
      content: string;
      parentStudentId?: string;
    }>(request);
    if (!body.senderId || !body.receiverId || !body.subject || !body.content) {
      return badRequest('senderId, receiverId, subject, and content are required');
    }

    const message = {
      id: generateId('msg'),
      senderId: body.senderId,
      receiverId: body.receiverId,
      subject: body.subject,
      content: body.content,
      parentStudentId: body.parentStudentId,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    MOCK_DIRECT_MESSAGES.push(message);
    return ok(message);
  } catch {
    return badRequest('Invalid request body');
  }
}
