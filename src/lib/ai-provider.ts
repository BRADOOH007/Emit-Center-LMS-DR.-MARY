import { fetchWithTimeout, TIMEOUTS } from './fetch-utils';
import { checkInput, logViolation, buildSafeSystemPrompt } from './ai-safety';
import { getAIProviderConfig } from './ai-settings';

export type AIProvider =
  | 'cerebras'
  | 'deepseek'
  | 'gemini'
  | 'groq'
  | 'openrouter'
  | 'openai'
  | 'premium-openai'
  | 'premium-gemini';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICallOptions {
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
  useReasoner?: boolean;
  usePremium?: boolean;
  cerebrasModel?: string;
  deepseekModel?: string;
  geminiModel?: string;
  groqModel?: string;
  openrouterModel?: string;
  openaiModel?: string;
  premiumOpenaiModel?: string;
  premiumGeminiModel?: string;
  taskType?: string;
}

export interface AICallResult {
  content: string;
  provider: AIProvider;
  model: string;
  tokensUsed?: number;
  latencyMs?: number;
}

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const CEREBRAS_URL = 'https://api.cerebras.ai/v1/chat/completions';

async function callHTTP(
  url: string,
  apiKey: string,
  model: string,
  messages: AIMessage[],
  maxTokens = 2000,
  temperature = 0.7,
  allKeys?: string[],
): Promise<{ content: string; tokensUsed?: number }> {
  const keys = allKeys && allKeys.length > 0 ? allKeys : [apiKey];
  let lastError: string = '';
  for (const key of keys) {
    try {
      const res = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://emitcenter.com',
            'X-Title': 'EMIT Center AI',
          },
          body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
        },
        TIMEOUTS.AI,
      );
      if (!res.ok) {
        lastError = `${url} ${res.status}`;
        continue;
      }
      const data = await res.json();
      return {
        content: data?.choices?.[0]?.message?.content || '',
        tokensUsed: data?.usage?.total_tokens,
      };
    } catch (e: any) {
      lastError = e.message || 'Network error';
      continue;
    }
  }
  throw new Error(`All keys failed for ${url}: ${lastError}`);
}

let configCache: {
  config: Awaited<ReturnType<typeof getAIProviderConfig>>;
  time: number;
} | null = null;

async function getSettings(): Promise<Awaited<ReturnType<typeof getAIProviderConfig>>> {
  if (!configCache || Date.now() - configCache.time >= 60_000) {
    configCache = {
      config: await getAIProviderConfig(),
      time: Date.now(),
    };
  }
  return configCache.config;
}

export function invalidateAIKeyCache(): void {
  configCache = null;
}

function pick(configValue: string | undefined, envVar: string): string | undefined {
  const raw = process.env[envVar] || configValue;
  if (!raw) return undefined;
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return parts[0];
}

