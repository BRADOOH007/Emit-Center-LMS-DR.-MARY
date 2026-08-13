'use client';

import { useEffect, useState } from 'react';
import { CreditCard, RotateCcw, Search, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageIntro, DataColumn, DataTable, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { useLocale } from '@/components/providers/AppProviders';
import type { Payment } from '@/types/dashboard';

export function AdminPayments() {
  const { formatCurrency, formatDate } = useLocale();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');
  const [rows, setRows] = useState<Payment[]>([]);

  useEffect(() => {
    let active = true;
    fetch('/api/payments')
      .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
      .then((json) => {
        if (active) setRows(Array.isArray(json.data) ? (json.data as Payment[]) : []);
      })
      .catch(() => {
        if (active) setRows([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const refund = (id: string) =>
    setRows((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'refunded', amount: p.amount } : p)));

  const payments = rows;
  const succeeded = payments.filter((p) => p.status === 'succeeded');
  const totalRevenue = succeeded.reduce((sum, p) => sum + p.amount, 0);
  const refunded = payments.filter((p) => p.status === 'refunded').reduce((sum, p) => sum + p.amount, 0);

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
      render: (payment) => (
        <span className="font-semibold tabular-nums text-text-primary">
          {formatCurrency(payment.amount / 100)} {payment.currency}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (payment) => <StatusBadgeForPayment status={payment.status} />,
    },
    {
      key: 'channel',
      header: 'Channel',
      render: () => (
        <span className="flex items-center gap-1.5 text-sm text-text-primary">
          <CreditCard className="h-3.5 w-3.5 text-gold-600" /> Stripe
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (payment) =>
        payment.status === 'succeeded' ? (
          <Button variant="outline" size="sm" onClick={() => refund(payment.id)}>
            <RotateCcw className="h-3.5 w-3.5" /> Refund
          </Button>
        ) : (
          <span className="text-xs text-text-muted">—</span>
        ),
    },
  ];

  const filtered = payments.filter(
    (p) =>
      (statusFilter === 'all' || p.status === statusFilter) &&
      p.stripePaymentIntentId.toLowerCase().includes(search.toLowerCase()),
  );

  const statuses = Array.from(new Set(payments.map((p) => p.status)));

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Admin · Payments"
        title="Payment Ledger"
        subtitle={`${payments.length} transactions · ${formatCurrency(totalRevenue / 100)} collected via Stripe`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Collected"
          value={formatCurrency(totalRevenue / 100)}
          hint={`${succeeded.length} successful payments`}
          icon={TrendingUp}
          tone="emerald"
        />
        <StatCard
          label="Refunded"
          value={formatCurrency(refunded / 100)}
          hint="Processed refunds"
          icon={TrendingUp}
          tone="red"
        />
        <StatCard
          label="Processing"
          value={payments.filter((p) => p.status === 'processing').length}
          hint="Awaiting confirmation"
          icon={CreditCard}
          tone="gold"
        />
        <StatCard
          label="Avg. Payment"
          value={formatCurrency(succeeded.length ? totalRevenue / succeeded.length / 100 : 0)}
          hint="Per successful payment"
          icon={CreditCard}
          tone="blue"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by payment intent…"
            className="input pl-9"
            aria-label="Search payments"
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
              {status}
            </button>
          ))}
        </div>
      </div>

      <SectionPanel>
        <DataTable rows={filtered} columns={columns} emptyMessage="No payments match your filters." />
      </SectionPanel>
    </div>
  );
}

function StatusBadgeForPayment({ status }: { status: string }) {
  const variant = status === 'succeeded' ? 'success' : status === 'processing' ? 'gold' : status === 'refunded' ? 'danger' : status === 'failed' ? 'danger' : 'neutral';
  return <Badge variant={variant}>{status}</Badge>;
}
