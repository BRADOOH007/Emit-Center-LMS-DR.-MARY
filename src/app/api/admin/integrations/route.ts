import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, forbid, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole, writeAuditLog } from '@/lib/security';

export interface IntegrationSettings {
  googleWorkspaceEnabled: boolean;
  googleClientId: string;
  googleClientSecret: string;
  microsoftEnabled: boolean;
  microsoftClientId: string;
  microsoftTenantId: string;
  microsoftClientSecret: string;
  ssoEnabled: boolean;
  ssoProvider: string;
  ssoIssuerUrl: string;
  ssoClientId: string;
  ssoClientSecret: string;
  zoomEnabled: boolean;
  zoomClientId: string;
  zoomClientSecret: string;
  zoomVerificationToken: string;
  zoomWebhookSecret: string;
}

const KEY = 'integration_settings';
const SECRET_KEYS = ['googleClientSecret', 'microsoftClientSecret', 'ssoClientSecret', 'zoomClientSecret', 'zoomWebhookSecret'] as const;

function redact(value: string): string {
  if (!value) return '';
  return value.length > 8 ? `••••••••${value.slice(-4)}` : '••••••••';
}

export async function GET() {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!isAdminRole(me.roles)) return forbid('Administrator access required');

  const setting = await prisma.appSetting.findUnique({ where: { key: KEY } });
  const raw = (setting?.value as Record<string, unknown> | null) ?? {};

  const cfg: IntegrationSettings = {
    googleWorkspaceEnabled: Boolean(raw.googleWorkspaceEnabled ?? false),
    googleClientId: (raw.googleClientId as string) ?? process.env.GOOGLE_CLIENT_ID ?? '',
    googleClientSecret: redact((raw.googleClientSecret as string) || process.env.GOOGLE_CLIENT_SECRET || ''),
    microsoftEnabled: Boolean(raw.microsoftEnabled ?? false),
    microsoftClientId: (raw.microsoftClientId as string) ?? process.env.MICROSOFT_CLIENT_ID ?? '',
    microsoftTenantId: (raw.microsoftTenantId as string) ?? process.env.MICROSOFT_TENANT_ID ?? 'common',
    microsoftClientSecret: redact((raw.microsoftClientSecret as string) || process.env.MICROSOFT_CLIENT_SECRET || ''),
    ssoEnabled: Boolean(raw.ssoEnabled ?? false),
    ssoProvider: (raw.ssoProvider as string) ?? 'oidc',
    ssoIssuerUrl: (raw.ssoIssuerUrl as string) ?? '',
    ssoClientId: (raw.ssoClientId as string) ?? '',
    ssoClientSecret: redact((raw.ssoClientSecret as string) || ''),
    zoomEnabled: Boolean(raw.zoomEnabled ?? false),
    zoomClientId: (raw.zoomClientId as string) ?? process.env.ZOOM_CLIENT_ID ?? '',
    zoomClientSecret: redact((raw.zoomClientSecret as string) || process.env.ZOOM_CLIENT_SECRET || ''),
    zoomVerificationToken: (raw.zoomVerificationToken as string) ?? process.env.ZOOM_VERIFICATION_TOKEN ?? '',
    zoomWebhookSecret: redact((raw.zoomWebhookSecret as string) || process.env.ZOOM_WEBHOOK_SECRET || ''),
  };

  return ok(cfg);
}

export async function PUT(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!isAdminRole(me.roles)) return forbid('Administrator access required');

  const body = await parseBody<Partial<IntegrationSettings>>(request).catch(() => null);
  if (!body) return badRequest('Invalid request body');

  const existing = await prisma.appSetting.findUnique({ where: { key: KEY } });
  const prev = (existing?.value as Record<string, unknown> | null) ?? {};
  const next: Record<string, unknown> = { ...prev };

  const REDACTED = new RegExp('^•+');
  const str = (v: unknown, k: string) => { if (v !== undefined && !REDACTED.test(String(v))) next[k] = String(v).trim(); };
  const bool = (v: unknown, k: string) => { if (v !== undefined) next[k] = Boolean(v); };

  bool(body.googleWorkspaceEnabled, 'googleWorkspaceEnabled');
  str(body.googleClientId, 'googleClientId');
  str(body.googleClientSecret, 'googleClientSecret');
  bool(body.microsoftEnabled, 'microsoftEnabled');
  str(body.microsoftClientId, 'microsoftClientId');
  str(body.microsoftTenantId, 'microsoftTenantId');
  str(body.microsoftClientSecret, 'microsoftClientSecret');
  bool(body.ssoEnabled, 'ssoEnabled');
  str(body.ssoProvider, 'ssoProvider');
  str(body.ssoIssuerUrl, 'ssoIssuerUrl');
  str(body.ssoClientId, 'ssoClientId');
  str(body.ssoClientSecret, 'ssoClientSecret');
  bool(body.zoomEnabled, 'zoomEnabled');
  str(body.zoomClientId, 'zoomClientId');
  str(body.zoomClientSecret, 'zoomClientSecret');
  str(body.zoomVerificationToken, 'zoomVerificationToken');
  str(body.zoomWebhookSecret, 'zoomWebhookSecret');

  await prisma.appSetting.upsert({
    where: { key: KEY },
    update: { value: next as unknown as Prisma.InputJsonValue },
    create: { key: KEY, value: next as unknown as Prisma.InputJsonValue },
  });

  await writeAuditLog({
    userId: me.id,
    action: 'settings.integrations_update',
    resourceType: 'app_setting',
    resourceId: KEY,
  });

  return ok({ saved: true });
}
