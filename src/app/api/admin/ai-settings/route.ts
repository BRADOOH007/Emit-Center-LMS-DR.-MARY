import { NextRequest } from 'next/server';
import { ok, badRequest, forbid, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import { isAdminRole, writeAuditLog } from '@/lib/security';
import { getAIProviderConfig, saveAIProviderConfig, type AIProviderConfig } from '@/lib/ai-settings';
import { invalidateAIKeyCache } from '@/lib/ai-provider';

export async function GET() {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!isAdminRole(me.roles)) return forbid('Administrator access required');

  const config = await getAIProviderConfig();
  const safe = {
    ...config,
    cerebroKey: config.cerebroKey ? `••••${config.cerebroKey.slice(-4)}` : '',
    deepseekKey: config.deepseekKey ? `••••${config.deepseekKey.slice(-4)}` : '',
    geminiKey: config.geminiKey ? `••••${config.geminiKey.slice(-4)}` : '',
    groqKey: config.groqKey ? `••••${config.groqKey.slice(-4)}` : '',
    openrouterKey: config.openrouterKey ? `••••${config.openrouterKey.slice(-4)}` : '',
    openaiKey: config.openaiKey ? `••••${config.openaiKey.slice(-4)}` : '',
    dalleKey: config.dalleKey ? `••••${config.dalleKey.slice(-4)}` : '',
    stabilityKey: config.stabilityKey ? `••••${config.stabilityKey.slice(-4)}` : '',
  };
  return ok(safe);
}

export async function PUT(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return forbid('Sign in required');
  if (!isAdminRole(me.roles)) return forbid('Administrator access required');

  const body = await parseBody<Partial<AIProviderConfig>>(request).catch(() => null);
  if (!body) return badRequest('Invalid request body');

  const existing = await getAIProviderConfig();
  const redacted = new RegExp('^\\*{4,}');

  const next: AIProviderConfig = {
    cerebroKey: body.cerebroKey && !redacted.test(body.cerebroKey) ? body.cerebroKey.trim() : existing.cerebroKey,
    deepseekKey: body.deepseekKey && !redacted.test(body.deepseekKey) ? body.deepseekKey.trim() : existing.deepseekKey,
    geminiKey: body.geminiKey && !redacted.test(body.geminiKey) ? body.geminiKey.trim() : existing.geminiKey,
    groqKey: body.groqKey && !redacted.test(body.groqKey) ? body.groqKey.trim() : existing.groqKey,
    openrouterKey:
      body.openrouterKey && !redacted.test(body.openrouterKey) ? body.openrouterKey.trim() : existing.openrouterKey,
    openaiKey: body.openaiKey && !redacted.test(body.openaiKey) ? body.openaiKey.trim() : existing.openaiKey,
    dalleKey: body.dalleKey && !redacted.test(body.dalleKey) ? body.dalleKey.trim() : existing.dalleKey,
    stabilityKey:
      body.stabilityKey && !redacted.test(body.stabilityKey) ? body.stabilityKey.trim() : existing.stabilityKey,
    activeProvider: body.activeProvider ?? existing.activeProvider ?? '',
    premiumEnabled: body.premiumEnabled ?? existing.premiumEnabled ?? true,
    premiumOpenaiModel: body.premiumOpenaiModel?.trim() || existing.premiumOpenaiModel || 'gpt-4o',
    premiumGeminiModel: body.premiumGeminiModel?.trim() || existing.premiumGeminiModel || 'gemini-2.0-flash',
    modelDefault: body.modelDefault?.trim() || existing.modelDefault || '',
    modelTeacher: body.modelTeacher?.trim() || existing.modelTeacher || '',
    modelStudent: body.modelStudent?.trim() || existing.modelStudent || '',
    modelPresentation: body.modelPresentation?.trim() || existing.modelPresentation || '',
  };

  await saveAIProviderConfig(next);
  invalidateAIKeyCache();

  await writeAuditLog({
    userId: me.id,
    action: 'settings.ai_update',
    resourceType: 'app_setting',
    resourceId: 'ai_provider_config',
  });

  const safe = { ...next, activeProvider: next.activeProvider ?? '' };
  return ok(safe);
}