import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, forbid, serverError } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { writeAuditLog } from '@/lib/security';

export async function POST(_req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!me.roles.includes('super_admin')) return forbid('Super admin access required');

  try {
    const result = await prisma.$transaction(async (tx) => {
      const payments = await tx.payment.deleteMany({});
      const enrollments = await tx.enrollment.deleteMany({});
      const certificates = await tx.certificate.deleteMany({});
      const quizAttempts = await tx.quizAttempt.deleteMany({});
      const submissions = await tx.submission.deleteMany({});
      const gradebook = await tx.gradebookEntry.deleteMany({});
      const attendance = await tx.attendanceRecord.deleteMany({});
      const ferpaLogs = await tx.ferpaAccessLog.deleteMany({});
      const courses = await tx.course.updateMany({ data: { enrolledCount: 0 } });

      return {
        payments: payments.count,
        enrollments: enrollments.count,
        certificates: certificates.count,
        quizAttempts: quizAttempts.count,
        submissions: submissions.count,
        gradebook: gradebook.count,
        attendance: attendance.count,
        ferpaLogs: ferpaLogs.count,
        coursesReset: courses.count,
      };
    });

    await writeAuditLog({
      userId: me.id,
      action: 'admin.reset.figures',
      resourceType: 'system',
    });

    return ok({ ...result, success: true });
  } catch {
    return serverError('Failed to reset platform figures.');
  }
}
