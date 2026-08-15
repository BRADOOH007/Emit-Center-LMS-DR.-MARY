'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ClipboardList, FileText, Lock, Search } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageIntro, DataColumn, DataTable, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { useLocale } from '@/components/providers/AppProviders';

interface AssignmentPayload {
  id: string;
  courseId: string;
  title: string;
  description: string;
  dueDate: string;
  points: number;
  allowedFormats: string[];
  isPublished: boolean;
  createdAt: string;
  questionCount?: number;
  pastDue?: boolean;
  mySubmission?: {
    status: string;
    score?: number | null;
    percentage?: number;
    letterGrade?: string | null;
    submittedAt: string;
  } | null;
}

type AssignmentRow = AssignmentPayload & { courseTitle: string };

interface EnrollmentItem {
  userId: string;
  courseId: string;
  status: string;
}

export function StudentAssignments({ studentId }: { studentId: string }) {
  const { formatDate } = useLocale();
  const [search, setSearch] = useState('');
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);

  useEffect(() => {
    let active = true;
    fetch('/api/enrollments')
      .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
      .then(async (json) => {
        const enrollments = (Array.isArray(json.data) ? json.data : []) as EnrollmentItem[];
        const courseIds = enrollments
          .filter((e) => e.userId === studentId && e.status === 'active')
          .map((e) => e.courseId);
        const courseTitles = new Map<string, string>();
        const lists = await Promise.all(
          courseIds.map(async (courseId: string) => {
            try {
              const [courseRes, assignRes] = await Promise.all([
                fetch(`/api/courses/${encodeURIComponent(courseId)}`),
                fetch(`/api/assignments/${encodeURIComponent(courseId)}`),
              ]);
              const courseJson = courseRes.ok ? await courseRes.json() : { data: null };
              if (courseJson?.data?.title) courseTitles.set(courseId, courseJson.data.title);
              const assignJson = assignRes.ok ? await assignRes.json() : { data: null };
              const data = assignJson.data ?? {};
              return Array.isArray(data.assignments) ? data.assignments : [];
            } catch {
              return [];
            }
          }),
        );
        const rows: AssignmentRow[] = lists
          .flat()
          .filter((a: AssignmentPayload) => a.isPublished !== false)
          .map((a: AssignmentPayload) => ({
            ...a,
            courseTitle: courseTitles.get(a.courseId) ?? 'Course',
          }));
        if (active) setAssignments(rows);
      })
      .catch(() => {
        if (active) setAssignments([]);
      });
    return () => {
      active = false;
    };
  }, [studentId]);

  const isPastDue = (a: AssignmentRow) => (typeof a.pastDue === 'boolean' ? a.pastDue : new Date(a.dueDate).getTime() < Date.now());
  const isGraded = (a: AssignmentRow) => a.mySubmission?.status === 'graded' && a.mySubmission.score != null;
  const isSubmitted = (a: AssignmentRow) => a.mySubmission != null;

  const openCount = assignments.filter((a) => !isSubmitted(a) && !isPastDue(a)).length;
  const gradedCount = assignments.filter(isGraded).length;

  const columns: DataColumn<AssignmentRow>[] = [
    {
      key: 'assignment',
      header: 'Assignment',
      render: (a) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-text-primary">{a.title}</p>
          <p className="text-xs text-text-muted">{a.courseTitle}</p>
        </div>
      ),
    },
    {
      key: 'due',
      header: 'Due',
      render: (a) => (
        <span className="flex items-center gap-1 text-sm tabular-nums text-text-primary">
          {formatDate(a.dueDate)}
          {isPastDue(a) && <Lock aria-hidden="true" className="h-3 w-3 text-red-500" />}
        </span>
      ),
    },
    {
      key: 'points',
      header: 'Points',
      render: (a) => <span className="text-sm tabular-nums text-text-primary">{a.points}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (a) => {
        if (isGraded(a)) {
          return (
            <span className="flex items-center gap-1.5">
              <Badge variant="success">Graded</Badge>
              <span className="text-xs font-bold text-emerald-600">{a.mySubmission?.score}/{a.points}</span>
            </span>
          );
        }
        if (isSubmitted(a)) return <Badge variant="gold">Submitted</Badge>;
        if (isPastDue(a)) return <Badge variant="danger">Past due</Badge>;
        return <Badge variant="neutral">Open</Badge>;
      },
    },
    {
      key: 'actions',
      header: '',
      render: (a) => (
        <Link href={`/assignments/${encodeURIComponent(a.courseId)}?assignmentId=${encodeURIComponent(a.id)}`}>
          <Button variant={isGraded(a) ? 'outline' : 'gold'} size="sm">
            {isGraded(a) ? 'View grade' : isSubmitted(a) ? 'View' : isPastDue(a) ? 'View' : 'Open & attempt'}
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Student · Assignments"
        title="My Assignments"
        subtitle={`${assignments.length} assignments · ${openCount} still open`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Assignments" value={assignments.length} hint="Across your courses" icon={ClipboardList} tone="gold" />
        <StatCard label="Open" value={openCount} hint="Not yet attempted" icon={FileText} tone="brown" />
        <StatCard label="Graded" value={gradedCount} hint="With scores" icon={CheckCircle2} tone="emerald" />
        <StatCard label="Total Points" value={assignments.reduce((s, a) => s + a.points, 0)} hint="Available" icon={FileText} tone="blue" />
      </div>

      <div className="relative max-w-sm">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search assignments…"
          className="input pl-9"
          aria-label="Search assignments"
        />
      </div>

      <SectionPanel>
        <DataTable
          rows={assignments.filter((a) => a.title.toLowerCase().includes(search.toLowerCase()))}
          columns={columns}
          emptyMessage="No assignments match your search."
        />
      </SectionPanel>
    </div>
  );
}
