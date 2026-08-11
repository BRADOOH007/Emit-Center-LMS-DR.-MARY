'use client';

import { CalendarDays } from 'lucide-react';
import { PageIntro, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { CalendarView } from '@/components/schedule/CalendarView';
import { getLinkedStudentIds, getStudentCourseIds } from '@/lib/dashboard-data';
import { MOCK_SESSIONS } from '@/lib/mock-data';

export function ParentSchedule({ parentId }: { parentId: string }) {
  const studentIds = getLinkedStudentIds(parentId);
  const courseIds = studentIds.flatMap((id) => getStudentCourseIds(id));
  const mine = MOCK_SESSIONS.filter((s) => courseIds.includes(s.courseId));
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