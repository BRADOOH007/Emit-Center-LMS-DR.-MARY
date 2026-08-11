'use client';

import { useMemo } from 'react';
import { Bell, BookOpen, CalendarDays, ClipboardList, Users } from 'lucide-react';
import { PageIntro, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { StatusBadge } from '@/components/dashboard/status';
import { getInstructorCourses, getRosterForCourse, getAnnouncements } from '@/lib/dashboard-data';
import { MOCK_GRADEBOOK, MOCK_SESSIONS } from '@/lib/mock-data';
import { useLocale } from '@/components/providers/AppProviders';

export function InstructorOverview({ instructorId }: { instructorId: string }) {
  const { formatDate } = useLocale();
  const courses = useMemo(() => getInstructorCourses(instructorId), [instructorId]);
  const courseIds = courses.map((c) => c.id);

  const mySessions = MOCK_SESSIONS.filter((s) => courseIds.includes(s.courseId));
  const rosterCount = courseIds.reduce((sum, id) => sum + getRosterForCourse(id).length, 0);
  const pendingGrades = MOCK_GRADEBOOK.filter((g) => courseIds.includes(g.courseId) && !g.comments).length;
  const announcements = getAnnouncements().filter((a) => courseIds.includes(a.courseId)).slice(0, 4);
  const upcoming = mySessions.filter((s) => s.status === 'scheduled').slice(0, 5);

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Instructor"
        title="Teaching Overview"
        subtitle={`${courses.length} courses · ${rosterCount} students · ${mySessions.length} sessions scheduled`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Courses" value={courses.length} hint="Courses you teach" icon={BookOpen} tone="gold" />
        <StatCard label="Total Students" value={rosterCount} hint="Across your courses" icon={Users} tone="blue" />
        <StatCard label="Upcoming Sessions" value={mySessions.filter((s) => s.status === 'scheduled').length} hint="Next in your schedule" icon={CalendarDays} tone="emerald" />
        <StatCard label="Pending Grades" value={pendingGrades} hint="Awaiting comments" icon={ClipboardList} tone="brown" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionPanel title="Upcoming Sessions" icon={CalendarDays}>
          <ul className="divide-y divide-line">
            {upcoming.length > 0 ? (
              upcoming.map((session) => (
                <li key={session.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">{session.title}</p>
                    <p className="text-xs text-text-muted">{formatDate(session.date)} · {session.startTime}–{session.endTime} · {session.format}</p>
                  </div>
                  <StatusBadge status={session.status} />
                </li>
              ))
            ) : (
              <li className="py-6 text-center text-sm text-text-muted">No upcoming sessions.</li>
            )}
          </ul>
        </SectionPanel>

        <SectionPanel title="Recent Announcements" icon={Bell}>
          <ul className="divide-y divide-line">
            {announcements.length > 0 ? (
              announcements.map((announcement) => (
                <li key={announcement.id} className="py-2.5">
                  <p className="text-sm font-medium text-text-primary">{announcement.title}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-text-muted">{announcement.body}</p>
                  <p className="mt-1 text-[11px] text-text-muted">{formatDate(announcement.createdAt)}</p>
                </li>
              ))
            ) : (
              <li className="py-6 text-center text-sm text-text-muted">No announcements yet.</li>
            )}
          </ul>
        </SectionPanel>
      </div>
    </div>
  );
}