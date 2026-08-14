'use client';

import { useCallback, useEffect, useState } from 'react';
import { Archive, BookOpen, FileText, Loader2, Presentation, Save, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageIntro, SectionPanel, DataTable, type DataColumn } from '@/components/dashboard/primitives';
import { cn } from '@/lib/utils';
import type { Course, Quiz, QuizQuestion } from '@/types';

type Tab = 'exams' | 'assignments' | 'presentations' | 'generations';

const TABS: { key: Tab; label: string; icon: typeof BookOpen }[] = [
  { key: 'exams', label: 'Exams', icon: BookOpen },
  { key: 'assignments', label: 'Assignments', icon: FileText },
  { key: 'presentations', label: 'Presentations', icon: Presentation },
  { key: 'generations', label: 'My Generations', icon: Archive },
];

const DIFFICULTY_OPTIONS = ['easy', 'medium', 'hard'];
const typeLabel: Record<string, string> = {
  'multiple-choice': 'Multiple Choice',
  'true-false': 'True / False',
  'short-answer': 'Short Answer',
  essay: 'Essay',
};

interface GenerationRow {
  id: string;
  type: string;
  title: string;
  courseId: string | null;
  createdAt: string;
}

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

interface AssignmentRow {
  id: string;
  courseId: string;
  title: string;
  points: number;
  dueDate: string;
  submissions?: unknown[];
}

interface GeneratedAssignment {
  title: string;
  description: string;
  instructions: string[];
  objectives: string[];
  rubric: { excellent: string; good: string; satisfactory: string; needsImprovement: string };
  estimatedDays: number;
  content: string;
}

interface GeneratedPresentation {
  title: string;
  description: string;
  slideCount: number;
  slides: {
    id: string;
    title: string;
    section: 'introduction' | 'body' | 'conclusion';
    content: string[];
    speakerNotes?: string;
    imagePrompt?: string;
  }[];
}

interface StoredGeneration {
  id: string;
  type: string;
  title: string;
  courseId: string | null;
  content: unknown;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
}

