import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, forbid, badRequest } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole } from '@/lib/security';
import type { Transcript, TranscriptCourse } from '@/types';

function gradePoints(letter: string | null): number | null {
  if (!letter) return null;
  const map: Record<string, number> = { 'A+': 4.0, A: 4.0, 'A-': 3.7, 'B+': 3.3, B: 3.0, 'B-': 2.7, 'C+': 2.3, C: 2.0, 'C-': 1.7, D: 1.0, F: 0 };
  return map[letter] ?? null;
}

export async function GET(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');

  const userId = request.nextUrl.searchParams.get('userId');
  const targetId = userId && (userId === me.id || isAdminRole(me.roles) || me.roles.includes('instructor')) ? userId : me.id;

  const [user, enrollments, gradebook, certificates] = await Promise.all([
    prisma.user.findUnique({ where: { id: targetId }, select: { fullName: true, email: true } }),
    prisma.enrollment.findMany({
      where: { userId: targetId },
      include: { course: { select: { id: true, title: true, subject: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.gradebookEntry.findMany({ where: { userId: targetId } }),
    prisma.certificate.findMany({ where: { userId: targetId } }),
  ]);

  if (!user) return badRequest('Student not found');

  const gradeByCourse = new Map(gradebook.map((g) => [g.courseId, g]));
  const certByCourse = new Map(certificates.map((c) => [c.courseId, c]));

  const courses: TranscriptCourse[] = enrollments.map((e) => {
    const g = gradeByCourse.get(e.courseId);
    const cert = certByCourse.get(e.courseId);
    return {
      courseId: e.courseId,
      courseTitle: e.course.title,
      subject: e.course.subject,
      status: e.status,
      overallPercentage: g?.overallPercentage ?? null,
      letterGrade: g?.letterGrade ?? null,
      completedAt: e.status === 'completed' ? e.updatedAt.toISOString() : null,
      certificateHash: cert?.verificationHash ?? null,
    };
  });

  const graded = courses.filter((c) => gradePoints(c.letterGrade) !== null);
  const totalPoints = graded.reduce((s, c) => s + (gradePoints(c.letterGrade) ?? 0), 0);
  const overallGpa = graded.length ? (totalPoints / graded.length).toFixed(2) : null;

  const transcript: Transcript = {
    studentName: user.fullName,
    studentEmail: user.email,
    courses,
    overallGpa,
    totalCredits: courses.filter((c) => c.status === 'completed').length,
    certificatesCount: certificates.length,
  };

  return ok(transcript);
}
