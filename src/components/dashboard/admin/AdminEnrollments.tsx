'use client';

import { useMemo, useState } from 'react';
import { CheckCheck, ClipboardList, Search, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageIntro, DataColumn, DataTable, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { StatusBadge } from '@/components/dashboard/status';
import { getEnrollments } from '@/lib/dashboard-data';
import { issueCertificate } from '@/lib/certificates';
import { useLocale } from '@/components/providers/AppProviders';
import type { Enrollment } from '@/types/dashboard';

export function AdminEnrollments() {
  const { formatDate } = useLocale();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');
  const [rows, setRows] = useState<Enrollment[]>(() => getEnrollments());
  const [lastIssued, setLastIssued] = useState<{ hash: string; studentName: string; courseTitle: string } | null>(null);

  const updateStatus = (id: string, status: Enrollment['status']) => {
    setRows((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        if (status === 'completed') {
          const issued = issueCertificate({
            userId: e.userId,
            courseId: e.courseId,
            completionDate: new Date().toISOString(),
          });
          setLastIssued({ hash: issued.verificationHash, studentName: issued.studentName, courseTitle: issued.courseTitle });
          fetch('/api/certificates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: e.userId, courseId: e.courseId }),
          }).catch(() => undefined);
        }
        return { ...e, status };
      }),
    );
  };

  const columns: DataColumn<Enrollment>[] = [
    {
      key: 'student',
      header: 'Student',
      render: (enrollment) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-text-primary">{enrollment.user?.name}</p>
          <p className="text-xs text-text-muted">{enrollment.user?.email}</p>
        </div>
      ),
    },
    {
      key: 'course',
      header: 'Course',
      render: (enrollment) => (
        <div className="min-w-0">
          <p className="truncate text-text-primary">{enrollment.course?.title}</p>
          <p className="text-xs text-text-muted">{enrollment.course?.format}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (enrollment) => <StatusBadge status={enrollment.status} />,
    },
    {
      key: 'enrolled',
      header: 'Enrolled',
      render: (enrollment) => (
        <span className="text-sm tabular-nums text-text-muted">
          {formatDate(enrollment.createdAt)}
        </span>
      ),
    },
    {
      key: 'seats',
      header: 'Seats',
      render: (enrollment) => (
        <span className="text-sm tabular-nums text-text-primary">
          {enrollment.course?.enrolledCount ?? 0}/{enrollment.course?.maxSeats ?? 0}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (enrollment) =>
        enrollment.status === 'pending' ? (
          <div className="flex items-center gap-1.5">
            <Button size="sm" onClick={() => updateStatus(enrollment.id, 'active')}>
              <CheckCheck className="h-3.5 w-3.5" /> Approve
            </Button>
            <Button variant="outline" size="sm" onClick={() => updateStatus(enrollment.id, 'cancelled')}>
              <XCircle className="h-3.5 w-3.5" /> Reject
            </Button>
          </div>
        ) : enrollment.status === 'active' ? (
          <Button variant="outline" size="sm" onClick={() => updateStatus(enrollment.id, 'completed')}>
            Complete
          </Button>
        ) : (
          <span className="text-xs text-text-muted">—</span>
        ),
    },
  ];

  const filtered = rows.filter(
    (e) =>
      (statusFilter === 'all' || e.status === statusFilter) &&
      (e.user?.name.toLowerCase().includes(search.toLowerCase()) || e.course?.title.toLowerCase().includes(search.toLowerCase())),
  );

  const statuses = Array.from(new Set(rows.map((e) => e.status)));

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Admin · Enrollments"
        title="Enrollment Records"
        subtitle={`${rows.length} enrollments across the catalog — approve, complete or cancel as needed`}
      />

      {lastIssued && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <p className="text-sm text-emerald-700 dark:text-emerald-300">
            Certificate auto-issued for <span className="font-semibold">{lastIssued.studentName}</span> — {lastIssued.courseTitle}
          </p>
          <a
            href={`/certificate/${lastIssued.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline btn-sm"
          >
            View Certificate
          </a>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Enrollments" value={rows.length} hint="All records" icon={ClipboardList} tone="gold" />
        <StatCard label="Active" value={rows.filter((e) => e.status === 'active').length} hint="Currently enrolled" icon={ClipboardList} tone="emerald" />
        <StatCard label="Pending" value={rows.filter((e) => e.status === 'pending').length} hint="Awaiting approval" icon={ClipboardList} tone="gold" />
        <StatCard label="Completed" value={rows.filter((e) => e.status === 'completed').length} hint="Finished courses" icon={ClipboardList} tone="blue" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student or course…"
            className="input pl-9"
            aria-label="Search enrollments"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`btn btn-sm ${statusFilter === 'all' ? 'btn-gold' : 'btn-outline'}`}
          >
            All
          </button>
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`btn btn-sm ${statusFilter === status ? 'btn-gold' : 'btn-outline'}`}
            >
              <Badge variant="neutral">{status}</Badge>
            </button>
          ))}
        </div>
      </div>

      <SectionPanel>
        <DataTable rows={filtered} columns={columns} emptyMessage="No enrollments match your filters." />
      </SectionPanel>
    </div>
  );
}