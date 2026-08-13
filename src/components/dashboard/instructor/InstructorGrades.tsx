'use client';

import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Search } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { PageIntro, DataColumn, DataTable, ProgressBarCell, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { useLocale } from '@/components/providers/AppProviders';
import { UserAvatar } from '@/components/ui/UserAvatar';
import type { Course, GradebookEntry } from '@/types';

type GradeRow = GradebookEntry & { courseTitle: string };

export function InstructorGrades({ instructorId }: { instructorId: string }) {
  const { formatDate } = useLocale();
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [courses, setCourses] = useState<Course[]>([]);
  const [entries, setEntries] = useState<GradeRow[]>([]);

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
            if (active) setEntries(rows.flat());
          })
          .catch(() => {
            if (active) setEntries([]);
          });
      })
      .catch(() => {
        if (active) {
          setCourses([]);
          setEntries([]);
        }
      });
    return () => {
      active = false;
    };
  }, [instructorId]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return entries.filter((entry) => {
      const name = (entry.user?.fullName ?? entry.user?.name ?? '').toLowerCase();
      const matchesSearch = !q || name.includes(q) || entry.courseTitle.toLowerCase().includes(q);
      const matchesCourse = courseFilter === 'all' || entry.courseId === courseFilter;
      return matchesSearch && matchesCourse;
    });
  }, [entries, search, courseFilter]);

  const columns: DataColumn<GradeRow>[] = [
    {
      key: 'student',
      header: 'Student',
      render: (entry) => (
        <div className="flex items-center gap-3">
          <UserAvatar name={entry.user?.fullName ?? entry.user?.name ?? '?'} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium text-text-primary">{entry.user?.fullName ?? entry.user?.name}</p>
            <p className="truncate text-xs text-text-muted">{entry.courseTitle}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'overall',
      header: 'Overall',
      render: (entry) => (
        <ProgressBarCell value={entry.overallPercentage} tone={entry.overallPercentage >= 80 ? 'emerald' : entry.overallPercentage >= 70 ? 'gold' : 'red'} />
      ),
    },
    {
      key: 'grade',
      header: 'Letter',
      render: (entry) => <Badge variant={entry.overallPercentage >= 80 ? 'success' : entry.overallPercentage >= 70 ? 'gold' : 'danger'}>{entry.letterGrade}</Badge>,
    },
    {
      key: 'quiz',
      header: 'Quizzes',
      render: (entry) => <span className="text-sm tabular-nums text-text-primary">{entry.quizScores.length}</span>,
    },
    {
      key: 'updated',
      header: 'Last Updated',
      render: (entry) => <span className="text-sm tabular-nums text-text-muted">{formatDate(entry.lastUpdated)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Instructor · Grades"
        title="My Gradebook"
        subtitle={`${entries.length} student records across your courses`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Student Records" value={entries.length} hint="In your courses" icon={ClipboardList} tone="gold" />
        <StatCard label="A / B Grades" value={entries.filter((e) => e.overallPercentage >= 80).length} hint="Strong performers" icon={ClipboardList} tone="emerald" />
        <StatCard label="Needs Attention" value={entries.filter((e) => e.overallPercentage < 70).length} hint="Below 70%" icon={ClipboardList} tone="red" />
        <StatCard label="Avg Overall" value={Math.round(entries.reduce((s, e) => s + e.overallPercentage, 0) / Math.max(1, entries.length))} hint="Class average" icon={ClipboardList} tone="blue" />
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
        <DataTable rows={filtered} columns={columns} emptyMessage="No grade records match your filters." />
      </SectionPanel>
    </div>
  );
}
