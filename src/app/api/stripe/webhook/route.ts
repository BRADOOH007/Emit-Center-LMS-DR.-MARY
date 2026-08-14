import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { getPaymentConfigServer } from '@/lib/payment-config';
import {
  activateEnrollmentForPayment,
  markPaymentFailed,
  markPaymentRefunded,
} from '@/lib/payments';
import { writeAuditLog } from '@/lib/security';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature') ?? '';

  const config = await getPaymentConfigServer();
  const webhookSecret = config.stripeWebhookSecret;
  const secretKey = config.stripeSecretKey;

  if (!webhookSecret || !secretKey || !secretKey.startsWith('sk_')) {
    return new Response(JSON.stringify({ error: 'Stripe webhook is not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const stripe = new Stripe(secretKey);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return new Response(JSON.stringify({ error: `Invalid signature: ${err instanceof Error ? err.message : 'unknown'}` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const { userId, courseId, promoCode } = (pi.metadata ?? {}) as {
          userId?: string;
          courseId?: string;
          promoCode?: string;
        };
        if (!userId || !courseId) break;
        await activateEnrollmentForPayment({
          userId,
          courseId,
          paymentIntentId: pi.id,
          amount: pi.amount,
          currency: pi.currency,
          promoCode,
          countPromo: true,
        });
        await writeAuditLog({
          userId,
          action: 'payment.webhook_succeeded',
          resourceType: 'course',
          resourceId: courseId,
        });
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await markPaymentFailed(pi.id);
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
        if (paymentIntentId) await markPaymentRefunded(paymentIntentId);
        break;
      }
      default:
        break;
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Webhook handler failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}