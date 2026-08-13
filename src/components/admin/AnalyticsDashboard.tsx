'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  GraduationCap,
  TrendingDown,
  TrendingUp,
  Users,
  UserCheck,
  BarChart3,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

interface AtRiskStudent {
  id: string;
  fullName: string;
  email: string;
}

interface AnalyticsMetrics {
  activeEnrollments: number;
  totalStudents: number;
  onsiteAttendanceRate: number;
  onlineAttendanceRate: number;
  overallAttendanceRate: number;
  courseCompletionRate: number;
  atRiskCount: number;
  totalCourses: number;
  publishedCourses: number;
  totalCertificates: number;
  pendingGradable: number;
  totalPayments: number;
  revenueAmount: number;
  unreadMessages: number;
  atRiskStudents: AtRiskStudent[];
  enrollmentTrend: { date: string; count: number }[];
  attendanceTrend: { date: string; onsitePct: number; onlinePct: number }[];
  gradeDistribution: { grade: string; count: number }[];
}

const EMPTY_METRICS: AnalyticsMetrics = {
  activeEnrollments: 0,
  totalStudents: 0,
  onsiteAttendanceRate: 0,
  onlineAttendanceRate: 0,
  overallAttendanceRate: 0,
  courseCompletionRate: 0,
  atRiskCount: 0,
  totalCourses: 0,
  publishedCourses: 0,
  totalCertificates: 0,
  pendingGradable: 0,
  totalPayments: 0,
  revenueAmount: 0,
  unreadMessages: 0,
  atRiskStudents: [],
  enrollmentTrend: [],
  attendanceTrend: [],
  gradeDistribution: [],
};

export function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState<AnalyticsMetrics>(EMPTY_METRICS);

  useEffect(() => {
    let active = true;
    fetch('/api/analytics')
      .then((res) => (res.ok ? res.json() : Promise.resolve({ data: null })))
      .then((json) => {
        if (active && json?.data?.metrics) setMetrics(json.data.metrics);
      })
      .catch(() => {
        if (active) setMetrics(EMPTY_METRICS);
      });
    return () => {
      active = false;
    };
  }, []);

  const attendanceTrend = useMemo(() => {
    if (metrics.attendanceTrend.length > 0) return metrics.attendanceTrend;
    return [
      {
        date: new Date().toISOString().slice(0, 10),
        onsitePct: metrics.onsiteAttendanceRate,
        onlinePct: metrics.onlineAttendanceRate,
      },
    ];
  }, [metrics]);

  const maxEnrollment = useMemo(
    () => (metrics.enrollmentTrend.length ? Math.max(...metrics.enrollmentTrend.map((d) => d.count)) : 1),
    [metrics],
  );
  const maxTrend = useMemo(
    () => (attendanceTrend.length ? Math.max(...attendanceTrend.map((d) => Math.max(d.onsitePct, d.onlinePct))) : 1),
    [attendanceTrend],
  );
  const maxGrade = useMemo(
    () => (metrics.gradeDistribution.length ? Math.max(...metrics.gradeDistribution.map((d) => d.count)) : 1),
    [metrics],
  );

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="panel flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
            <Users aria-hidden="true" className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wide">Active Enrollments</p>
            <p className="font-display text-2xl font-bold text-text-primary">{metrics.activeEnrollments}</p>
          </div>
        </div>
        <div className="panel flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
            <GraduationCap aria-hidden="true" className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wide">Total Students</p>
            <p className="font-display text-2xl font-bold text-text-primary">{metrics.totalStudents}</p>
          </div>
        </div>
        <div className="panel flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-500/10">
            <UserCheck aria-hidden="true" className="h-6 w-6 text-gold-600 dark:text-gold-400" />
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wide">Attendance Rate</p>
            <p className="font-display text-2xl font-bold text-text-primary">{metrics.overallAttendanceRate}%</p>
            <p className="text-[11px] text-text-muted">
              <span className="text-green-600">Onsite {metrics.onsiteAttendanceRate}%</span> &middot;{' '}
              <span className="text-blue-600">Online {metrics.onlineAttendanceRate}%</span>
            </p>
          </div>
        </div>
        <div className="panel flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
            <AlertTriangle aria-hidden="true" className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wide">
              <span className="flex items-center gap-1">Completion Rate <TrendingDown aria-hidden="true" className="h-3 w-3 text-red-500" /></span>
            </p>
            <p className="font-display text-2xl font-bold text-text-primary">{metrics.courseCompletionRate}%</p>
            <p className="text-[11px] text-red-600 dark:text-red-400">{metrics.atRiskCount} students at risk</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="panel">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-text-primary">
            <TrendingUp aria-hidden="true" className="h-4 w-4 text-gold-600" />
            Enrollment Trend
          </h3>
          <div className="flex items-end gap-1" style={{ height: '8rem' }}>
            {metrics.enrollmentTrend.map((point) => (
              <div key={point.date} className="group flex flex-1 flex-col items-center justify-end">
                <div
                  className="w-full rounded-t bg-gold-500 transition-all hover:bg-gold-400"
                  style={{ height: `${(point.count / maxEnrollment) * 90}%` }}
                />
                <span className="mt-1 text-[10px] text-text-muted group-hover:text-text-primary">
                  {point.date.slice(5)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-text-primary">
            <UserCheck aria-hidden="true" className="h-4 w-4 text-gold-600" />
            Attendance Rates
          </h3>
          <div className="space-y-2">
            {attendanceTrend.map((point) => (
              <div key={point.date} className="flex items-center gap-3">
                <span className="w-12 text-xs text-text-muted">{point.date.slice(8)}</span>
                <div className="flex flex-1 gap-1.5">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="w-10 text-right text-emerald-600">{point.onsitePct}%</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-line-soft">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(point.onsitePct / maxTrend) * 100}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-line-soft">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${(point.onlinePct / maxTrend) * 100}%` }} />
                    </div>
                    <span className="w-10 text-blue-600">{point.onlinePct}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-4 text-[10px] text-text-muted">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Onsite</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Online</span>
          </div>
        </div>

        <div className="panel">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-text-primary">
            <BarChart3 aria-hidden="true" className="h-4 w-4 text-gold-600" />
            Grade Distribution
          </h3>
          <div className="flex items-end gap-1" style={{ height: '7rem' }}>
            {metrics.gradeDistribution.map((d) => (
              <div key={d.grade} className="group flex flex-1 flex-col items-center justify-end">
                <div
                  className={cn(
                    'w-full rounded-t transition-all',
                    d.grade.startsWith('A') ? 'bg-emerald-500' :
                    d.grade.startsWith('B') ? 'bg-blue-500' :
                    d.grade.startsWith('C') ? 'bg-amber-500' :
                    d.grade === 'D' ? 'bg-orange-500' : 'bg-red-500',
                  )}
                  style={{ height: `${(d.count / maxGrade) * 80}%` }}
                />
                <span className="mt-1 text-[10px] text-text-muted group-hover:text-text-primary">{d.grade}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-text-primary">
            <AlertTriangle aria-hidden="true" className="h-4 w-4 text-red-500" />
            At-Risk Students
          </h3>
          <div className="space-y-2">
            {metrics.atRiskStudents.map((student) => (
              <div key={student.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">{student.fullName}</p>
                  <p className="truncate text-xs text-text-muted">{student.email}</p>
                </div>
                <Badge variant="danger">at risk</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
