'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { PageIntro, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { CalendarView } from '@/components/schedule/CalendarView';
import { useSession } from '@/components/providers/AppProviders';
import type { ClassSession } from '@/types';

export function ParentSchedule({ parentId }: { parentId: string }) {
  const { user } = useSession();
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      const links: { student?: { id: string } | null }[] = await fetch(`/api/users/${encodeURIComponent(user.id)}/linked-students`)
        .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
        .then((json) => (Array.isArray(json.data) ? json.data : []));
      const studentIds: string[] = links
        .map((link) => link.student?.id)
        .filter((id): id is string => Boolean(id));

      const enrollmentRows = await Promise.all(
        studentIds.map((id) =>
          fetch(`/api/enrollments?userId=${encodeURIComponent(id)}`)
            .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
            .then((json) => (Array.isArray(json.data) ? json.data : [])),
        ),
      );
      const ids = Array.from(new Set(enrollmentRows.flat().map((e: { courseId: string }) => e.courseId)));

      const sessionRows = (await fetch('/api/sessions')
        .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
        .then((json) => (Array.isArray(json.data) ? json.data : []))) as ClassSession[];

      if (!active) return;
      setCourseIds(ids);
      setSessions(sessionRows);
    }

    load();
    return () => {
      active = false;
    };
  }, [user.id]);

  const mine = useMemo(() => sessions.filter((s) => courseIds.includes(s.courseId)), [sessions, courseIds]);
  const scheduled = mine.filter((s) => s.status === 'scheduled').length;

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Parent · Schedule"
        title="Family Schedule"
        subtitle={`${mine.length} sessions across your linked students · ${scheduled} upcoming`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Sessions" value={mine.length} hint="All linked students" icon={CalendarDays} tone="gold" />
        <StatCard label="Upcoming" value={scheduled} hint="Scheduled" icon={CalendarDays} tone="blue" />
        <StatCard label="Onsite" value={mine.filter((s) => s.format === 'onsite').length} hint="In-person" icon={CalendarDays} tone="brown" />
        <StatCard label="Online / Hybrid" value={mine.filter((s) => s.format !== 'onsite').length} hint="Remote" icon={CalendarDays} tone="emerald" />
      </div>

      <SectionPanel title="Weekly Timetable" icon={CalendarDays}>
        <CalendarView />
      </SectionPanel>
    </div>
  );
}
