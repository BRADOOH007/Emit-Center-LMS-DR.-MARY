import { prisma } from '@/lib/prisma';

// How long audit/activity rows live before they are purged automatically.
// Configurable via AUDIT_RETENTION_HOURS (default 24h).
export const AUDIT_RETENTION_HOURS = (() => {
  const raw = Number(process.env.AUDIT_RETENTION_HOURS ?? 24);
  return Number.isFinite(raw) && raw > 0 ? raw : 24;
})();

// Backstop: at most one opportunistic purge per process every interval.
const BACKSTOP_INTERVAL_MS = 30 * 60 * 1000;
// Only a fraction of writes trigger the check so concurrent instances share
// the work instead of thundering the database at once.
const BACKSTOP_SAMPLE_RATE = 0.02;

let lastBackstopPurgeAt = 0;

const HR_TO_MS = 60 * 60 * 1000;

/**
 * Deletes every audit/activity log older than the retention window. Returns
 * the number of rows removed. Never throws — a failed purge must not break
 * the request that triggered it.
 */
export async function purgeExpiredAuditLogs(): Promise<number> {
  const cutoff = new Date(Date.now() - AUDIT_RETENTION_HOURS * HR_TO_MS);
  try {
    const result = await prisma.auditLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    return result.count;
  } catch {
    return 0;
  }
}

/**
 * Opportunistic safe-guard so the audit table can never grow unbounded even if
 * the periodic cron is missed or misconfigured. Fire-and-forget.
 */
export function maybePurgeExpiredAuditLogs(): void {
  const now = Date.now();
  if (now - lastBackstopPurgeAt < BACKSTOP_INTERVAL_MS) return;
  if (Math.random() > BACKSTOP_SAMPLE_RATE) return;
  lastBackstopPurgeAt = now;
  purgeExpiredAuditLogs().catch(() => {});
}