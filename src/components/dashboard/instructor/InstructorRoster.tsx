'use client';

import { useMemo, useState } from 'react';
import { Search, UserRound } from 'lucide-react';
import { PageIntro, DataColumn, DataTable, ProgressBarCell, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { Badge } from '@/components/ui/Badge';
import { getInstructorCourses, getRosterForCourse } from '@/lib/dashboard-data';
import { UserAvatar } from '@/components/ui/UserAvatar';

export function InstructorRoster({ instructorId }: { instructorId: string }) {
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState<string>('all');

  const courses = useMemo(() => getInstructorCourses(instructorId), [instructorId]);
  const roster = useMemo(() => {
    const rows = courses.flatMap((course) =>
      getRosterForCourse(course.id).map((row) => ({ ...row, courseTitle: course.title })),
    );
    return rows;
  }, [courses]);

  const filtered = roster.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || r.user?.name.toLowerCase().includes(q) || r.user?.email.toLowerCase().includes(q);
    const matchesCourse = courseFilter === 'all' || r.courseId === courseFilter;
    return matchesSearch && matchesCourse;
  });

  const columns: DataColumn<(typeof roster)[number]>[] = [
    {
      key: 'student',
      header: 'Student',
      render: (row) => (
        <div className="flex items-center gap-3">
          <UserAvatar name={row.user?.name ?? '?'} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium text-text-primary">{row.user?.name}</p>
            <p className="truncate text-xs text-text-muted">{row.user?.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'course',
      header: 'Course',
      render: (row) => <span className="text-sm text-text-primary">{row.courseTitle}</span>,
    },
    {
      key: 'grade',
      header: 'Current Grade',
      render: (row) => (
        <Badge variant={row.grade === '—' ? 'neutral' : 'success'}>{row.grade}</Badge>
      ),
    },
    {
      key: 'attendance',
      header: 'Attendance',
      render: (row) => <ProgressBarCell value={row.attendancePct} tone="blue" />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Instructor · Roster"
        title="Student Roster"
        subtitle={`${roster.length} students across ${courses.length} courses`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total Students" value={roster.length} hint="Active enrollments" icon={UserRound} tone="gold" />
        <StatCard label="Courses" value={courses.length} hint="Taught by you" icon={UserRound} tone="blue" />
        <StatCard label="Avg Attendance" value={Math.round(roster.reduce((s, r) => s + r.attendancePct, 0) / Math.max(1, roster.length))} hint="Across roster" icon={UserRound} tone="emerald" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students…"
            className="input pl-9"
            aria-label="Search students"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setCourseFilter('all')} className={`btn btn-sm ${courseFilter === 'all' ? 'btn-gold' : 'btn-outline'}`}>
            All courses
          </button>
          {courses.map((course) => (
            <button key={course.id} onClick={() => setCourseFilter(course.id)} className={`btn btn-sm ${courseFilter === course.id ? 'btn-gold' : 'btn-outline'}`}>
              {course.title}
            </button>
          ))}
        </div>
      </div>

      <SectionPanel>
        <DataTable rows={filtered} columns={columns} emptyMessage="No students match your filters." />
      </SectionPanel>
    </div>
  );
}