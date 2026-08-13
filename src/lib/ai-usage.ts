import { prisma } from '@/lib/prisma';
import { cache } from '@/lib/cache';

export interface AIUsageLimits {
  dailyCalls: number;
  monthlyCalls: number;
  maxTokensPerCall: number;
  maxTokensPerDay: number;
}

const DEFAULT_LIMITS: AIUsageLimits = {
  dailyCalls: 10,
  monthlyCalls: 200,
  maxTokensPerCall: 1000,
  maxTokensPerDay: 5000,
};

const LIMITS_BY_ROLE: Record<string, AIUsageLimits> = {
  super_admin: { dailyCalls: 999999, monthlyCalls: 999999, maxTokensPerCall: 4000, maxTokensPerDay: 9999999 },
  administrator: { dailyCalls: 200, monthlyCalls: 10000, maxTokensPerCall: 4000, maxTokensPerDay: 200000 },
  instructor: { dailyCalls: 60, monthlyCalls: 2000, maxTokensPerCall: 3000, maxTokensPerDay: 50000 },
  student: DEFAULT_LIMITS,
  parent: DEFAULT_LIMITS,
};

function getTodayKey(userId: string): string {
  const d = new Date();
  return `ai-usage:${userId}:${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getMonthKey(userId: string): string {
  const d = new Date();
  return `ai-usage:${userId}:${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function getUsageLimits(userId: string): Promise<AIUsageLimits> {
  try {
    const cached = await cache.get(`ai-limits:${userId}`);
    if (cached) return JSON.parse(cached) as AIUsageLimits;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    });
    if (!user) return DEFAULT_LIMITS;

    const role = user.roles[0] ?? 'student';
    const limits = LIMITS_BY_ROLE[role] ?? DEFAULT_LIMITS;
    await cache.set(`ai-limits:${userId}`, JSON.stringify(limits), 3600).catch(() => {});
    return limits;
  } catch {
    return DEFAULT_LIMITS;
  }
}

export async function checkAIUsageAllowed(
  userId: string,
): Promise<{ allowed: boolean; reason?: string; limits: AIUsageLimits }> {
  const limits = await getUsageLimits(userId);

  const dailyKey = getTodayKey(userId);
  const monthlyKey = getMonthKey(userId);

  try {
    const [dailyCount, monthlyCount] = await Promise.all([
      cache.get(dailyKey).then((v) => (v ? parseInt(v as string, 10) : 0)),
      cache.get(monthlyKey).then((v) => (v ? parseInt(v as string, 10) : 0)),
    ]);

    if (dailyCount >= limits.dailyCalls) {
      return { allowed: false, reason: `Daily AI limit reached (${limits.dailyCalls}/day). Resets at midnight.`, limits };
    }
    if (monthlyCount >= limits.monthlyCalls) {
      return { allowed: false, reason: `Monthly AI limit reached (${limits.monthlyCalls}/month). Resets next month.`, limits };
    }

    return { allowed: true, limits };
  } catch {
    return { allowed: true, limits };
  }
}

export async function recordAIUsage(userId: string, tokensUsed: number = 0): Promise<void> {
  const dailyKey = getTodayKey(userId);
  const monthlyKey = getMonthKey(userId);

  try {
    await Promise.all([
      cache.incr(dailyKey).then(async (count) => {
        if (count === 1) await cache.expire(dailyKey, 86400);
      }),
      cache.incr(monthlyKey).then(async (count) => {
        if (count === 1) await cache.expire(monthlyKey, 31 * 86400);
      }),
    ]);

    if (tokensUsed > 0) {
      const tokenKey = `ai-tokens:${userId}:${new Date().toISOString().slice(0, 7)}`;
      try {
        const current = await cache.get(tokenKey).then((v) => (v ? parseInt(v as string, 10) : 0));
        await cache.set(tokenKey, String(current + tokensUsed), 31 * 86400);
      } catch {
        /* non-fatal */
      }
    }
  } catch {
    /* non-fatal */
  }
}

export async function getAIUsageStats(
  userId: string,
): Promise<{ daily: number; dailyLimit: number; monthly: number; monthlyLimit: number; tokensThisMonth: number }> {
  const limits = await getUsageLimits(userId);
  const dailyKey = getTodayKey(userId);
  const monthlyKey = getMonthKey(userId);
  const tokenKey = `ai-tokens:${userId}:${new Date().toISOString().slice(0, 7)}`;

  try {
    const [daily, monthly, tokens] = await Promise.all([
      cache.get(dailyKey).then((v) => (v ? parseInt(v as string, 10) : 0)),
      cache.get(monthlyKey).then((v) => (v ? parseInt(v as string, 10) : 0)),
      cache.get(tokenKey).then((v) => (v ? parseInt(v as string, 10) : 0)),
    ]);

    return {
      daily,
      dailyLimit: limits.dailyCalls,
      monthly,
      monthlyLimit: limits.monthlyCalls,
      tokensThisMonth: tokens,
    };
  } catch {
    return { daily: 0, dailyLimit: limits.dailyCalls, monthly: 0, monthlyLimit: limits.monthlyCalls, tokensThisMonth: 0 };
  }
}