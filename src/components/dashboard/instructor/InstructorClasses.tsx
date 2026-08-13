'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, MapPin, Monitor, Search } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { PageIntro, DataColumn, DataTable, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { StatusBadge } from '@/components/dashboard/status';
import { useLocale } from '@/components/providers/AppProviders';
import type { ClassSession, FacilityRoom } from '@/types';

export function InstructorClasses({ instructorId }: { instructorId: string }) {
  const { formatDate } = useLocale();
  const [search, setSearch] = useState('');
  const [mine, setMine] = useState<ClassSession[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(`/api/sessions?instructorId=${encodeURIComponent(instructorId)}`)
        .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] }))),
      fetch('/api/resources')
        .then((res) => (res.ok ? res.json() : Promise.resolve({ data: { rooms: [] } }))),
    ])
      .then(([sessionsJson, resourcesJson]) => {
        if (!active) return;
        const rooms: FacilityRoom[] = Array.isArray(resourcesJson.data?.rooms) ? resourcesJson.data.rooms : [];
        const raw: ClassSession[] = Array.isArray(sessionsJson.data) ? sessionsJson.data : [];
        setMine(
          raw
            .filter((s) => s.instructorId === instructorId || (s.course?.instructorId ?? s.instructor?.id) === instructorId)
            .map((s) => ({ ...s, room: s.roomId ? rooms.find((r) => r.id === s.roomId) : undefined })),
        );
      })
      .catch(() => {
        if (active) setMine([]);
      });
    return () => {
      active = false;
    };
  }, [instructorId]);

  const filtered = useMemo(
    () => mine.filter((s) => s.title.toLowerCase().includes(search.toLowerCase())),
    [mine, search],
  );

  const columns: DataColumn<ClassSession>[] = [
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
            <><MapPin className="h-3.5 w-3.5 text-brown-500" />{session.room?.name ?? 'Onsite'}</>
          ) : (
            <><Monitor className="h-3.5 w-3.5 text-gold-600" />{session.meetingPlatform ?? 'Online'}</>
          )}
        </span>
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
      key: 'status',
      header: 'Status',
      render: (session) => <StatusBadge status={session.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Instructor · Classes"
        title="My Classes"
        subtitle={`${mine.length} sessions assigned to you`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Sessions" value={mine.length} hint="All assigned" icon={CalendarDays} tone="gold" />
        <StatCard label="Scheduled" value={mine.filter((s) => s.status === 'scheduled').length} hint="Upcoming" icon={CalendarDays} tone="blue" />
        <StatCard label="Completed" value={mine.filter((s) => s.status === 'completed').length} hint="Finished" icon={CalendarDays} tone="emerald" />
        <StatCard label="Labs & Workshops" value={mine.filter((s) => s.sessionType !== 'lecture').length} hint="Hands-on" icon={CalendarDays} tone="brown" />
      </div>

      <div className="relative max-w-sm">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your sessions…"
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
