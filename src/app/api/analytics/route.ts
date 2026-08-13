import { prisma } from '@/lib/prisma';
import { ok, forbid } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole } from '@/lib/security';

export async function GET() {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!isAdminRole(me.roles)) return forbid('Administrator access required');

  const [
    totalStudents,
    activeEnrollments,
    completedEnrollments,
    totalCourses,
    publishedCourses,
    totalCertificates,
    pendingGradable,
    totalPayments,
    revenue,
    atRiskCount,
    unreadMessages,
    recentAudits,
  ] = await Promise.all([
    prisma.user.count({ where: { roles: { has: 'student' } } }),
    prisma.enrollment.count({ where: { status: 'active' } }),
    prisma.enrollment.count({ where: { status: 'completed' } }),
    prisma.course.count(),
    prisma.course.count({ where: { isPublished: true } }),
    prisma.certificate.count(),
    prisma.submission.count({ where: { status: 'submitted' } }),
    prisma.payment.count({ where: { status: 'succeeded' } }),
    prisma.payment.aggregate({ where: { status: 'succeeded' }, _sum: { amount: true } }),
    prisma.gradebookEntry.count({ where: { overallPercentage: { lt: 60 } } }),
    prisma.directMessage.count({ where: { isRead: false } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { user: { select: { fullName: true, email: true } } } }),
  ]);

  const totalEnrollments = await prisma.enrollment.count();
  const courseCompletionRate =
    totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 1000) / 10 : 0;

  const enrollmentTrend = await prisma.enrollment.groupBy({
    by: ['createdAt'],
    _count: { _all: true },
    orderBy: { createdAt: 'asc' },
  });

  const attendanceRecords = await prisma.attendanceRecord.groupBy({
    by: ['status'],
    _count: { _all: true },
  });
  const attendanceMap = Object.fromEntries(attendanceRecords.map((r) => [r.status, r._count._all]));
  const totalAttendance = attendanceRecords.reduce((sum, r) => sum + r._count._all, 0);
  const presentCount = (attendanceMap.present ?? 0) + (attendanceMap.late ?? 0);
  const overallAttendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 1000) / 10 : 0;

  const gradeDistribution = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'].map((grade) => ({
    grade,
    count: 0,
  }));

  const gradebookEntries = await prisma.gradebookEntry.findMany({ select: { letterGrade: true } });
  gradebookEntries.forEach((entry) => {
    const bucket = gradeDistribution.find((g) => g.grade === entry.letterGrade);
    if (bucket) bucket.count += 1;
  });

  const atRiskStudents = await prisma.user.findMany({
    where: { roles: { has: 'student' }, gradebook: { some: { overallPercentage: { lt: 60 } } } },
    select: { id: true, fullName: true, email: true },
    take: 10,
  });

  const metrics = {
    activeEnrollments,
    totalStudents,
    onsiteAttendanceRate: overallAttendanceRate,
    onlineAttendanceRate: overallAttendanceRate,
    overallAttendanceRate,
    courseCompletionRate,
    atRiskCount,
    totalCourses,
    publishedCourses,
    totalCertificates,
    pendingGradable,
    totalPayments,
    revenueAmount: revenue._sum.amount ?? 0,
    unreadMessages,
    atRiskStudents,
    enrollmentTrend: enrollmentTrend.map((e) => ({
      date: e.createdAt.toISOString().split('T')[0],
      count: e._count._all,
    })),
    attendanceTrend: [],
    gradeDistribution,
  };

  return ok({
    metrics,
    recentAudits: recentAudits.map((a) => ({
      id: a.id,
      userId: a.userId,
      action: a.action,
      resourceType: a.resourceType,
      resourceId: a.resourceId,
      createdAt: a.createdAt.toISOString(),
      user: a.user,
    })),
  });
}
