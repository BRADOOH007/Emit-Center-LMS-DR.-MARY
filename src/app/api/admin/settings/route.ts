import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, forbid, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole, writeAuditLog } from '@/lib/security';
import { PAYMENT_CONFIG_KEY, redactSecret, isRedacted, type PaymentConfig } from '@/lib/payment-config';

export async function GET() {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!isAdminRole(me.roles)) return forbid('Administrator access required');

  const setting = await prisma.appSetting.findUnique({ where: { key: PAYMENT_CONFIG_KEY } });
  const raw = (setting?.value as PaymentConfig | null) ?? null;

  const config: PaymentConfig = {
    stripePublishableKey: raw?.stripePublishableKey ?? (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''),
    stripeSecretKey: redactSecret(raw?.stripeSecretKey ?? process.env.STRIPE_SECRET_KEY ?? ''),
    stripeSecretKeyConfigured: Boolean(raw?.stripeSecretKey ?? process.env.STRIPE_SECRET_KEY),
    baseCurrency: raw?.baseCurrency ?? 'USD',
    demoMode: raw?.demoMode ?? true,
    paymentGateway: raw?.paymentGateway ?? 'stripe',
    paypalClientId: raw?.paypalClientId ?? '',
    paypalClientSecret: redactSecret(raw?.paypalClientSecret ?? ''),
    paypalEnvironment: raw?.paypalEnvironment ?? 'sandbox',
    paypalEnabled: raw?.paypalEnabled ?? false,
    promoCodes: raw?.promoCodes ?? {},
  };

  return ok(config);
}

export async function PUT(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!isAdminRole(me.roles)) return forbid('Administrator access required');

  const body = await parseBody<{
    stripePublishableKey?: string;
    stripeSecretKey?: string;
    baseCurrency?: string;
    demoMode?: boolean;
    paymentGateway?: 'stripe' | 'paypal';
    paypalClientId?: string;
    paypalClientSecret?: string;
    paypalEnvironment?: 'sandbox' | 'live';
    paypalEnabled?: boolean;
    promoCodes?: Record<string, { discountPercent: number; maxUses: number }>;
  }>(request).catch(() => null);

  if (!body) return badRequest('Invalid request body');

  const existing = await prisma.appSetting.findUnique({ where: { key: PAYMENT_CONFIG_KEY } });
  const prev = (existing?.value as Partial<PaymentConfig> | null) ?? {};

  const next: PaymentConfig = {
    stripePublishableKey:
      (body.stripePublishableKey ?? prev.stripePublishableKey ?? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '').trim(),
    stripeSecretKey: prev.stripeSecretKey ?? process.env.STRIPE_SECRET_KEY ?? '',
    stripeSecretKeyConfigured: Boolean(prev.stripeSecretKey ?? process.env.STRIPE_SECRET_KEY),
    baseCurrency: (body.baseCurrency ?? prev.baseCurrency ?? 'USD').toUpperCase(),
    demoMode: body.demoMode ?? prev.demoMode ?? true,
    paymentGateway: body.paymentGateway ?? prev.paymentGateway ?? 'stripe',
    paypalClientId: (body.paypalClientId ?? prev.paypalClientId ?? '').trim(),
    paypalClientSecret: prev.paypalClientSecret ?? '',
    paypalEnvironment: body.paypalEnvironment ?? prev.paypalEnvironment ?? 'sandbox',
    paypalEnabled: body.paypalEnabled ?? prev.paypalEnabled ?? false,
    promoCodes: body.promoCodes ?? prev.promoCodes ?? {},
  };

  if (body.stripeSecretKey?.trim() && !isRedacted(body.stripeSecretKey)) {
    next.stripeSecretKey = body.stripeSecretKey.trim();
    next.stripeSecretKeyConfigured = true;
    process.env.STRIPE_SECRET_KEY = body.stripeSecretKey.trim();
  }
  if (body.stripePublishableKey?.trim()) {
    next.stripePublishableKey = body.stripePublishableKey.trim();
  }
  if (body.paypalClientId?.trim()) next.paypalClientId = body.paypalClientId.trim();
  if (body.paypalClientSecret?.trim() && !isRedacted(body.paypalClientSecret)) {
    next.paypalClientSecret = body.paypalClientSecret.trim();
    next.paypalEnabled = true;
  }

  await prisma.appSetting.upsert({
    where: { key: PAYMENT_CONFIG_KEY },
    update: { value: next as unknown as Prisma.InputJsonValue },
    create: { key: PAYMENT_CONFIG_KEY, value: next as unknown as Prisma.InputJsonValue },
  });

  await writeAuditLog({
    userId: me.id,
    action: 'settings.payments_update',
    resourceType: 'app_setting',
    resourceId: PAYMENT_CONFIG_KEY,
  });

  const safe: PaymentConfig = {
    ...next,
    stripeSecretKey: redactSecret(next.stripeSecretKey),
    paypalClientSecret: redactSecret(next.paypalClientSecret),
  };
  return ok(safe);
}
