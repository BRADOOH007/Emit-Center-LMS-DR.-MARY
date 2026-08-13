'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, UserRound } from 'lucide-react';
import { PageIntro, DataColumn, DataTable, ProgressBarCell, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { Badge } from '@/components/ui/Badge';
import { UserAvatar } from '@/components/ui/UserAvatar';
import type { Course, GradebookEntry } from '@/types';

type RosterRow = GradebookEntry & { courseTitle: string };

export function InstructorRoster({ instructorId }: { instructorId: string }) {
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [courses, setCourses] = useState<Course[]>([]);
  const [roster, setRoster] = useState<RosterRow[]>([]);

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
        Promise.all(
          courseIds.map((id) =>
            fetch(`/api/gradebook/${encodeURIComponent(id)}`)
              .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
              .then((gradeJson) =>
                Array.isArray(gradeJson.data)
                  ? gradeJson.data.map((entry: GradebookEntry) => ({
                      ...entry,
                      courseTitle: myCourses.find((c) => c.id === entry.courseId)?.title ?? entry.courseId,
                    }))
                  : [],
              ),
          ),
        )
          .then((rows) => {
            if (active) setRoster(rows.flat());
          })
          .catch(() => {
            if (active) setRoster([]);
          });
      })
      .catch(() => {
        if (active) {
          setCourses([]);
          setRoster([]);
        }
      });
    return () => {
      active = false;
    };
  }, [instructorId]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return roster.filter((r) => {
      const name = (r.user?.fullName ?? r.user?.name ?? '').toLowerCase();
      const email = (r.user?.email ?? '').toLowerCase();
      const matchesSearch = !q || name.includes(q) || email.includes(q);
      const matchesCourse = courseFilter === 'all' || r.courseId === courseFilter;
      return matchesSearch && matchesCourse;
    });
  }, [roster, search, courseFilter]);

  const columns: DataColumn<RosterRow>[] = [
    {
      key: 'student',
      header: 'Student',
      render: (row) => (
        <div className="flex items-center gap-3">
          <UserAvatar name={row.user?.fullName ?? row.user?.name ?? '?'} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium text-text-primary">{row.user?.fullName ?? row.user?.name}</p>
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
        <Badge variant={row.letterGrade ? 'success' : 'neutral'}>{row.letterGrade ?? '—'}</Badge>
      ),
    },
    {
      key: 'attendance',
      header: 'Attendance',
      render: (row) => <ProgressBarCell value={0} tone="blue" />,
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
        <StatCard label="Avg Attendance" value={0} hint="Across roster" icon={UserRound} tone="emerald" />
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
