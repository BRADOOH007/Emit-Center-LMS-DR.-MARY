'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  CheckCheck,
  Clock,
  QrCode,
  UserCheck,
  UserX,
  UserMinus,
  Users,
  Search,
} from 'lucide-react';
import { MOCK_SESSIONS, MOCK_USERS, MOCK_ATTENDANCE_RECORDS } from '@/lib/mock-data';
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
  const [selectedSessionId, setSelectedSessionId] = useState(MOCK_SESSIONS[0]?.id ?? '');
  const [showQrCode, setShowQrCode] = useState(false);
  const [records, setRecords] = useState(MOCK_ATTENDANCE_RECORDS);
  const [search, setSearch] = useState('');

  const selectedSession = useMemo(
    () => MOCK_SESSIONS.find((s) => s.id === selectedSessionId),
    [selectedSessionId],
  );

  const sessionRecords = useMemo(() => {
    return records.filter((r) => r.sessionId === selectedSessionId);
  }, [records, selectedSessionId]);

  const enrolledUsers = useMemo(() => {
    return MOCK_USERS.filter((u) => u.roles.includes('student'));
  }, []);

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
      const existing = records.find((r) => r.sessionId === selectedSessionId && r.userId === userId);

      if (existing) {
        setRecords((prev) =>
          prev.map((r) => (r.id === existing.id ? { ...r, status: nextStatus as typeof r.status, checkInMethod: 'manual' as const, checkInTime: new Date().toISOString() } : r)),
        );
      } else {
        const newRecord = {
          id: `att_${Date.now()}`,
          sessionId: selectedSessionId,
          userId,
          status: nextStatus as 'present' | 'absent' | 'late' | 'excused',
          checkInMethod: 'manual' as const,
          checkInTime: new Date().toISOString(),
        };
        setRecords((prev) => [...prev, newRecord]);
      }
    },
    [records, selectedSessionId],
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
            {MOCK_SESSIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} — {s.date.slice(0, 10)} {s.startTime}–{s.endTime}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
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
