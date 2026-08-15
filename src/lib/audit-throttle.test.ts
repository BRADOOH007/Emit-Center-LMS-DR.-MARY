import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { shouldAudit, pruneAuditThrottle } from '@/lib/audit-throttle';

describe('audit-throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    // Reset module state between tests.
    vi.resetModules();
  });

  it('allows the first event then throttles within the window', () => {
    expect(shouldAudit('a:first', 1000)).toBe(true);
    expect(shouldAudit('a:first', 1000)).toBe(false);
  });

  it('allows a different key independently', () => {
    expect(shouldAudit('b:k1', 1000)).toBe(true);
    expect(shouldAudit('b:k2', 1000)).toBe(true);
  });

  it('re-allows after the window elapses', () => {
    expect(shouldAudit('c:win', 1000)).toBe(true);
    vi.advanceTimersByTime(1001);
    expect(shouldAudit('c:win', 1000)).toBe(true);
  });

  it('pruneAuditThrottle drops stale keys', () => {
    expect(shouldAudit('stale:key', 1000)).toBe(true);
    vi.advanceTimersByTime(11 * 60 * 1000);
    pruneAuditThrottle(10 * 60 * 1000);
    // Key was dropped, so it logs again immediately.
    expect(shouldAudit('stale:key', 1000)).toBe(true);
  });
});
