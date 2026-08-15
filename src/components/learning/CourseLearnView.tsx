'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Loader2,
  MessageSquare,
  Play,
  RefreshCw,
  Sparkles,
  Target,
  Video,
  X,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmitTutorDrawer } from '@/components/ai/emit-tutor-drawer';
import { LessonViewer } from '@/components/learning/LessonViewer';
import { VirtualClassLauncher } from '@/components/learning/VirtualClassroom';
import { cn } from '@/lib/utils';

const SUBJECT_LABELS: Record<string, string> = {
  robotics: 'Robotics',
  coding: 'Coding',
  design: 'Design',
  life_skills: 'Life Skills',
  engineering: 'Engineering',
  career: 'Career',
};

interface RecallQ {
  question: string;
  type: string;
  options?: string[];
  answer: string;
  explanation: string;
}

interface LearnLesson {
  id: string;
  title: string;
  summary: string | null;
  order: number;
  status: string;
  hasContent: boolean;
  progress: { status: string; score: number | null; completedAt: string | null } | null;
}

interface LearnUnit {
  id: string;
  title: string;
  description: string | null;
  order: number;
  lessons: LearnLesson[];
}

interface LessonPayload {
  id: string;
  title: string;
  summary: string | null;
  content: string | null;
  assessment: { preview: { whatYoullLearn: string; concepts: string[] }; recall: RecallQ[] } | null;
  status: string;
  error: string | null;
}

type Phase = 'preview' | 'learn' | 'recall' | 'done';

