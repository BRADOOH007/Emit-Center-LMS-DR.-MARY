'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Search } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { PageIntro, DataColumn, DataTable, ProgressBarCell, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { useLocale } from '@/components/providers/AppProviders';
import type { GradebookEntry } from '@/types';

type GradeRow = GradebookEntry & { courseTitle: string };

interface EnrollmentItem {
  courseId: string;
  status: string;
  course?: { title?: string };
}

export function StudentGrades({ studentId }: { studentId: string }) {
  const { formatDate } = useLocale();
  const [search, setSearch] = useState('');
  const [grades, setGrades] = useState<GradeRow[]>([]);

  useEffect(() => {
    let active = true;
    fetch('/api/enrollments')
      .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
      .then(async (json) => {
        const enrollments = (Array.isArray(json.data) ? json.data : []) as EnrollmentItem[];
        const rows = await Promise.all(
          enrollments.map(async (enrollment) => {
            const courseTitle = enrollment.course?.title ?? enrollment.courseId;
            try {
              const res = await fetch(`/api/gradebook/${encodeURIComponent(enrollment.courseId)}`);
              const gradeJson = res.ok ? await res.json() : { data: [] };
              const entries = (Array.isArray(gradeJson.data) ? gradeJson.data : []) as GradebookEntry[];
              const own = entries.find((entry) => entry.userId === studentId);
              return own ? { ...own, courseTitle } : null;
            } catch {
              return null;
            }
          }),
        );
        if (active) setGrades(rows.filter((row): row is GradeRow => row !== null));
      })
      .catch(() => {
        if (active) setGrades([]);
      });
    return () => {
      active = false;
    };
  }, [studentId]);

  const filtered = grades.filter((entry) => entry.courseTitle.toLowerCase().includes(search.toLowerCase()));
  const avg = Math.round(grades.reduce((s, entry) => s + entry.overallPercentage, 0) / Math.max(1, grades.length));

  const columns: DataColumn<GradeRow>[] = [
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
        subtitle={`${grades.length} graded courses · overall average ${avg}%`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Average" value={`${avg}%`} hint="Across courses" icon={BarChart3} tone="gold" />
        <StatCard label="Graded Courses" value={grades.length} hint="With records" icon={BarChart3} tone="blue" />
        <StatCard label="Strong (A/B)" value={grades.filter((e) => e.overallPercentage >= 80).length} hint="80% or above" icon={BarChart3} tone="emerald" />
        <StatCard label="Needs Work" value={grades.filter((e) => e.overallPercentage < 70).length} hint="Below 70%" icon={BarChart3} tone="red" />
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