export function InstructorAssessments({ instructorId }: { instructorId: string }) {
  const [tab, setTab] = useState<Tab>('exams');
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState('');

  // --- shared fields (exam / assignment / presentation) ---
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [grade, setGrade] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  // --- exams ---
  const [totalPoints, setTotalPoints] = useState(100);
  const [timeLimit, setTimeLimit] = useState(30);
  const [includeTypes, setIncludeTypes] = useState<Record<string, boolean>>({
    'multiple-choice': true,
    'true-false': false,
    'short-answer': true,
    essay: false,
  });
  const [exam, setExam] = useState<{ title: string; description: string; timeLimit: number; totalPoints: number; questions: QuizQuestion[] } | null>(null);
  const [quizRows, setQuizRows] = useState<InstructorRow[]>([]);
  const [loadingQuizRows, setLoadingQuizRows] = useState(true);
  const [deleteQuizId, setDeleteQuizId] = useState<string | null>(null);

  // --- assignments ---
  const [estimatedDays, setEstimatedDays] = useState(7);
  const [assignment, setAssignment] = useState<GeneratedAssignment | null>(null);
  const [assignmentRows, setAssignmentRows] = useState<AssignmentRow[]>([]);
  const [loadingAssignmentRows, setLoadingAssignmentRows] = useState(true);
  const [deleteAssignmentId, setDeleteAssignmentId] = useState<string | null>(null);

  // --- presentations ---
  const [slideCount, setSlideCount] = useState(8);
  const [presentation, setPresentation] = useState<GeneratedPresentation | null>(null);

  // --- generations list ---
  const [generationRows, setGenerationRows] = useState<GenerationRow[]>([]);
  const [loadingGenerations, setLoadingGenerations] = useState(true);
  const [viewGenerationId, setViewGenerationId] = useState<string | null>(null);
  const [viewedGeneration, setViewedGeneration] = useState<StoredGeneration | null>(null);

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
    setLoadingQuizRows(true);
    fetch(`/api/quizzes?courseId=${encodeURIComponent(courseId)}`)
      .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
      .then((json) => {
        if (Array.isArray(json.data)) {
          setQuizRows(
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
          setQuizRows([]);
        }
      })
      .catch(() => setQuizRows([]))
      .finally(() => setLoadingQuizRows(false));
  }, [courseId]);

  const loadAssignments = useCallback(() => {
    setLoadingAssignmentRows(true);
    fetch(`/api/assignments/${encodeURIComponent(courseId)}`)
      .then((res) => (res.ok ? res.json() : Promise.resolve({ data: null })))
      .then((json) => {
        const list = Array.isArray(json.data?.assignments) ? json.data.assignments : [];
        setAssignmentRows(list);
      })
      .catch(() => setAssignmentRows([]))
      .finally(() => setLoadingAssignmentRows(false));
  }, [courseId]);

  const loadGenerations = useCallback(() => {
    setLoadingGenerations(true);
    fetch(`/api/generations?courseId=${encodeURIComponent(courseId ?? '')}`)
      .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
      .then((json) => {
        if (Array.isArray(json.data)) setGenerationRows(json.data);
        else setGenerationRows([]);
      })
      .catch(() => setGenerationRows([]))
      .finally(() => setLoadingGenerations(false));
  }, [courseId]);

  const loadGenerationById = useCallback(async (id: string) => {
    const res = await fetch(`/api/generations/${id}`).catch(() => null);
    if (!res) return;
    const json = await res.json().catch(() => null);
    if (json?.success && json.data) setViewedGeneration(json.data);
  }, []);

  useEffect(() => {
    if (viewGenerationId) {
      setViewedGeneration(null);
      loadGenerationById(viewGenerationId);
    } else {
      setViewedGeneration(null);
    }
  }, [viewGenerationId, loadGenerationById]);

  const handleDeleteAssignment = async (id: string) => {
    setDeleteAssignmentId(id);
    await fetch(`/api/assignments/${courseId}`, { method: 'DELETE', body: JSON.stringify({ assignmentId: id }) }).catch(() => undefined);
    loadAssignments();
    setDeleteAssignmentId(null);
  };

  const handleDeleteGeneration = async (id: string) => {
    await fetch(`/api/generations/${id}`, { method: 'DELETE' }).catch(() => undefined);
    if (viewGenerationId === id) setViewGenerationId(null);
    setViewedGeneration(null);
    loadGenerations();
  };

  useEffect(() => {
    loadCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadCourses]);

  useEffect(() => {
    if (!courseId) return;
    if (tab === 'exams') loadQuizzes();
    if (tab === 'assignments') loadAssignments();
    if (tab === 'generations') loadGenerations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, tab]);

  // =================== EXAMS ===================
  const handleGenerateExam = async () => {
    if (!courseId) return setError('Select a course first.');
    setGenerating(true);
    setError('');
    setSavedMsg('');
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
      if (!json.success) return setError(json.error ?? 'Failed to generate exam.');
      setExam(json.data.exam);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to generate exam.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveExam = async () => {
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
      if (!json.success) return setError(json.error ?? 'Failed to save quiz.');
      setSavedMsg(`Quiz “${json.data.title}” was published to your course.`);
      setExam(null);
      loadQuizzes();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save quiz.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuiz = async (id: string) => {
    setDeleteQuizId(id);
    await fetch(`/api/quizzes/${id}`, { method: 'DELETE' }).catch(() => undefined);
    loadQuizzes();
    setDeleteQuizId(null);
  };

  // =================== ASSIGNMENTS ===================
  const handleGenerateAssignment = async () => {
    if (!courseId) return setError('Select a course first.');
    setGenerating(true);
    setError('');
    setSavedMsg('');
    try {
      const res = await fetch('/api/ai/generate-assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          subject,
          topic,
          grade: grade || undefined,
          difficulty,
          estimatedDays,
        }),
      });
      const json = await res.json();
      if (!json.success) return setError(json.error ?? 'Failed to generate assignment.');
      setAssignment(json.data.assignment);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to generate assignment.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveAssignment = async () => {
    if (!assignment || !courseId) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          title: assignment.title,
          description: `${assignment.description}\n\n${assignment.content}\n\n${assignment.instructions.map((i, n) => `${n + 1}. ${i}`).join('\n')}`,
          dueDate: new Date(Date.now() + estimatedDays * 24 * 60 * 60 * 1000).toISOString(),
          points: 100,
          allowedFormats: ['pdf', 'doc', 'docx', 'zip'],
        }),
      });
      const json = await res.json();
      if (!json.success) return setError(json.error ?? 'Failed to save assignment.');
      setSavedMsg(`Assignment “${json.data.title}” was published to your course.`);
      setAssignment(null);
      loadAssignments();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save assignment.');
    } finally {
      setSaving(false);
    }
  };

  // =================== PRESENTATIONS ===================
  const handleGeneratePresentation = async () => {
    if (!courseId) return setError('Select a course first.');
    setGenerating(true);
    setError('');
    setSavedMsg('');
    try {
      const res = await fetch('/api/ai/generate-presentation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          subject,
          topic,
          grade: grade || undefined,
          difficulty,
          slideCount,
        }),
      });
      const json = await res.json();
      if (!json.success) return setError(json.error ?? 'Failed to generate presentation.');
      setPresentation(json.data.presentation);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to generate presentation.');
    } finally {
      setGenerating(false);
    }
  };

  // =================== RENDERING ===================
  const quizColumns: DataColumn<InstructorRow>[] = [
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
    { key: 'questions', header: 'Questions', render: (r) => `${r.questionCount}` },
    { key: 'points', header: 'Points', render: (r) => `${r.totalPoints} pts` },
    { key: 'time', header: 'Time', render: (r) => `${r.timeLimit} min` },
    { key: 'attempts', header: 'Attempts', render: (r) => `${r.attempts}` },
    { key: 'created', header: 'Created', render: (r) => new Date(r.createdAt).toLocaleDateString() },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) => (
        <Button variant="ghost" size="sm" disabled={deleteQuizId === r.id} onClick={() => handleDeleteQuiz(r.id)}>
          <Trash2 aria-hidden="true" className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const assignmentColumns: DataColumn<AssignmentRow>[] = [
    { key: 'title', header: 'Assignment', render: (r) => <span className="font-medium text-text-primary">{r.title}</span> },
    { key: 'points', header: 'Points', render: (r) => `${r.points} pts` },
    { key: 'due', header: 'Due', render: (r) => new Date(r.dueDate).toLocaleDateString() },
    { key: 'submissions', header: 'Submissions', render: (r) => `${r.submissions?.length ?? 0}` },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) => (
        <Button variant="ghost" size="sm" disabled={deleteAssignmentId === r.id} onClick={() => handleDeleteAssignment(r.id)}>
          <Trash2 aria-hidden="true" className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const generationColumns: DataColumn<GenerationRow>[] = [
    {
      key: 'type',
      header: 'Type',
      render: (r) => <Badge variant="neutral">{r.type}</Badge>,
    },
    { key: 'title', header: 'Title', render: (r) => <span className="font-medium text-text-primary">{r.title}</span> },
    { key: 'created', header: 'Created', render: (r) => new Date(r.createdAt).toLocaleDateString() },
    {
      key: 'view',
      header: '',
      className: 'text-right',
      render: (r) => (
        <Button variant="ghost" size="sm" onClick={() => setViewGenerationId(viewGenerationId === r.id ? null : r.id)}>
          {viewGenerationId === r.id ? 'Hide' : 'View'}
        </Button>
      ),
    },
    {
      key: 'delete',
      header: '',
      className: 'text-right',
      render: (r) => (
        <Button variant="ghost" size="sm" onClick={() => handleDeleteGeneration(r.id)}>
          <Trash2 aria-hidden="true" className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Teaching"
        title="Exams & Assignments"
        subtitle="Generate exams, assignments, and presentations with AI — all generations are saved for reuse."
      />

      <div className="flex flex-wrap items-center gap-2">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
              tab === key
                ? 'border-gold-500 bg-gold-500/10 text-gold-700 dark:text-gold-300'
                : 'border-line text-text-muted hover:bg-line-soft',
            )}
          >
            <Icon aria-hidden="true" className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <SectionPanel title="Course" icon={BookOpen}>
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
      </SectionPanel>

      {tab === 'exams' && (
        <>
          <SectionPanel title="Generate an exam with AI" icon={Sparkles}>
            <ExamForm
              subject={subject}
              setSubject={setSubject}
              topic={topic}
              setTopic={setTopic}
              grade={grade}
              setGrade={setGrade}
              difficulty={difficulty}
              setDifficulty={setDifficulty}
              totalPoints={totalPoints}
              setTotalPoints={setTotalPoints}
              timeLimit={timeLimit}
              setTimeLimit={setTimeLimit}
              includeTypes={includeTypes}
              setIncludeTypes={setIncludeTypes}
              error={error}
              generating={generating}
              onGenerate={handleGenerateExam}
            />
          </SectionPanel>
          {exam && (
            <SectionPanel
              title={exam.title}
              icon={Sparkles}
              actions={
                <Button variant="gold" size="sm" onClick={handleSaveExam} disabled={saving}>
                  {saving ? <><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />Saving…</> : <><Save aria-hidden="true" className="h-4 w-4" />Save as Quiz</>}
                </Button>
              }
            >
              <p className="mb-1 text-xs text-gold-600 dark:text-gold-400">
                {exam.timeLimit} min · {exam.questions.length} questions · {exam.questions.reduce((s, q) => s + q.points, 0)}/{exam.totalPoints} pts
              </p>
              {exam.description && <p className="mb-3 text-sm text-text-muted">{exam.description}</p>}
              <div className="space-y-3">
                {exam.questions.map((q, i) => (
                  <div key={q.id} className="rounded-lg border border-line p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-text-primary">{i + 1}. {q.question}</p>
                      <Badge variant="neutral">{typeLabel[q.type]}</Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
                      <span>{q.points} pts</span>
                      {q.correctAnswer && <span className="text-emerald-700 dark:text-emerald-400">Answer: {q.correctAnswer}</span>}
                      {q.modelAnswer && q.type !== 'short-answer' && (
                        <span className="max-w-xl truncate text-emerald-700 dark:text-emerald-400">Model: {q.modelAnswer}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </SectionPanel>
          )}
          <SectionPanel title="Published quizzes" icon={BookOpen}>
            {loadingQuizRows ? (
              <Loading />
            ) : (
              <DataTable<InstructorRow>
                rows={quizRows}
                columns={quizColumns}
                emptyMessage="No quizzes yet. Generate and save your first exam above."
              />
            )}
          </SectionPanel>
        </>
      )}

      {tab === 'assignments' && (
        <>
          <SectionPanel title="Generate an assignment with AI" icon={FileText}>
            <AssignmentForm
              subject={subject}
              setSubject={setSubject}
              topic={topic}
              setTopic={setTopic}
              grade={grade}
              setGrade={setGrade}
              difficulty={difficulty}
              setDifficulty={setDifficulty}
              estimatedDays={estimatedDays}
              setEstimatedDays={setEstimatedDays}
              error={error}
              generating={generating}
              onGenerate={handleGenerateAssignment}
            />
          </SectionPanel>
          {assignment && (
            <SectionPanel
              title={assignment.title}
              icon={FileText}
              actions={
                <Button variant="gold" size="sm" onClick={handleSaveAssignment} disabled={saving}>
                  {saving ? <><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />Saving…</> : <><Save aria-hidden="true" className="h-4 w-4" />Publish Assignment</>}
                </Button>
              }
            >
              <p className="mb-2 text-sm text-text-muted">{assignment.description}</p>
              <div className="space-y-3 text-sm text-text-primary">
                <p className="whitespace-pre-wrap">{assignment.content}</p>
              </div>
              {assignment.objectives.length > 0 && (
                <div className="mt-3">
                  <p className="label">Learning objectives</p>
                  <ul className="list-inside list-disc text-sm text-text-primary">
                    {assignment.objectives.map((o, i) => <li key={i}>{o}</li>)}
                  </ul>
                </div>
              )}
              <div className="mt-3 rounded-lg bg-line-soft p-3">
                <p className="label !mb-1">Rubric</p>
                <ul className="space-y-1 text-xs text-text-primary">
                  <li><span className="font-semibold">Excellent:</span> {assignment.rubric.excellent}</li>
                  <li><span className="font-semibold">Good:</span> {assignment.rubric.good}</li>
                  <li><span className="font-semibold">Satisfactory:</span> {assignment.rubric.satisfactory}</li>
                  <li><span className="font-semibold">Needs improvement:</span> {assignment.rubric.needsImprovement}</li>
                </ul>
              </div>
            </SectionPanel>
          )}
          <SectionPanel title="Course assignments" icon={BookOpen}>
            {loadingAssignmentRows ? (
              <Loading />
            ) : (
              <DataTable<AssignmentRow>
                rows={assignmentRows}
                columns={assignmentColumns}
                emptyMessage="No assignments yet. Generate and publish your first one above."
              />
            )}
          </SectionPanel>
        </>
      )}

      {tab === 'presentations' && (
        <>
          <SectionPanel title="Generate a presentation with AI" icon={Presentation}>
            <PresentationForm
              subject={subject}
              setSubject={setSubject}
              topic={topic}
              setTopic={setTopic}
              grade={grade}
              setGrade={setGrade}
              difficulty={difficulty}
              setDifficulty={setDifficulty}
              slideCount={slideCount}
              setSlideCount={setSlideCount}
              error={error}
              generating={generating}
              onGenerate={handleGeneratePresentation}
            />
          </SectionPanel>
          {presentation && (
            <SectionPanel title={presentation.title} icon={Presentation}>
              <p className="mb-3 text-sm text-text-muted">{presentation.description} · {presentation.slideCount} slides</p>
              <div className="space-y-3">
                {presentation.slides.map((slide, i) => (
                  <div key={slide.id} className="rounded-lg border border-line p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-text-primary">{i + 1}. {slide.title}</p>
                      <Badge variant="neutral">{slide.section}</Badge>
                    </div>
                    <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-sm text-text-primary">
                      {slide.content.map((line, j) => <li key={j}>{line}</li>)}
                    </ul>
                    {slide.speakerNotes && (
                      <p className="mt-1.5 text-xs text-text-muted"><span className="font-semibold text-text-primary">Notes:</span> {slide.speakerNotes}</p>
                    )}
                  </div>
                ))}
              </div>
            </SectionPanel>
          )}
        </>
      )}

      {tab === 'generations' && (
        <SectionPanel title="My saved generations" icon={Archive}>
          <p className="mb-3 text-xs text-text-muted">
            Every exam, assignment, and presentation you generate is saved here and can be reopened anytime.
          </p>
          {loadingGenerations ? (
            <Loading />
          ) : (
            <>
              <DataTable<GenerationRow>
                rows={generationRows}
                columns={generationColumns}
                emptyMessage="Nothing generated yet for this course."
              />
              {viewedGeneration && (
                <div className="mt-4 rounded-lg border border-line p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="font-display text-base font-bold text-text-primary">{viewedGeneration.title}</p>
                    <Badge variant="gold">{viewedGeneration.type}</Badge>
                  </div>
                  <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-line-soft p-3 text-xs text-text-primary">
                    {JSON.stringify(viewedGeneration.content, null, 2)}
                  </pre>
                </div>
              )}
            </>
          )}
        </SectionPanel>
      )}

      {savedMsg && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
          {savedMsg}
        </div>
      )}
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center py-8 text-text-muted">
      <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
      Loading…
    </div>
  );
}

function SharedTopicInputs(props: {
  subject: string;
  setSubject: (v: string) => void;
  topic: string;
  setTopic: (v: string) => void;
  grade: string;
  setGrade: (v: string) => void;
  difficulty: 'easy' | 'medium' | 'hard';
  setDifficulty: (v: 'easy' | 'medium' | 'hard') => void;
}) {
  return (
    <>
      <div>
        <label className="label">Topic</label>
        <input className="input" placeholder="e.g. Quadratic Equations" value={props.topic} onChange={(e) => props.setTopic(e.target.value)} />
      </div>
      <div>
        <label className="label">Subject (optional)</label>
        <input className="input" placeholder="Auto-filled from course" value={props.subject} onChange={(e) => props.setSubject(e.target.value)} />
      </div>
      <div>
        <label className="label">Grade / Level (optional)</label>
        <input className="input" placeholder="e.g. Grade 9" value={props.grade} onChange={(e) => props.setGrade(e.target.value)} />
      </div>
      <div>
        <label className="label">Difficulty</label>
        <select className="input" value={props.difficulty} onChange={(e) => props.setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}>
          {DIFFICULTY_OPTIONS.map((d) => (
            <option key={d} value={d}>{d[0].toUpperCase() + d.slice(1)}</option>
          ))}
        </select>
      </div>
    </>
  );
}

function ExamForm(props: {
  subject: string;
  setSubject: (v: string) => void;
  topic: string;
  setTopic: (v: string) => void;
  grade: string;
  setGrade: (v: string) => void;
  difficulty: 'easy' | 'medium' | 'hard';
  setDifficulty: (v: 'easy' | 'medium' | 'hard') => void;
  totalPoints: number;
  setTotalPoints: (v: number) => void;
  timeLimit: number;
  setTimeLimit: (v: number) => void;
  includeTypes: Record<string, boolean>;
  setIncludeTypes: (v: Record<string, boolean>) => void;
  error: string;
  generating: boolean;
  onGenerate: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <SharedTopicInputs
          subject={props.subject}
          setSubject={props.setSubject}
          topic={props.topic}
          setTopic={props.setTopic}
          grade={props.grade}
          setGrade={props.setGrade}
          difficulty={props.difficulty}
          setDifficulty={props.setDifficulty}
        />
        <div>
          <label className="label">Total points</label>
          <input type="number" className="input" min={1} value={props.totalPoints} onChange={(e) => props.setTotalPoints(Math.max(1, Number(e.target.value) || 1))} />
        </div>
        <div>
          <label className="label">Time limit (minutes)</label>
          <input type="number" className="input" min={1} value={props.timeLimit} onChange={(e) => props.setTimeLimit(Math.max(1, Number(e.target.value) || 1))} />
        </div>
        <div className="sm:col-span-2">
          <p className="label">Question types</p>
          <div className="flex flex-wrap gap-2">
            {Object.keys(typeLabel).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => props.setIncludeTypes({ ...props.includeTypes, [type]: !props.includeTypes[type] })}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors',
                  props.includeTypes[type]
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
      {props.error && <p className="text-sm text-red-600 dark:text-red-400">{props.error}</p>}
      <Button variant="gold" onClick={props.onGenerate} disabled={props.generating}>
        {props.generating ? <><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />Generating…</> : <><Wand2 aria-hidden="true" className="h-4 w-4" />Generate Exam</>}
      </Button>
    </div>
  );
}

function AssignmentForm(props: {
  subject: string;
  setSubject: (v: string) => void;
  topic: string;
  setTopic: (v: string) => void;
  grade: string;
  setGrade: (v: string) => void;
  difficulty: 'easy' | 'medium' | 'hard';
  setDifficulty: (v: 'easy' | 'medium' | 'hard') => void;
  estimatedDays: number;
  setEstimatedDays: (v: number) => void;
  error: string;
  generating: boolean;
  onGenerate: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <SharedTopicInputs
          subject={props.subject}
          setSubject={props.setSubject}
          topic={props.topic}
          setTopic={props.setTopic}
          grade={props.grade}
          setGrade={props.setGrade}
          difficulty={props.difficulty}
          setDifficulty={props.setDifficulty}
        />
        <div>
          <label className="label">Estimated time (days)</label>
          <input type="number" className="input" min={1} value={props.estimatedDays} onChange={(e) => props.setEstimatedDays(Math.max(1, Number(e.target.value) || 1))} />
        </div>
      </div>
      {props.error && <p className="text-sm text-red-600 dark:text-red-400">{props.error}</p>}
      <Button variant="gold" onClick={props.onGenerate} disabled={props.generating}>
        {props.generating ? <><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />Generating…</> : <><Wand2 aria-hidden="true" className="h-4 w-4" />Generate Assignment</>}
      </Button>
    </div>
  );
}

function PresentationForm(props: {
  subject: string;
  setSubject: (v: string) => void;
  topic: string;
  setTopic: (v: string) => void;
  grade: string;
  setGrade: (v: string) => void;
  difficulty: 'easy' | 'medium' | 'hard';
  setDifficulty: (v: 'easy' | 'medium' | 'hard') => void;
  slideCount: number;
  setSlideCount: (v: number) => void;
  error: string;
  generating: boolean;
  onGenerate: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <SharedTopicInputs
          subject={props.subject}
          setSubject={props.setSubject}
          topic={props.topic}
          setTopic={props.setTopic}
          grade={props.grade}
          setGrade={props.setGrade}
          difficulty={props.difficulty}
          setDifficulty={props.setDifficulty}
        />
        <div>
          <label className="label">Number of slides</label>
          <input type="number" className="input" min={4} max={15} value={props.slideCount} onChange={(e) => props.setSlideCount(Math.max(4, Math.min(15, Number(e.target.value) || 8)))} />
        </div>
      </div>
      {props.error && <p className="text-sm text-red-600 dark:text-red-400">{props.error}</p>}
      <Button variant="gold" onClick={props.onGenerate} disabled={props.generating}>
        {props.generating ? <><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />Generating…</> : <><Wand2 aria-hidden="true" className="h-4 w-4" />Generate Presentation</>}
      </Button>
    </div>
  );
}