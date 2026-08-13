'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { PageIntro, DataColumn, DataTable, ProgressBarCell, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { useLocale } from '@/components/providers/AppProviders';
import type { Course } from '@/types';

export function InstructorCourses({ instructorId }: { instructorId: string }) {
  const { formatCurrency } = useLocale();
  const [search, setSearch] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/courses')
      .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
      .then((json) => {
        if (active) {
          setCourses(
            Array.isArray(json.data) ? json.data.filter((c: Course) => c.instructorId === instructorId) : [],
          );
        }
      })
      .catch(() => {
        if (active) setCourses([]);
      });
    return () => {
      active = false;
    };
  }, [instructorId]);

  const filtered = useMemo(
    () => courses.filter((c) => c.title.toLowerCase().includes(search.toLowerCase())),
    [courses, search],
  );
  const rosterCount = courses.reduce((sum, c) => sum + c.enrolledCount, 0);

  const columns: DataColumn<Course>[] = [
    {
      key: 'course',
      header: 'Course',
      render: (course) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-text-primary">{course.title}</p>
          <p className="text-xs text-text-muted">{course.subject} · {course.ageLevel}</p>
        </div>
      ),
    },
    {
      key: 'format',
      header: 'Format',
      render: (course) => (
        <Badge variant={course.format === 'onsite' ? 'brown' : course.format === 'online' ? 'gold' : 'success'}>
          {course.format}
        </Badge>
      ),
    },
    {
      key: 'schedule',
      header: 'Schedule',
      render: (course) => <span className="text-sm text-text-muted">{course.schedule.days.join(', ')}</span>,
    },
    {
      key: 'enrollment',
      header: 'Enrollment',
      render: (course) => <ProgressBarCell value={(course.enrolledCount / course.maxSeats) * 100} />,
    },
    {
      key: 'price',
      header: 'Price (USD)',
      render: (course) => (
        <span className="text-sm tabular-nums text-text-primary">
          {formatCurrency((course.pricing.find((p) => p.currency === 'USD')?.amount ?? 0) / 100)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Instructor · Courses"
        title="My Courses"
        subtitle={`${courses.length} courses · ${rosterCount} students enrolled across them`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="My Courses" value={courses.length} hint="Assigned to you" icon={BookOpen} tone="gold" />
        <StatCard label="Total Students" value={rosterCount} hint="Enrolled across courses" icon={BookOpen} tone="blue" />
        <StatCard label="Onsite" value={courses.filter((c) => c.format === 'onsite').length} hint="In-person" icon={BookOpen} tone="brown" />
        <StatCard label="Online / Hybrid" value={courses.filter((c) => c.format !== 'onsite').length} hint="Remote delivery" icon={BookOpen} tone="emerald" />
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
