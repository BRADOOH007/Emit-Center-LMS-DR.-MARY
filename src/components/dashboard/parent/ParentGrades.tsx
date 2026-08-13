'use client';

import { useEffect, useState } from 'react';
import { ClipboardList, Search } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { PageIntro, DataColumn, DataTable, ProgressBarCell, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { useLocale, useSession } from '@/components/providers/AppProviders';

type GradeRow = {
  id: string;
  courseId: string;
  userId: string;
  overallPercentage: number;
  letterGrade: string;
  comments: string;
  lastUpdated: string;
  studentName: string;
  courseTitle: string;
};

export function ParentGrades({ parentId }: { parentId: string }) {
  const { formatDate } = useLocale();
  const { user } = useSession();
  const [search, setSearch] = useState('');
  const [entries, setEntries] = useState<GradeRow[]>([]);
  const [studentCount, setStudentCount] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      const links: { student?: { id: string; fullName: string } | null }[] = await fetch(`/api/users/${encodeURIComponent(user.id)}/linked-students`)
        .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
        .then((json) => (Array.isArray(json.data) ? json.data : []));
      const studentList: { id: string; fullName: string }[] = links
        .map((link) => link.student)
        .filter((s): s is { id: string; fullName: string } => Boolean(s));
      const studentIds = studentList.map((s) => s.id);

      const enrollmentRows = await Promise.all(
        studentIds.map((id) =>
          fetch(`/api/enrollments?userId=${encodeURIComponent(id)}`)
            .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
            .then((json) => (Array.isArray(json.data) ? json.data : [])),
        ),
      );

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

      const entryList: GradeRow[] = gradebookRows
        .flat()
        .filter((g: { userId: string }) => studentIds.includes(g.userId))
        .map((g: GradeRow) => ({
          ...g,
          studentName: studentList.find((s) => s.id === g.userId)?.fullName ?? g.userId,
          courseTitle: courseTitleById.get(g.courseId) ?? g.courseId,
        }));

      if (!active) return;
      setStudentCount(studentList.length);
      setEntries(entryList);
    }

    load();
    return () => {
      active = false;
    };
  }, [user.id]);

  const filtered = entries.filter(
    (e) =>
      e.courseTitle.toLowerCase().includes(search.toLowerCase()) ||
      e.studentName.toLowerCase().includes(search.toLowerCase()),
  );

  const columns: DataColumn<GradeRow>[] = [
    {
      key: 'student',
      header: 'Student',
      render: (entry) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-text-primary">{entry.studentName}</p>
          <p className="text-xs text-text-muted">{formatDate(entry.lastUpdated)}</p>
        </div>
      ),
    },
    {
      key: 'course',
      header: 'Course',
      render: (entry) => <span className="text-sm text-text-primary">{entry.courseTitle}</span>,
    },
    {
      key: 'overall',
      header: 'Overall',
      render: (entry) => (
        <ProgressBarCell value={entry.overallPercentage} tone={entry.overallPercentage >= 80 ? 'emerald' : entry.overallPercentage >= 70 ? 'gold' : 'red'} />
      ),
    },
    {
      key: 'letter',
      header: 'Letter',
      render: (entry) => (
        <Badge variant={entry.overallPercentage >= 80 ? 'success' : entry.overallPercentage >= 70 ? 'gold' : 'danger'}>
          {entry.letterGrade}
        </Badge>
      ),
    },
    {
      key: 'comments',
      header: 'Instructor Notes',
      render: (entry) => <span className="line-clamp-1 max-w-[16rem] text-sm text-text-muted">{entry.comments}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Parent · Grades"
        title="Student Grades"
        subtitle={`${entries.length} grade records across your linked students`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Grade Records" value={entries.length} hint="Across students" icon={ClipboardList} tone="gold" />
        <StatCard label="Strong (A/B)" value={entries.filter((e) => e.overallPercentage >= 80).length} hint="80% or above" icon={ClipboardList} tone="emerald" />
        <StatCard label="Needs Work" value={entries.filter((e) => e.overallPercentage < 70).length} hint="Below 70%" icon={ClipboardList} tone="red" />
        <StatCard label="Students" value={studentCount} hint="Linked profiles" icon={ClipboardList} tone="blue" />
      </div>

      <div className="relative max-w-sm">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by student or course…"
          className="input pl-9"
          aria-label="Search grades"
        />
      </div>

      <SectionPanel>
        <DataTable rows={filtered} columns={columns} emptyMessage="No grade records match your search." />
      </SectionPanel>
    </div>
  );
}
