import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder';
    stripeClient = new Stripe(key, {
      apiVersion: '2025-08-27.basil',
    });
  }
  return stripeClient;
}

export function getStripePublicKey(): string {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? 'pk_test_placeholder';
}
