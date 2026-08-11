'use client';

import { CalendarDays } from 'lucide-react';
import { PageIntro, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { CalendarView } from '@/components/schedule/CalendarView';
import { getStudentCourseIds } from '@/lib/dashboard-data';
import { MOCK_SESSIONS } from '@/lib/mock-data';

export function StudentSchedule({ studentId }: { studentId: string }) {
  const courseIds = getStudentCourseIds(studentId);
  const mine = MOCK_SESSIONS.filter((s) => courseIds.includes(s.courseId));
  const scheduled = mine.filter((s) => s.status === 'scheduled').length;

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Student · Schedule"
        title="My Schedule"
        subtitle={`${mine.length} sessions across your courses · ${scheduled} upcoming`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Sessions" value={mine.length} hint="All courses" icon={CalendarDays} tone="gold" />
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