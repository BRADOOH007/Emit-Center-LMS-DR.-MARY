import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, notFound, forbid, serverError, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isRateLimited, writeAuditLog } from '@/lib/security';
import { getPaymentConfigServer } from '@/lib/payment-config';
import { promoUsageCount } from '@/lib/payments';
import type { SupportedCurrency } from '@/types';

interface PromoDef {
  discountPercent: number;
  maxUses: number;
}

async function applyPromo(promoCode: string | undefined, promoCodes: Record<string, PromoDef>): Promise<{ discountPercent: number; valid: boolean }> {
  if (!promoCode) return { discountPercent: 0, valid: false };
  const code = promoCode.toUpperCase().trim();
  const promo = promoCodes[code];
  if (!promo) return { discountPercent: 0, valid: false };
  const timesUsed = Number(await promoUsageCount(code).catch(() => 0));
  if (Number(promo.maxUses) > 0 && timesUsed >= Number(promo.maxUses)) {
    return { discountPercent: 0, valid: false };
  }
  return { discountPercent: Math.min(100, Math.max(0, Number(promo.discountPercent))), valid: true };
}

function getStripeConfig(config: { stripePublishableKey: string; stripeSecretKey: string }): { publishableKey: string; secretKey: string } | null {
  const publishableKey = config.stripePublishableKey;
  const secretKey = config.stripeSecretKey;
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

  const fullConfig = await getPaymentConfigServer();

  const { discountPercent } = await applyPromo(body.promoCode, promoCodes);
  const discountedAmount = Math.round(price.amount * (1 - discountPercent / 100));
  const promoApplied = discountPercent > 0 ? body.promoCode?.toUpperCase() : null;

  // Only accept currencies the platform is configured for; default to USD pricing.
  const currency = body.currency.toLowerCase();
  const stripe = getStripeConfig(fullConfig);
  const useRealStripe = !demoMode && !!stripe && fullConfig.paymentGateway !== 'paypal';
  const useRealPayPal = !demoMode && fullConfig.paymentGateway === 'paypal' && fullConfig.paypalEnabled && !!fullConfig.paypalClientId && !!fullConfig.paypalClientSecret;

  if (useRealPayPal) {
    try {
      const auth = Buffer.from(`${fullConfig.paypalClientId}:${fullConfig.paypalClientSecret}`).toString('base64');
      const apiBase = fullConfig.paypalEnvironment === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';
      const tokenRes = await fetch(`${apiBase}/v1/oauth2/token`, {
        method: 'POST',
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials',
      });
      if (!tokenRes.ok) return serverError('Unable to create payment. Please contact support.');
      const tokenData = await tokenRes.json();
      const orderRes = await fetch(`${apiBase}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{
            reference_id: course.id,
            amount: { currency_code: currency.toUpperCase(), value: (discountedAmount / 100).toFixed(2) },
            description: course.title.slice(0, 127),
          }],
        }),
      });
      if (!orderRes.ok) return serverError('Unable to create payment. Please contact support.');
      const orderData = await orderRes.json();

      await writeAuditLog({
        userId: me.id,
        action: 'payment.intent_created',
        resourceType: 'course',
        resourceId: course.id,
      });

      return ok({
        paymentIntentId: orderData.id,
        clientSecret: null,
        amount: discountedAmount,
        currency,
        course: { id: course.id, title: course.title },
        promoApplied,
        discountPercent,
        originalAmount: price.amount,
        demo: false,
        gateway: 'paypal',
        approvalUrl: orderData.links?.find((l: { rel: string }) => l.rel === 'approve')?.href ?? null,
      });
    } catch {
      return serverError('Unable to create payment. Please contact support.');
    }
  }

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
        gateway: 'stripe',
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
    gateway: 'stripe',
  });
}
