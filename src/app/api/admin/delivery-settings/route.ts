import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, forbid, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole, writeAuditLog } from '@/lib/security';

export interface DeliverySettings {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpFrom: string;
  smtpConfigured: boolean;
  resendApiKey: string;
  sendgridApiKey: string;
  twilioAccountSid: string;
  twilioFrom: string;
  twilioConfigured: boolean;
}

const KEY = 'delivery_settings';
const SECRET_KEYS = ['smtpPass', 'resendApiKey', 'sendgridApiKey', 'twilioAuthToken'] as const;

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
    smtpHost: (raw.smtpHost as string) ?? process.env.SMTP_HOST ?? '',
    smtpPort: Number(raw.smtpPort ?? process.env.SMTP_PORT ?? 587),
    smtpUser: (raw.smtpUser as string) ?? process.env.SMTP_USER ?? '',
    smtpFrom: (raw.smtpFrom as string) ?? process.env.SMTP_FROM ?? '',
    smtpConfigured: Boolean((raw.smtpPass as string) || process.env.SMTP_PASS),
    resendApiKey: readSecret('resendApiKey', raw) || process.env.RESEND_API_KEY || '',
    sendgridApiKey: readSecret('sendgridApiKey', raw) || process.env.SENDGRID_API_KEY || '',
    twilioAccountSid: (raw.twilioAccountSid as string) ?? process.env.TWILIO_ACCOUNT_SID ?? '',
    twilioFrom: (raw.twilioFrom as string) ?? process.env.TWILIO_FROM ?? '',
    twilioConfigured: Boolean((raw.twilioAuthToken as string) || process.env.TWILIO_AUTH_TOKEN),
  };

  return ok(cfg);
}

export async function PUT(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!isAdminRole(me.roles)) return forbid('Administrator access required');

  const body = await parseBody<Partial<DeliverySettings> & { smtpPass?: string; twilioAuthToken?: string }>(request).catch(() => null);
  if (!body) return badRequest('Invalid request body');

  const existing = await prisma.appSetting.findUnique({ where: { key: KEY } });
  const prev = (existing?.value as Record<string, unknown> | null) ?? {};

  const next: Record<string, unknown> = { ...prev };

  if (body.smtpHost !== undefined) next.smtpHost = body.smtpHost.trim();
  if (body.smtpPort !== undefined) next.smtpPort = Number(body.smtpPort) || 587;
  if (body.smtpUser !== undefined) next.smtpUser = body.smtpUser.trim();
  if (body.smtpFrom !== undefined) next.smtpFrom = body.smtpFrom.trim();
  if (body.resendApiKey !== undefined && body.resendApiKey.trim()) next.resendApiKey = body.resendApiKey.trim();
  if (body.sendgridApiKey !== undefined && body.sendgridApiKey.trim()) next.sendgridApiKey = body.sendgridApiKey.trim();
  if (body.twilioAccountSid !== undefined) next.twilioAccountSid = body.twilioAccountSid.trim();
  if (body.twilioFrom !== undefined) next.twilioFrom = body.twilioFrom.trim();
  if (body.smtpPass?.trim()) next.smtpPass = body.smtpPass.trim();
  if (body.twilioAuthToken?.trim()) next.twilioAuthToken = body.twilioAuthToken.trim();

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
