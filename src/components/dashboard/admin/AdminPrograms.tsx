'use client';

import { useEffect, useMemo, useState } from 'react';
import { GraduationCap, Search } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageIntro, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { useLocale } from '@/components/providers/AppProviders';
import type { Program } from '@/types/dashboard';
import type { CourseSubject, DeliveryFormat } from '@/types';

const FORMAT_TONES: Record<string, 'gold' | 'brown' | 'success'> = {
  onsite: 'brown',
  online: 'gold',
  hybrid: 'success',
};

interface ProgramCourse {
  id: string;
  title: string;
  subject: string;
  format: string;
  enrolledCount: number;
  schedule: { startDate: string; endDate: string; days: string[] };
}

export function AdminPrograms() {
  const { formatDate } = useLocale();
  const [courses, setCourses] = useState<ProgramCourse[]>([]);
  const [search, setSearch] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [added, setAdded] = useState<Program[]>([]);
  const [draft, setDraft] = useState({ name: '', description: '', format: 'onsite' as 'onsite' | 'online' | 'hybrid', subject: 'coding' as CourseSubject });

  useEffect(() => {
    let active = true;
    fetch('/api/admin/courses')
      .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
      .then((json) => {
        if (active) setCourses(Array.isArray(json.data) ? (json.data as ProgramCourse[]) : []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const programs = useMemo<Program[]>(() => {
    const bySubject = new Map<string, ProgramCourse[]>();
    courses.forEach((course) => {
      const list = bySubject.get(course.subject) ?? [];
      list.push(course);
      bySubject.set(course.subject, list);
    });
    return Array.from(bySubject.entries()).map(([subject, list]) => {
      const formats = Array.from(new Set(list.map((c) => c.format))) as DeliveryFormat[];
      const startDates = list.map((c) => c.schedule.startDate).sort();
      const endDates = list.map((c) => c.schedule.endDate).sort();
      return {
        id: `prg_${subject}`,
        name: subject.replace(/-/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase()),
        subject: subject as CourseSubject,
        description: `${list.length} course${list.length === 1 ? '' : 's'} in this track across EMIT programs.`,
        courseCount: list.length,
        enrolledCount: list.reduce((sum, c) => sum + c.enrolledCount, 0),
        formats,
        status: 'active',
        startDate: startDates[0] ?? new Date().toISOString(),
        endDate: endDates[endDates.length - 1] ?? new Date().toISOString(),
      };
    });
  }, [courses]);

  const allPrograms = [...added, ...programs];

  const filtered = allPrograms.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const totalCourses = allPrograms.reduce((sum, p) => sum + p.courseCount, 0);
  const totalEnrolled = allPrograms.reduce((sum, p) => sum + p.enrolledCount, 0);

  const createProgram = () => {
    if (!draft.name.trim()) return;
    const newProgram: Program = {
      id: `prg_new_${Date.now()}`,
      name: draft.name.trim(),
      subject: draft.subject,
      description: draft.description.trim() || 'Newly added program track.',
      formats: [draft.format],
      status: 'active',
      courseCount: 0,
      enrolledCount: 0,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 365 * 86400000).toISOString(),
    };
    setAdded((prev) => [newProgram, ...prev]);
    setComposerOpen(false);
    setDraft({ name: '', description: '', format: 'onsite', subject: 'coding' });
  };

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Admin · Programs"
        title="Programs"
        subtitle={`${allPrograms.length} active program tracks · ${totalEnrolled} total students enrolled across ${totalCourses} courses`}
        actions={
          <Button onClick={() => setComposerOpen((prev) => !prev)}>
            <GraduationCap aria-hidden="true" className="h-4 w-4" /> New Program
          </Button>
        }
      />

      {composerOpen && (
        <SectionPanel title="Add New Program" icon={GraduationCap}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="program-name">Program name</label>
              <input
                id="program-name"
                className="input"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="e.g. Aerospace Engineering"
              />
            </div>
            <div>
              <label className="label" htmlFor="program-format">Delivery</label>
              <select
                id="program-format"
                className="input"
                value={draft.format}
                onChange={(e) => setDraft({ ...draft, format: e.target.value as 'onsite' | 'online' | 'hybrid' })}
              >
                <option value="onsite">Onsite</option>
                <option value="online">Online</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="program-subject">Subject</label>
              <select
                id="program-subject"
                className="input"
                value={draft.subject}
                onChange={(e) => setDraft({ ...draft, subject: e.target.value as CourseSubject })}
              >
                <option value="robotics">Robotics</option>
                <option value="coding">Coding</option>
                <option value="design">Design</option>
                <option value="life_skills">Life Skills</option>
                <option value="engineering">Engineering</option>
                <option value="career">Career</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="program-desc">Description</label>
              <textarea
                id="program-desc"
                rows={3}
                className="input"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Describe the program track…"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button onClick={createProgram}>Create Program</Button>
            <Button variant="outline" onClick={() => setComposerOpen(false)}>Cancel</Button>
          </div>
        </SectionPanel>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Programs" value={allPrograms.length} hint="All tracks" icon={GraduationCap} tone="gold" />
        <StatCard label="Courses" value={totalCourses} hint={`${allPrograms.filter((p) => p.formats.includes('onsite')).length} onsite tracks`} icon={GraduationCap} tone="brown" />
        <StatCard label="Total Enrolled" value={totalEnrolled} hint="Across all tracks" icon={GraduationCap} tone="blue" />
        <StatCard label="Onsite Tracks" value={allPrograms.filter((p) => p.formats.includes('onsite')).length} hint="Onsite delivery" icon={GraduationCap} tone="emerald" />
      </div>

      <div className="relative max-w-sm">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search programs…"
          className="input pl-9"
          aria-label="Search programs"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((program) => (
          <article key={program.id} className="card flex flex-col p-5">
            <div className="flex items-start justify-between gap-2">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-500/10">
                <GraduationCap aria-hidden="true" className="h-6 w-6 text-gold-600 dark:text-gold-400" />
              </span>
              <Badge variant={program.status === 'active' ? 'success' : 'danger'}>{program.status}</Badge>
            </div>
            <h2 className="mt-3 font-display text-lg font-semibold text-text-primary">{program.name}</h2>
            <p className="mt-1 flex-1 text-sm text-text-muted">{program.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {program.formats.map((format) => (
                <Badge key={format} variant={FORMAT_TONES[format] ?? 'neutral'}>{format}</Badge>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs text-text-muted">
              <span>{formatDate(program.startDate)} — {formatDate(program.endDate)}</span>
              <span className="font-semibold text-text-primary">{program.enrolledCount} enrolled</span>
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <SectionPanel className="py-16 text-center">
          <p className="text-sm text-text-muted">No programs match “{search}”.</p>
        </SectionPanel>
      )}
    </div>
  );
}
