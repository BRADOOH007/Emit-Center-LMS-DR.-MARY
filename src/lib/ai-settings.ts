import { prisma } from '@/lib/prisma';

export const AI_SETTINGS_KEY = 'ai_provider_config';

export interface AIProviderConfig {
  cerebroKey?: string;
  deepseekKey?: string;
  geminiKey?: string;
  groqKey?: string;
  openrouterKey?: string;
  openaiKey?: string;
  dalleKey?: string;
  stabilityKey?: string;
  activeProvider?: string;
  premiumEnabled?: boolean;
  premiumOpenaiModel?: string;
  premiumGeminiModel?: string;
  modelDefault?: string;
  modelTeacher?: string;
  modelStudent?: string;
  modelPresentation?: string;
}

export const emptyConfig: AIProviderConfig = {
  activeProvider: '',
  premiumEnabled: true,
  premiumOpenaiModel: 'gpt-4o',
  premiumGeminiModel: 'gemini-2.0-flash',
};

export async function getAIProviderConfig(): Promise<AIProviderConfig> {
  try {
    const setting = await prisma.appSetting.findUnique({ where: { key: AI_SETTINGS_KEY } });
    const raw = (setting?.value as Partial<AIProviderConfig> | null) ?? {};
    return {
      ...emptyConfig,
      ...raw,
      activeProvider: raw.activeProvider ?? '',
      premiumEnabled: raw.premiumEnabled ?? true,
    };
  } catch {
    return { ...emptyConfig };
  }
}

export async function saveAIProviderConfig(next: AIProviderConfig): Promise<AIProviderConfig> {
  await prisma.appSetting.upsert({
    where: { key: AI_SETTINGS_KEY },
    update: { value: next as object },
    create: { key: AI_SETTINGS_KEY, value: next as object },
  });
  return next;
}