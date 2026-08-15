import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, forbid, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole, writeAuditLog } from '@/lib/security';

export interface DeliverySettings {
  emailFrom: string;
  resendApiKey: string;
  resendConfigured: boolean;
  twilioAccountSid: string;
  twilioFrom: string;
  twilioConfigured: boolean;
}

const KEY = 'delivery_settings';

function redact(value: string): string {
  if (!value) return '';
  return value.length > 8 ? `••••••••${value.slice(-4)}` : '••••••••';
}

function readSecret(key: string, prev: Record<string, unknown>): string {
  const v = prev[key];
  return typeof v === 'string' ? v : '';
}

export async function GET() {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!isAdminRole(me.roles)) return forbid('Administrator access required');

  const setting = await prisma.appSetting.findUnique({ where: { key: KEY } });
  const raw = (setting?.value as Record<string, unknown> | null) ?? {};

  const cfg: DeliverySettings = {
    emailFrom: (raw.emailFrom as string) ?? process.env.EMAIL_FROM ?? 'no-reply@emitcenter.com',
    resendApiKey: redact(readSecret('resendApiKey', raw) || process.env.RESEND_API_KEY || ''),
    resendConfigured: Boolean(readSecret('resendApiKey', raw) || process.env.RESEND_API_KEY),
    twilioAccountSid: (raw.twilioAccountSid as string) ?? process.env.TWILIO_ACCOUNT_SID ?? '',
    twilioFrom: (raw.twilioFrom as string) ?? process.env.TWILIO_FROM ?? '',
    twilioConfigured: Boolean(readSecret('twilioAuthToken', raw) || process.env.TWILIO_AUTH_TOKEN),
  };

  return ok(cfg);
}

export async function PUT(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!isAdminRole(me.roles)) return forbid('Administrator access required');

  const body = await parseBody<Partial<DeliverySettings> & { twilioAuthToken?: string }>(request).catch(() => null);
  if (!body) return badRequest('Invalid request body');

  const existing = await prisma.appSetting.findUnique({ where: { key: KEY } });
  const prev = (existing?.value as Record<string, unknown> | null) ?? {};

  const next: Record<string, unknown> = { ...prev };

  const REDACTED = new RegExp('^•+');
  const keepExisting = (bodyVal: string | undefined, storeKey: string) => {
    if (bodyVal === undefined) return;
    if (REDACTED.test(bodyVal)) return;
    next[storeKey] = bodyVal.trim();
  };

  if (body.emailFrom !== undefined) next.emailFrom = body.emailFrom.trim();
  keepExisting(body.resendApiKey, 'resendApiKey');
  if (body.twilioAccountSid !== undefined) next.twilioAccountSid = body.twilioAccountSid.trim();
  if (body.twilioFrom !== undefined) next.twilioFrom = body.twilioFrom.trim();
  keepExisting(body.twilioAuthToken, 'twilioAuthToken');

  await prisma.appSetting.upsert({
    where: { key: KEY },
    update: { value: next as unknown as Prisma.InputJsonValue },
    create: { key: KEY, value: next as unknown as Prisma.InputJsonValue },
  });

  await writeAuditLog({
    userId: me.id,
    action: 'settings.delivery_update',
    resourceType: 'app_setting',
    resourceId: KEY,
  });

  return ok({ saved: true });
}