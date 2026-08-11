'use client';

import { useMemo, useState } from 'react';
import { ClipboardList, Search } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { PageIntro, DataColumn, DataTable, ProgressBarCell, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { getGradebookForStudent, getLinkedStudentIds } from '@/lib/dashboard-data';
import { MOCK_COURSES, MOCK_USERS } from '@/lib/mock-data';
import { useLocale } from '@/components/providers/AppProviders';

export function ParentGrades({ parentId }: { parentId: string }) {
  const { formatDate } = useLocale();
  const [search, setSearch] = useState('');
  const studentIds = useMemo(() => getLinkedStudentIds(parentId), [parentId]);

  const entries = useMemo(
    () =>
      studentIds.flatMap((studentId) =>
        getGradebookForStudent(studentId).map((grade) => ({
          ...grade,
          studentName: MOCK_USERS.find((u) => u.id === studentId)?.fullName ?? studentId,
          courseTitle: MOCK_COURSES.find((c) => c.id === grade.courseId)?.title ?? grade.courseId,
        })),
      ),
    [studentIds],
  );

  const filtered = entries.filter(
    (e) =>
      e.courseTitle.toLowerCase().includes(search.toLowerCase()) ||
      e.studentName.toLowerCase().includes(search.toLowerCase()),
  );

  const columns: DataColumn<(typeof entries)[number]>[] = [
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
        <StatCard label="Students" value={studentIds.length} hint="Linked profiles" icon={ClipboardList} tone="blue" />
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