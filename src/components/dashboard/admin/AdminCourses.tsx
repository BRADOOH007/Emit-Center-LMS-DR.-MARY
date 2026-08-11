'use client';

import { useMemo, useState } from 'react';
import { BookOpen, Eye, EyeOff, Search } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageIntro, DataColumn, DataTable, ProgressBarCell, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { MOCK_COURSES, MOCK_USERS } from '@/lib/mock-data';
import { useLocale } from '@/components/providers/AppProviders';
import type { AgeLevel, Course, CourseSubject, DeliveryFormat } from '@/types';

export function AdminCourses() {
  const { formatCurrency } = useLocale();
  const [search, setSearch] = useState('');
  const [published, setPublished] = useState<string[]>([...MOCK_COURSES.map((c) => c.id)]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState({ title: '', subject: 'coding', ageLevel: 'middle', format: 'online', priceUsd: '149' });
  const [added, setAdded] = useState<Course[]>([]);

  const togglePublished = (id: string) => {
    setPublished((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const courses = [...added, ...MOCK_COURSES];

  const filtered = courses.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()) || c.subject.includes(search.toLowerCase()),
  );

  const createCourse = () => {
    if (!draft.title.trim()) return;
    const id = `crs_new_${Date.now()}`;
    const formats = ['onsite', 'online', 'hybrid'] as const;
    const newCourse: Course = {
      id,
      title: draft.title.trim(),
      slug: draft.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: 'Newly added course awaiting a full description.',
      format: formats.includes(draft.format as (typeof formats)[number]) ? (draft.format as DeliveryFormat) : 'online',
      ageLevel: draft.ageLevel as AgeLevel,
      subject: draft.subject as CourseSubject,
      schedule: {
        days: ['Saturday'],
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 90 * 86400000).toISOString(),
        timeSlots: [{ start: '10:00', end: '12:00', timezone: 'US Eastern' }],
      },
      maxSeats: 20,
      enrolledCount: 0,
      instructorId: 'usr_0002',
      instructor: MOCK_USERS.find((u) => u.id === 'usr_0002'),
      pricing: [{ id: `prc_${id}`, courseId: id, currency: 'USD', amount: Math.round(Number(draft.priceUsd || 0) * 100) }],
      isPublished: false,
      createdAt: new Date().toISOString(),
    };
    setAdded((prev) => [newCourse, ...prev]);
    setPublished((prev) => [newCourse.id, ...prev]);
    setComposerOpen(false);
    setDraft({ title: '', subject: 'coding', ageLevel: 'middle', format: 'online', priceUsd: '149' });
  };

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
      key: 'instructor',
      header: 'Instructor',
      render: (course) => <span className="text-sm text-text-primary">{course.instructor?.name ?? '—'}</span>,
    },
    {
      key: 'enrollment',
      header: 'Enrollment',
      render: (course) => (
        <ProgressBarCell value={(course.enrolledCount / course.maxSeats) * 100} />
      ),
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
    {
      key: 'status',
      header: 'Status',
      render: (course) => (
        <Badge variant={published.includes(course.id) ? 'success' : 'neutral'}>
          {published.includes(course.id) ? 'Published' : 'Draft'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (course) => (
        <Button
          variant={published.includes(course.id) ? 'outline' : 'ghost'}
          size="sm"
          onClick={() => togglePublished(course.id)}
        >
          {published.includes(course.id) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {published.includes(course.id) ? 'Unpublish' : 'Publish'}
        </Button>
      ),
    },
  ];

  const totalSeats = courses.reduce((s, c) => s + c.maxSeats, 0);
  const totalEnrolled = courses.reduce((s, c) => s + c.enrolledCount, 0);

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Admin · Courses"
        title="Course Catalog"
        subtitle={`${MOCK_COURSES.length} courses · ${totalEnrolled}/${totalSeats} seats filled across the catalog`}
        actions={
          <Button onClick={() => setComposerOpen((prev) => !prev)}>
            <BookOpen aria-hidden="true" className="h-4 w-4" /> New Course
          </Button>
        }
      />

      {composerOpen && (
        <SectionPanel title="Add New Course" icon={BookOpen}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="course-title">Course title</label>
              <input
                id="course-title"
                className="input"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="e.g. Intro to Electronics"
              />
            </div>
            <div>
              <label className="label" htmlFor="course-subject">Subject</label>
              <select
                id="course-subject"
                className="input"
                value={draft.subject}
                onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
              >
                <option value="robotics">Robotics</option>
                <option value="coding">Coding</option>
                <option value="design">Design</option>
                <option value="life_skills">Life Skills</option>
                <option value="engineering">Engineering</option>
                <option value="career">Career</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="course-format">Format</label>
              <select
                id="course-format"
                className="input"
                value={draft.format}
                onChange={(e) => setDraft({ ...draft, format: e.target.value })}
              >
                <option value="onsite">Onsite</option>
                <option value="online">Online</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="course-age">Age level</label>
              <select
                id="course-age"
                className="input"
                value={draft.ageLevel}
                onChange={(e) => setDraft({ ...draft, ageLevel: e.target.value })}
              >
                <option value="elementary">Elementary</option>
                <option value="middle">Middle</option>
                <option value="high">High</option>
                <option value="adult">Adult</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="course-price">Price (USD)</label>
              <input
                id="course-price"
                type="number"
                min={0}
                className="input"
                value={draft.priceUsd}
                onChange={(e) => setDraft({ ...draft, priceUsd: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button onClick={createCourse}>Create Course</Button>
            <Button variant="outline" onClick={() => setComposerOpen(false)}>Cancel</Button>
          </div>
        </SectionPanel>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Courses" value={courses.length} hint={`${published.length} published`} icon={BookOpen} tone="gold" />
        <StatCard label="Published" value={published.length} hint="Visible in catalog" icon={BookOpen} tone="emerald" />
        <StatCard label="Seats Filled" value={Math.round((totalEnrolled / totalSeats) * 100)} hint={`${totalEnrolled} enrolled`} icon={BookOpen} tone="blue" />
        <StatCard label="Instructors" value={new Set(courses.map((c) => c.instructorId)).size} hint="Active faculty" icon={BookOpen} tone="brown" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses…"
            className="input pl-9"
            aria-label="Search courses"
          />
        </div>
        <span className="text-sm text-text-muted">Showing {filtered.length} of {courses.length}</span>
      </div>

      <SectionPanel>
        <DataTable rows={filtered} columns={columns} emptyMessage="No courses match your search." />
      </SectionPanel>
    </div>
  );
}