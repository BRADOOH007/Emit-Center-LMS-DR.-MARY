'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileBarChart, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { PageIntro, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { useLocale, useSession } from '@/components/providers/AppProviders';
import type { User } from '@/types';

type ReportRow = {
  id: string;
  courseId: string;
  userId: string;
  overallPercentage: number;
  letterGrade: string;
  comments: string;
  lastUpdated: string;
  student?: User;
  courseTitle: string;
};

export function ParentReports({ parentId }: { parentId: string }) {
  const { formatDate } = useLocale();
  const { user } = useSession();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [studentCount, setStudentCount] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      const links: { student?: User | null }[] = await fetch(`/api/users/${encodeURIComponent(user.id)}/linked-students`)
        .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
        .then((json) => (Array.isArray(json.data) ? json.data : []));
      const studentList: User[] = links
        .map((link) => link.student)
        .filter((s): s is User => Boolean(s));
      const studentIds = studentList.map((s) => s.id);

      const enrollmentRows = await Promise.all(
        studentIds.map((id) =>
          fetch(`/api/enrollments?userId=${encodeURIComponent(id)}`)
            .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
            .then((json) => (Array.isArray(json.data) ? json.data : [])),
        ),
      );

      const courseTitleById = new Map<string, string>();
      enrollmentRows
        .flat()
        .forEach((enrollment: { courseId: string; course?: { title?: string } }) => {
          courseTitleById.set(enrollment.courseId, enrollment.course?.title ?? enrollment.courseId);
        });
      const courseIdList = Array.from(courseTitleById.keys());

      const gradebookRows = await Promise.all(
        courseIdList.map((courseId) =>
          fetch(`/api/gradebook/${encodeURIComponent(courseId)}`)
            .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
            .then((json) => (Array.isArray(json.data) ? json.data : [])),
        ),
      );

      const reportList: ReportRow[] = gradebookRows
        .flat()
        .filter((g: { userId: string }) => studentIds.includes(g.userId))
        .map((g: ReportRow) => ({
          ...g,
          student: studentList.find((s) => s.id === g.userId),
          courseTitle: courseTitleById.get(g.courseId) ?? g.courseId,
        }));

      if (!active) return;
      setStudentCount(studentList.length);
      setReports(reportList);
    }

    load();
    return () => {
      active = false;
    };
  }, [user.id]);

  const avg = Math.round(reports.reduce((s, r) => s + r.overallPercentage, 0) / Math.max(1, reports.length));

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Parent · Reports"
        title="Progress Reports"
        subtitle={`${reports.length} progress records across your linked students`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Reports" value={reports.length} hint="Grade records" icon={FileBarChart} tone="gold" />
        <StatCard label="Average Grade" value={`${avg}%`} hint="Across all records" icon={TrendingUp} tone="emerald" />
        <StatCard label="Students" value={studentCount} hint="Linked profiles" icon={FileBarChart} tone="blue" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((report) => (
          <article key={report.id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-gold-600 dark:text-gold-400">
                  {report.student?.fullName}
                </p>
                <h2 className="mt-1 font-semibold text-text-primary">{report.courseTitle}</h2>
                <p className="mt-1 text-xs text-text-muted">Updated {formatDate(report.lastUpdated)}</p>
              </div>
              <Badge variant={report.overallPercentage >= 80 ? 'success' : report.overallPercentage >= 70 ? 'gold' : 'danger'}>
                {report.letterGrade}
              </Badge>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>Overall performance</span>
                <span className="font-semibold text-text-primary">{Math.round(report.overallPercentage)}%</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-line-soft">
                <div
                  className="h-full rounded-full bg-gold-500"
                  style={{ width: `${Math.min(100, report.overallPercentage)}%` }}
                />
              </div>
            </div>
            <p className="mt-4 border-t border-line pt-3 text-sm text-text-muted">
              {report.comments || 'No instructor comments yet for this term.'}
            </p>
          </article>
        ))}
      </div>

      {reports.length === 0 && (
        <SectionPanel className="py-16 text-center">
          <p className="text-sm text-text-muted">No progress reports available yet.</p>
        </SectionPanel>
      )}
    </div>
  );
}
