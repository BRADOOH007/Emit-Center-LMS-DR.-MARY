import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, forbid, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isRateLimited, writeAuditLog } from '@/lib/security';
import { sanitizeInput } from '@/lib/validation';

export async function GET(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');

  const messages = await prisma.directMessage.findMany({
    where: { OR: [{ senderId: me.id }, { receiverId: me.id }] },
    include: {
      sender: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
      receiver: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const threads = new Map<string, { id: string; participant: { id: string; fullName: string; email: string; avatarUrl: string | null }; messages: unknown[]; unread: number }>();

  messages.forEach((msg) => {
    const otherId = msg.senderId === me.id ? msg.receiverId : msg.senderId;
    if (!threads.has(otherId)) {
      const participant = msg.senderId === me.id ? msg.receiver : msg.sender;
      threads.set(otherId, {
        id: `mt_${otherId}`,
        participant,
        messages: [],
        unread: 0,
      });
    }
    const thread = threads.get(otherId)!;
    thread.messages.push(msg);
    if (!msg.isRead && msg.receiverId === me.id) thread.unread++;
  });

  const threadList = Array.from(threads.values()).sort(
    (a, b) => new Date((b.messages[0] as { createdAt: Date }).createdAt).getTime() - new Date((a.messages[0] as { createdAt: Date }).createdAt).getTime(),
  );

  return ok(threadList);
}

export async function POST(request: NextRequest) {
  if (isRateLimited(request)) return badRequest('Too many requests. Please try again later.');

  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');

  const body = await parseBody<{
    receiverId?: string;
    subject?: string;
    content?: string;
    parentStudentId?: string;
  }>(request).catch(() => null);

  if (!body?.receiverId || !body?.subject || !body?.content) {
    return badRequest('receiverId, subject, and content are required');
  }

  const receiver = await prisma.user.findUnique({ where: { id: body.receiverId } });
  if (!receiver) return badRequest('Recipient not found');

  const message = await prisma.directMessage.create({
    data: {
      senderId: me.id,
      receiverId: body.receiverId,
      subject: sanitizeInput(body.subject).slice(0, 200),
      content: sanitizeInput(body.content).slice(0, 5000),
      parentStudentId: body.parentStudentId ?? null,
    },
  });

  await prisma.notification.create({
    data: {
      userId: receiver.id,
      type: 'message',
      title: `New message from ${me.fullName}`,
      body: sanitizeInput(body.subject).slice(0, 200),
      actionUrl: '/messages',
    },
  });

  await writeAuditLog({
    userId: me.id,
    action: 'message.sent',
    resourceType: 'message',
    resourceId: message.id,
  });

  return ok(message);
}
