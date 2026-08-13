'use client';

import { useCallback, useEffect, useState } from 'react';
import { BookOpen, Loader2, Save, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageIntro, SectionPanel, DataTable, type DataColumn } from '@/components/dashboard/primitives';
import { cn } from '@/lib/utils';
import type { Course, Quiz, QuizQuestion } from '@/types';

interface InstructorRow {
  id: string;
  courseId: string;
  title: string;
  questionCount: number;
  totalPoints: number;
  timeLimit: number;
  published: boolean;
  attempts: number;
  createdAt: string;
}

const DIFFICULTY_OPTIONS = ['easy', 'medium', 'hard'];
const typeLabel: Record<string, string> = {
  'multiple-choice': 'Multiple Choice',
  'true-false': 'True / False',
  'short-answer': 'Short Answer',
  essay: 'Essay',
};

export function InstructorAssessments({ instructorId }: { instructorId: string }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [grade, setGrade] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [totalPoints, setTotalPoints] = useState(100);
  const [timeLimit, setTimeLimit] = useState(30);
  const [includeTypes, setIncludeTypes] = useState<Record<string, boolean>>({
    'multiple-choice': true,
    'true-false': false,
    'short-answer': true,
    essay: false,
  });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [exam, setExam] = useState<{ title: string; description: string; timeLimit: number; totalPoints: number; questions: QuizQuestion[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Quiz | null>(null);
  const [rows, setRows] = useState<InstructorRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadCourses = useCallback(() => {
    fetch('/api/admin/courses')
      .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
      .then((json) => {
        const myCourses: Course[] = Array.isArray(json.data)
          ? json.data.filter((c: Course) => c.instructorId === instructorId)
          : [];
        setCourses(myCourses);
        if (myCourses.length > 0 && !courseId) setCourseId(myCourses[0].id);
      })
      .catch(() => setCourses([]));
  }, [instructorId, courseId]);

  const loadQuizzes = useCallback(() => {
    setLoadingList(true);
    fetch(`/api/quizzes?courseId=${encodeURIComponent(courseId)}`)
      .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
      .then((json) => {
        if (Array.isArray(json.data)) {
          setRows(
            json.data.map((q: Quiz & { questionCount?: number; attempts?: { submittedAt: string }[] }) => ({
              id: q.id,
              courseId: q.courseId,
              title: q.title,
              questionCount: q.questionCount ?? q.questions.length,
              totalPoints: q.totalPoints,
              timeLimit: q.timeLimit,
              published: q.isPublished,
              attempts: q.attempts?.length ?? 0,
              createdAt: q.createdAt,
            })),
          );
        } else {
          setRows([]);
        }
      })
      .catch(() => setRows([]))
      .finally(() => setLoadingList(false));
  }, [courseId]);

  useEffect(() => {
    loadCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadCourses]);

  useEffect(() => {
    if (courseId) loadQuizzes();
    else setRows([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const handleGenerate = async () => {
    if (!courseId) {
      setError('Select a course first.');
      return;
    }
    setGenerating(true);
    setError('');
    setSaved(null);
    try {
      const res = await fetch('/api/ai/generate-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          subject,
          topic,
          grade: grade || undefined,
          difficulty,
          totalPoints,
          timeLimit,
          includeMultipleChoice: includeTypes['multiple-choice'],
          includeTrueFalse: includeTypes['true-false'],
          includeShortAnswer: includeTypes['short-answer'],
          includeEssay: includeTypes['essay'],
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? 'Failed to generate exam.');
        return;
      }
      setExam(json.data.exam);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to generate exam.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!exam || !courseId) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          title: exam.title,
          description: exam.description,
          timeLimit: exam.timeLimit,
          questions: exam.questions,
          totalPoints: exam.totalPoints,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? 'Failed to save quiz.');
        return;
      }
      setSaved(json.data);
      setExam(null);
      loadQuizzes();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save quiz.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteId(id);
    try {
      const res = await fetch(`/api/quizzes/${id}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({ success: false }));
      if (!json.success) {
        setError(json.error ?? 'Failed to delete quiz.');
      }
      loadQuizzes();
    } finally {
      setDeleteId(null);
    }
  };

  const columns: DataColumn<InstructorRow>[] = [
    {
      key: 'title',
      header: 'Quiz',
      render: (r) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-text-primary">{r.title}</span>
          {!r.published && <Badge variant="neutral">Draft</Badge>}
        </div>
      ),
    },
    {
      key: 'questions',
      header: 'Questions',
      render: (r) => `${r.questionCount}`,
    },
    {
      key: 'points',
      header: 'Points',
      render: (r) => `${r.totalPoints} pts`,
    },
    {
      key: 'time',
      header: 'Time',
      render: (r) => `${r.timeLimit} min`,
    },
    {
      key: 'attempts',
      header: 'Attempts',
      render: (r) => `${r.attempts}`,
    },
    {
      key: 'created',
      header: 'Created',
      render: (r) => new Date(r.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            disabled={deleteId === r.id}
            onClick={() => handleDelete(r.id)}
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const questionCount = exam ? exam.questions.length : 0;
  const pointsSum = exam ? exam.questions.reduce((sum, q) => sum + q.points, 0) : 0;

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Assessment"
        title="Exams & Assessments"
        subtitle="Generate exams with AI, then publish them as timed quizzes for your students."
      />

      <SectionPanel title="Course" icon={BookOpen}>
        <div className="space-y-4">
          <div>
            <label htmlFor="assess-course" className="label">Course</label>
            <select
              id="assess-course"
              className="input"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              <option value="">Select a course…</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
        </div>
      </SectionPanel>

      <SectionPanel title="Generate with AI" icon={Sparkles}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="assess-topic" className="label">Topic</label>
            <input
              id="assess-topic"
              className="input"
              placeholder="e.g. Quadratic Equations"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="assess-subject" className="label">Subject (optional)</label>
            <input
              id="assess-subject"
              className="input"
              placeholder="Auto-filled from course"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="assess-grade" className="label">Grade / Level (optional)</label>
            <input
              id="assess-grade"
              className="input"
              placeholder="e.g. Grade 9"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="assess-difficulty" className="label">Difficulty</label>
            <select
              id="assess-difficulty"
              className="input"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
            >
              {DIFFICULTY_OPTIONS.map((d) => (
                <option key={d} value={d}>{d[0].toUpperCase() + d.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="assess-points" className="label">Total points</label>
            <input
              id="assess-points"
              type="number"
              className="input"
              min={1}
              value={totalPoints}
              onChange={(e) => setTotalPoints(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
          <div>
            <label htmlFor="assess-time" className="label">Time limit (minutes)</label>
            <input
              id="assess-time"
              type="number"
              className="input"
              min={1}
              value={timeLimit}
              onChange={(e) => setTimeLimit(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
          <div className="sm:col-span-2">
            <p className="label">Question types</p>
            <div className="flex flex-wrap gap-2">
              {Object.keys(typeLabel).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setIncludeTypes((prev) => ({ ...prev, [type]: !prev[type] }))}
                  className={cn(
                    'rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors',
                    includeTypes[type]
                      ? 'border-gold-500 bg-gold-500/10 text-gold-600 dark:text-gold-400'
                      : 'border-line text-text-muted hover:bg-line-soft',
                  )}
                >
                  {typeLabel[type]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="gold" onClick={handleGenerate} disabled={generating || !courseId}>
            {generating ? (
              <>
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Wand2 aria-hidden="true" className="h-4 w-4" />
                Generate Exam
              </>
            )}
          </Button>
        </div>
      </SectionPanel>

      {exam && (
        <SectionPanel
          title={exam.title}
          icon={Sparkles}
          actions={
            <Button variant="gold" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save aria-hidden="true" className="h-4 w-4" />
                  Save as Quiz
                </>
              )}
            </Button>
          }
        >
          <p className="mb-1 text-xs text-gold-600 dark:text-gold-400">
            {exam.timeLimit} min · {questionCount} questions · {pointsSum}/{exam.totalPoints} pts
          </p>
          {exam.description && <p className="mb-3 text-sm text-text-muted">{exam.description}</p>}
          <div className="space-y-3">
            {exam.questions.map((q, i) => (
              <div key={q.id} className="rounded-lg border border-line p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-text-primary">
                    {i + 1}. {q.question}
                  </p>
                  <Badge variant="neutral">{typeLabel[q.type]}</Badge>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
                  <span>{q.points} pts</span>
                  {q.options && q.options.length > 0 && (
                    <span>Options: {q.options.join(' · ')}</span>
                  )}
                  {q.correctAnswer && (
                    <span className="text-emerald-700 dark:text-emerald-400">Answer: {q.correctAnswer}</span>
                  )}
                  {q.modelAnswer && q.type !== 'short-answer' && (
                    <span className="max-w-xl truncate text-emerald-700 dark:text-emerald-400">Model: {q.modelAnswer}</span>
                  )}
                  {saved && (
                    <span className="text-emerald-600 dark:text-emerald-400">Saved ✓</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SectionPanel>
      )}

      {saved && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
          Quiz “{saved.title}” was published to your course. Students can now take it.
        </div>
      )}

      <SectionPanel title="Published quizzes" icon={BookOpen}>
        {loadingList ? (
          <div className="flex items-center justify-center py-8 text-text-muted">
            <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : (
          <DataTable<InstructorRow>
            rows={rows}
            columns={columns}
            emptyMessage="No quizzes yet. Generate and save your first exam above."
          />
        )}
      </SectionPanel>
    </div>
  );
}