'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Check, Eye, EyeOff, GitBranch, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageIntro, DataColumn, DataTable, ProgressBarCell, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { useLocale } from '@/components/providers/AppProviders';
import type { AgeLevel, CoursePrerequisite, CourseSchedule, CourseStandard, CourseSubject, DeliveryFormat, SupportedCurrency } from '@/types';

interface AdminCourse {
  id: string;
  title: string;
  slug: string;
  description: string;
  format: DeliveryFormat;
  ageLevel: AgeLevel;
  subject: CourseSubject;
  schedule: CourseSchedule;
  onsiteLocation?: string;
  virtualLink?: string;
  maxSeats: number;
  enrolledCount: number;
  instructorId: string;
  instructor?: { id: string; fullName: string; email: string } | null;
  pricing: { id: string; courseId: string; currency: SupportedCurrency; amount: number }[];
  prerequisites?: CoursePrerequisite[];
  standards?: CourseStandard[];
  isPublished: boolean;
  createdAt: string;
}

interface StandardDraft {
  authority: string;
  code: string;
  description: string;
}

export function AdminCourses() {
  const { formatCurrency } = useLocale();
  const [search, setSearch] = useState('');
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [published, setPublished] = useState<string[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState({ title: '', subject: 'coding', ageLevel: 'middle', format: 'online', priceUsd: '149' });

  // --- prerequisites & standards editor ---
  const [editId, setEditId] = useState<string | null>(null);
  const [preReqIds, setPreReqIds] = useState<string[]>([]);
  const [standards, setStandards] = useState<StandardDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    loadCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCourses = async () => {
    try {
      const res = await fetch('/api/admin/courses');
      if (!res.ok) return;
      const json = await res.json();
      if (!Array.isArray(json.data)) return;
      const data = json.data as AdminCourse[];
      setCourses(data);
      setPublished(data.filter((c) => c.isPublished).map((c) => c.id));
    } catch {
      /* ignore transient errors */
    }
  };

  const togglePublished = async (id: string) => {
    const course = courses.find((c) => c.id === id);
    if (!course) return;
    const next = !published.includes(id);
    const prevPublished = published;
    setPublished((p) => (next ? [...p, id] : p.filter((x) => x !== id)));
    try {
      const res = await fetch(`/api/admin/courses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: next }),
      });
      const json = await res.json();
      if (!json.success) {
        setPublished(prevPublished);
        window.alert(`Failed to ${next ? 'publish' : 'unpublish'}: ${json.error ?? 'unknown error'}`);
      }
    } catch {
      setPublished(prevPublished);
      window.alert('Network error while toggling publish state.');
    }
  };

  const allCourses = courses;

  const filtered = allCourses.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()) || c.subject.includes(search.toLowerCase()),
  );

  const createCourse = async () => {
    if (!draft.title.trim()) return;
    const pricing = { currency: 'USD' as const, amount: Math.round(Number(draft.priceUsd || 0) * 100) };
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draft.title.trim(),
          subject: draft.subject,
          ageLevel: draft.ageLevel,
          format: draft.format,
          description: 'Newly added course awaiting a full description.',
          pricing: [pricing],
          isPublished: false,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        window.alert(`Failed to create course: ${json.error ?? 'unknown error'}`);
        return;
      }
      setComposerOpen(false);
      setDraft({ title: '', subject: 'coding', ageLevel: 'middle', format: 'online', priceUsd: '149' });
      await loadCourses();
    } catch {
      window.alert('Network error while creating course.');
    }
  };

  const deleteCourse = async (course: AdminCourse) => {
    if (!window.confirm(`Delete course “${course.title}”? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/courses/${course.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) {
        window.alert(`Failed to delete: ${json.error ?? 'unknown error'}`);
        return;
      }
      await loadCourses();
    } catch {
      window.alert('Network error while deleting course.');
    }
  };

  const openCourseEditor = (course: AdminCourse) => {
    setEditId(course.id);
    setPreReqIds(course.prerequisites?.map((p) => p.prerequisiteId) ?? []);
    setStandards(
      (course.standards ?? []).map((s) => ({ authority: s.authority, code: s.code, description: s.description ?? '' })),
    );
    setSaveMsg('');
  };

  const saveCoursePath = async () => {
    if (!editId) return;
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch(`/api/admin/courses/${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prerequisiteIds: preReqIds,
          standards: standards.filter((s) => s.authority.trim() && s.code.trim()),
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setSaveMsg(`Failed to save: ${json.error ?? 'unknown error'}`);
      } else {
        setCourses((prev) =>
          prev.map((c) =>
            c.id === editId
              ? {
                  ...c,
                  prerequisites: json.data.prerequisites,
                  standards: (json.data.standards ?? []).map((s: CourseStandard) => ({
                    id: s.id,
                    courseId: s.courseId,
                    authority: s.authority,
                    code: s.code,
                    description: s.description,
                  })),
                }
              : c,
          ),
        );
        setSaveMsg('Learning pathway saved.');
      }
    } catch {
      setSaveMsg('Network error while saving.');
    } finally {
      setSaving(false);
    }
  };

  const columns: DataColumn<AdminCourse>[] = [
    {
      key: 'course',
      header: 'Course',
      render: (course) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-text-primary">{course.title}</p>
          <p className="text-xs text-text-muted">{course.subject} · {course.ageLevel}</p>
        </div>
      ),
    },
    {
      key: 'format',
      header: 'Format',
      render: (course) => (
        <Badge variant={course.format === 'onsite' ? 'brown' : course.format === 'online' ? 'gold' : 'success'}>
          {course.format}
        </Badge>
      ),
    },
    {
      key: 'instructor',
      header: 'Instructor',
      render: (course) => <span className="text-sm text-text-primary">{course.instructor?.fullName ?? '—'}</span>,
    },
    {
      key: 'enrollment',
      header: 'Enrollment',
      render: (course) => (
        <ProgressBarCell value={(course.enrolledCount / course.maxSeats) * 100} />
      ),
    },
    {
      key: 'price',
      header: 'Price (USD)',
      render: (course) => (
        <span className="text-sm tabular-nums text-text-primary">
          {formatCurrency((course.pricing.find((p) => p.currency === 'USD')?.amount ?? 0) / 100)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (course) => (
        <Badge variant={published.includes(course.id) ? 'success' : 'neutral'}>
          {published.includes(course.id) ? 'Published' : 'Draft'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (course) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => openCourseEditor(course)}>
            <GitBranch aria-hidden="true" className="h-3.5 w-3.5" /> Pathway
          </Button>
          <Button
            variant={published.includes(course.id) ? 'outline' : 'ghost'}
            size="sm"
            onClick={() => togglePublished(course.id)}
          >
            {published.includes(course.id) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {published.includes(course.id) ? 'Unpublish' : 'Publish'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Delete ${course.title}`}
            onClick={() => deleteCourse(course)}
          >
            <Trash2 aria-hidden="true" className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
          </Button>
        </div>
      ),
    },
  ];

  const totalSeats = allCourses.reduce((s, c) => s + c.maxSeats, 0);
  const totalEnrolled = allCourses.reduce((s, c) => s + c.enrolledCount, 0);

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Admin · Courses"
        title="Course Catalog"
        subtitle={`${allCourses.length} courses · ${totalEnrolled}/${totalSeats} seats filled across the catalog`}
        actions={
          <Button onClick={() => setComposerOpen((prev) => !prev)}>
            <BookOpen aria-hidden="true" className="h-4 w-4" /> New Course
          </Button>
        }
      />

      {composerOpen && (
        <SectionPanel title="Add New Course" icon={BookOpen}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="course-title">Course title</label>
              <input
                id="course-title"
                className="input"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="e.g. Intro to Electronics"
              />
            </div>
            <div>
              <label className="label" htmlFor="course-subject">Subject</label>
              <select
                id="course-subject"
                className="input"
                value={draft.subject}
                onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
              >
                <option value="robotics">Robotics</option>
                <option value="coding">Coding</option>
                <option value="design">Design</option>
                <option value="life_skills">Life Skills</option>
                <option value="engineering">Engineering</option>
                <option value="career">Career</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="course-format">Format</label>
              <select
                id="course-format"
                className="input"
                value={draft.format}
                onChange={(e) => setDraft({ ...draft, format: e.target.value })}
              >
                <option value="onsite">Onsite</option>
                <option value="online">Online</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="course-age">Age level</label>
              <select
                id="course-age"
                className="input"
                value={draft.ageLevel}
                onChange={(e) => setDraft({ ...draft, ageLevel: e.target.value })}
              >
                <option value="elementary">Elementary</option>
                <option value="middle">Middle</option>
                <option value="high">High</option>
                <option value="adult">Adult</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="course-price">Price (USD)</label>
              <input
                id="course-price"
                type="number"
                min={0}
                className="input"
                value={draft.priceUsd}
                onChange={(e) => setDraft({ ...draft, priceUsd: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button onClick={createCourse}>Create Course</Button>
            <Button variant="outline" onClick={() => setComposerOpen(false)}>Cancel</Button>
          </div>
        </SectionPanel>
      )}

      {editId && (
        <CoursePathEditor
          editId={editId}
          courses={allCourses}
          preReqIds={preReqIds}
          setPreReqIds={setPreReqIds}
          standards={standards}
          setStandards={setStandards}
          saving={saving}
          saveMsg={saveMsg}
          onSave={saveCoursePath}
          onClose={() => setEditId(null)}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Courses" value={allCourses.length} hint={`${published.length} published`} icon={BookOpen} tone="gold" />
        <StatCard label="Published" value={published.length} hint="Visible in catalog" icon={BookOpen} tone="emerald" />
        <StatCard label="Seats Filled" value={totalSeats > 0 ? Math.round((totalEnrolled / totalSeats) * 100) : 0} hint={`${totalEnrolled} enrolled`} icon={BookOpen} tone="blue" />
        <StatCard label="Instructors" value={new Set(allCourses.map((c) => c.instructorId)).size} hint="Active faculty" icon={BookOpen} tone="brown" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses…"
            className="input pl-9"
            aria-label="Search courses"
          />
        </div>
        <span className="text-sm text-text-muted">Showing {filtered.length} of {allCourses.length}</span>
      </div>

      <SectionPanel>
        <DataTable rows={filtered} columns={columns} emptyMessage="No courses match your search." />
      </SectionPanel>
    </div>
  );
}

function CoursePathEditor({
  editId,
  courses,
  preReqIds,
  setPreReqIds,
  standards,
  setStandards,
  saving,
  saveMsg,
  onSave,
  onClose,
}: {
  editId: string;
  courses: AdminCourse[];
  preReqIds: string[];
  setPreReqIds: (ids: string[]) => void;
  standards: StandardDraft[];
  setStandards: (list: StandardDraft[]) => void;
  saving: boolean;
  saveMsg: string;
  onSave: () => void;
  onClose: () => void;
}) {
  const current = courses.find((c) => c.id === editId);
  const candidates = courses.filter((c) => c.id !== editId && !c.id.startsWith('crs_new'));

  const togglePreReq = (id: string) => {
    setPreReqIds(preReqIds.includes(id) ? preReqIds.filter((x) => x !== id) : [...preReqIds, id]);
  };

  const updateStandard = (index: number, patch: Partial<StandardDraft>) => {
    setStandards(standards.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  return (
    <SectionPanel
      title={`Learning path · ${current?.title ?? ''}`}
      icon={GitBranch}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          <Button variant="gold" size="sm" onClick={onSave} disabled={saving}>
            {saving ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Check aria-hidden="true" className="h-4 w-4" />}
            Save
          </Button>
        </div>
      }
    >
      <p className="mb-1 text-xs text-text-muted">Select prerequisite courses and align academic standards (e.g. TEKS, B.E.S.T., NGSS, Common Core).</p>
      {saveMsg && (
        <p className={`mb-3 text-xs ${saveMsg.startsWith('Failed') || saveMsg.startsWith('Network') ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
          {saveMsg}
        </p>
      )}

      <div className="mb-4">
        <p className="label">Prerequisites (must be completed before enrollment)</p>
        {candidates.length === 0 ? (
          <p className="text-sm text-text-muted">No other published courses to choose from yet.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {candidates.map((c) => (
              <label
                key={c.id}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  preReqIds.includes(c.id) ? 'border-gold-500 bg-gold-500/10' : 'border-line hover:bg-line-soft'
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-text-primary">{c.title}</span>
                  <span className="text-xs text-text-muted">{c.subject} · {c.ageLevel}</span>
                </span>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-gold-500"
                  checked={preReqIds.includes(c.id)}
                  onChange={() => togglePreReq(c.id)}
                />
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <p className="label !mb-0">Standards alignment</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setStandards([...standards, { authority: '', code: '', description: '' }])}
        >
          <Plus aria-hidden="true" className="h-3.5 w-3.5" /> Add standard
        </Button>
      </div>

      {standards.length === 0 ? (
        <p className="text-sm text-text-muted">No standards aligned yet.</p>
      ) : (
        <div className="space-y-2">
          {standards.map((s, i) => (
            <div key={i} className="grid gap-2 rounded-lg border border-line p-2 sm:grid-cols-[95px_110px_1fr_auto]">
              <input
                className="input !py-1.5"
                placeholder="Authority"
                value={s.authority}
                onChange={(e) => updateStandard(i, { authority: e.target.value })}
              />
              <input
                className="input !py-1.5"
                placeholder="Code (e.g. 8.2B)"
                value={s.code}
                onChange={(e) => updateStandard(i, { code: e.target.value })}
              />
              <input
                className="input !py-1.5"
                placeholder="Standard description (optional)"
                value={s.description}
                onChange={(e) => updateStandard(i, { description: e.target.value })}
              />
              <Button variant="ghost" size="sm" onClick={() => setStandards(standards.filter((_, j) => j !== i))}>
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </SectionPanel>
  );
}
