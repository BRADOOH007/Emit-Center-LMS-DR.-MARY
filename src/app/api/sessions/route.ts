import { NextRequest } from 'next/server';
import { MOCK_SESSIONS, MOCK_ROOMS, MOCK_USERS, MOCK_COURSES } from '@/lib/mock-data';
import { ok } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const courseId = searchParams.get('courseId');
  const format = searchParams.get('format');
  const date = searchParams.get('date');
  const status = searchParams.get('status');

  let sessions = MOCK_SESSIONS.map((session) => ({
    ...session,
    course: MOCK_COURSES.find((c) => c.id === session.courseId),
    instructor: MOCK_USERS.find((u) => u.id === session.instructorId),
    room: session.roomId ? MOCK_ROOMS.find((r) => r.id === session.roomId) : undefined,
  }));

  if (courseId) sessions = sessions.filter((s) => s.courseId === courseId);
  if (format) sessions = sessions.filter((s) => s.format === format);
  if (date) sessions = sessions.filter((s) => s.date.startsWith(date));
  if (status) sessions = sessions.filter((s) => s.status === status);

  sessions.sort((a, b) => new Date(a.date + 'T' + a.startTime).getTime() - new Date(b.date + 'T' + b.startTime).getTime());

  return ok(sessions);
}
