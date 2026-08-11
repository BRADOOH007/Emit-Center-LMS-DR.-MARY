'use client';

import { CalendarDays } from 'lucide-react';
import { PageIntro, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { CalendarView } from '@/components/schedule/CalendarView';
import { MOCK_SESSIONS } from '@/lib/mock-data';

export function InstructorSchedule({ instructorId }: { instructorId: string }) {
  const mine = MOCK_SESSIONS.filter((s) => s.instructorId === instructorId);
  const scheduled = mine.filter((s) => s.status === 'scheduled').length;

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Instructor · Schedule"
        title="My Schedule"
        subtitle={`${mine.length} sessions assigned to you · ${scheduled} upcoming`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Sessions" value={mine.length} hint="All assigned" icon={CalendarDays} tone="gold" />
        <StatCard label="Upcoming" value={scheduled} hint="Scheduled sessions" icon={CalendarDays} tone="blue" />
        <StatCard label="Completed" value={mine.filter((s) => s.status === 'completed').length} hint="Finished" icon={CalendarDays} tone="emerald" />
        <StatCard label="Onsite" value={mine.filter((s) => s.format === 'onsite').length} hint="In-person" icon={CalendarDays} tone="brown" />
      </div>

      <SectionPanel title="Weekly Timetable" icon={CalendarDays}>
        <CalendarView />
      </SectionPanel>
    </div>
  );
}