'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCheck,
  Clock,
  MonitorPlay,
  QrCode,
  UserCheck,
  UserX,
  UserMinus,
  Users,
  Search,
  X,
} from 'lucide-react';
import type { AttendanceRecord, ClassSession, User } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS: { value: 'present' | 'absent' | 'late' | 'excused'; label: string; icon: typeof UserCheck }[] = [
  { value: 'present', label: 'Present', icon: UserCheck },
  { value: 'late', label: 'Late', icon: Clock },
  { value: 'absent', label: 'Absent', icon: UserX },
  { value: 'excused', label: 'Excused', icon: UserMinus },
];

export function AttendanceTracker() {
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [showQrCode, setShowQrCode] = useState(false);
  const [kioskMode, setKioskMode] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [fallbackUsers, setFallbackUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/sessions')
      .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
      .then((json) => {
        if (!active) return;
        const list = Array.isArray(json.data) ? (json.data as ClassSession[]) : [];
        setSessions(list);
        setSelectedSessionId((prev) => (prev && list.some((s) => s.id === prev) ? prev : (list[0]?.id ?? '')));
      })
      .catch(() => {
        if (active) setSessions([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/users?role=student')
      .then((res) => {
        if (!res.ok) return Promise.resolve({ data: [] });
        return res.json();
      })
      .then((json) => {
        if (active) setFallbackUsers(Array.isArray(json.data) ? (json.data as User[]) : []);
      })
      .catch(() => {
        if (active) setFallbackUsers([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!selectedSessionId) {
      setRecords([]);
      return;
    }
    fetch(`/api/attendance/${encodeURIComponent(selectedSessionId)}`)
      .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
      .then((json) => {
        if (active) setRecords(Array.isArray(json.data) ? (json.data as AttendanceRecord[]) : []);
      })
      .catch(() => {
        if (active) setRecords([]);
      });
    return () => {
      active = false;
    };
  }, [selectedSessionId]);

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === selectedSessionId),
    [sessions, selectedSessionId],
  );

  const sessionRecords = useMemo(() => {
    return records.filter((r) => r.sessionId === selectedSessionId);
  }, [records, selectedSessionId]);

  const enrolledUsers = useMemo(() => {
    if (fallbackUsers.length > 0) return fallbackUsers;
    const seen = new Set<string>();
    const users: User[] = [];
    records.forEach((r) => {
      if (r.user && !seen.has(r.user.id)) {
        seen.add(r.user.id);
        users.push(r.user);
      }
    });
    return users;
  }, [fallbackUsers, records]);

  const filteredUsers = useMemo(() => {
    if (!search) return enrolledUsers;
    const q = search.toLowerCase();
    return enrolledUsers.filter((u) => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [enrolledUsers, search]);

  const stats = useMemo(() => {
    const present = sessionRecords.filter((r) => r.status === 'present').length;
    const late = sessionRecords.filter((r) => r.status === 'late').length;
    const absent = sessionRecords.filter((r) => r.status === 'absent').length;
    const excused = sessionRecords.filter((r) => r.status === 'excused').length;
    const total = enrolledUsers.length;
    return { present, late, absent, excused, total, checked: present + late + absent + excused };
  }, [sessionRecords, enrolledUsers]);

  const handleToggleStatus = useCallback(
    async (userId: string, currentStatus: string) => {
      const nextStatus = currentStatus === 'present' ? 'absent' : 'present';
      if (!selectedSessionId) return;
      try {
        const res = await fetch(`/api/attendance/${encodeURIComponent(selectedSessionId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, status: nextStatus, checkInMethod: 'manual' }),
        });
        if (!res.ok) return;
        const json = await res.json();
        const record = json?.data as (AttendanceRecord & { id?: string }) | undefined;
        setRecords((prev) => {
          const existing = prev.find((r) => r.userId === userId);
          if (existing) {
            return prev.map((r) =>
              r.userId === userId
                ? { ...r, status: nextStatus as AttendanceRecord['status'], checkInMethod: 'manual' as const, checkInTime: new Date().toISOString() }
                : r,
            );
          }
          const user = enrolledUsers.find((u) => u.id === userId);
          return [
            ...prev,
            {
              id: record?.id ?? `att_${Date.now()}`,
              sessionId: selectedSessionId,
              userId,
              status: nextStatus as AttendanceRecord['status'],
              checkInMethod: 'manual' as const,
              checkInTime: new Date().toISOString(),
              user,
            },
          ];
        });
      } catch {
        return;
      }
    },
    [selectedSessionId, enrolledUsers],
  );

  const getUserStatus = useCallback(
    (userId: string) => {
      const record = sessionRecords.find((r) => r.userId === userId);
      return record?.status ?? null;
    },
    [sessionRecords],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <label htmlFor="session-select" className="label sr-only">Select session</label>
          <select
            id="session-select"
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="input !py-2 min-w-[20rem]"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} — {s.date.slice(0, 10)} {s.startTime}–{s.endTime}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setKioskMode(true)}
          >
            <MonitorPlay aria-hidden="true" className="h-4 w-4" />
            Kiosk Mode
          </Button>
          <Button
            variant={showQrCode ? 'gold' : 'outline'}
            size="sm"
            onClick={() => setShowQrCode((prev) => !prev)}
          >
            <QrCode aria-hidden="true" className="h-4 w-4" />
            QR Check-in
          </Button>
        </div>
      </div>

      {showQrCode && <QRCodeDisplay sessionId={selectedSessionId} sessionTitle={selectedSession?.title} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Enrolled" value={stats.total} icon={Users} color="text-text-muted" />
        <StatCard label="Present" value={stats.present} icon={UserCheck} color="text-emerald-600" />
        <StatCard label="Late" value={stats.late} icon={Clock} color="text-amber-600" />
        <StatCard label="Absent" value={stats.absent} icon={UserX} color="text-red-600" />
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students..."
              className="input !pl-9 !py-2"
            />
          </div>
        </div>

        <div className="nav-panel divide-y divide-line">
          {filteredUsers.map((user) => {
            const status = getUserStatus(user.id);
            return (
              <div key={user.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text-primary">{user.fullName}</p>
                  <p className="truncate text-xs text-text-muted">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {status && (
                    <Badge
                      variant={
                        status === 'present' ? 'success' : status === 'late' ? 'gold' : status === 'excused' ? 'neutral' : 'danger'
                      }
                      className="text-[11px]"
                    >
                      {STATUS_OPTIONS.find((o) => o.value === status)?.label}
                    </Badge>
                  )}
                  <Button
                    variant={status === 'present' ? 'outline' : 'gold'}
                    size="sm"
                    onClick={() => handleToggleStatus(user.id, status ?? '')}
                  >
                    {status === 'present' ? 'Mark Absent' : 'Mark Present'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {kioskMode && (
        <KioskMode
          sessionId={selectedSessionId}
          sessionTitle={selectedSession?.title}
          users={enrolledUsers}
          getUserStatus={getUserStatus}
          onCheckIn={handleToggleStatus}
          onClose={() => setKioskMode(false)}
        />
      )}
    </div>
  );
}

function KioskMode({
  sessionId,
  sessionTitle,
  users,
  getUserStatus,
  onCheckIn,
  onClose,
}: {
  sessionId: string;
  sessionTitle?: string;
  users: User[];
  getUserStatus: (userId: string) => string | null;
  onCheckIn: (userId: string, status: string) => void;
  onClose: () => void;
}) {
  const present = users.filter((u) => getUserStatus(u.id) === 'present').length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-base-surface">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <div>
          <p className="font-display text-lg font-bold text-text-primary">{sessionTitle ?? 'Attendance Kiosk'}</p>
          <p className="text-xs text-text-muted">{present}/{users.length} checked in</p>
        </div>
        <button type="button" onClick={onClose} className="btn btn-ghost btn-sm !px-2" aria-label="Exit kiosk mode">
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {users.map((user) => {
            const status = getUserStatus(user.id);
            const isPresent = status === 'present';
            return (
              <button
                key={user.id}
                type="button"
                disabled={!sessionId}
                onClick={() => onCheckIn(user.id, status ?? '')}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-2xl border-2 p-5 text-center transition-all',
                  isPresent ? 'border-emerald-500 bg-emerald-500/10' : 'border-line bg-base-elevated hover:border-gold-500',
                )}
              >
                <div className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold',
                  isPresent ? 'bg-emerald-500 text-white' : 'bg-gold-500/15 text-gold-700 dark:text-gold-300',
                )}>
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
                <p className="text-sm font-semibold text-text-primary">{user.fullName}</p>
                <Badge variant={isPresent ? 'success' : 'neutral'}>{isPresent ? 'Present' : 'Tap to check in'}</Badge>
              </button>
            );
          })}
        </div>
        {users.length === 0 && (
          <p className="py-16 text-center text-sm text-text-muted">No enrolled students found.</p>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; color: string }) {
  return (
    <div className="panel flex items-center gap-3">
      <Icon aria-hidden="true" className={cn('h-5 w-5 shrink-0', color)} />
      <div>
        <p className="text-sm font-semibold text-text-primary">{value}</p>
        <p className="text-[11px] text-text-muted">{label}</p>
      </div>
    </div>
  );
}

function QRCodeDisplay({ sessionId, sessionTitle }: { sessionId: string; sessionTitle?: string }) {
  const checkInUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/attendance/${sessionId}?method=qr`;

  return (
    <div className="panel flex flex-col items-center gap-3 py-6 text-center">
      <div className="flex items-center gap-2 rounded-full bg-gold-500/10 px-4 py-1.5">
        <QrCode aria-hidden="true" className="h-5 w-5 text-gold-600" />
        <span className="text-sm font-semibold text-gold-700 dark:text-gold-300">QR Self Check-in</span>
      </div>
      <div className="flex h-40 w-40 items-center justify-center rounded-xl border-2 border-dashed border-line bg-base-surface">
        <QrCode aria-hidden="true" className="h-24 w-24 text-brown-800 dark:text-gold-300" />
      </div>
      <p className="text-xs text-text-muted">
        Students scan this code to check in to: {sessionTitle ?? 'Session'}
      </p>
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        Print QR Code
      </Button>
    </div>
  );
}