function pickAll(configValue: string | undefined, envVar: string): string[] {
  const raw = process.env[envVar] || configValue;
  if (!raw) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export async function callAI(opts: AICallOptions): Promise<AICallResult> {
  const {
    messages,
    maxTokens = 2000,
    temperature = 0.7,
    useReasoner = false,
    usePremium = true,
    cerebrasModel = process.env.CEREBRAS_MODEL || 'gpt-oss-120b',
    deepseekModel = useReasoner ? 'deepseek-reasoner' : (process.env.DEEPSEEK_MODEL || 'deepseek-chat'),
    geminiModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    groqModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    openrouterModel = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
    openaiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini',
    premiumOpenaiModel = process.env.PREMIUM_OPENAI_MODEL || 'gpt-4o',
    premiumGeminiModel = process.env.PREMIUM_GEMINI_MODEL || 'gemini-2.0-flash',
  } = opts;

  const settings = await getSettings();

  const CEREBRAS_KEY = pick(settings.cerebroKey, 'CEREBRAS_API_KEY');
  const DEEPSEEK_KEY = pick(settings.deepseekKey, 'DEEPSEEK_API_KEY');
  const GEMINI_KEY = pick(settings.geminiKey, 'GEMINI_API_KEY');
  const GROQ_KEY = pick(settings.groqKey, 'GROQ_API_KEY');
  const OPENROUTER_KEY = pick(settings.openrouterKey, 'OPENROUTER_API_KEY');
  const OPENAI_KEY = pick(settings.openaiKey, 'OPENAI_API_KEY');

  const ALL_CEREBRAS_KEYS = pickAll(settings.cerebroKey, 'CEREBRAS_API_KEY');
  const ALL_DEEPSEEK_KEYS = pickAll(settings.deepseekKey, 'DEEPSEEK_API_KEY');
  const ALL_GEMINI_KEYS = pickAll(settings.geminiKey, 'GEMINI_API_KEY');
  const ALL_GROQ_KEYS = pickAll(settings.groqKey, 'GROQ_API_KEY');
  const ALL_OPENROUTER_KEYS = pickAll(settings.openrouterKey, 'OPENROUTER_API_KEY');
  const ALL_OPENAI_KEYS = pickAll(settings.openaiKey, 'OPENAI_API_KEY');

  if (!CEREBRAS_KEY && !DEEPSEEK_KEY && !GEMINI_KEY && !GROQ_KEY && !OPENROUTER_KEY && !OPENAI_KEY) {
    throw new Error('No AI keys configured. Add keys via the AI settings page or set env vars.');
  }

  const resolvedPremium = usePremium && settings.premiumEnabled !== false;
  const resolvedPremiumOpenai = settings.premiumOpenaiModel || premiumOpenaiModel;
  const resolvedPremiumGemini = settings.premiumGeminiModel || premiumGeminiModel;
  const activeProvider = settings.activeProvider;
  const taskModels: Record<string, string> = {
    default: settings.modelDefault || '',
    teacher: settings.modelTeacher || '',
    student: settings.modelStudent || '',
    presentation: settings.modelPresentation || '',
  };
  const taskModel = opts.taskType ? taskModels[opts.taskType] || taskModels.default : taskModels.default;
  const effectiveGroqModel = taskModel || groqModel;
  const effectiveCerebrasModel = taskModel || cerebrasModel;
  const effectiveDeepseekModel = useReasoner ? 'deepseek-reasoner' : (taskModel || deepseekModel);
  const effectiveGeminiModel = taskModel || geminiModel;
  const effectiveOpenrouterModel = taskModel || openrouterModel;
  const effectiveOpenaiModel = taskModel || openaiModel;

  const errors: string[] = [];
  const start = Date.now();

  const userMessage = messages.find((m) => m.role === 'user')?.content || '';
  const inputCheck = checkInput(userMessage);
  if (!inputCheck.passed) {
    logViolation({
      userId: 'unknown',
      userRole: 'unknown',
      input: userMessage,
      reason: inputCheck.reason || 'Non-educational content',
      category: inputCheck.category || 'non_educational',
      route: 'callAI',
    });
    return {
      content:
        "I'm designed to help with educational topics. Please ask me something related to teaching, learning, or your school subjects.",
      provider: 'groq' as AIProvider,
      model: 'safety-filter',
    };
  }

  const safeMessages = messages.map((m) =>
    m.role === 'system' ? { ...m, content: buildSafeSystemPrompt(m.content) } : m,
  );

  if (activeProvider && !useReasoner) {
    const providerConfig: Record<string, { key: string | undefined; url: string; model: string }> = {
      groq: { key: GROQ_KEY, url: GROQ_URL, model: effectiveGroqModel },
      cerebras: { key: CEREBRAS_KEY, url: CEREBRAS_URL, model: effectiveCerebrasModel },
      deepseek: { key: DEEPSEEK_KEY, url: DEEPSEEK_URL, model: effectiveDeepseekModel },
      gemini: { key: GEMINI_KEY, url: GEMINI_URL, model: effectiveGeminiModel },
      openrouter: { key: OPENROUTER_KEY, url: OPENROUTER_URL, model: effectiveOpenrouterModel },
      openai: { key: OPENAI_KEY, url: OPENAI_URL, model: effectiveOpenaiModel },
    };
    const cfg = providerConfig[activeProvider];
    if (cfg?.key) {
      try {
        const allKeys =
          activeProvider === 'groq'
            ? ALL_GROQ_KEYS
            : activeProvider === 'cerebras'
              ? ALL_CEREBRAS_KEYS
              : activeProvider === 'deepseek'
                ? ALL_DEEPSEEK_KEYS
                : activeProvider === 'gemini'
                  ? ALL_GEMINI_KEYS
                  : activeProvider === 'openrouter'
                    ? ALL_OPENROUTER_KEYS
                    : ALL_OPENAI_KEYS;
        const { content, tokensUsed } = await callHTTP(
          cfg.url,
          cfg.key,
          cfg.model,
          safeMessages,
          maxTokens,
          temperature,
          allKeys,
        );
        if (content)
          return {
            content,
            provider: activeProvider as AIProvider,
            model: cfg.model,
            tokensUsed,
            latencyMs: Date.now() - start,
          };
      } catch (e: any) {
        errors.push(`Active provider ${activeProvider}: ${e.message}`);
        console.warn('[AI] Active provider:', e.message);
      }
    }
  }

  if (OPENAI_KEY && !OPENAI_KEY.startsWith('sk-or-') && resolvedPremium) {
    try {
      const { content, tokensUsed } = await callHTTP(
        OPENAI_URL,
        OPENAI_KEY,
        resolvedPremiumOpenai,
        safeMessages,
        maxTokens,
        temperature,
        ALL_OPENAI_KEYS,
      );
      if (content)
        return {
          content,
          provider: 'premium-openai',
          model: resolvedPremiumOpenai,
          tokensUsed,
          latencyMs: Date.now() - start,
        };
    } catch (e: any) {
      errors.push(`Premium OpenAI: ${e.message}`);
      console.warn('[AI] Premium OpenAI:', e.message);
    }
  }

  if (GEMINI_KEY && resolvedPremium) {
    try {
      const { content, tokensUsed } = await callHTTP(
        GEMINI_URL,
        GEMINI_KEY,
        resolvedPremiumGemini,
        safeMessages,
        maxTokens,
        temperature,
        ALL_GEMINI_KEYS,
      );
      if (content)
        return {
          content,
          provider: 'premium-gemini',
          model: resolvedPremiumGemini,
          tokensUsed,
          latencyMs: Date.now() - start,
        };
    } catch (e: any) {
      errors.push(`Premium Gemini: ${e.message}`);
      console.warn('[AI] Premium Gemini:', e.message);
    }
  }

  if (GROQ_KEY && !useReasoner) {
    try {
      const { content, tokensUsed } = await callHTTP(
        GROQ_URL,
        GROQ_KEY,
        effectiveGroqModel,
        safeMessages,
        maxTokens,
        temperature,
        ALL_GROQ_KEYS,
      );
      if (content)
        return { content, provider: 'groq', model: effectiveGroqModel, tokensUsed, latencyMs: Date.now() - start };
    } catch (e: any) {
      errors.push(`Groq: ${e.message}`);
      console.warn('[AI] Groq:', e.message);
    }
  }

  if (CEREBRAS_KEY && !useReasoner) {
    try {
      const { content, tokensUsed } = await callHTTP(
        CEREBRAS_URL,
        CEREBRAS_KEY,
        effectiveCerebrasModel,
        safeMessages,
        maxTokens,
        temperature,
        ALL_CEREBRAS_KEYS,
      );
      if (content)
        return {
          content,
          provider: 'cerebras',
          model: effectiveCerebrasModel,
          tokensUsed,
          latencyMs: Date.now() - start,
        };
    } catch (e: any) {
      errors.push(`Cerebras: ${e.message}`);
      console.warn('[AI] Cerebras:', e.message);
    }
  }

  if (DEEPSEEK_KEY) {
    try {
      const { content, tokensUsed } = await callHTTP(
        DEEPSEEK_URL,
        DEEPSEEK_KEY,
        effectiveDeepseekModel,
        safeMessages,
        maxTokens,
        temperature,
        ALL_DEEPSEEK_KEYS,
      );
      if (content)
        return {
          content,
          provider: 'deepseek',
          model: effectiveDeepseekModel,
          tokensUsed,
          latencyMs: Date.now() - start,
        };
    } catch (e: any) {
      errors.push(`DeepSeek: ${e.message}`);
      console.warn('[AI] DeepSeek:', e.message);
    }
  }

  if (GEMINI_KEY) {
    try {
      const { content, tokensUsed } = await callHTTP(
        GEMINI_URL,
        GEMINI_KEY,
        effectiveGeminiModel,
        safeMessages,
        maxTokens,
        temperature,
        ALL_GEMINI_KEYS,
      );
      if (content)
        return { content, provider: 'gemini', model: effectiveGeminiModel, tokensUsed, latencyMs: Date.now() - start };
    } catch (e: any) {
      errors.push(`Gemini: ${e.message}`);
      console.warn('[AI] Gemini:', e.message);
    }
  }

  const effectiveORKey = OPENROUTER_KEY || (OPENAI_KEY?.startsWith('sk-or-') ? OPENAI_KEY : undefined);
  if (effectiveORKey) {
    const isOR = effectiveORKey.startsWith('sk-or-');
    const url = isOR ? OPENROUTER_URL : OPENAI_URL;
    const model = isOR ? effectiveOpenrouterModel : effectiveOpenaiModel;
    const allORKeys = isOR ? ALL_OPENROUTER_KEYS : ALL_OPENAI_KEYS;
    try {
      const { content, tokensUsed } = await callHTTP(url, effectiveORKey, model, safeMessages, maxTokens, temperature, allORKeys);
      if (content)
        return { content, provider: isOR ? 'openrouter' : 'openai', model, tokensUsed, latencyMs: Date.now() - start };
    } catch (e: any) {
      errors.push(`OpenRouter: ${e.message}`);
      console.warn('[AI] OpenRouter:', e.message);
    }
  }

  if (OPENAI_KEY && !OPENAI_KEY.startsWith('sk-or-') && OPENAI_KEY !== OPENROUTER_KEY) {
    try {
      const { content, tokensUsed } = await callHTTP(
        OPENAI_URL,
        OPENAI_KEY,
        effectiveOpenaiModel,
        safeMessages,
        maxTokens,
        temperature,
        ALL_OPENAI_KEYS,
      );
      if (content)
        return { content, provider: 'openai', model: effectiveOpenaiModel, tokensUsed, latencyMs: Date.now() - start };
    } catch (e: any) {
      errors.push(`OpenAI: ${e.message}`);
    }
  }

  if (errors.length === 0) {
    throw new Error('All AI providers skipped — no response generated');
  }
  throw new Error(`All AI providers failed:\n${errors.join('\n')}`);
}

export async function getAIResponse(
  systemPrompt: string,
  userMessage: string,
  opts?: Partial<AICallOptions>,
): Promise<string> {
  const result = await callAI({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    ...opts,
  });
  return result.content;
}

export async function getAIReasoning(
  systemPrompt: string,
  userMessage: string,
  opts?: Partial<AICallOptions>,
): Promise<string> {
  return getAIResponse(systemPrompt, userMessage, { ...opts, useReasoner: true });
}