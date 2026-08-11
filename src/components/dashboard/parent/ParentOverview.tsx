'use client';

import { useMemo } from 'react';
import { CalendarDays, ClipboardList, TrendingUp, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { PageIntro, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { getGradebookForStudent, getLinkedStudentIds, getStudentCourseIds } from '@/lib/dashboard-data';
import { MOCK_SESSIONS, MOCK_USERS } from '@/lib/mock-data';
import { useLocale } from '@/components/providers/AppProviders';

export function ParentOverview({ parentId }: { parentId: string }) {
  const { formatDate } = useLocale();
  const studentIds = useMemo(() => getLinkedStudentIds(parentId), [parentId]);
  const students = MOCK_USERS.filter((u) => studentIds.includes(u.id));

  const upcoming = useMemo(() => {
    const courseIds = studentIds.flatMap((id) => getStudentCourseIds(id));
    return MOCK_SESSIONS.filter((s) => courseIds.includes(s.courseId) && s.status === 'scheduled').slice(0, 5);
  }, [studentIds]);

  const latestReports = useMemo(
    () => studentIds.flatMap((id) => getGradebookForStudent(id)).slice(0, 4),
    [studentIds],
  );

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Parent / Guardian"
        title="Family Overview"
        subtitle={`${students.length} linked ${students.length === 1 ? 'student' : 'students'} · stay on top of progress, schedule and grades`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Linked Students" value={students.length} hint="Connected accounts" icon={UserRound} tone="gold" />
        <StatCard label="Upcoming Classes" value={upcoming.length} hint="Across linked students" icon={CalendarDays} tone="blue" />
        <StatCard label="Latest Reports" value={latestReports.length} hint="Recent grade records" icon={ClipboardList} tone="brown" />
        <StatCard label="Avg Grade" value={`${Math.round(latestReports.reduce((s, r) => s + r.overallPercentage, 0) / Math.max(1, latestReports.length))}%`} hint="Latest records" icon={TrendingUp} tone="emerald" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionPanel title="My Students" icon={UserRound}>
          <ul className="divide-y divide-line">
            {students.map((student) => (
              <li key={student.id} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-text-primary">{student.fullName}</p>
                  <p className="text-xs text-text-muted">{student.email}</p>
                </div>
                <Badge variant="neutral">{student.fullName.split(' ')[0]} {student.fullName.split(' ')[1]?.charAt(0) ?? ''}</Badge>
              </li>
            ))}
          </ul>
        </SectionPanel>

        <SectionPanel title="Upcoming Classes" icon={CalendarDays}>
          <ul className="divide-y divide-line">
            {upcoming.length > 0 ? (
              upcoming.map((session) => (
                <li key={session.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">{session.title}</p>
                    <p className="text-xs text-text-muted">{formatDate(session.date)} · {session.startTime}–{session.endTime}</p>
                  </div>
                  <Badge variant={session.format === 'onsite' ? 'brown' : 'gold'}>{session.format}</Badge>
                </li>
              ))
            ) : (
              <li className="py-6 text-center text-sm text-text-muted">No upcoming classes.</li>
            )}
          </ul>
        </SectionPanel>
      </div>
    </div>
  );
}