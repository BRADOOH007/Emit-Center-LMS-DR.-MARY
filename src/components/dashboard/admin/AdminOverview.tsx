'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  CircleDollarSign,
  GraduationCap,
  PlayCircle,
  TrendingUp,
  Users,
} from 'lucide-react';
import { PageIntro, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { StatusBadge } from '@/components/dashboard/status';
import { useLocale } from '@/components/providers/AppProviders';
import type { Enrollment, Payment } from '@/types/dashboard';
import type { User } from '@/types';

interface AnalyticsMetrics {
  activeEnrollments: number;
  totalStudents: number;
  onsiteAttendanceRate: number;
  onlineAttendanceRate: number;
  overallAttendanceRate: number;
  courseCompletionRate: number;
  atRiskCount: number;
}

interface AuditEntry {
  id: string;
  action: string;
  createdAt: string;
  resourceType: string;
  resourceId: string | null;
  userId: string;
  user?: { fullName: string; email: string } | null;
}

interface RawEnrollment {
  id: string;
  userId: string;
  courseId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  course?: {
    id: string;
    title: string;
  } | null;
}

const EMPTY_METRICS: AnalyticsMetrics = {
  activeEnrollments: 0,
  totalStudents: 0,
  onsiteAttendanceRate: 0,
  onlineAttendanceRate: 0,
  overallAttendanceRate: 0,
  courseCompletionRate: 0,
  atRiskCount: 0,
};

export function AdminOverview() {
  const { formatCurrency, formatDateTime } = useLocale();
  const [metrics, setMetrics] = useState<AnalyticsMetrics>(EMPTY_METRICS);
  const [recentAudits, setRecentAudits] = useState<AuditEntry[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [rawEnrollments, setRawEnrollments] = useState<RawEnrollment[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    let active = true;
    const fetchJson = (url: string) =>
      fetch(url).then((res) => (res.ok ? res.json() : Promise.resolve({ data: null })));
    Promise.all([
      fetchJson('/api/analytics'),
      fetchJson('/api/payments'),
      fetchJson('/api/enrollments'),
      fetchJson('/api/users'),
    ])
      .then(([analytics, paymentsJson, enrollmentsJson, usersJson]) => {
        if (!active) return;
        if (analytics?.data?.metrics) setMetrics(analytics.data.metrics);
        setRecentAudits(Array.isArray(analytics?.data?.recentAudits) ? analytics.data.recentAudits : []);
        setPayments(Array.isArray(paymentsJson?.data) ? paymentsJson.data : []);
        setRawEnrollments(Array.isArray(enrollmentsJson?.data) ? enrollmentsJson.data : []);
        setUsers(Array.isArray(usersJson?.data) ? usersJson.data : []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const enrollments = useMemo<Enrollment[]>(
    () =>
      rawEnrollments.map((e) => ({
        id: e.id,
        userId: e.userId,
        courseId: e.courseId,
        status: e.status as Enrollment['status'],
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
        course: (e.course ?? undefined) as Enrollment['course'],
        user: users.find((u) => u.id === e.userId),
      })),
    [rawEnrollments, users],
  );

  const revenue = useMemo(
    () => payments.filter((p) => p.status === 'succeeded').reduce((sum, p) => sum + p.amount, 0),
    [payments],
  );
  const completed = enrollments.filter((e) => e.status === 'completed').length;
  const pending = enrollments.filter((e) => e.status === 'pending').length;
  const recentEnrollments = enrollments.slice(0, 6);
  const activeStudents = users.filter((u) => u.roles.includes('student')).length;

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Super Admin"
        title="Platform Overview"
        subtitle="Monitor the full EMIT Center LMS — programs, enrollments, revenue and health at a glance."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Students"
          value={metrics.totalStudents.toLocaleString()}
          hint={`${activeStudents} student accounts`}
          icon={Users}
          tone="blue"
        />
        <StatCard
          label="Active Enrollments"
          value={metrics.activeEnrollments}
          hint={`${completed} completed · ${pending} pending`}
          icon={BookOpen}
          tone="emerald"
        />
        <StatCard
          label="Course Completion"
          value={`${metrics.courseCompletionRate}%`}
          hint={`${metrics.atRiskCount} students at risk`}
          icon={GraduationCap}
          tone="gold"
        />
        <StatCard
          label="Collected Revenue"
          value={formatCurrency(revenue / 100)}
          hint={`Across ${payments.filter((p) => p.status === 'succeeded').length} successful payments`}
          icon={CircleDollarSign}
          tone="brown"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <SectionPanel title="Attendance Health" icon={Activity} className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="panel flex flex-col items-center justify-center gap-1 p-4">
              <p className="text-xs uppercase tracking-wide text-text-muted">Overall</p>
              <p className="font-display text-3xl font-bold text-text-primary">{metrics.overallAttendanceRate}%</p>
              <p className="text-xs text-emerald-600">Healthy</p>
            </div>
            <div className="panel flex flex-col items-center justify-center gap-1 p-4">
              <p className="text-xs uppercase tracking-wide text-text-muted">Onsite</p>
              <p className="font-display text-3xl font-bold text-text-primary">{metrics.onsiteAttendanceRate}%</p>
              <p className="flex items-center gap-1 text-xs text-text-muted">
                <TrendingUp className="h-3 w-3 text-emerald-600" /> tracked per session
              </p>
            </div>
            <div className="panel flex flex-col items-center justify-center gap-1 p-4">
              <p className="text-xs uppercase tracking-wide text-text-muted">Online</p>
              <p className="font-display text-3xl font-bold text-text-primary">{metrics.onlineAttendanceRate}%</p>
              <p className="flex items-center gap-1 text-xs text-text-muted">
                <TrendingUp className="h-3 w-3 text-emerald-600" /> tracked per session
              </p>
            </div>
          </div>

          <div className="mt-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
              <AlertTriangle className="h-4 w-4 text-red-500" /> Enrollments to review
            </h3>
            {pending > 0 ? (
              <div className="space-y-2">
                {recentEnrollments.filter((e) => e.status === 'pending').slice(0, 4).map((enrollment) => (
                  <div key={enrollment.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary">{enrollment.user?.name}</p>
                      <p className="truncate text-xs text-text-muted">{enrollment.course?.title}</p>
                    </div>
                    <StatusBadge status={enrollment.status} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted">All enrollments are resolved. Nothing to review.</p>
            )}
          </div>
        </SectionPanel>

        <SectionPanel title="Recent Activity" icon={TrendingUp}>
          <ul className="space-y-3">
            {recentAudits.slice(0, 5).map((log) => (
              <li key={log.id} className="flex items-start gap-3 text-sm">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold-500" />
                <div className="min-w-0">
                  <p className="truncate text-text-primary">{log.action.replace(/\./g, ' · ')}</p>
                  <p className="truncate text-xs text-text-muted">
                    {log.user?.fullName ?? 'Unknown user'}
                    {log.user?.email ? ` · ${log.user.email}` : ''} · {formatDateTime(log.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </SectionPanel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionPanel title="Latest Enrollments" icon={BookOpen}>
          <ul className="divide-y divide-line">
            {recentEnrollments.map((enrollment) => (
              <li key={enrollment.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brown-600 font-semibold uppercase text-gold-200">
                    {enrollment.user?.name?.slice(0, 2)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">{enrollment.user?.name}</p>
                    <p className="truncate text-xs text-text-muted">{enrollment.course?.title}</p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <StatusBadge status={enrollment.status} />
                  <p className="mt-0.5 text-[11px] text-text-muted">{formatDateTime(enrollment.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        </SectionPanel>

        <SectionPanel title="System Quick Actions" icon={PlayCircle}>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { label: 'View analytics', href: '/dashboard/admin/analytics' },
              { label: 'Manage courses', href: '/dashboard/admin/courses' },
              { label: 'Review enrollments', href: '/dashboard/admin/enrollments' },
              { label: 'Payment ledger', href: '/dashboard/admin/payments' },
              { label: 'User management', href: '/dashboard/admin/users' },
              { label: 'Platform settings', href: '/dashboard/admin/settings' },
            ].map((action) => (
              <a
                key={action.href}
                href={action.href}
                className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5 text-sm font-medium text-text-primary transition-colors hover:border-gold-600 hover:bg-gold-500/5"
              >
                {action.label}
                <span aria-hidden="true" className="text-gold-600">→</span>
              </a>
            ))}
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}
