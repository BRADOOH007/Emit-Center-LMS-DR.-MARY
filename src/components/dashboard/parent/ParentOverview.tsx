'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ClipboardList, TrendingUp, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { PageIntro, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { useLocale, useSession } from '@/components/providers/AppProviders';
import type { ClassSession, User } from '@/types';

type ReportRow = {
  id: string;
  courseId: string;
  userId: string;
  overallPercentage: number;
  letterGrade: string;
  comments: string;
  lastUpdated: string;
  student?: User;
  courseTitle: string;
};

export function ParentOverview({ parentId }: { parentId: string }) {
  const { formatDate } = useLocale();
  const { user } = useSession();
  const [students, setStudents] = useState<User[]>([]);
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      const links: { student?: User | null }[] = await fetch(`/api/users/${encodeURIComponent(user.id)}/linked-students`)
        .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
        .then((json) => (Array.isArray(json.data) ? json.data : []));
      const studentList: User[] = links
        .map((link) => link.student)
        .filter((s): s is User => Boolean(s));
      const studentIds = studentList.map((s) => s.id);

      const [enrollmentRows, sessionRows] = await Promise.all([
        Promise.all(
          studentIds.map((id) =>
            fetch(`/api/enrollments?userId=${encodeURIComponent(id)}`)
              .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
              .then((json) => (Array.isArray(json.data) ? json.data : [])),
          ),
        ),
        fetch('/api/sessions')
          .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
          .then((json) => (Array.isArray(json.data) ? json.data : [])) as Promise<ClassSession[]>,
      ]);

      const courseTitleById = new Map<string, string>();
      enrollmentRows
        .flat()
        .forEach((enrollment: { courseId: string; course?: { title?: string } }) => {
          courseTitleById.set(enrollment.courseId, enrollment.course?.title ?? enrollment.courseId);
        });
      const courseIdList = Array.from(courseTitleById.keys());

      const gradebookRows = await Promise.all(
        courseIdList.map((courseId) =>
          fetch(`/api/gradebook/${encodeURIComponent(courseId)}`)
            .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
            .then((json) => (Array.isArray(json.data) ? json.data : [])),
        ),
      );

      const reportList: ReportRow[] = gradebookRows
        .flat()
        .filter((g: { userId: string }) => studentIds.includes(g.userId))
        .map((g: ReportRow) => ({
          ...g,
          student: studentList.find((s) => s.id === g.userId),
          courseTitle: courseTitleById.get(g.courseId) ?? g.courseId,
        }));

      if (!active) return;
      setStudents(studentList);
      setCourseIds(courseIdList);
      setSessions(sessionRows);
      setReports(reportList);
    }

    load();
    return () => {
      active = false;
    };
  }, [user.id]);

  const upcoming = useMemo(
    () => sessions.filter((s) => courseIds.includes(s.courseId) && s.status === 'scheduled').slice(0, 5),
    [sessions, courseIds],
  );

  const latestReports = useMemo(() => reports.slice(0, 4), [reports]);

  const avgGrade = Math.round(
    latestReports.reduce((s, r) => s + r.overallPercentage, 0) / Math.max(1, latestReports.length),
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
        <StatCard label="Avg Grade" value={`${avgGrade}%`} hint="Latest records" icon={TrendingUp} tone="emerald" />
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
