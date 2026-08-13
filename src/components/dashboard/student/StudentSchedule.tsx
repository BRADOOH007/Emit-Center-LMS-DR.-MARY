'use client';

import { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { PageIntro, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { CalendarView } from '@/components/schedule/CalendarView';

interface SessionItem {
  id: string;
  courseId: string;
  title: string;
  format: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
}

interface EnrollmentItem {
  userId: string;
  courseId: string;
  status: string;
}

export function StudentSchedule({ studentId }: { studentId: string }) {
  const [mine, setMine] = useState<SessionItem[]>([]);

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
        const sessions = (Array.isArray(sessionsJson.data) ? sessionsJson.data : []) as SessionItem[];
        setMine(sessions.filter((s) => courseIds.includes(s.courseId)));
      })
      .catch(() => {
        if (active) setMine([]);
      });
    return () => {
      active = false;
    };
  }, [studentId]);

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
