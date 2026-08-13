'use client';

import { useEffect, useState } from 'react';
import { ClipboardList, FileText, Search } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageIntro, DataColumn, DataTable, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { useLocale } from '@/components/providers/AppProviders';
import type { Assignment } from '@/types';

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
  submissions: { userId: string }[];
}

type AssignmentRow = Assignment & { submitted: boolean };

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
        const lists = await Promise.all(
          courseIds.map(async (courseId: string) => {
            try {
              const res = await fetch(`/api/assignments/${encodeURIComponent(courseId)}`);
              const assignJson = res.ok ? await res.json() : { data: {} };
              const data = assignJson.data ?? {};
              return Array.isArray(data.assignments) ? data.assignments : [];
            } catch {
              return [];
            }
          }),
        );
        const rows = lists
          .flat()
          .map((assignment: AssignmentPayload): AssignmentRow => ({
            ...assignment,
            submitted: assignment.submissions.some((submission) => submission.userId === studentId),
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

  const submit = (assignment: AssignmentRow) => {
    if (assignment.submitted) return;
    fetch(`/api/assignments/${assignment.courseId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignmentId: assignment.id, fileName: 'submission.txt', fileSize: 0 }),
    })
      .then((res) => (res.ok ? res.json() : Promise.resolve({ data: null })))
      .then((json) => {
        if (json?.success) {
          setAssignments((prev) => prev.map((row) => (row.id === assignment.id ? { ...row, submitted: true } : row)));
        }
      })
      .catch(() => undefined);
  };

  const filtered = assignments.filter((a) => a.title.toLowerCase().includes(search.toLowerCase()));

  const columns: DataColumn<AssignmentRow>[] = [
    {
      key: 'assignment',
      header: 'Assignment',
      render: (assignment) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-text-primary">{assignment.title}</p>
          <p className="text-xs text-text-muted">{assignment.allowedFormats.join(', ')}</p>
        </div>
      ),
    },
    {
      key: 'due',
      header: 'Due',
      render: (assignment) => <span className="text-sm tabular-nums text-text-primary">{formatDate(assignment.dueDate)}</span>,
    },
    {
      key: 'points',
      header: 'Points',
      render: (assignment) => <span className="text-sm tabular-nums text-text-primary">{assignment.points}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (assignment) => (
        assignment.submitted ? <Badge variant="success">Submitted</Badge> : <Badge variant="gold">Open</Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (assignment) => (
        <Button
          variant={assignment.submitted ? 'outline' : 'gold'}
          size="sm"
          onClick={() => submit(assignment)}
        >
          {assignment.submitted ? 'View' : 'Submit'}
        </Button>
      ),
    },
  ];

  const openCount = assignments.filter((a) => !a.submitted).length;

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Student · Assignments"
        title="My Assignments"
        subtitle={`${assignments.length} assignments · ${openCount} still open`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Assignments" value={assignments.length} hint="Across your courses" icon={ClipboardList} tone="gold" />
        <StatCard label="Open" value={openCount} hint="Not yet submitted" icon={FileText} tone="brown" />
        <StatCard label="Submitted" value={assignments.length - openCount} hint="Completed" icon={FileText} tone="emerald" />
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
        <DataTable rows={filtered} columns={columns} emptyMessage="No assignments match your search." />
      </SectionPanel>
    </div>
  );
}