export function CourseLearnView({ courseId }: { courseId: string }) {
  const [tab, setTab] = useState<'ai' | 'materials'>('ai');
  const [course, setCourse] = useState<{ title: string; description: string; subject: string } | null>(null);
  const [units, setUnits] = useState<LearnUnit[]>([]);
  const [percent, setPercent] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syllabusLoading, setSyllabusLoading] = useState(false);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [lesson, setLesson] = useState<LessonPayload | null>(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [phase, setPhase] = useState<Phase>('preview');
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());
  const [recallAnswers, setRecallAnswers] = useState<(string | number)[]>([]);
  const [recallSubmitted, setRecallSubmitted] = useState(false);
  const [recallScore, setRecallScore] = useState(0);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadState = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${encodeURIComponent(courseId)}/learn`, { cache: 'no-store' });
      if (!res.ok) {
        setNotice('Could not load course content.');
        setLoading(false);
        return;
      }
      const json = await res.json();
      const data = json.success ? json.data : null;
      if (!data) return;
      setCourse(data.course);
      setUnits(data.units ?? []);
      setPercent(data.percentComplete ?? 0);
      setCompletedCount(data.completedCount ?? 0);
      setTotalCount(data.totalCount ?? 0);
      if (data.units?.length) {
        setExpandedUnits(new Set(data.units.slice(0, 1).map((u: LearnUnit) => u.id)));
      }
    } catch {
      setNotice('Could not load course content.');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [phase, lessonLoading]);

  const generateSyllabus = async () => {
    setSyllabusLoading(true);
    setNotice('');
    try {
      const res = await fetch('/api/ai/generate-course-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setNotice(json.error || 'Could not build your course. Please try again.');
        return;
      }
      await loadState();
    } catch {
      setNotice('Could not build your course. Please try again.');
    } finally {
      setSyllabusLoading(false);
    }
  };

  const openLesson = useCallback(
    async (target: LearnLesson) => {
      setActiveLessonId(target.id);
      setLessonLoading(true);
      setLesson(null);
      setPhase('preview');
      setRecallSubmitted(false);
      setRecallScore(0);
      try {
        const res = await fetch('/api/ai/generate-course-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId, lessonId: target.id }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          setLesson({
            id: target.id,
            title: target.title,
            summary: target.summary,
            content: null,
            assessment: null,
            status: 'error',
            error: json.error || 'Could not load this lesson.',
          });
          return;
        }
        setLesson(json.data.lesson);
        await loadState();
      } catch {
        setLesson({
          id: target.id,
          title: target.title,
          summary: target.summary,
          content: null,
          assessment: null,
          status: 'error',
          error: 'Could not load this lesson.',
        });
      } finally {
        setLessonLoading(false);
      }
    },
    [courseId, loadState],
  );

  const flatLessons = useMemo(
    () =>
      units.flatMap((u) =>
        u.lessons.map((l) => ({
          ...l,
          unitId: u.id,
          unitTitle: u.title,
        })),
      ),
    [units],
  );

  const toggleUnit = (unitId: string) => {
    setExpandedUnits((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      return next;
    });
  };

  const ensureExpanded = (unitId: string) => {
    setExpandedUnits((prev) => {
      if (prev.has(unitId)) return prev;
      const next = new Set(prev);
      next.add(unitId);
      return next;
    });
  };

  const startLearning = () => setPhase('learn');

  const startRecall = () => {
    setRecallSubmitted(false);
    setRecallScore(0);
    setRecallAnswers(new Array(lesson?.assessment?.recall.length ?? 0).fill(undefined));
    setPhase('recall');
  };

  const handleRecallChange = (i: number, val: string | number) => {
    setRecallAnswers((prev) => {
      const next = [...prev];
      next[i] = val;
      return next;
    });
  };

  const submitRecall = async () => {
    if (!lesson?.assessment) return;
    const recall = lesson.assessment.recall;
    const correctCount = recall.reduce((acc, q, i) => {
      const ans = recallAnswers[i];
      if (ans === undefined || ans === null) return acc;
      if (q.type === 'mcq' && Array.isArray(q.options)) {
        const idx = typeof ans === 'number' ? ans : parseInt(String(ans), 10);
        const correctIdx = q.options.findIndex((o) => o === q.answer);
        return acc + (idx === correctIdx ? 1 : 0);
      }
      const normalized = (input: string) => input.trim().toLowerCase().replace(/\s+/g, ' ');
      const correct = normalized(String(q.answer));
      const given = normalized(String(ans));
      return acc + (given === correct ? 1 : 0);
    }, 0);
    const score = recall.length > 0 ? Math.round((correctCount / recall.length) * 100) : 0;
    setRecallScore(score);
    setRecallSubmitted(true);
    setPhase('done');
    try {
      await fetch(`/api/courses/${encodeURIComponent(courseId)}/learn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId: lesson.id, status: 'completed', score }),
      });
      await loadState();
    } catch {
      /* non-fatal */
    }
  };

  const completeAndContinue = () => {
    if (!activeLessonId) return;
    const currentIdx = flatLessons.findIndex((l) => l.id === activeLessonId);
    const next = currentIdx >= 0 ? flatLessons[currentIdx + 1] : undefined;
    if (next) {
      ensureExpanded(next.unitId);
      openLesson(next);
    } else {
      setLesson(null);
      setActiveLessonId(null);
      setPhase('preview');
    }
  };

  const subjectLabel = course ? SUBJECT_LABELS[course.subject] ?? course.subject : '';

  if (tab === 'materials') {
    return (
      <div className="space-y-6">
        <TabBar tab={tab} setTab={setTab} />
        <VirtualClassLauncher courseId={courseId} />
        <LessonViewer courseId={courseId} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TabBar tab={tab} setTab={setTab} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="header-kicker">Self-Paced Learning</p>
          <h1 className="page-title">{course?.title ?? 'Course Lessons'}</h1>
          {course?.description && <p className="page-subtitle mt-1 max-w-2xl">{course.description}</p>}
        </div>
        {course && (
          <Button variant="outline" size="sm" onClick={() => setTutorOpen(true)}>
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            Ask Emit Tutor
          </Button>
        )}
      </div>

      {notice && (
        <div className="flex items-center justify-between gap-3 rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} aria-label="Dismiss">
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-card border border-line bg-base-surface py-20 text-center shadow-card">
          <Loader2 aria-hidden="true" className="h-10 w-10 animate-spin text-gold-600" />
          <p className="mt-3 text-sm font-medium text-text-primary">Loading your lessons…</p>
        </div>
      ) : syllabusLoading ? (
        <div className="flex flex-col items-center justify-center rounded-card border border-line bg-base-surface py-20 text-center shadow-card">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-gold-500/20" />
            <Loader2 aria-hidden="true" className="relative h-12 w-12 animate-spin text-gold-600" />
          </div>
          <p className="mt-4 text-sm font-semibold text-text-primary">Creating your personalized course…</p>
          <p className="mt-1 text-xs text-text-muted">Our AI is building your {subjectLabel} syllabus and lessons</p>
        </div>
      ) : units.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-gold-400 bg-gradient-to-br from-gold-500/10 to-brown-500/10 py-20 text-center">
          <BookOpen aria-hidden="true" className="h-16 w-16 text-gold-500" />
          <h2 className="mt-4 text-lg font-bold text-text-primary">Let&apos;s build your learning path</h2>
          <p className="mt-1 max-w-md text-sm text-text-muted">
            EMIT Tutor Bot will create a standards-aligned curriculum of units and lessons just for this course.
          </p>
          <Button variant="gold" size="lg" className="mt-6 gap-2" onClick={generateSyllabus}>
            <Sparkles aria-hidden="true" className="h-5 w-5" />
            Generate my course
          </Button>
        </div>
      ) : (
        <>
          <div className="panel">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary">
                  {completedCount} of {totalCount} lessons completed
                </p>
                <p className="text-xs text-text-muted">{percent}% through the course</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2.5 w-40 overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-gold-500 to-brown-600 transition-all duration-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-gold-700 dark:text-gold-300">{percent}%</span>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
            <aside className="scrollbar-thin max-h-[calc(100vh-16rem)] space-y-1 overflow-y-auto rounded-card border border-line bg-base-surface p-2 shadow-card">
              {units.map((unit) => {
                const isExpanded = expandedUnits.has(unit.id);
                const unitCompleted = unit.lessons.filter((l) => l.progress?.completedAt || l.progress?.status === 'completed').length;
                return (
                  <div key={unit.id}>
                    <button
                      type="button"
                      onClick={() => toggleUnit(unit.id)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium text-text-primary hover:bg-line-soft"
                    >
                      {isExpanded ? <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-text-muted" /> : <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-text-muted" />}
                      <span className="min-w-0 flex-1 truncate">{unit.title}</span>
                      <span className="text-[10px] text-text-muted">{unitCompleted}/{unit.lessons.length}</span>
                    </button>
                    {isExpanded && (
                      <ul className="ml-3 space-y-0.5 border-l border-line pb-1 pl-2">
                        {unit.lessons.map((l) => {
                          const done = l.progress?.completedAt || l.progress?.status === 'completed';
                          const active = l.id === activeLessonId;
                          return (
                            <li key={l.id}>
                              <button
                                type="button"
                                onClick={() => openLesson(l)}
                                className={cn(
                                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                                  active ? 'bg-gold-500/10 font-medium text-gold-700 dark:text-gold-300' : 'text-text-muted hover:bg-line-soft',
                                )}
                              >
                                {done ? (
                                  <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                                ) : l.status === 'error' ? (
                                  <AlertCircle aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-red-500" />
                                ) : l.status === 'generating' ? (
                                  <Loader2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0 animate-spin text-gold-600" />
                                ) : (
                                  <Circle aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                                )}
                                <span className="min-w-0 flex-1 truncate">{l.title}</span>
                                {l.progress?.score != null && (
                                  <span className="text-[10px] font-bold text-emerald-600">{l.progress.score}%</span>
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </aside>

            <div className="min-w-0 space-y-4">
              {!lesson && !lessonLoading && (
                <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-line bg-line-soft/40 py-20 text-center">
                  <BookOpen aria-hidden="true" className="h-14 w-14 text-gold-500" />
                  <p className="mt-3 font-semibold text-text-primary">Pick a lesson to start learning</p>
                  <p className="mt-1 text-sm text-text-muted">Your AI lesson appears here with active recall questions</p>
                </div>
              )}

              {lessonLoading && (
                <div className="flex flex-col items-center justify-center rounded-card border border-line bg-base-surface py-16 text-center shadow-card">
                  <Loader2 aria-hidden="true" className="h-10 w-10 animate-spin text-gold-600" />
                  <p className="mt-3 text-sm font-semibold text-text-primary">Creating your personalized lesson…</p>
                  <p className="text-xs text-text-muted">Our AI is writing this lesson for you</p>
                </div>
              )}

              {lesson && !lessonLoading && lesson.status === 'error' && (
                <div className="rounded-card border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-950">
                  <AlertCircle aria-hidden="true" className="mx-auto h-10 w-10 text-red-500" />
                  <h3 className="mt-3 text-base font-semibold text-red-800 dark:text-red-200">{lesson.error || 'Could not generate this lesson.'}</h3>
                  <Button variant="danger" className="mt-4" onClick={() => openLesson(flatLessons.find((l) => l.id === lesson.id)!) }>
                    <RefreshCw aria-hidden="true" className="h-4 w-4" />
                    Try again
                  </Button>
                </div>
              )}

              {lesson && !lessonLoading && lesson.status !== 'error' && (
                <div className="overflow-hidden rounded-card border border-line bg-base-surface shadow-card">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-gradient-to-r from-gold-500 to-brown-600 px-5 py-4 text-white">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">
                        Phase {phase === 'preview' ? '1' : phase === 'learn' ? '2' : phase === 'recall' ? '3' : '✓'} / 3
                      </p>
                      <h2 className="truncate text-lg font-bold">{lesson.title}</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setLesson(null);
                        setActiveLessonId(null);
                        setPhase('preview');
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
                      aria-label="Close lesson"
                    >
                      <X aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex gap-1 border-b border-line bg-line-soft/50 px-4 py-2">
                    {(['preview', 'learn', 'recall'] as Phase[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        disabled={!lesson.content || p === 'recall'}
                        onClick={() => setPhase(p)}
                        className={cn(
                          'flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                          phase === p ? 'bg-gold-500 text-white' : 'text-text-muted hover:bg-line',
                        )}
                      >
                        {p === 'preview' ? 'Preview' : p === 'learn' ? 'Learn' : 'Recall'}
                      </button>
                    ))}
                  </div>

                  <div className="p-5 sm:p-6" ref={bottomRef}>
                    {phase === 'preview' && lesson.assessment?.preview && (
                      <div className="space-y-5">
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
                          <p className="text-sm text-amber-800 dark:text-amber-200">{lesson.assessment.preview.whatYoullLearn}</p>
                        </div>
                        <div className="space-y-2">
                          {lesson.assessment.preview.concepts.map((c, i) => (
                            <div key={i} className="flex items-center gap-3 rounded-xl bg-line-soft/60 px-4 py-3">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold-500 text-xs font-bold text-white">{i + 1}</span>
                              <span className="text-sm text-text-primary">{c}</span>
                            </div>
                          ))}
                        </div>
                        <Button variant="gold" fullWidth onClick={startLearning}>
                          <Play aria-hidden="true" className="mr-2 h-4 w-4" />
                          Start Learning
                        </Button>
                      </div>
                    )}

                    {phase === 'learn' && lesson.content && (
                      <div className="space-y-5">
                        <div className="max-h-[60vh] overflow-y-auto">
                          <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-headings:mt-4 prose-headings:mb-2 prose-table:block prose-table:overflow-x-auto prose-code:bg-line prose-code:px-1 prose-code:rounded prose-pre:bg-slate-800 prose-pre:text-slate-100 dark:prose-invert">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{lesson.content}</ReactMarkdown>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="brown" fullWidth onClick={startRecall}>
                            <Brain aria-hidden="true" className="mr-2 h-4 w-4" />
                            I&apos;m Ready — {lesson.assessment?.recall.length ?? 0} Questions
                          </Button>
                        </div>
                      </div>
                    )}

                    {phase === 'recall' && lesson.assessment && (
                      <div className="space-y-4">
                        {lesson.assessment.recall.map((q, i) => {
                          const sel = recallAnswers[i];
                          const correctOpt = q.type === 'mcq' && Array.isArray(q.options) ? q.options.findIndex((o) => o === q.answer) : -1;
                          const correct = recallSubmitted && q.type === 'mcq' ? sel === correctOpt : null;
                          const wrong = recallSubmitted && q.type === 'mcq' && sel !== undefined && sel !== correctOpt;
                          return (
                            <div key={i} className="space-y-3 rounded-xl border border-line p-4">
                              <p className="text-sm font-semibold text-text-primary">{i + 1}. {q.question}</p>
                              {q.type === 'mcq' && Array.isArray(q.options) ? (
                                <div className="space-y-1.5">
                                  {q.options.map((opt, j) => {
                                    const isSel = sel === j;
                                    const isCorrect = recallSubmitted && j === correctOpt;
                                    return (
                                      <button
                                        key={j}
                                        type="button"
                                        disabled={recallSubmitted}
                                        onClick={() => handleRecallChange(i, j)}
                                        className={cn(
                                          'flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                                          isCorrect
                                            ? 'border-emerald-400 bg-emerald-100 dark:bg-emerald-950'
                                            : isSel && wrong
                                              ? 'border-red-400 bg-red-100 dark:bg-red-950'
                                              : isSel
                                                ? 'border-gold-500 bg-gold-500/10'
                                                : 'border-line hover:border-gold-400 hover:bg-line-soft',
                                        )}
                                      >
                                        <span
                                          className={cn(
                                            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                                            isCorrect ? 'bg-emerald-500 text-white' : isSel && wrong ? 'bg-red-500 text-white' : isSel ? 'bg-gold-500 text-white' : 'bg-line text-text-muted',
                                          )}
                                        >
                                          {String.fromCharCode(65 + j)}
                                        </span>
                                        <span className="text-text-primary">{opt}</span>
                                        {isCorrect && <CheckCircle2 aria-hidden="true" className="ml-auto h-4 w-4 text-emerald-600" />}
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    disabled={recallSubmitted}
                                    value={typeof sel === 'string' ? sel : ''}
                                    onChange={(e) => handleRecallChange(i, e.target.value)}
                                    placeholder="Type your answer…"
                                    className="input w-full"
                                  />
                                </div>
                              )}
                              {recallSubmitted && (
                                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-800 dark:bg-blue-950">
                                  <span className="font-bold text-blue-800 dark:text-blue-200">Answer: </span>
                                  <span className="text-blue-700 dark:text-blue-300">{q.answer}</span>
                                  <p className="mt-1 text-xs text-blue-600 dark:text-blue-300">{q.explanation}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {!recallSubmitted ? (
                          <Button variant="gold" fullWidth onClick={submitRecall}>
                            <CheckCircle2 aria-hidden="true" className="mr-2 h-4 w-4" />
                            Submit Answers
                          </Button>
                        ) : null}
                      </div>
                    )}

                    {phase === 'done' && (
                      <div className="space-y-4">
                        <div className="rounded-xl bg-gradient-to-r from-gold-50 to-brown-50 p-4 text-center dark:from-gold-950 dark:to-brown-950">
                          <p className="text-3xl font-extrabold text-gold-700 dark:text-gold-300">{recallScore}%</p>
                          <p className="text-sm text-text-muted">
                            {recallScore >= 80 ? "Excellent! You've mastered this." : recallScore >= 50 ? 'Good progress! Review and try again.' : 'Keep going! Practice makes perfect.'}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" className="flex-1" onClick={startRecall}>
                            Review
                          </Button>
                          <Button variant="gold" className="flex-1" onClick={completeAndContinue}>
                            <ArrowRight aria-hidden="true" className="mr-2 h-4 w-4" />
                            Complete &amp; Continue
                          </Button>
                        </div>
                        <Button variant="brown" fullWidth onClick={() => setTutorOpen(true)}>
                          <MessageSquare aria-hidden="true" className="mr-2 h-4 w-4" />
                          Ask Emit Tutor about this lesson
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {course && (
        <EmitTutorDrawer
          open={tutorOpen}
          onClose={() => setTutorOpen(false)}
          studentName={undefined}
          currentSubject={subjectLabel}
          currentTopic={lesson?.title}
          currentGrade={undefined}
          currentCurriculum="common-core"
          initialPrompt={
            lesson?.title
              ? `I'm studying "${lesson.title}" in ${subjectLabel}. Help me understand this better.`
              : undefined
          }
        />
      )}
    </div>
  );
}

function TabBar({ tab, setTab }: { tab: 'ai' | 'materials'; setTab: (tab: 'ai' | 'materials') => void }) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-line bg-base-surface p-1 shadow-card">
      <button
        type="button"
        onClick={() => setTab('ai')}
        className={cn(
          'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
          tab === 'ai' ? 'bg-gold-500 text-white' : 'text-text-muted hover:text-text-primary',
        )}
      >
        <Sparkles aria-hidden="true" className="h-4 w-4" />
        AI Self-Paced Lessons
      </button>
      <button
        type="button"
        onClick={() => setTab('materials')}
        className={cn(
          'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
          tab === 'materials' ? 'bg-gold-500 text-white' : 'text-text-muted hover:text-text-primary',
        )}
      >
        <Video aria-hidden="true" className="h-4 w-4" />
        Course Materials
      </button>
    </div>
  );
}
