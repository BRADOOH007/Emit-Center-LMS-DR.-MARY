import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, forbid } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole } from '@/lib/security';

export async function GET(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');

  const { searchParams } = request.nextUrl;
  const userId = searchParams.get('userId');
  const courseId = searchParams.get('courseId');

  if (userId && userId !== me.id && !isAdminRole(me.roles)) {
    const linked = await prisma.parentStudentLink.findUnique({
      where: { parentId_studentId: { parentId: me.id, studentId: userId } },
    });
    if (!linked) return forbid('You can only view your own payments');
  }

  const payments = await prisma.payment.findMany({
    where: {
      ...(userId ? { userId } : {}),
      ...(courseId ? { courseId } : {}),
    },
    include: {
      course: { select: { id: true, title: true, format: true } },
      user: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return ok(
    payments.map((p) => ({
      id: p.id,
      userId: p.userId,
      courseId: p.courseId,
      enrollmentId: p.enrollmentId,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      stripePaymentIntentId: p.stripePaymentIntentId,
      createdAt: p.createdAt.toISOString(),
      course: p.course,
      user: p.user,
    })),
  );
}
