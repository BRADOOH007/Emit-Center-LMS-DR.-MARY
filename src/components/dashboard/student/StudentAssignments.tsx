'use client';

import { useMemo, useState } from 'react';
import { ClipboardList, FileText, Search } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageIntro, DataColumn, DataTable, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { getStudentCourseIds } from '@/lib/dashboard-data';
import { MOCK_ASSIGNMENTS, MOCK_SUBMISSIONS } from '@/lib/mock-data';
import { useLocale } from '@/components/providers/AppProviders';
import type { Assignment } from '@/types';

export function StudentAssignments({ studentId }: { studentId: string }) {
  const { formatDate } = useLocale();
  const [search, setSearch] = useState('');
  const courseIds = useMemo(() => getStudentCourseIds(studentId), [studentId]);

  const assignments = useMemo(
    () => MOCK_ASSIGNMENTS.filter((a) => courseIds.includes(a.courseId)),
    [courseIds],
  );

  const filtered = assignments.filter((a) => a.title.toLowerCase().includes(search.toLowerCase()));

  const [submittedIds, setSubmittedIds] = useState<string[]>(
    () => MOCK_SUBMISSIONS.filter((s) => s.userId === studentId).map((s) => s.assignmentId),
  );

  const submit = (assId: string) => setSubmittedIds((prev) => (prev.includes(assId) ? prev : [...prev, assId]));
  const submitted = (id: string) => submittedIds.includes(id);

  const columns: DataColumn<Assignment>[] = [
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
        submitted(assignment.id) ? <Badge variant="success">Submitted</Badge> : <Badge variant="gold">Open</Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (assignment) => (
        <Button
          variant={submitted(assignment.id) ? 'outline' : 'gold'}
          size="sm"
          onClick={() => submit(assignment.id)}
        >
          {submitted(assignment.id) ? 'View' : 'Submit'}
        </Button>
      ),
    },
  ];

  const openCount = assignments.filter((a) => !submitted(a.id)).length;

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