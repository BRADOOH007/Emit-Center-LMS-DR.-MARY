import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, forbid, notFound, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { sanitizeInput, slugify } from '@/lib/validation';
import type { LiveSession, Recording } from '@/types';

function parseJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

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
    agenda: parseJsonArray<string>(row.agendaJson),
    status: row.status as LiveSession['status'],
    scheduledStart: row.scheduledStart.toISOString(),
    scheduledEnd: row.scheduledEnd.toISOString(),
    recordings: parseJsonArray<Recording>(row.recordingsJson),
  };
}

const CREATOR_ROLES = ['super_admin', 'administrator', 'instructor'];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const courseId = searchParams.get('courseId');

  const sessions = await prisma.liveSession.findMany({
    where: courseId ? { courseId } : undefined,
    orderBy: { scheduledStart: 'asc' },
  });

  return ok({ liveSessions: sessions.map(mapLiveSession) });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return forbid('Sign in to create a live session');
  if (!CREATOR_ROLES.includes(user.activeRole)) {
    return forbid('Only instructors and administrators can create live sessions');
  }

  try {
    const body = await parseBody<{
      courseId: string;
      title: string;
      platform: 'zoom' | 'google_meet' | 'teams' | 'jitsi';
      joinUrl?: string;
      hostKey?: string;
      scheduledStart: string;
      scheduledEnd: string;
      agenda?: string[];
    }>(request);

    if (!body.courseId || !body.title || !body.scheduledStart || !body.scheduledEnd) {
      return badRequest('courseId, title, scheduledStart, and scheduledEnd are required');
    }

    const course = await prisma.course.findUnique({ where: { id: body.courseId } });
    if (!course) return notFound('Course not found');

    const platform = ['zoom', 'google_meet', 'teams', 'jitsi'].includes(body.platform) ? body.platform : 'zoom';
    let joinUrl = sanitizeInput(body.joinUrl ?? '');
    if (!joinUrl) {
      if (platform === 'jitsi') {
        joinUrl = `https://meet.jit.si/emit-${slugify(body.title)}-${Date.now().toString(36)}`;
      } else if (platform === 'google_meet') {
        joinUrl = `https://meet.google.com/new`;
      } else {
        joinUrl = `https://zoom.us/j/emit-${slugify(body.title)}`;
      }
    }
    if (!/^https?:\/\//.test(joinUrl)) joinUrl = `https://${joinUrl}`;

    const agenda = Array.isArray(body.agenda) ? body.agenda.filter((a) => a.trim()).slice(0, 12) : [];

    const created = await prisma.liveSession.create({
      data: {
        courseId: body.courseId,
        title: sanitizeInput(body.title),
        platform,
        joinUrl,
        hostKey: body.hostKey ? sanitizeInput(body.hostKey) : null,
        status: 'upcoming',
        scheduledStart: new Date(body.scheduledStart),
        scheduledEnd: new Date(body.scheduledEnd),
        agendaJson: agenda,
      },
    });

    return ok(mapLiveSession(created), 201);
  } catch {
    return badRequest('Invalid request body');
  }
}