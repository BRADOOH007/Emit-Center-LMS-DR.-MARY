'use client';

import { useEffect, useState } from 'react';
import { BookOpenCheck, LifeBuoy, MessageSquare, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageIntro, SectionPanel } from '@/components/dashboard/primitives';

interface HelpTopic {
  id: string;
  courseId: string;
  title: string;
  type: string;
}

interface MyCourse {
  id: string;
  title: string;
}

interface EnrollmentItem {
  userId: string;
  courseId: string;
  status: string;
  course?: { title?: string };
}

interface ContentSection {
  contents?: { id: string; courseId: string; title: string; type: string }[];
}

export function StudentSupport({ studentId }: { studentId: string }) {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [sending, setSending] = useState(false);
  const [topic, setTopic] = useState('Technical issue');
  const [relatedCourse, setRelatedCourse] = useState('');
  const [message, setMessage] = useState('');
  const [myCourses, setMyCourses] = useState<MyCourse[]>([]);
  const [helpTopics, setHelpTopics] = useState<HelpTopic[]>([]);

  useEffect(() => {
    let active = true;
    fetch('/api/enrollments')
      .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
      .then(async (json) => {
        const enrollments = (Array.isArray(json.data) ? json.data : []) as EnrollmentItem[];
        const courses = enrollments
          .filter((enrollment) => enrollment.userId === studentId && enrollment.status === 'active')
          .map((enrollment) => ({ id: enrollment.courseId, title: enrollment.course?.title ?? enrollment.courseId }));
        const topicsByCourse = await Promise.all(
          courses.map(async (course) => {
            try {
              const res = await fetch(`/api/content/${encodeURIComponent(course.id)}`);
              const contentJson = res.ok ? await res.json() : { data: {} };
              const data = contentJson.data ?? {};
              if (!Array.isArray(data.sections)) return [];
              const sections = data.sections as ContentSection[];
              return sections
                .flatMap((section) => section.contents ?? [])
                .filter((content) => content.courseId === course.id);
            } catch {
              return [];
            }
          }),
        );
        if (active) {
          setMyCourses(courses);
          setHelpTopics(topicsByCourse.flat().slice(0, 6));
        }
      })
      .catch(() => {
        if (active) {
          setMyCourses([]);
          setHelpTopics([]);
        }
      });
    return () => {
      active = false;
    };
  }, [studentId]);

  const filteredTopics = helpTopics.filter((t) => t.title.toLowerCase().includes(query.toLowerCase()));

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSending(true);
    setSubmitError('');
    try {
      const adminRes = await fetch('/api/users?role=super_admin');
      const adminJson = adminRes.ok ? await adminRes.json() : { data: [] };
      let admins = (Array.isArray(adminJson.data) ? adminJson.data : []) as { id: string }[];
      if (admins.length === 0) {
        const fallbackRes = await fetch('/api/users?role=administrator');
        const fallbackJson = fallbackRes.ok ? await fallbackRes.json() : { data: [] };
        admins = (Array.isArray(fallbackJson.data) ? fallbackJson.data : []) as { id: string }[];
      }
      if (admins.length === 0) {
        setSubmitError('No support contact found. Please try again later.');
        setSending(false);
        return;
      }
      const receiverId = admins[0].id;
      const course = myCourses.find((c) => c.id === relatedCourse);
      const subject = `Support ticket: ${topic}${course ? ` — ${course.title}` : ''}`;
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId, subject, content: message.trim() }),
      });
      if (!res.ok) {
        setSubmitError('Failed to send. Please try again.');
        setSending(false);
        return;
      }
      setMessage('');
      setSubmitted(true);
    } catch {
      setSubmitError('Failed to send. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Student · Support"
        title="Help & Support"
        subtitle="Find answers, browse resources, or send a ticket to the EMIT support team."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionPanel title="Submit a Ticket" icon={LifeBuoy}>
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="sup-topic">Topic</label>
              <select id="sup-topic" className="input" value={topic} onChange={(e) => setTopic(e.target.value)}>
                <option>Technical issue</option>
                <option>Billing &amp; payments</option>
                <option>Course content</option>
                <option>Enrollment help</option>
                <option>Something else</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="sup-course">Related course</label>
              <select id="sup-course" className="input" value={relatedCourse} onChange={(e) => setRelatedCourse(e.target.value)}>
                {myCourses.map((course) => (
                  <option key={course.id} value={course.id}>{course.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="sup-message">Describe the issue</label>
              <textarea
                id="sup-message"
                rows={4}
                className="input"
                placeholder="Tell us what happened…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            {submitError && <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>}
            <div className="flex items-center gap-2">
              <Button onClick={handleSubmit} disabled={sending || !message.trim()}>
                <MessageSquare aria-hidden="true" className="h-4 w-4" /> {sending ? 'Sending…' : 'Send Ticket'}
              </Button>
              {submitted && <p className="text-sm text-emerald-600">Ticket sent to support — we&apos;ll respond by email.</p>}
            </div>
          </div>
        </SectionPanel>

        <SectionPanel title="Help Center" icon={BookOpenCheck}>
          <div className="relative mb-4 max-w-sm">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search help articles…"
              className="input pl-9"
              aria-label="Search help"
            />
          </div>
          <ul className="divide-y divide-line">
            {filteredTopics.length > 0 ? (
              filteredTopics.map((topic) => (
                <li key={topic.id}>
                  <a href={`/learn/${topic.courseId}`} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="truncate text-sm font-medium text-text-primary">{topic.title}</span>
                    <span className="shrink-0 text-xs text-text-muted">{topic.type}</span>
                  </a>
                </li>
              ))
            ) : (
              <li className="py-6 text-center text-sm text-text-muted">
                No help articles match “{query}”. Try contacting support.
              </li>
            )}
          </ul>
        </SectionPanel>
      </div>
    </div>
  );
}
