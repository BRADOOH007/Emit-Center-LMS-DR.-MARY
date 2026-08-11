'use client';

import { useMemo, useState } from 'react';
import { CircleDollarSign, Receipt, Search } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { PageIntro, DataColumn, DataTable, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { getStudentPayments } from '@/lib/dashboard-data';
import { useLocale } from '@/components/providers/AppProviders';
import type { Payment } from '@/types/dashboard';

export function StudentPayments({ studentId }: { studentId: string }) {
  const { formatCurrency, formatDate } = useLocale();
  const [search, setSearch] = useState('');
  const payments = useMemo(() => getStudentPayments(studentId), [studentId]);
  const succeeded = payments.filter((p) => p.status === 'succeeded');
  const totalPaid = succeeded.reduce((sum, p) => sum + p.amount, 0);
  const pending = payments.filter((p) => p.status === 'processing').reduce((sum, p) => sum + p.amount, 0);

  const filtered = payments.filter((p) => p.stripePaymentIntentId.toLowerCase().includes(search.toLowerCase()));

  const downloadReceipt = (payment: Payment) => {
    const lines = [
      'EMIT Center LMS — Payment Receipt',
      '----------------------------------',
      `Payment ID:     ${payment.stripePaymentIntentId}`,
      `Date:           ${new Date(payment.createdAt).toLocaleString()}`,
      `Amount:         ${formatCurrency(payment.amount)} ${payment.currency}`,
      `Status:         ${payment.status}`,
      `Gateway:        Stripe`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${payment.stripePaymentIntentId}-receipt.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: DataColumn<Payment>[] = [
    {
      key: 'payment',
      header: 'Payment',
      render: (payment) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-text-primary">{payment.stripePaymentIntentId}</p>
          <p className="text-xs text-text-muted">{formatDate(payment.createdAt)}</p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (payment) => <span className="font-semibold tabular-nums text-text-primary">{formatCurrency(payment.amount)} {payment.currency}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (payment) => (
        <Badge variant={payment.status === 'succeeded' ? 'success' : payment.status === 'processing' ? 'gold' : payment.status === 'refunded' ? 'danger' : 'neutral'}>
          {payment.status}
        </Badge>
      ),
    },
    {
      key: 'receipt',
      header: 'Receipt',
      render: (payment) => (
        <button type="button" onClick={() => downloadReceipt(payment)} className="btn btn-outline btn-sm" aria-label="Download receipt">
          <Receipt className="h-3.5 w-3.5" /> Download
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Student · Payments"
        title="My Payments"
        subtitle={`${payments.length} transactions · ${formatCurrency(totalPaid)} paid`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Paid" value={formatCurrency(totalPaid)} hint="Successful payments" icon={CircleDollarSign} tone="emerald" />
        <StatCard label="Pending" value={formatCurrency(pending)} hint="In processing" icon={CircleDollarSign} tone="gold" />
        <StatCard label="Transactions" value={payments.length} hint="All time" icon={CircleDollarSign} tone="blue" />
        <StatCard label="Refunded" value={formatCurrency(payments.filter((p) => p.status === 'refunded').reduce((s, p) => s + p.amount, 0))} hint="Credited back" icon={CircleDollarSign} tone="red" />
      </div>

      <div className="relative max-w-sm">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search transactions…"
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