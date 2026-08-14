import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, forbid, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole, writeAuditLog } from '@/lib/security';

export interface IntegrationSettings {
  googleWorkspaceEnabled: boolean;
  googleClientId: string;
  microsoftEnabled: boolean;
  microsoftClientId: string;
  microsoftTenantId: string;
  ssoEnabled: boolean;
  ssoProvider: string;
  ssoIssuerUrl: string;
  zoomEnabled: boolean;
  zoomClientId: string;
}

const KEY = 'integration_settings';

export async function GET() {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!isAdminRole(me.roles)) return forbid('Administrator access required');

  const setting = await prisma.appSetting.findUnique({ where: { key: KEY } });
  const raw = (setting?.value as Record<string, unknown> | null) ?? {};

  const cfg: IntegrationSettings = {
    googleWorkspaceEnabled: Boolean(raw.googleWorkspaceEnabled ?? false),
    googleClientId: (raw.googleClientId as string) ?? process.env.GOOGLE_CLIENT_ID ?? '',
    microsoftEnabled: Boolean(raw.microsoftEnabled ?? false),
    microsoftClientId: (raw.microsoftClientId as string) ?? process.env.MICROSOFT_CLIENT_ID ?? '',
    microsoftTenantId: (raw.microsoftTenantId as string) ?? process.env.MICROSOFT_TENANT_ID ?? 'common',
    ssoEnabled: Boolean(raw.ssoEnabled ?? false),
    ssoProvider: (raw.ssoProvider as string) ?? 'oidc',
    ssoIssuerUrl: (raw.ssoIssuerUrl as string) ?? '',
    zoomEnabled: Boolean(raw.zoomEnabled ?? false),
    zoomClientId: (raw.zoomClientId as string) ?? process.env.ZOOM_CLIENT_ID ?? '',
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

  const str = (v: unknown, k: string) => { if (v !== undefined) next[k] = String(v).trim(); };
  const bool = (v: unknown, k: string) => { if (v !== undefined) next[k] = Boolean(v); };

  bool(body.googleWorkspaceEnabled, 'googleWorkspaceEnabled');
  str(body.googleClientId, 'googleClientId');
  bool(body.microsoftEnabled, 'microsoftEnabled');
  str(body.microsoftClientId, 'microsoftClientId');
  str(body.microsoftTenantId, 'microsoftTenantId');
  bool(body.ssoEnabled, 'ssoEnabled');
  str(body.ssoProvider, 'ssoProvider');
  str(body.ssoIssuerUrl, 'ssoIssuerUrl');
  bool(body.zoomEnabled, 'zoomEnabled');
  str(body.zoomClientId, 'zoomClientId');

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
