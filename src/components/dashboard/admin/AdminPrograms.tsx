'use client';

import { useEffect, useMemo, useState } from 'react';
import { GraduationCap, Loader2, Search, Trash2 } from 'lucide-react';
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

const SUBJECT_LABELS: Record<CourseSubject, string> = {
  robotics: 'Robotics',
  coding: 'Coding',
  design: 'Design',
  'life-skills': 'Life Skills',
  engineering: 'Engineering',
  career: 'Career',
};

export function AdminPrograms() {
  const { formatDate } = useLocale();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [search, setSearch] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [draft, setDraft] = useState({
    name: '',
    description: '',
    subject: 'coding' as CourseSubject,
  });

  const load = async () => {
    try {
      const res = await fetch('/api/admin/programs');
      if (!res.ok) return;
      const json = await res.json();
      setPrograms(Array.isArray(json.data) ? (json.data as Program[]) : []);
    } catch {
      /* ignore transient errors */
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () => programs.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())),
    [programs, search],
  );

  const totalCourses = programs.reduce((sum, p) => sum + p.courseCount, 0);
  const totalEnrolled = programs.reduce((sum, p) => sum + p.enrolledCount, 0);
  const onsiteTracks = programs.filter((p) => p.formats.includes('onsite')).length;

  const createProgram = async () => {
    if (!draft.name.trim()) return;
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name.trim(),
          description: draft.description.trim(),
          subject: draft.subject,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setMessage(`Failed to create: ${json.error ?? 'unknown error'}`);
        return;
      }
      setPrograms((prev) => [json.data as Program, ...prev]);
      setComposerOpen(false);
      setDraft({ name: '', description: '', subject: 'coding' });
      setMessage('');
    } catch {
      setMessage('Network error while creating program.');
    } finally {
      setSaving(false);
    }
  };

  const deleteProgram = async (program: Program) => {
    if (!window.confirm(`Delete program “${program.name}”? Courses in it will be unassigned but not deleted.`)) return;
    try {
      const res = await fetch(`/api/admin/programs/${program.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) {
        window.alert(`Failed to delete: ${json.error ?? 'unknown error'}`);
        return;
      }
      setPrograms((prev) => prev.filter((p) => p.id !== program.id));
    } catch {
      window.alert('Network error while deleting program.');
    }
  };

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Admin · Programs"
        title="Programs"
        subtitle={`${programs.length} active program tracks · ${totalEnrolled} total students enrolled across ${totalCourses} courses`}
        actions={
          <Button onClick={() => setComposerOpen((prev) => !prev)}>
            <GraduationCap aria-hidden="true" className="h-4 w-4" /> New Program
          </Button>
        }
      />

      {message && (
        <p className={`text-sm ${message.startsWith('Failed') || message.startsWith('Network') ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
          {message}
        </p>
      )}

      {composerOpen && (
        <SectionPanel title="Add New Program" icon={GraduationCap}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
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
              <label className="label" htmlFor="program-subject">Subject track</label>
              <select
                id="program-subject"
                className="input"
                value={draft.subject}
                onChange={(e) => setDraft({ ...draft, subject: e.target.value as CourseSubject })}
              >
                {(Object.keys(SUBJECT_LABELS) as CourseSubject[]).map((s) => (
                  <option key={s} value={s}>{SUBJECT_LABELS[s]}</option>
                ))}
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
            <Button onClick={createProgram} disabled={saving}>
              {saving ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <GraduationCap aria-hidden="true" className="h-4 w-4" />}
              Create Program
            </Button>
            <Button variant="outline" onClick={() => setComposerOpen(false)}>Cancel</Button>
          </div>
        </SectionPanel>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Programs" value={programs.length} hint="All tracks" icon={GraduationCap} tone="gold" />
        <StatCard label="Courses" value={totalCourses} hint="Across all tracks" icon={GraduationCap} tone="brown" />
        <StatCard label="Total Enrolled" value={totalEnrolled} hint="Across all tracks" icon={GraduationCap} tone="blue" />
        <StatCard label="Onsite Tracks" value={onsiteTracks} hint="Onsite delivery" icon={GraduationCap} tone="emerald" />
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
              <div className="flex items-center gap-2">
                <Badge variant={program.status === 'active' ? 'success' : 'danger'}>{program.status}</Badge>
                <Button variant="ghost" size="sm" aria-label={`Delete ${program.name}`} onClick={() => deleteProgram(program)}>
                  <Trash2 aria-hidden="true" className="h-4 w-4 text-red-600 dark:text-red-400" />
                </Button>
              </div>
            </div>
            <h2 className="mt-3 font-display text-lg font-semibold text-text-primary">{program.name}</h2>
            <p className="mt-1 flex-1 text-sm text-text-muted">{program.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge variant="neutral">{SUBJECT_LABELS[program.subject] ?? program.subject}</Badge>
              {program.formats.map((format) => (
                <Badge key={format} variant={FORMAT_TONES[format] ?? 'neutral'}>{format}</Badge>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs text-text-muted">
              <span>{formatDate(program.startDate)} — {formatDate(program.endDate)}</span>
              <span className="font-semibold text-text-primary">{program.enrolledCount} enrolled · {program.courseCount} courses</span>
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
