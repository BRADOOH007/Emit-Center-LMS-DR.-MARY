import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const courseId = searchParams.get('courseId');
  const format = searchParams.get('format');
  const date = searchParams.get('date');
  const status = searchParams.get('status');
  const instructorId = searchParams.get('instructorId');

  const where: Record<string, unknown> = {};
  if (courseId) where.courseId = courseId;
  if (format) where.format = format;
  if (status) where.status = status;
  if (instructorId) where.instructorId = instructorId;

  let sessions = await prisma.courseSession.findMany({
    where,
    include: {
      course: { select: { id: true, title: true, slug: true } },
      instructor: { select: { id: true, fullName: true, email: true } },
      attendance: true,
    },
    orderBy: { date: 'asc' },
  });

  if (date) {
    sessions = sessions.filter((s) => s.date.toISOString().startsWith(date));
  }

  const data = sessions.map((s) => ({
    id: s.id,
    courseId: s.courseId,
    title: s.title,
    format: s.format,
    date: s.date.toISOString().split('T')[0],
    startTime: s.startTime,
    endTime: s.endTime,
    hostTimezone: s.hostTimezone,
    instructorId: s.instructorId,
    roomId: s.roomId,
    meetingLink: s.meetingLink,
    status: s.status,
    sessionType: s.sessionType,
    course: s.course,
    instructor: s.instructor,
    attendanceCount: s.attendance.length,
  }));

  return ok(data);
}
