'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { PageIntro, DataColumn, DataTable, ProgressBarCell, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { useLocale } from '@/components/providers/AppProviders';
import type { Enrollment } from '@/types/dashboard';

export function StudentCourses({ studentId }: { studentId: string }) {
  const { formatDate } = useLocale();
  const [search, setSearch] = useState('');
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);

  useEffect(() => {
    let active = true;
    fetch('/api/enrollments')
      .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
      .then((json) => {
        if (active) setEnrollments(Array.isArray(json.data) ? json.data : []);
      })
      .catch(() => {
        if (active) setEnrollments([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const mine = enrollments.filter((e) => e.userId === studentId);
  const active = mine.filter((e) => e.status === 'active');

  const filtered = active.filter((e) => e.course?.title.toLowerCase().includes(search.toLowerCase()));

  const columns: DataColumn<Enrollment>[] = [
    {
      key: 'course',
      header: 'Course',
      render: (enrollment) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-text-primary">{enrollment.course?.title}</p>
          <p className="text-xs text-text-muted">{enrollment.course?.subject} · {enrollment.course?.format}</p>
        </div>
      ),
    },
    {
      key: 'schedule',
      header: 'Schedule',
      render: (enrollment) => {
        const schedule = enrollment.course?.schedule;
        return (
          <span className="text-sm text-text-muted">
            {schedule?.days?.join(', ') ?? 'Schedule TBD'}
            {schedule?.startDate ? ` · ${formatDate(schedule.startDate)}` : ''}
          </span>
        );
      },
    },
    {
      key: 'progress',
      header: 'Progress',
      render: () => <ProgressBarCell value={65} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (enrollment) => <Badge variant="success">{enrollment.status}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      render: (enrollment) => (
        <a href={`/learn/${enrollment.courseId}`} className="btn btn-outline btn-sm">
          Open
        </a>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Student · Courses"
        title="My Courses"
        subtitle={`${active.length} active courses`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Courses" value={active.length} hint="Currently enrolled" icon={BookOpen} tone="gold" />
        <StatCard label="Completed" value={mine.filter((e) => e.status === 'completed').length} hint="Finished courses" icon={BookOpen} tone="emerald" />
        <StatCard label="Pending" value={mine.filter((e) => e.status === 'pending').length} hint="Awaiting start" icon={BookOpen} tone="gold" />
        <StatCard label="Onsite" value={active.filter((e) => e.course?.format === 'onsite').length} hint="In-person" icon={BookOpen} tone="brown" />
      </div>

      <div className="relative max-w-sm">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your courses…"
          className="input pl-9"
          aria-label="Search courses"
        />
      </div>

      <SectionPanel>
        <DataTable rows={filtered} columns={columns} emptyMessage="No courses match your search." />
      </SectionPanel>
    </div>
  );
}
