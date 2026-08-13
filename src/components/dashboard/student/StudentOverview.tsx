'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Award, BookOpen, CalendarDays, ClipboardList, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { PageIntro, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { StatusBadge } from '@/components/dashboard/status';
import type { Assignment, Certificate, ClassSession, GradebookEntry } from '@/types';
import { useLocale } from '@/components/providers/AppProviders';

export function StudentOverview({ studentId }: { studentId: string }) {
  const { formatDate } = useLocale();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [enrollments, setEnrollments] = useState<{ id: string; userId: string; courseId: string; status: string }[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [grades, setGrades] = useState<GradebookEntry[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    let active = true;
    fetch(`/api/certificates?userId=${encodeURIComponent(studentId)}`)
      .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
      .then((json) => {
        if (active) setCertificates(Array.isArray(json.data) ? json.data : []);
      })
      .catch(() => {
        if (active) setCertificates([]);
      });
    return () => {
      active = false;
    };
  }, [studentId]);

  useEffect(() => {
    let active = true;
    fetch(`/api/enrollments?userId=${encodeURIComponent(studentId)}`)
      .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
      .then((json) => {
        if (active) setEnrollments(Array.isArray(json.data) ? json.data : []);
      })
      .catch(() => {
        if (active) setEnrollments([]);
      });
    return () => {
      active = false;
    };
  }, [studentId]);

  useEffect(() => {
    let active = true;
    fetch('/api/sessions')
      .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
      .then((json) => {
        if (active) setSessions(Array.isArray(json.data) ? (json.data as ClassSession[]) : []);
      })
      .catch(() => {
        if (active) setSessions([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const courseIds = useMemo(
    () => enrollments.filter((e) => e.status === 'active').map((e) => e.courseId),
    [enrollments],
  );

  useEffect(() => {
    let active = true;
    if (courseIds.length === 0) {
      setGrades([]);
      setAssignments([]);
      return;
    }
    const gradesFetches = courseIds.map((id) =>
      fetch(`/api/gradebook/${encodeURIComponent(id)}`)
        .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
        .then((json) => (Array.isArray(json.data) ? json.data : []))
        .catch(() => []),
    );
    const assignmentsFetches = courseIds.map((id) =>
      fetch(`/api/assignments/${encodeURIComponent(id)}`)
        .then((res) => (res.ok ? res.json() : Promise.resolve({ data: { assignments: [] } })))
        .then((json) => {
          const d = json.data;
          return Array.isArray(d) ? d : Array.isArray(d?.assignments) ? d.assignments : [];
        })
        .catch(() => []),
    );
    Promise.all([...gradesFetches, ...assignmentsFetches]).then((results) => {
      if (!active) return;
      const allGrades = results.slice(0, courseIds.length).flat() as GradebookEntry[];
      const allAssignments = results.slice(courseIds.length).flat() as Assignment[];
      setGrades(allGrades.filter((g) => g.userId === studentId));
      setAssignments(allAssignments);
    });
    return () => {
      active = false;
    };
  }, [courseIds, studentId]);

  const activeCount = enrollments.filter((e) => e.status === 'active').length;
  const upcoming = sessions
    .filter((s) => courseIds.includes(s.courseId) && s.status === 'scheduled')
    .slice(0, 5);
  const pendingAssignments = assignments.filter((a) => courseIds.includes(a.courseId)).slice(0, 4);
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