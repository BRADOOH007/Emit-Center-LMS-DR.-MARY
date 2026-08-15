'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, LogOut, MonitorSmartphone, RefreshCw, ShieldX } from 'lucide-react';
import type { SessionRecord } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/toast';

function deviceLabel(userAgent: string | null): string {
  if (!userAgent) return 'Unknown device';
  const ua = userAgent;
  const get = (re: RegExp): string | null => ua.match(re)?.[1] ?? null;
  const browser =
    get(/Edg\/([\d.]+)/) ? 'Microsoft Edge'
    : get(/Chrome\/([\d.]+)/) ? 'Chrome'
    : get(/Firefox\/([\d.]+)/) ? 'Firefox'
    : get(/Safari\/([\d.]+)/) ? 'Safari'
    : get(/MSIE\s([\d.]+)/) ? 'Internet Explorer'
    : 'Browser';
  const os = get(/Windows NT 10\.0/) ? 'Windows'
    : get(/Mac OS X/) ? 'macOS'
    : get(/Android/) ? 'Android'
    : get(/iPhone|iPad|iPod/) ? 'iOS'
    : get(/Linux/) ? 'Linux'
    : 'OS';
  const mobile = /Mobile|Android|iPhone|iPad/.test(ua) ? 'mobile' : 'desktop';
  return `${browser} on ${os} (${mobile})`;
}

function formatRelative(isoUtc: string): string {
  const then = new Date(isoUtc).getTime();
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function ActiveSessions() {
  const toast = useToast();
  const [sessions, setSessions] = useState<SessionRecord[] | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [revokingOthers, setRevokingOthers] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/sessions', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Could not load sessions', json.error);
        return;
      }
      setSessions(json.data.sessions);
      setCurrentSessionId(json.data.currentSessionId);
    } catch {
      toast.error('Network error', 'Please try again.');
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const revokeOne = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/auth/sessions/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Could not end session', json.error);
        return;
      }
      setSessions((prev) => prev?.filter((s) => s.id !== id) ?? null);
      toast.success('Session ended', 'That device is now signed out.');
    } catch {
      toast.error('Network error', 'Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const revokeOthers = async () => {
    setRevokingOthers(true);
    try {
      const res = await fetch('/api/auth/sessions/revoke-others', { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Could not sign out other devices', json.error);
        return;
      }
      setSessions((prev) => prev?.filter((s) => s.isCurrent) ?? null);
      toast.success(
        `Signed out ${json.data.revoked} other device${json.data.revoked === 1 ? '' : 's'}`,
        'Only this session remains active.',
      );
    } catch {
      toast.error('Network error', 'Please try again.');
    } finally {
      setRevokingOthers(false);
    }
  };

  const hasOtherSessions = (sessions ?? []).some((s) => !s.isCurrent);

  return (
    <section className="panel p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold text-text-primary">Active sessions</h2>
          <p className="mt-1 text-sm text-text-muted">
            Devices currently signed into your account. Sessions expire after 7 days without a visit, and newer activity
            overrides older sessions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={load} aria-label="Refresh sessions">
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            Refresh
          </Button>
          {hasOtherSessions && (
            <Button type="button" size="sm" variant="danger" onClick={revokeOthers} disabled={revokingOthers}>
              {revokingOthers ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldX aria-hidden="true" className="h-4 w-4" />
              )}
              Sign out other devices
            </Button>
          )}
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {sessions === null ? (
          <div className="flex items-center gap-3 rounded-panel border border-line bg-base-muted px-4 py-6 text-sm text-text-muted">
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-gold-600 dark:text-gold-400" />
            Loading active sessions…
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-panel border border-line bg-base-muted px-4 py-6 text-sm text-text-muted">
            No active sessions found.
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className="flex flex-wrap items-center gap-3 rounded-panel border border-line bg-base px-4 py-3"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-500/15 text-gold-700 dark:text-gold-300">
                <MonitorSmartphone aria-hidden="true" className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-text-primary">{deviceLabel(session.userAgent)}</p>
                  {session.isCurrent && <Badge variant="success" dot>This device</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-text-muted">
                  {session.ipAddress ? `IP ${session.ipAddress} · ` : ''}Active {formatRelative(session.lastUsedAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!session.isCurrent && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => revokeOne(session.id)} disabled={busyId !== null}>
                    {busyId === session.id ? (
                      <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut aria-hidden="true" className="h-4 w-4" />
                    )}
                    End session
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}