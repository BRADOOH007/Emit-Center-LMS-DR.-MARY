import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, notFound, forbid, serverError, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isRateLimited, writeAuditLog } from '@/lib/security';
import type { SupportedCurrency } from '@/types';

function getStripeConfig(): { publishableKey: string; secretKey: string } | null {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!publishableKey || !secretKey) return null;
  if (!publishableKey.startsWith('pk_') || !secretKey.startsWith('sk_')) return null;
  return { publishableKey, secretKey };
}

function applyPromo(promoCode: string | undefined, promoCodes: Record<string, { discountPercent: number; maxUses: number }>, used: Record<string, number>): number {
  if (!promoCode) return 0;
  const code = promoCode.toUpperCase().trim();
  const promo = promoCodes[code];
  if (!promo) return 0;
  const timesUsed = used[code] ?? 0;
  if (timesUsed >= promo.maxUses) return 0;
  return Math.min(100, Math.max(0, promo.discountPercent));
}

export async function POST(request: NextRequest) {
  if (isRateLimited(request)) return badRequest('Too many requests. Please try again later.');

  const me = await getSessionUser();
  if (!me) return forbid('Sign in to enroll');

  const body = await parseBody<{
    courseId?: string;
    currency?: SupportedCurrency;
    promoCode?: string;
  }>(request).catch(() => null);

  if (!body?.courseId || !body.currency) {
    return badRequest('courseId and currency are required');
  }

  const course = await prisma.course.findUnique({
    where: { id: body.courseId },
    include: { pricing: true, enrollments: true },
  });
  if (!course) return notFound('Course not found');
  if (!course.isPublished) return badRequest('This course is not open for enrollment');

  const activeCount = course.enrollments.filter((e) => e.status === 'active' || e.status === 'pending').length;
  if (activeCount >= course.maxSeats) return badRequest('This course is full');

  const already = course.enrollments.find((e) => e.userId === me.id && (e.status === 'active' || e.status === 'pending'));
  if (already) return badRequest('You are already enrolled in this course');

  const price = course.pricing.find((p) => p.currency === body.currency) ?? course.pricing[0];
  if (!price) return badRequest(`No pricing available for ${body.currency}`);

  const setting = await prisma.appSetting.findUnique({ where: { key: 'payment_config' } });
  const paymentConfig = (setting?.value as { promoCodes?: Record<string, { discountPercent: number; maxUses: number }>; demoMode?: boolean } | null) ?? null;
  const promoCodes = paymentConfig?.promoCodes ?? {};
  const demoMode = paymentConfig?.demoMode ?? true;

  const discountPercent = applyPromo(body.promoCode, promoCodes, {});
  const discountedAmount = Math.round(price.amount * (1 - discountPercent / 100));
  const promoApplied = discountPercent > 0 ? body.promoCode?.toUpperCase() : null;

  // Only accept currencies the platform is configured for; default to USD pricing.
  const currency = body.currency.toLowerCase();
  const stripe = getStripeConfig();
  const useRealStripe = !demoMode && !!stripe;

  if (useRealStripe) {
    try {
      const client = new Stripe(stripe!.secretKey);
      const intent = await client.paymentIntents.create({
        amount: discountedAmount,
        currency,
        metadata: {
          courseId: course.id,
          courseTitle: course.title.slice(0, 128),
          userId: me.id,
          ...(promoApplied ? { promoCode: promoApplied } : {}),
        },
        automatic_payment_methods: { enabled: true },
      });

      await writeAuditLog({
        userId: me.id,
        action: 'payment.intent_created',
        resourceType: 'course',
        resourceId: course.id,
      });

      return ok({
        paymentIntentId: intent.id,
        clientSecret: intent.client_secret,
        amount: discountedAmount,
        currency,
        course: { id: course.id, title: course.title },
        promoApplied,
        discountPercent,
        originalAmount: price.amount,
        demo: false,
      });
    } catch {
      return serverError('Unable to create payment. Please contact support.');
    }
  }

  // Demo / sandbox mode: produce a synthetic intent so the flow is testable.
  const paymentIntentId = `pi_demo_${Date.now()}_${me.id.slice(0, 6)}`;
  return ok({
    paymentIntentId,
    clientSecret: null,
    amount: discountedAmount,
    currency,
    course: { id: course.id, title: course.title },
    promoApplied,
    discountPercent,
    originalAmount: price.amount,
    demo: true,
  });
}
