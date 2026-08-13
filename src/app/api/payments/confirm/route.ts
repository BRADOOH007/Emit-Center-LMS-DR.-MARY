import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, notFound, forbid, serverError, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isRateLimited, writeAuditLog } from '@/lib/security';

function getStripeConfig(): { publishableKey: string; secretKey: string } | null {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!publishableKey || !secretKey) return null;
  if (!publishableKey.startsWith('pk_') || !secretKey.startsWith('sk_')) return null;
  return { publishableKey, secretKey };
}

export async function POST(request: NextRequest) {
  if (isRateLimited(request)) return badRequest('Too many requests. Please try again later.');

  const me = await getSessionUser();
  if (!me) return forbid('Sign in to enroll');

  const body = await parseBody<{
    courseId?: string;
    paymentIntentId?: string;
  }>(request).catch(() => null);

  if (!body?.courseId || !body?.paymentIntentId) {
    return badRequest('courseId and paymentIntentId are required');
  }

  const course = await prisma.course.findUnique({ where: { id: body.courseId } });
  if (!course) return notFound('Course not found');

  const existingEnrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: me.id, courseId: course.id } },
  });
  if (existingEnrollment && (existingEnrollment.status === 'active' || existingEnrollment.status === 'pending')) {
    return badRequest('You are already enrolled in this course');
  }

  const setting = await prisma.appSetting.findUnique({ where: { key: 'payment_config' } });
  const paymentConfig = (setting?.value as { demoMode?: boolean } | null) ?? null;
  const demoMode = paymentConfig?.demoMode ?? true;

  const isDemoIntent = body.paymentIntentId.startsWith('pi_demo_');
  const stripe = getStripeConfig();
  const useRealStripe = !demoMode && !!stripe && !isDemoIntent;

  if (useRealStripe) {
    try {
      const client = new Stripe(stripe!.secretKey);
      const intent = await client.paymentIntents.retrieve(body.paymentIntentId);
      if (intent.status !== 'succeeded') {
        return badRequest('Payment has not been completed yet');
      }
    } catch {
      return serverError('Unable to verify payment');
    }
  }

  const price = await prisma.coursePrice.findFirst({ where: { courseId: course.id } });
  const amount = price?.amount ?? 0;

  const enrollment = await prisma.$transaction(async (tx) => {
    const enrollmentRow = await tx.enrollment.upsert({
      where: { userId_courseId: { userId: me.id, courseId: course.id } },
      update: { status: 'active' },
      create: { userId: me.id, courseId: course.id, status: 'active' },
    });

    await tx.payment.create({
      data: {
        userId: me.id,
        courseId: course.id,
        enrollmentId: enrollmentRow.id,
        amount,
        currency: 'USD',
        stripePaymentIntentId: body.paymentIntentId as string,
        status: 'succeeded',
      },
    });

    await tx.course.update({
      where: { id: course.id },
      data: { enrolledCount: { increment: 1 } },
    });

    await tx.notification.create({
      data: {
        userId: me.id,
        type: 'enrollment',
        title: `Enrolled in ${course.title}`,
        body: `Your enrollment in ${course.title} is active. Check your schedule for upcoming sessions.`,
        actionUrl: `/courses/${course.id}`,
      },
    });

    return enrollmentRow;
  }, { timeout: 20000 });

  await writeAuditLog({
    userId: me.id,
    action: 'enrollment.created',
    resourceType: 'course',
    resourceId: course.id,
  });

  return ok({ enrollment });
}
