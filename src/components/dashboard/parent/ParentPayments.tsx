'use client';

import { useEffect, useState } from 'react';
import { CircleDollarSign, Search } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { PageIntro, DataColumn, DataTable, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { useLocale, useSession } from '@/components/providers/AppProviders';

type PaymentRow = {
  id: string;
  userId: string;
  courseId: string;
  enrollmentId: string;
  amount: number;
  currency: string;
  stripePaymentIntentId: string;
  status: string;
  createdAt: string;
  studentName: string;
};

export function ParentPayments({ parentId }: { parentId: string }) {
  const { formatCurrency, formatDate } = useLocale();
  const { user } = useSession();
  const [search, setSearch] = useState('');
  const [entries, setEntries] = useState<PaymentRow[]>([]);
  const [studentCount, setStudentCount] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      const links: { student?: { id: string; fullName: string } | null }[] = await fetch(`/api/users/${encodeURIComponent(user.id)}/linked-students`)
        .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
        .then((json) => (Array.isArray(json.data) ? json.data : []));
      const studentList: { id: string; fullName: string }[] = links
        .map((link) => link.student)
        .filter((s): s is { id: string; fullName: string } => Boolean(s));

      const paymentRows = await Promise.all(
        studentList.map((student) =>
          fetch(`/api/payments?userId=${encodeURIComponent(student.id)}`)
            .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
            .then((json) => (Array.isArray(json.data) ? json.data : []))
            .then((rows) =>
              rows.map((p: Omit<PaymentRow, 'studentName'>) => ({
                ...p,
                studentName: student.fullName,
              })),
            ),
        ),
      );

      if (!active) return;
      setStudentCount(studentList.length);
      setEntries(paymentRows.flat());
    }

    load();
    return () => {
      active = false;
    };
  }, [user.id]);

  const succeeded = entries.filter((p) => p.status === 'succeeded');
  const totalPaid = succeeded.reduce((s, p) => s + p.amount, 0);

  const filtered = entries.filter(
    (p) =>
      p.stripePaymentIntentId.toLowerCase().includes(search.toLowerCase()) ||
      p.studentName.toLowerCase().includes(search.toLowerCase()),
  );

  const columns: DataColumn<PaymentRow>[] = [
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
      render: (payment) => <span className="font-semibold tabular-nums text-text-primary">{formatCurrency(payment.amount / 100)} {payment.currency}</span>,
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
        subtitle={`${entries.length} transactions · ${formatCurrency(totalPaid / 100)} paid for your students`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Paid" value={formatCurrency(totalPaid / 100)} hint="Successful payments" icon={CircleDollarSign} tone="emerald" />
        <StatCard label="Transactions" value={entries.length} hint="All time" icon={CircleDollarSign} tone="blue" />
        <StatCard label="Pending" value={entries.filter((p) => p.status === 'processing').length} hint="In processing" icon={CircleDollarSign} tone="gold" />
        <StatCard label="Students" value={studentCount} hint="Linked profiles" icon={CircleDollarSign} tone="brown" />
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
