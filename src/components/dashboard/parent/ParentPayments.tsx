'use client';

import { useMemo, useState } from 'react';
import { CircleDollarSign, Search } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { PageIntro, DataColumn, DataTable, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { getLinkedStudentIds, getStudentPayments } from '@/lib/dashboard-data';
import { MOCK_USERS } from '@/lib/mock-data';
import { useLocale } from '@/components/providers/AppProviders';
import type { Payment } from '@/types/dashboard';

export function ParentPayments({ parentId }: { parentId: string }) {
  const { formatCurrency, formatDate } = useLocale();
  const [search, setSearch] = useState('');
  const studentIds = useMemo(() => getLinkedStudentIds(parentId), [parentId]);

  const entries = useMemo(
    () =>
      studentIds.flatMap((studentId) =>
        getStudentPayments(studentId).map((payment) => ({
          ...payment,
          studentName: MOCK_USERS.find((u) => u.id === studentId)?.fullName ?? studentId,
        })),
      ),
    [studentIds],
  );

  const succeeded = entries.filter((p) => p.status === 'succeeded');
  const totalPaid = succeeded.reduce((s, p) => s + p.amount, 0);

  const filtered = entries.filter(
    (p) =>
      p.stripePaymentIntentId.toLowerCase().includes(search.toLowerCase()) ||
      p.studentName.toLowerCase().includes(search.toLowerCase()),
  );

  const columns: DataColumn<Payment & { studentName: string }>[] = [
    {
      key: 'student',
      header: 'Student',
      render: (payment) => <span className="text-sm font-medium text-text-primary">{payment.studentName}</span>,
    },
    {
      key: 'payment',
      header: 'Payment',
      render: (payment) => (
        <span className="text-sm tabular-nums text-text-muted">{payment.stripePaymentIntentId}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (payment) => <span className="font-semibold tabular-nums text-text-primary">{formatCurrency(payment.amount)} {payment.currency}</span>,
    },
    {
      key: 'date',
      header: 'Date',
      render: (payment) => <span className="text-sm tabular-nums text-text-muted">{formatDate(payment.createdAt)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (payment) => (
        <Badge variant={payment.status === 'succeeded' ? 'success' : payment.status === 'processing' ? 'gold' : 'neutral'}>
          {payment.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Parent · Payments"
        title="Family Payments"
        subtitle={`${entries.length} transactions · ${formatCurrency(totalPaid)} paid for your students`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Paid" value={formatCurrency(totalPaid)} hint="Successful payments" icon={CircleDollarSign} tone="emerald" />
        <StatCard label="Transactions" value={entries.length} hint="All time" icon={CircleDollarSign} tone="blue" />
        <StatCard label="Pending" value={entries.filter((p) => p.status === 'processing').length} hint="In processing" icon={CircleDollarSign} tone="gold" />
        <StatCard label="Students" value={studentIds.length} hint="Linked profiles" icon={CircleDollarSign} tone="brown" />
      </div>

      <div className="relative max-w-sm">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by student or transaction…"
          className="input pl-9"
          aria-label="Search payments"
        />
      </div>

      <SectionPanel>
        <DataTable rows={filtered} columns={columns} emptyMessage="No payments match your search." />
      </SectionPanel>
    </div>
  );
}