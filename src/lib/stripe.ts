import Stripe from 'stripe';
import { getPaymentConfigServer } from '@/lib/payment-config';

let stripeClient: Stripe | null = null;
let stripeClientKey: string | null = null;

export async function getStripe(): Promise<Stripe> {
  const config = await getPaymentConfigServer();
  const key = config.stripeSecretKey || (process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder');
  if (!stripeClient || stripeClientKey !== key) {
    stripeClient = new Stripe(key, {
      apiVersion: '2025-08-27.basil',
    });
    stripeClientKey = key;
  }
  return stripeClient;
}

export async function getStripePublicKey(): Promise<string> {
  const config = await getPaymentConfigServer();
  return config.stripePublishableKey || (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? 'pk_test_placeholder');
}
