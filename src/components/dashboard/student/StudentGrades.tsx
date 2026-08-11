'use client';

import { useMemo, useState } from 'react';
import { BarChart3, Search } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { PageIntro, DataColumn, DataTable, ProgressBarCell, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { getGradebookForStudent } from '@/lib/dashboard-data';
import { MOCK_COURSES } from '@/lib/mock-data';
import { useLocale } from '@/components/providers/AppProviders';

export function StudentGrades({ studentId }: { studentId: string }) {
  const { formatDate } = useLocale();
  const [search, setSearch] = useState('');
  const grades = useMemo(() => getGradebookForStudent(studentId), [studentId]);

  const entries = grades.map((grade) => ({
    ...grade,
    courseTitle: MOCK_COURSES.find((c) => c.id === grade.courseId)?.title ?? grade.courseId,
  }));

  const filtered = entries.filter((e) => e.courseTitle.toLowerCase().includes(search.toLowerCase()));
  const avg = Math.round(entries.reduce((s, e) => s + e.overallPercentage, 0) / Math.max(1, entries.length));

  const columns: DataColumn<(typeof entries)[number]>[] = [
    {
      key: 'course',
      header: 'Course',
      render: (entry) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-text-primary">{entry.courseTitle}</p>
          <p className="text-xs text-text-muted">Updated {formatDate(entry.lastUpdated)}</p>
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
      key: 'letter',
      header: 'Letter Grade',
      render: (entry) => (
        <Badge variant={entry.overallPercentage >= 80 ? 'success' : entry.overallPercentage >= 70 ? 'gold' : 'danger'}>
          {entry.letterGrade}
        </Badge>
      ),
    },
    {
      key: 'practical',
      header: 'Practical',
      render: (entry) => <span className="text-sm tabular-nums text-text-primary">{entry.practicalScore}/100</span>,
    },
    {
      key: 'comments',
      header: 'Feedback',
      render: (entry) => <span className="line-clamp-1 max-w-[16rem] text-sm text-text-muted">{entry.comments}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Student · Grades"
        title="My Grades"
        subtitle={`${entries.length} graded courses · overall average ${avg}%`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Average" value={`${avg}%`} hint="Across courses" icon={BarChart3} tone="gold" />
        <StatCard label="Graded Courses" value={entries.length} hint="With records" icon={BarChart3} tone="blue" />
        <StatCard label="Strong (A/B)" value={entries.filter((e) => e.overallPercentage >= 80).length} hint="80% or above" icon={BarChart3} tone="emerald" />
        <StatCard label="Needs Work" value={entries.filter((e) => e.overallPercentage < 70).length} hint="Below 70%" icon={BarChart3} tone="red" />
      </div>

      <div className="relative max-w-sm">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search courses…"
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