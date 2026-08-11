'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, MapPin, Monitor, Search } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { PageIntro, DataColumn, DataTable, ProgressBarCell, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { MOCK_ROOMS, MOCK_SESSIONS, MOCK_USERS } from '@/lib/mock-data';
import { StatusBadge } from '@/components/dashboard/status';
import { useLocale } from '@/components/providers/AppProviders';
import type { ClassSession } from '@/types';

export function AdminClasses() {
  const { formatDate } = useLocale();
  const [search, setSearch] = useState('');
  const [formatFilter, setFormatFilter] = useState<'all' | 'onsite' | 'online' | 'hybrid'>('all');

  const enriched = useMemo(() => MOCK_SESSIONS.map((s) => ({
    ...s,
    instructor: MOCK_USERS.find((u) => u.id === s.instructorId),
    room: s.roomId ? MOCK_ROOMS.find((r) => r.id === s.roomId) : undefined,
  })), []);

  const filtered = enriched.filter((s) => {
    const matchesFormat = formatFilter === 'all' || s.format === formatFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q || s.title.toLowerCase().includes(q) || s.instructor?.name.toLowerCase().includes(q) || s.room?.name.toLowerCase().includes(q);
    return matchesFormat && matchesSearch;
  });

  const columns: DataColumn<ClassSession & { room?: (typeof MOCK_ROOMS)[number] }>[] = [
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
      key: 'format',
      header: 'Format',
      render: (session) => (
        <Badge variant={session.format === 'onsite' ? 'brown' : session.format === 'online' ? 'gold' : 'success'}>
          {session.format}
        </Badge>
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
            <><MapPin className="h-3.5 w-3.5 text-brown-500" />{session.room?.name ?? 'Onsite'}</>
          ) : (
            <><Monitor className="h-3.5 w-3.5 text-gold-600" />{session.meetingPlatform ?? 'Online'}</>
          )}
        </span>
      ),
    },
    {
      key: 'instructor',
      header: 'Instructor',
      render: (session) => <span className="text-sm text-text-primary">{session.instructor?.name ?? '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (session) => <StatusBadge status={session.status} />,
    },
  ];

  const scheduled = enriched.filter((s) => s.status === 'scheduled').length;

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Admin · Classes"
        title="Class Sessions"
        subtitle={`${MOCK_SESSIONS.length} sessions across all courses · ${scheduled} currently scheduled`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Sessions" value={MOCK_SESSIONS.length} hint="All courses" icon={CalendarDays} tone="gold" />
        <StatCard label="Scheduled" value={scheduled} hint="Upcoming sessions" icon={CalendarDays} tone="blue" />
        <StatCard label="Onsite" value={enriched.filter((s) => s.format === 'onsite').length} hint="In-person sessions" icon={CalendarDays} tone="brown" />
        <StatCard label="Live / Online" value={enriched.filter((s) => s.format !== 'onsite').length} hint="Remote sessions" icon={CalendarDays} tone="emerald" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'onsite', 'online', 'hybrid'] as const).map((format) => (
          <button
            key={format}
            onClick={() => setFormatFilter(format)}
            className={`btn btn-sm ${formatFilter === format ? 'btn-gold' : 'btn-outline'}`}
          >
            {format === 'all' ? 'All formats' : format}
          </button>
        ))}
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
        <DataTable rows={filtered} columns={columns} emptyMessage="No sessions match your filters." />
      </SectionPanel>
    </div>
  );
}