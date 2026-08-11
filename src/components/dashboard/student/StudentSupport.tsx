'use client';

import { useMemo, useState } from 'react';
import { BookOpenCheck, LifeBuoy, MessageSquare, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageIntro, SectionPanel } from '@/components/dashboard/primitives';
import { getStudentCourseIds } from '@/lib/dashboard-data';
import { MOCK_COURSES, MOCK_LESSON_CONTENTS } from '@/lib/mock-data';

export function StudentSupport({ studentId }: { studentId: string }) {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const courseIds = useMemo(() => getStudentCourseIds(studentId), [studentId]);
  const myCourses = MOCK_COURSES.filter((c) => courseIds.includes(c.id));
  const helpTopics = MOCK_LESSON_CONTENTS.filter((c) => courseIds.includes(c.courseId)).slice(0, 6);

  const filteredTopics = helpTopics.filter((t) => t.title.toLowerCase().includes(query.toLowerCase()));

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
              <select id="sup-topic" className="input">
                <option>Technical issue</option>
                <option>Billing &amp; payments</option>
                <option>Course content</option>
                <option>Enrollment help</option>
                <option>Something else</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="sup-course">Related course</label>
              <select id="sup-course" className="input">
                {myCourses.map((course) => (
                  <option key={course.id} value={course.id}>{course.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="sup-message">Describe the issue</label>
              <textarea id="sup-message" rows={4} className="input" placeholder="Tell us what happened…" />
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setSubmitted(true)}>
                <MessageSquare aria-hidden="true" className="h-4 w-4" /> Send Ticket
              </Button>
              {submitted && <p className="text-sm text-emerald-600">Ticket submitted — we&apos;ll respond by email.</p>}
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