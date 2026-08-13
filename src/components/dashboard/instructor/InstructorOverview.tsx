'use client';

import { useEffect, useState } from 'react';
import { Bell, BookOpen, CalendarDays, ClipboardList, Users } from 'lucide-react';
import { PageIntro, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { StatusBadge } from '@/components/dashboard/status';
import { useLocale } from '@/components/providers/AppProviders';
import type { AnnouncementData } from '@/types/dashboard';
import type { ClassSession, Course, GradebookEntry } from '@/types';

export function InstructorOverview({ instructorId }: { instructorId: string }) {
  const { formatDate } = useLocale();
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [gradebook, setGradebook] = useState<GradebookEntry[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([]);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/courses')
      .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
      .then((json) => {
        if (!active) return;
        const myCourses: Course[] = Array.isArray(json.data)
          ? json.data.filter((c: Course) => c.instructorId === instructorId)
          : [];
        const courseIds = myCourses.map((c) => c.id);
        setCourses(myCourses);
        Promise.all([
          fetch('/api/sessions').then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] }))),
          fetch('/api/announcements').then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] }))),
          ...courseIds.map((id) =>
            fetch(`/api/gradebook/${encodeURIComponent(id)}`)
              .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] }))),
          ),
        ])
          .then(([sessionsJson, annJson, ...gradeJsons]) => {
            if (!active) return;
            setSessions(
              Array.isArray(sessionsJson.data)
                ? sessionsJson.data.filter((s: ClassSession) => courseIds.includes(s.courseId))
                : [],
            );
            setAnnouncements(
              Array.isArray(annJson.data)
                ? annJson.data.filter((a: AnnouncementData) => courseIds.includes(a.courseId)).slice(0, 4)
                : [],
            );
            setGradebook(gradeJsons.flatMap((g) => (Array.isArray(g.data) ? g.data : [])));
          })
          .catch(() => {
            if (active) {
              setSessions([]);
              setAnnouncements([]);
              setGradebook([]);
            }
          });
      })
      .catch(() => {
        if (active) {
          setCourses([]);
          setSessions([]);
          setGradebook([]);
          setAnnouncements([]);
        }
      });
    return () => {
      active = false;
    };
  }, [instructorId]);

  const rosterCount = gradebook.length;
  const pendingGrades = gradebook.filter((g) => !g.comments).length;
  const upcoming = sessions.filter((s) => s.status === 'scheduled').slice(0, 5);

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Instructor"
        title="Teaching Overview"
        subtitle={`${courses.length} courses · ${rosterCount} students · ${sessions.length} sessions scheduled`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Courses" value={courses.length} hint="Courses you teach" icon={BookOpen} tone="gold" />
        <StatCard label="Total Students" value={rosterCount} hint="Across your courses" icon={Users} tone="blue" />
        <StatCard label="Upcoming Sessions" value={sessions.filter((s) => s.status === 'scheduled').length} hint="Next in your schedule" icon={CalendarDays} tone="emerald" />
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
