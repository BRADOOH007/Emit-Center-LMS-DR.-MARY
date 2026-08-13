'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, MapPin, Monitor, Search } from 'lucide-react';
import { PageIntro, DataColumn, DataTable, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { StatusBadge } from '@/components/dashboard/status';
import { useLocale } from '@/components/providers/AppProviders';

interface SessionRow {
  id: string;
  courseId: string;
  title: string;
  format: string;
  date: string;
  startTime: string;
  endTime: string;
  sessionType: string;
  status: string;
  meetingLink?: string;
  instructor?: { id: string; fullName: string } | null;
}

interface EnrollmentItem {
  userId: string;
  courseId: string;
  status: string;
}

export function StudentClasses({ studentId }: { studentId: string }) {
  const { formatDate } = useLocale();
  const [search, setSearch] = useState('');
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch('/api/enrollments').then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] }))),
      fetch('/api/sessions').then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] }))),
    ])
      .then(([enrollmentsJson, sessionsJson]) => {
        if (!active) return;
        const enrollments = (Array.isArray(enrollmentsJson.data) ? enrollmentsJson.data : []) as EnrollmentItem[];
        const courseIds = enrollments
          .filter((e) => e.userId === studentId && e.status === 'active')
          .map((e) => e.courseId);
        const all = (Array.isArray(sessionsJson.data) ? sessionsJson.data : []) as SessionRow[];
        setSessions(all.filter((s) => courseIds.includes(s.courseId)));
      })
      .catch(() => {
        if (active) setSessions([]);
      });
    return () => {
      active = false;
    };
  }, [studentId]);

  const filtered = sessions.filter((s) => s.title.toLowerCase().includes(search.toLowerCase()));

  const columns: DataColumn<SessionRow>[] = [
    {
      key: 'session',
      header: 'Session',
      render: (session) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-text-primary">{session.title}</p>
          <p className="text-xs text-text-muted">{session.sessionType} · {formatDate(session.date)}</p>
        </div>
      ),
    },
    {
      key: 'time',
      header: 'Time',
      render: (session) => <span className="text-sm tabular-nums text-text-primary">{session.startTime}–{session.endTime}</span>,
    },
    {
      key: 'location',
      header: 'Location',
      render: (session) => (
        <span className="flex items-center gap-1.5 text-sm text-text-primary">
          {session.format === 'onsite' ? (
            <><MapPin className="h-3.5 w-3.5 text-brown-500" />Onsite</>
          ) : (
            <><Monitor className="h-3.5 w-3.5 text-gold-600" />Online</>
          )}
        </span>
      ),
    },
    {
      key: 'instructor',
      header: 'Instructor',
      render: (session) => <span className="text-sm text-text-primary">{session.instructor?.fullName ?? '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (session) => <StatusBadge status={session.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Student · Classes"
        title="My Classes"
        subtitle={`${sessions.length} sessions across your courses`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Sessions" value={sessions.length} hint="All courses" icon={CalendarDays} tone="gold" />
        <StatCard label="Upcoming" value={sessions.filter((s) => s.status === 'scheduled').length} hint="Scheduled" icon={CalendarDays} tone="blue" />
        <StatCard label="Onsite" value={sessions.filter((s) => s.format === 'onsite').length} hint="In-person" icon={CalendarDays} tone="brown" />
        <StatCard label="Online / Hybrid" value={sessions.filter((s) => s.format !== 'onsite').length} hint="Remote" icon={CalendarDays} tone="emerald" />
      </div>

      <div className="relative max-w-sm">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search sessions…"
          className="input pl-9"
          aria-label="Search sessions"
        />
      </div>

      <SectionPanel>
        <DataTable rows={filtered} columns={columns} emptyMessage="No sessions match your search." />
      </SectionPanel>
    </div>
  );
}
