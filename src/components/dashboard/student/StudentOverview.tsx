'use client';

import { useMemo } from 'react';
import { ArrowRight, Award, BookOpen, CalendarDays, ClipboardList, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { PageIntro, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { StatusBadge } from '@/components/dashboard/status';
import {
  getGradebookForStudent,
  getStudentCourseIds,
  getStudentEnrollments,
} from '@/lib/dashboard-data';
import { getStudentCertificates } from '@/lib/certificates';
import { MOCK_ASSIGNMENTS, MOCK_SESSIONS } from '@/lib/mock-data';
import { useLocale } from '@/components/providers/AppProviders';

export function StudentOverview({ studentId }: { studentId: string }) {
  const { formatDate } = useLocale();
  const courseIds = useMemo(() => getStudentCourseIds(studentId), [studentId]);
  const enrollments = useMemo(() => getStudentEnrollments(studentId), [studentId]);
  const grades = useMemo(() => getGradebookForStudent(studentId), [studentId]);
  const certificates = useMemo(() => getStudentCertificates(studentId), [studentId]);

  const activeCount = enrollments.filter((e) => e.status === 'active').length;
  const sessions = MOCK_SESSIONS.filter((s) => courseIds.includes(s.courseId));
  const upcoming = sessions.filter((s) => s.status === 'scheduled').slice(0, 5);
  const pendingAssignments = MOCK_ASSIGNMENTS.filter((a) => courseIds.includes(a.courseId)).slice(0, 4);
  const avgGrade = Math.round(
    grades.reduce((sum, g) => sum + g.overallPercentage, 0) / Math.max(1, grades.length),
  );

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Student"
        title="My Learning"
        subtitle={`${activeCount} active courses · ${grades.length} graded records · average ${avgGrade}%`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Courses" value={activeCount} hint={`${enrollments.length} total enrollments`} icon={BookOpen} tone="gold" />
        <StatCard label="Upcoming Classes" value={upcoming.length} hint="Next sessions" icon={CalendarDays} tone="blue" />
        <StatCard label="Open Assignments" value={pendingAssignments.length} hint="To complete" icon={ClipboardList} tone="brown" />
        <StatCard label="Average Grade" value={`${avgGrade}%`} hint="Across courses" icon={TrendingUp} tone="emerald" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionPanel title="Upcoming Classes" icon={CalendarDays}>
          <ul className="divide-y divide-line">
            {upcoming.length > 0 ? (
              upcoming.map((session) => (
                <li key={session.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">{session.title}</p>
                    <p className="text-xs text-text-muted">{formatDate(session.date)} · {session.startTime}–{session.endTime}</p>
                  </div>
                  <Badge variant={session.format === 'onsite' ? 'brown' : 'gold'}>{session.format}</Badge>
                </li>
              ))
            ) : (
              <li className="py-6 text-center text-sm text-text-muted">No upcoming classes.</li>
            )}
          </ul>
        </SectionPanel>

        <SectionPanel title="Assignments Due" icon={ClipboardList}>
          <ul className="divide-y divide-line">
            {pendingAssignments.length > 0 ? (
              pendingAssignments.map((assignment) => (
                <li key={assignment.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">{assignment.title}</p>
                    <p className="text-xs text-text-muted">Due {formatDate(assignment.dueDate)} · {assignment.points} pts</p>
                  </div>
                  <StatusBadge status="pending" />
                </li>
              ))
            ) : (
              <li className="py-6 text-center text-sm text-text-muted">Nothing due right now.</li>
            )}
          </ul>
        </SectionPanel>
      </div>

      <SectionPanel
        title="My Certificates"
        icon={Award}
        actions={
          <a href="/dashboard/student/certificates" className="btn btn-outline btn-sm">
            View all <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
          </a>
        }
      >
        {certificates.length > 0 ? (
          <ul className="divide-y divide-line">
            {certificates.slice(0, 3).map((cert) => (
              <li key={cert.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">{cert.courseTitle}</p>
                  <p className="text-xs text-text-muted">
                    Completed {formatDate(cert.completionDate)} · {cert.verificationHash}
                  </p>
                </div>
                <Badge variant="success" dot>Issued</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-text-muted">
            No certificates yet — complete a course and one will be issued automatically.
          </p>
        )}
      </SectionPanel>
    </div>
  );
}