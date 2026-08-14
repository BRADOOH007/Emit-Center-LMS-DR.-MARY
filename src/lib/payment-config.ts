export const PAYMENT_CONFIG_KEY = 'payment_config';

export interface PaymentConfig {
  stripePublishableKey: string;
  stripeSecretKey: string;
  stripeSecretKeyConfigured: boolean;
  stripeWebhookSecret: string;
  baseCurrency: string;
  demoMode: boolean;
  paymentGateway: 'stripe' | 'paypal';
  paypalClientId: string;
  paypalClientSecret: string;
  paypalEnvironment: 'sandbox' | 'live';
  paypalEnabled: boolean;
  promoCodes: Record<string, { discountPercent: number; maxUses: number }>;
}

export function redactSecret(value: string): string {
  if (!value) return '';
  return value.length > 8 ? `••••••••${value.slice(-4)}` : '••••••••';
}

export function isRedacted(value: string): boolean {
  return /^•+/.test(value);
}

// Server-side: reads the persisted config (with real secrets) so payment
// routes can use keys stored via the admin dashboard, not just env vars.
export async function getPaymentConfigServer(): Promise<PaymentConfig> {
  let stored: Partial<PaymentConfig> | null = null;
  try {
    const { prisma } = await import('@/lib/prisma');
    const setting = await prisma.appSetting.findUnique({ where: { key: PAYMENT_CONFIG_KEY } });
    stored = (setting?.value as Partial<PaymentConfig> | null) ?? null;
  } catch {
    stored = null;
  }
  return {
    stripePublishableKey:
      stored?.stripePublishableKey ?? (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''),
    stripeSecretKey: stored?.stripeSecretKey ?? (process.env.STRIPE_SECRET_KEY ?? ''),
    stripeSecretKeyConfigured: Boolean(stored?.stripeSecretKey ?? process.env.STRIPE_SECRET_KEY),
    stripeWebhookSecret: stored?.stripeWebhookSecret ?? (process.env.STRIPE_WEBHOOK_SECRET ?? ''),
    baseCurrency: stored?.baseCurrency ?? 'USD',
    demoMode: stored?.demoMode ?? true,
    paymentGateway: stored?.paymentGateway ?? 'stripe',
    paypalClientId: stored?.paypalClientId ?? '',
    paypalClientSecret: stored?.paypalClientSecret ?? '',
    paypalEnvironment: stored?.paypalEnvironment ?? 'sandbox',
    paypalEnabled: stored?.paypalEnabled ?? false,
    promoCodes: stored?.promoCodes ?? {},
  };
}
