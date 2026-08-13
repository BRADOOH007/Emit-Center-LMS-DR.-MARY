import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, forbid, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole, writeAuditLog } from '@/lib/security';
import { PAYMENT_CONFIG_KEY, type PaymentConfig } from '@/lib/payment-config';

export async function GET() {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!isAdminRole(me.roles)) return forbid('Administrator access required');

  const setting = await prisma.appSetting.findUnique({ where: { key: PAYMENT_CONFIG_KEY } });
  const raw = (setting?.value as PaymentConfig | null) ?? null;

  const config: PaymentConfig = {
    stripePublishableKey: raw?.stripePublishableKey ?? (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''),
    stripeSecretKeyConfigured: raw?.stripeSecretKeyConfigured ?? Boolean(process.env.STRIPE_SECRET_KEY),
    baseCurrency: raw?.baseCurrency ?? 'USD',
    demoMode: raw?.demoMode ?? true,
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
    promoCodes?: Record<string, { discountPercent: number; maxUses: number }>;
  }>(request).catch(() => null);

  if (!body) return badRequest('Invalid request body');

  const existing = await prisma.appSetting.findUnique({ where: { key: PAYMENT_CONFIG_KEY } });
  const prev = (existing?.value as Partial<PaymentConfig> | null) ?? {};

  const next: PaymentConfig = {
    stripePublishableKey:
      (body.stripePublishableKey ?? prev.stripePublishableKey ?? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '').trim(),
    stripeSecretKeyConfigured: body.stripeSecretKey
      ? Boolean(body.stripeSecretKey.trim()) || (prev.stripeSecretKeyConfigured ?? false)
      : (prev.stripeSecretKeyConfigured ?? Boolean(process.env.STRIPE_SECRET_KEY)),
    baseCurrency: (body.baseCurrency ?? prev.baseCurrency ?? 'USD').toUpperCase(),
    demoMode: body.demoMode ?? prev.demoMode ?? true,
    promoCodes: body.promoCodes ?? prev.promoCodes ?? {},
  };

  if (body.stripeSecretKey?.trim()) {
    // Store a marker only. The raw secret must live in the environment so it is
    // never exposed to the client. If a new key is supplied we write it to env
    // for the current process and flag that it must be persisted by the operator.
    next.stripeSecretKeyConfigured = true;
    process.env.STRIPE_SECRET_KEY = body.stripeSecretKey.trim();
  }

  await prisma.appSetting.upsert({
    where: { key: PAYMENT_CONFIG_KEY },
    update: { value: next as object },
    create: { key: PAYMENT_CONFIG_KEY, value: next as object },
  });

  await writeAuditLog({
    userId: me.id,
    action: 'settings.payments_update',
    resourceType: 'app_setting',
    resourceId: PAYMENT_CONFIG_KEY,
  });

  return ok(next);
}
