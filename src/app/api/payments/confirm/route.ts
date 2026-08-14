import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, serverError, forbid, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isRateLimited, writeAuditLog } from '@/lib/security';
import { getPaymentConfigServer } from '@/lib/payment-config';
import { activateEnrollmentForPayment } from '@/lib/payments';

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
    paymentIntentId?: string;
    promoCode?: string;
  }>(request).catch(() => null);

  if (!body?.courseId || !body?.paymentIntentId) {
    return badRequest('courseId and paymentIntentId are required');
  }

  const course = await prisma.course.findUnique({ where: { id: body.courseId } });
  if (!course) return badRequest('Course not found');

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
  const isPayPalOrder = body.paymentIntentId.startsWith('PAYPAL-');
  const fullConfig = await getPaymentConfigServer();
  const stripe = isPayPalOrder ? null : getStripeConfig(fullConfig);
  const useRealStripe = !demoMode && !!stripe && !isDemoIntent && !isPayPalOrder;

  if (isPayPalOrder && !demoMode) {
    // Verify the PayPal order was approved/captured.
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
      if (!tokenRes.ok) return serverError('Unable to verify PayPal payment');
      const tokenData = await tokenRes.json();
      const orderRes = await fetch(`${apiBase}/v2/checkout/orders/${body.paymentIntentId}`, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (!orderRes.ok) return serverError('Unable to verify PayPal payment');
      const orderData = await orderRes.json();
      if (orderData.status !== 'COMPLETED' && orderData.status !== 'APPROVED') {
        return badRequest('Payment has not been completed yet');
      }
    } catch {
      return serverError('Unable to verify PayPal payment');
    }
  }

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

  // For demo/paypal flows (no Stripe webhook) we record promo usage here; the
  // Stripe webhook is the authoritative recorder for real Stripe payments.
  const countPromoHere = isDemoIntent || isPayPalOrder;

  const { enrollmentId: enrollment } = await activateEnrollmentForPayment({
    userId: me.id,
    courseId: course.id,
    paymentIntentId: body.paymentIntentId as string,
    amount,
    currency: fullConfig.baseCurrency ?? 'USD',
    promoCode: body.promoCode,
    countPromo: countPromoHere,
  });

  await writeAuditLog({
    userId: me.id,
    action: 'enrollment.created',
    resourceType: 'course',
    resourceId: course.id,
  });

  return ok({ enrollment });
}
