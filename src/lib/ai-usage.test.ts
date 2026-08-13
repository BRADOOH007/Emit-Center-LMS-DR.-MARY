import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCache = vi.hoisted(() => ({
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  incr: vi.fn().mockResolvedValue(1),
  expire: vi.fn().mockResolvedValue(undefined),
  ttl: vi.fn(),
}));

vi.mock('@/lib/cache', () => ({ cache: mockCache }));

import { checkAIUsageAllowed, recordAIUsage, getAIUsageStats, getUsageLimits } from '@/lib/ai-usage';
import { prisma } from '@/lib/prisma';

describe('ai-usage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-set default return values after clearAllMocks
    mockCache.get.mockResolvedValue(null);
    mockCache.set.mockResolvedValue(undefined);
    mockCache.incr.mockResolvedValue(1);
    mockCache.expire.mockResolvedValue(undefined);
  });

  describe('getUsageLimits', () => {
    it('returns unlimited for SUPER_ADMIN role', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ roles: ['super_admin'] });

      const limits = await getUsageLimits('admin-1');

      expect(limits.dailyCalls).toBe(999999);
      expect(limits.monthlyCalls).toBe(999999);
    });

    it('returns default limits when no user found', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      const limits = await getUsageLimits('unknown-user');

      expect(limits.dailyCalls).toBe(10);
      expect(limits.monthlyCalls).toBe(200);
    });

    it('returns tier-specific limits for instructors', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ roles: ['instructor'] });

      const limits = await getUsageLimits('teacher-1');

      expect(limits.dailyCalls).toBe(60);
      expect(limits.monthlyCalls).toBe(2000);
    });

    it('returns default for students', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ roles: ['student'] });

      const limits = await getUsageLimits('student-1');

      expect(limits.dailyCalls).toBe(10);
    });

    it('uses cached limits when available', async () => {
      mockCache.get.mockResolvedValueOnce(
        JSON.stringify({ dailyCalls: 50, monthlyCalls: 1500, maxTokensPerCall: 3000, maxTokensPerDay: 50000 }),
      );

      const limits = await getUsageLimits('teacher-1');

      expect(limits.dailyCalls).toBe(50);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('checkAIUsageAllowed', () => {
    it('allows when under limits', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ roles: ['super_admin'] });

      const result = await checkAIUsageAllowed('admin-1');

      expect(result.allowed).toBe(true);
    });

    it('blocks when daily limit reached', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ roles: ['student'] });

      // Student tier: 10 daily. Return 10+ for the daily key.
      mockCache.get.mockImplementation(async (key: string) => {
        if (key.startsWith('ai-limits:')) return null;
        if (key.startsWith('ai-usage:')) return '10';
        return null;
      });

      const result = await checkAIUsageAllowed('student-1');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Daily AI limit');
    });

    it('blocks when monthly limit reached', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ roles: ['student'] });

      // Student tier: 10 daily, 200 monthly.
      mockCache.get
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('0')
        .mockResolvedValueOnce('200');

      const result = await checkAIUsageAllowed('student-1');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Monthly AI limit');
    });

    it('fails open when cache error occurs', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ roles: ['super_admin'] });
      mockCache.get.mockRejectedValue(new Error('Cache down'));

      const result = await checkAIUsageAllowed('admin-1');

      expect(result.allowed).toBe(true);
    });
  });

  describe('recordAIUsage', () => {
    it('increments daily and monthly counters', async () => {
      await recordAIUsage('user-1');

      expect(mockCache.incr).toHaveBeenCalledTimes(2);
      expect(mockCache.expire).toHaveBeenCalled();
    });

    it('records token usage when provided', async () => {
      mockCache.get.mockResolvedValue('100');

      await recordAIUsage('user-1', 50);

      expect(mockCache.set).toHaveBeenCalledWith(
        expect.stringContaining('ai-tokens:user-1:'),
        '150',
        expect.any(Number),
      );
    });

    it('starts token count from 0 when no previous tokens', async () => {
      await recordAIUsage('user-1', 50);

      expect(mockCache.set).toHaveBeenCalledWith(
        expect.stringContaining('ai-tokens:user-1:'),
        '50',
        expect.any(Number),
      );
    });
  });

  describe('getAIUsageStats', () => {
    it('returns usage stats', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ roles: ['super_admin'] });

      mockCache.get
        .mockResolvedValueOnce(
          JSON.stringify({ dailyCalls: 999999, monthlyCalls: 999999, maxTokensPerCall: 4000, maxTokensPerDay: 9999999 }),
        )
        .mockResolvedValueOnce('5')
        .mockResolvedValueOnce('100')
        .mockResolvedValueOnce('5000');

      const stats = await getAIUsageStats('admin-1');

      expect(stats.daily).toBe(5);
      expect(stats.monthly).toBe(100);
      expect(stats.tokensThisMonth).toBe(5000);
      expect(stats.dailyLimit).toBe(999999);
    });

    it('returns zeros on cache error', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ roles: ['super_admin'] });
      mockCache.get.mockRejectedValue(new Error('Cache down'));

      const stats = await getAIUsageStats('admin-1');

      expect(stats.daily).toBe(0);
      expect(stats.monthly).toBe(0);
      expect(stats.tokensThisMonth).toBe(0);
    });
  });
});