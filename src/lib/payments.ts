import { prisma } from '@/lib/prisma';
import { awardBadge } from '@/lib/badges';

export interface PaymentActivationInput {
  userId: string;
  courseId: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  promoCode?: string;
  countPromo?: boolean;
}

export async function promoUsageCount(code: string): Promise<number> {
  const row = await prisma.promoUsage.findUnique({ where: { code } });
  return row?.used ?? 0;
}

export async function incrementPromoUsage(code: string): Promise<void> {
  await prisma.promoUsage.upsert({
    where: { code },
    update: { used: { increment: 1 } },
    create: { code, used: 1 },
  });
}

/**
 * Activates the enrollment + payment for a successful Stripe payment intent.
 * Idempotent: safe to call from both the client confirm route and the Stripe
 * webhook. The webhook path guarantees that a payment is finalized even if the
 * user's browser disconnects right after paying.
 */
export async function activateEnrollmentForPayment(input: PaymentActivationInput): Promise<{ enrollmentId: string }> {
  const { userId, courseId, paymentIntentId, amount, currency, promoCode, countPromo } = input;

  const existingEnrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  const wasActive = existingEnrollment?.status === 'active';

  // Enroll first so a stable enrollmentId always exists (Payment requires it).
  const enrollment = await prisma.enrollment.upsert({
    where: { userId_courseId: { userId, courseId } },
    update: { status: 'active' },
    create: { userId, courseId, status: 'active' },
  });

  await prisma.payment.upsert({
    where: { stripePaymentIntentId: paymentIntentId },
    update: {
      status: 'succeeded',
      amount,
      currency: currency.toUpperCase(),
      enrollmentId: enrollment.id,
    },
    create: {
      userId,
      courseId,
      amount,
      currency: currency.toUpperCase(),
      status: 'succeeded',
      stripePaymentIntentId: paymentIntentId,
      enrollmentId: enrollment.id,
    },
  });

  // Increment seat count only on a real transition into "active".
  if (!wasActive) {
    await prisma.course.update({
      where: { id: courseId },
      data: { enrolledCount: { increment: 1 } },
    });
  }

  // First enrollment badge.
  const enrollmentCount = await prisma.enrollment.count({ where: { userId } });
  if (enrollmentCount === 1) {
    awardBadge(userId, 'First Steps').catch(() => {});
  }

  await prisma.notification.upsert({
    where: {
      id: `${paymentIntentId.slice(-24)}_${userId}`,
    },
    update: {},
    create: {
      id: `${paymentIntentId.slice(-24)}_${userId}`,
      userId,
      type: 'enrollment',
      title: `Enrollment active`,
      body: 'Your payment was confirmed. Check your schedule for upcoming sessions.',
      actionUrl: `/courses/${courseId}`,
    },
  }).catch(() => {});

  if (countPromo && promoCode) {
    incrementPromoUsage(promoCode).catch(() => {});
  }

  return { enrollmentId: enrollment.id };
}

export async function markPaymentFailed(paymentIntentId: string): Promise<void> {
  await prisma.payment.updateMany({
    where: { stripePaymentIntentId: paymentIntentId },
    data: { status: 'failed' },
  });
}

export async function markPaymentRefunded(paymentIntentId: string): Promise<void> {
  const payment = await prisma.payment.findUnique({ where: { stripePaymentIntentId: paymentIntentId } });
  if (!payment) return;
  await prisma.payment.update({ where: { id: payment.id }, data: { status: 'refunded' } });
  await prisma.enrollment.updateMany({
    where: { id: payment.enrollmentId, status: 'active' },
    data: { status: 'cancelled' },
  });
}