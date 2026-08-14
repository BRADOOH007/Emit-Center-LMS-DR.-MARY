'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Megaphone, Search, Send, UserRound, X } from 'lucide-react';
import { PageIntro, DataColumn, DataTable, ProgressBarCell, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { UserAvatar } from '@/components/ui/UserAvatar';
import type { Course, GradebookEntry } from '@/types';

type RosterRow = GradebookEntry & { courseTitle: string };

export function InstructorRoster({ instructorId }: { instructorId: string }) {
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [courses, setCourses] = useState<Course[]>([]);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [broadcastOpen, setBroadcastOpen] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/courses')
      .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
      .then((json) => {
        if (!active) return;
        const myCourses: Course[] = Array.isArray(json.data)
          ? json.data.filter((c: Course) => c.instructorId === instructorId)
          : [];
        const courseIds = myCourses.map((c) => c.id);
        setCourses(myCourses);
        Promise.all(
          courseIds.map((id) =>
            fetch(`/api/gradebook/${encodeURIComponent(id)}`)
              .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
              .then((gradeJson) =>
                Array.isArray(gradeJson.data)
                  ? gradeJson.data.map((entry: GradebookEntry) => ({
                      ...entry,
                      courseTitle: myCourses.find((c) => c.id === entry.courseId)?.title ?? entry.courseId,
                    }))
                  : [],
              ),
          ),
        )
          .then((rows) => {
            if (active) setRoster(rows.flat());
          })
          .catch(() => {
            if (active) setRoster([]);
          });
      })
      .catch(() => {
        if (active) {
          setCourses([]);
          setRoster([]);
        }
      });
    return () => {
      active = false;
    };
  }, [instructorId]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return roster.filter((r) => {
      const name = (r.user?.fullName ?? r.user?.name ?? '').toLowerCase();
      const email = (r.user?.email ?? '').toLowerCase();
      const matchesSearch = !q || name.includes(q) || email.includes(q);
      const matchesCourse = courseFilter === 'all' || r.courseId === courseFilter;
      return matchesSearch && matchesCourse;
    });
  }, [roster, search, courseFilter]);

  const columns: DataColumn<RosterRow>[] = [
    {
      key: 'student',
      header: 'Student',
      render: (row) => (
        <div className="flex items-center gap-3">
          <UserAvatar name={row.user?.fullName ?? row.user?.name ?? '?'} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium text-text-primary">{row.user?.fullName ?? row.user?.name}</p>
            <p className="truncate text-xs text-text-muted">{row.user?.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'course',
      header: 'Course',
      render: (row) => <span className="text-sm text-text-primary">{row.courseTitle}</span>,
    },
    {
      key: 'grade',
      header: 'Current Grade',
      render: (row) => (
        <Badge variant={row.letterGrade ? 'success' : 'neutral'}>{row.letterGrade ?? '—'}</Badge>
      ),
    },
    {
      key: 'attendance',
      header: 'Attendance',
      render: (row) => <ProgressBarCell value={0} tone="blue" />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Instructor · Roster"
        title="Student Roster"
        subtitle={`${roster.length} students across ${courses.length} courses`}
        actions={
          <Button onClick={() => setBroadcastOpen(true)} disabled={courses.length === 0}>
            <Megaphone aria-hidden="true" className="h-4 w-4" /> Message Class
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total Students" value={roster.length} hint="Active enrollments" icon={UserRound} tone="gold" />
        <StatCard label="Courses" value={courses.length} hint="Taught by you" icon={UserRound} tone="blue" />
        <StatCard label="Avg Attendance" value={0} hint="Across roster" icon={UserRound} tone="emerald" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students…"
            className="input pl-9"
            aria-label="Search students"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setCourseFilter('all')} className={`btn btn-sm ${courseFilter === 'all' ? 'btn-gold' : 'btn-outline'}`}>
            All courses
          </button>
          {courses.map((course) => (
            <button key={course.id} onClick={() => setCourseFilter(course.id)} className={`btn btn-sm ${courseFilter === course.id ? 'btn-gold' : 'btn-outline'}`}>
              {course.title}
            </button>
          ))}
        </div>
      </div>

      <SectionPanel>
        <DataTable rows={filtered} columns={columns} emptyMessage="No students match your filters." />
      </SectionPanel>

      {broadcastOpen && (
        <BroadcastModal
          courses={courses}
          onClose={() => setBroadcastOpen(false)}
        />
      )}
    </div>
  );
}

function BroadcastModal({ courses, onClose }: { courses: Course[]; onClose: () => void }) {
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState('');

  const send = async () => {
    if (!courseId || !subject.trim() || !content.trim()) return;
    setSending(true);
    setResult('');
    try {
      const res = await fetch('/api/messages/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, subject: subject.trim(), content: content.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setResult(`Message sent to ${json.data.recipients} student(s).`);
        setSubject('');
        setContent('');
      } else {
        setResult(json.error ?? 'Failed to send.');
      }
    } catch {
      setResult('Network error while sending.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Message class" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-lg rounded-card border border-line bg-base-elevated p-5 shadow-pop">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-text-primary">Message the class</h3>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm !px-1.5" aria-label="Close">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-1 text-xs text-text-muted">Sends an in-app message, notification, and email to every enrolled student.</p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="label" htmlFor="bc-course">Course</label>
            <select id="bc-course" className="input" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="bc-subject">Subject</label>
            <input id="bc-subject" className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Class reminder" />
          </div>
          <div>
            <label className="label" htmlFor="bc-content">Message</label>
            <textarea id="bc-content" rows={4} className="input" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your message…" />
          </div>
          {result && <p className="text-sm text-emerald-600 dark:text-emerald-400">{result}</p>}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button variant="gold" onClick={send} disabled={sending || !courseId || !subject.trim() || !content.trim()} className="flex-1">
              {sending ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Send aria-hidden="true" className="h-4 w-4" />}
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
