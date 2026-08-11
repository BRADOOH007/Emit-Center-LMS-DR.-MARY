'use client';

import { useMemo, useState } from 'react';
import { Megaphone, Pin, Search } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageIntro, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { getAnnouncements, getInstructorCourses } from '@/lib/dashboard-data';
import { useLocale } from '@/components/providers/AppProviders';
import type { AnnouncementData } from '@/types/dashboard';

export function InstructorAnnouncements({ instructorId }: { instructorId: string }) {
  const { formatDate } = useLocale();
  const [search, setSearch] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState({ courseId: '', title: '', body: '' });
  const courses = useMemo(() => getInstructorCourses(instructorId), [instructorId]);
  const courseIds = courses.map((c) => c.id);

  const [announcements, setAnnouncements] = useState<AnnouncementData[]>(() =>
    getAnnouncements().filter((a) => courseIds.includes(a.courseId)).sort((a, b) => Number(b.pinned) - Number(a.pinned)),
  );

  const publish = () => {
    if (!draft.title.trim() || !draft.body.trim()) return;
    const courseId = draft.courseId || courses[0]?.id;
    if (!courseId) return;
    const post: AnnouncementData = {
      id: `ann_new_${Date.now()}`,
      authorId: instructorId,
      courseId,
      title: draft.title.trim(),
      body: draft.body.trim(),
      pinned: false,
      createdAt: new Date().toISOString(),
    };
    setAnnouncements((prev) => [post, ...prev]);
    setComposerOpen(false);
    setDraft({ courseId: '', title: '', body: '' });
  };

  const filtered = announcements.filter((a) => a.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Instructor · Announcements"
        title="Course Announcements"
        subtitle={`${announcements.length} announcements across your courses — keep students in the loop`}
        actions={
          <Button onClick={() => setComposerOpen((prev) => !prev)}>
            <Megaphone aria-hidden="true" className="h-4 w-4" /> New Announcement
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Announcements" value={announcements.length} hint="All courses" icon={Megaphone} tone="gold" />
        <StatCard label="Pinned" value={announcements.filter((a) => a.pinned).length} hint="Featured posts" icon={Pin} tone="brown" />
        <StatCard label="Courses" value={courses.length} hint="Your courses" icon={Megaphone} tone="blue" />
      </div>

      {composerOpen && (
        <SectionPanel title="Compose Announcement" icon={Megaphone}>
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="ann-course">Course</label>
              <select id="ann-course" className="input" value={draft.courseId || courses[0]?.id} onChange={(e) => setDraft({ ...draft, courseId: e.target.value })}>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>{course.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="ann-title">Title</label>
              <input id="ann-title" className="input" placeholder="e.g. Lab session rescheduled" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="ann-body">Message</label>
              <textarea id="ann-body" rows={4} className="input" placeholder="Write your announcement…" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={publish}>Publish</Button>
              <Button variant="outline" onClick={() => { setComposerOpen(false); setDraft({ courseId: '', title: '', body: '' }); }}>Cancel</Button>
            </div>
          </div>
        </SectionPanel>
      )}

      <div className="relative max-w-sm">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search announcements…"
          className="input pl-9"
          aria-label="Search announcements"
        />
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <SectionPanel className="py-16 text-center">
            <p className="text-sm text-text-muted">No announcements match your search.</p>
          </SectionPanel>
        )}
        {filtered.map((announcement) => (
          <article key={announcement.id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                {announcement.pinned && <Pin aria-hidden="true" className="h-4 w-4 text-gold-600" />}
                <h2 className="font-semibold text-text-primary">{announcement.title}</h2>
              </div>
              <Badge variant={announcement.pinned ? 'gold' : 'neutral'}>{announcement.pinned ? 'Pinned' : 'Posted'}</Badge>
            </div>
            <p className="mt-2 text-sm text-text-muted">{announcement.body}</p>
            <p className="mt-3 text-xs text-text-muted">{formatDate(announcement.createdAt)}</p>
          </article>
        ))}
      </div>
    </div>
  );
}