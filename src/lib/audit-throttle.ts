// In-memory throttle map so high-frequency events (e.g. student asking the AI
// tutor) still land in the recent-activity feed but never flood the database.
const lastLoggedAt = new Map<string, number>();

const DEFAULT_THROTTLE_MS = 60 * 1000;

/**
 * Returns true the first time it is called for a key within `throttleMs`, and
 * false afterwards until the window elapses.
 */
export function shouldAudit(key: string, throttleMs = DEFAULT_THROTTLE_MS): boolean {
  const now = Date.now();
  const last = lastLoggedAt.get(key) ?? 0;
  if (now - last < throttleMs) return false;
  lastLoggedAt.set(key, now);
  return true;
}

/**
 * Prevents `lastLoggedAt` from growing forever on long-lived processes.
 * Call periodically (e.g. from the purge routine) to drop stale keys.
 */
export function pruneAuditThrottle(maxAgeMs = 10 * 60 * 1000): void {
  const cutoff = Date.now() - maxAgeMs;
  for (const [key, ts] of lastLoggedAt) {
    if (ts < cutoff) lastLoggedAt.delete(key);
  }
}