'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  FolderPlus,
  Loader2,
  MonitorPlay,
  ClipboardCheck,
  FileArchive,
  HelpCircle,
  MessageSquare,
  Link2,
  Plus,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageIntro, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { cn } from '@/lib/utils';
import type { Course, ContentType, LessonContent, LessonSection } from '@/types';

const CONTENT_TYPE_META: Record<ContentType, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  video: { label: 'Video', icon: MonitorPlay },
  document: { label: 'Document', icon: FileText },
  assignment: { label: 'Assignment', icon: ClipboardCheck },
  scorm: { label: 'SCORM', icon: FileArchive },
  quiz: { label: 'Quiz', icon: HelpCircle },
  discussion: { label: 'Discussion', icon: MessageSquare },
};

const CONTENT_TYPES = Object.keys(CONTENT_TYPE_META) as ContentType[];

interface Section extends LessonSection {
  contents: LessonContent[];
}

export function InstructorContent({ instructorId }: { instructorId: string }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState('');
  const [sections, setSections] = useState<Section[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // new section form
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [addingSection, setAddingSection] = useState(false);

  // new content form
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [contentDraft, setContentDraft] = useState({ title: '', type: 'document' as ContentType, url: '', duration: '' });
  const [savingContent, setSavingContent] = useState(false);

  const [error, setError] = useState('');

  const loadCourses = useCallback(() => {
    fetch('/api/admin/courses')
      .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
      .then((json) => {
        const mine: Course[] = Array.isArray(json.data)
          ? json.data.filter((c: Course) => c.instructorId === instructorId)
          : [];
        setCourses(mine);
        if (mine.length > 0 && !courseId) setCourseId(mine[0].id);
      })
      .catch(() => setCourses([]));
  }, [instructorId, courseId]);

  const loadContent = useCallback(() => {
    if (!courseId) return;
    setLoading(true);
    fetch(`/api/content/${encodeURIComponent(courseId)}`)
      .then((res) => (res.ok ? res.json() : Promise.resolve({ data: { sections: [] } })))
      .then((json) => {
        const raw = Array.isArray(json.data?.sections) ? json.data.sections : [];
        setSections(raw as Section[]);
        setExpanded(new Set((raw as Section[]).map((s) => s.id)));
      })
      .catch(() => setSections([]))
      .finally(() => setLoading(false));
  }, [courseId]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const addSection = async () => {
    if (!courseId || !newSectionTitle.trim()) return;
    setAddingSection(true);
    setError('');
    try {
      const res = await fetch(`/api/content/${encodeURIComponent(courseId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'section', title: newSectionTitle.trim(), contentType: 'video' }),
      });
      const json = await res.json();
      if (!json.success) setError(json.error ?? 'Failed to add section');
      else {
        setSections((prev) => [...prev, { ...json.data, contents: [] }]);
        setNewSectionTitle('');
      }
    } catch {
      setError('Network error');
    } finally {
      setAddingSection(false);
    }
  };

  const addContent = async () => {
    if (!addingTo || !contentDraft.title.trim()) return;
    setSavingContent(true);
    setError('');
    try {
      const payload: Record<string, string> = { kind: 'content', sectionId: addingTo, title: contentDraft.title.trim(), type: contentDraft.type, duration: contentDraft.duration.trim() };
      if (contentDraft.url.trim()) {
        if (contentDraft.type === 'scorm') payload.scormManifestUrl = contentDraft.url.trim();
        else if (contentDraft.type === 'video') payload.embedUrl = contentDraft.url.trim();
        else payload.fileUrl = contentDraft.url.trim();
      }
      const res = await fetch(`/api/content/${encodeURIComponent(courseId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) setError(json.error ?? 'Failed to add content');
      else {
        setSections((prev) => prev.map((s) => (s.id === addingTo ? { ...s, contents: [...s.contents, json.data] } : s)));
        setAddingTo(null);
        setContentDraft({ title: '', type: 'document', url: '', duration: '' });
      }
    } catch {
      setError('Network error');
    } finally {
      setSavingContent(false);
    }
  };

  const deleteContent = async (sectionId: string, contentId: string) => {
    const res = await fetch(`/api/content/${encodeURIComponent(courseId)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'content', id: contentId }),
    });
    const json = await res.json().catch(() => null);
    if (json?.success) {
      setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, contents: s.contents.filter((c) => c.id !== contentId) } : s)));
    }
  };

  const deleteSection = async (sectionId: string) => {
    const res = await fetch(`/api/content/${encodeURIComponent(courseId)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'section', id: sectionId }),
    });
    const json = await res.json().catch(() => null);
    if (json?.success) {
      setSections((prev) => prev.filter((s) => s.id !== sectionId));
    }
  };

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const totalItems = sections.reduce((s, sec) => s + sec.contents.length, 0);

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Instructor · Content"
        title="Content & Resource Library"
        subtitle="Build course lessons with videos, documents, links, and SCORM modules."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Courses" value={courses.length} hint="Your courses" icon={BookOpen} tone="gold" />
        <StatCard label="Sections" value={sections.length} hint="Units / modules" icon={FolderPlus} tone="blue" />
        <StatCard label="Content Items" value={totalItems} hint="Lessons & resources" icon={FileText} tone="brown" />
      </div>

      <SectionPanel title="Course" icon={BookOpen}>
        <label className="label" htmlFor="content-course">Course</label>
        <select id="content-course" className="input" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          <option value="">Select a course…</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </SectionPanel>

      {courseId && (
        <SectionPanel
          title="Add a section"
          icon={FolderPlus}
          actions={
            <Button size="sm" onClick={addSection} disabled={addingSection || !newSectionTitle.trim()}>
              {addingSection ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Plus aria-hidden="true" className="h-4 w-4" />}
              Add Section
            </Button>
          }
        >
          <input
            className="input"
            placeholder="e.g. Unit 1 — Introduction"
            value={newSectionTitle}
            onChange={(e) => setNewSectionTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSection()}
          />
        </SectionPanel>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-10 text-text-muted">
          <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" /> Loading content…
        </div>
      ) : (
        <div className="space-y-3">
          {sections.length === 0 && courseId && (
            <SectionPanel className="py-16 text-center">
              <p className="text-sm text-text-muted">No sections yet. Add your first section above.</p>
            </SectionPanel>
          )}

          {sections.map((section) => {
            const isOpen = expanded.has(section.id);
            return (
              <SectionPanel key={section.id}>
                <div className="flex items-center justify-between gap-3">
                  <button type="button" onClick={() => toggle(section.id)} className="flex flex-1 items-center gap-2 text-left">
                    {isOpen ? <ChevronDown aria-hidden="true" className="h-4 w-4 text-text-muted" /> : <ChevronRight aria-hidden="true" className="h-4 w-4 text-text-muted" />}
                    <span className="font-semibold text-text-primary">{section.title}</span>
                    {section.duration && <span className="text-xs text-text-muted">{section.duration}</span>}
                    <Badge variant="neutral">{section.contents.length} items</Badge>
                  </button>
                  <Button variant="ghost" size="sm" onClick={() => deleteSection(section.id)} aria-label="Delete section">
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </Button>
                </div>

                {isOpen && (
                  <div className="mt-3 space-y-2 border-t border-line pt-3">
                    {section.contents.map((content) => {
                      const meta = CONTENT_TYPE_META[content.type] ?? CONTENT_TYPE_META.document;
                      const Icon = meta.icon;
                      return (
                        <div key={content.id} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2">
                          <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-gold-600 dark:text-gold-400" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-text-primary">{content.title}</p>
                            <p className="text-xs text-text-muted">
                              {meta.label}
                              {content.duration ? ` · ${content.duration}` : ''}
                              {(content.embedUrl || content.fileUrl || content.scormManifestUrl) && ' · linked'}
                            </p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => deleteContent(section.id, content.id)} aria-label="Delete content">
                            <Trash2 aria-hidden="true" className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}

                    {addingTo === section.id ? (
                      <div className="rounded-lg border border-gold-500/40 bg-gold-500/5 p-3">
                        <div className="space-y-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="label">Title</label>
                              <input className="input" value={contentDraft.title} onChange={(e) => setContentDraft({ ...contentDraft, title: e.target.value })} placeholder="e.g. Lesson video" />
                            </div>
                            <div>
                              <label className="label">Type</label>
                              <select className="input" value={contentDraft.type} onChange={(e) => setContentDraft({ ...contentDraft, type: e.target.value as ContentType })}>
                                {CONTENT_TYPES.map((t) => (
                                  <option key={t} value={t}>{CONTENT_TYPE_META[t].label}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="label">URL {contentDraft.type === 'document' ? '(file/link)' : contentDraft.type === 'video' ? '(embed)' : contentDraft.type === 'scorm' ? '(manifest)' : ''}</label>
                              <input className="input" value={contentDraft.url} onChange={(e) => setContentDraft({ ...contentDraft, url: e.target.value })} placeholder="https://…" />
                            </div>
                            <div>
                              <label className="label">Duration (optional)</label>
                              <input className="input" value={contentDraft.duration} onChange={(e) => setContentDraft({ ...contentDraft, duration: e.target.value })} placeholder="e.g. 10 min" />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" onClick={addContent} disabled={savingContent || !contentDraft.title.trim()}>
                              {savingContent ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Plus aria-hidden="true" className="h-4 w-4" />}
                              Add Item
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setAddingTo(null)}>Cancel</Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setAddingTo(section.id)}>
                        <Link2 aria-hidden="true" className="h-4 w-4" /> Add content item
                      </Button>
                    )}
                  </div>
                )}
              </SectionPanel>
            );
          })}
        </div>
      )}
    </div>
  );
}
