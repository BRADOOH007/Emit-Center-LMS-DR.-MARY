'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Lock,
  Send,
  Sparkles,
  XCircle,
} from 'lucide-react';
import type { Assignment, AssignmentQuestion, AssignmentQuestionResult, Submission } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface AssignmentPayload extends Assignment {
  questions?: AssignmentQuestion[];
  questionCount?: number;
  pastDue?: boolean;
  now?: string;
  mySubmission?: (Submission & { answers?: AssignmentQuestionResult[] }) | null;
}

export function AssignmentPortal({ courseId }: { courseId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [assignments, setAssignments] = useState<AssignmentPayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/assignments/${encodeURIComponent(courseId)}`);
      if (!res.ok) {
        setAssignments([]);
        return;
      }
      const json = await res.json();
      const data = json?.data;
      const list = Array.isArray(data?.assignments) ? (data.assignments as AssignmentPayload[]) : [];
      setAssignments(list);
      const deepLink = searchParams.get('assignmentId');
      if (deepLink && list.some((a) => a.id === deepLink)) setActiveId(deepLink);
      else if (!activeId && list.length > 0) setActiveId(list[0].id);
    } catch {
      setAssignments([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, searchParams]);

  useEffect(() => {
    load();
  }, [load]);

  const active = useMemo(() => assignments.find((a) => a.id === activeId) ?? null, [assignments, activeId]);

  const formatDueDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

  const isPastDue = (a: AssignmentPayload) => {
    if (typeof a.pastDue === 'boolean') return a.pastDue;
    return new Date(a.dueDate).getTime() < Date.now();
  };

  const canAttempt = (a: AssignmentPayload) => !isPastDue(a) && (a.questions?.length ?? 0) > 0 && a.isPublished !== false;

  const openAssignment = (id: string) => {
    setActiveId(id);
    setAnswers({});
    setNotice('');
    router.replace(`/assignments/${encodeURIComponent(courseId)}?assignmentId=${encodeURIComponent(id)}`);
  };

  const handleSubmit = async (a: AssignmentPayload) => {
    if (!a.questions || a.questions.length === 0) return;
    setSubmitting(true);
    setNotice('');
    try {
      const payload = a.questions.map((q) => ({ questionId: q.id, answer: answers[q.id] ?? '' }));
      const res = await fetch(`/api/assignments/${encodeURIComponent(courseId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId: a.id, answers: payload }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setNotice(json?.error ?? 'Could not submit. Please try again.');
        return;
      }
      await load();
    } catch {
      setNotice('Could not submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (a: AssignmentPayload) => {
    const file = files[a.id];
    if (!file) return;
    setUploadingId(a.id);
    try {
      const form = new FormData();
      form.append('file', file);
      const upRes = await fetch('/api/uploads', { method: 'POST', body: form });
      if (!upRes.ok) return;
      const upJson = await upRes.json();
      const uploaded = upJson?.data as { url?: string; key?: string; originalName?: string } | undefined;
      const res = await fetch(`/api/assignments/${encodeURIComponent(courseId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: a.id,
          fileName: uploaded?.originalName ?? file.name,
          fileSize: file.size,
          fileUrl: uploaded?.url ?? undefined,
          fileKey: uploaded?.key ?? undefined,
        }),
      });
      if (res.ok) await load();
    } catch {
      return;
    } finally {
      setUploadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <Loader2 aria-hidden="true" className="h-10 w-10 animate-spin text-gold-600" />
        <p className="mt-3 text-sm font-medium text-text-primary">Loading assignments…</p>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <FileText aria-hidden="true" className="mb-3 h-12 w-12 text-text-muted/40" />
        <p className="font-semibold text-text-primary">No assignments yet</p>
        <p className="text-xs text-text-muted">Check back later for new assignments.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {assignments.map((a) => {
          const graded = a.mySubmission?.status === 'graded' && a.mySubmission.score != null;
          const submitted = a.mySubmission != null;
          const due = isPastDue(a);
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => openAssignment(a.id)}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-btn px-4 py-2 text-sm font-medium transition-colors',
                activeId === a.id
                  ? 'bg-gold-500/10 text-gold-700 dark:text-gold-300'
                  : 'text-text-muted hover:bg-line-soft hover:text-text-primary',
              )}
            >
              {a.title}
              {due && !submitted && <Lock aria-hidden="true" className="h-3 w-3 text-red-500" />}
              {graded && <CheckCircle2 aria-hidden="true" className="h-3 w-3 text-emerald-500" />}
            </button>
          );
        })}
      </div>

      {active && (
        <div className="space-y-6">
          <div className="card space-y-4 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-xl font-bold text-text-primary">{active.title}</h2>
                <p className="mt-2 text-sm text-text-muted">{active.description}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="gold">{active.points} pts</Badge>
                {isPastDue(active) ? (
                  <Badge variant="danger" dot>Past due</Badge>
                ) : (
                  <Badge variant="success" dot>
                    <Clock aria-hidden="true" className="h-3 w-3" />
                    Due {formatDueDate(active.dueDate)}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {notice && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
              <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
              {notice}
            </div>
          )}

          {active.questions && active.questions.length > 0 ? (
            <QuizAttemptView
              assignment={active}
              answers={answers}
              setAnswers={setAnswers}
              submitting={submitting}
              onSubmit={() => handleSubmit(active)}
            />
          ) : (
            <LegacyUploadView
              assignment={active}
              files={files}
              setFiles={setFiles}
              uploadingId={uploadingId}
              onSubmit={() => handleFileUpload(active)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function QuizAttemptView(props: {
  assignment: AssignmentPayload;
  answers: Record<string, string>;
  setAnswers: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
  submitting: boolean;
  onSubmit: () => void;
}) {
  const { assignment, answers, setAnswers, submitting, onSubmit } = props;
  const questions = assignment.questions ?? [];
  const submission = assignment.mySubmission;
  const graded = submission?.status === 'graded' && submission.score != null;
  const pastDue = isPastDuePayload(assignment);
  const allowAttempt = !pastDue && assignment.isPublished !== false;

  if (graded && submission) {
    return <GradedReview assignment={assignment} submission={submission} />;
  }

  if (pastDue) {
    return (
      <div className="card p-8 text-center">
        <Lock aria-hidden="true" className="mx-auto h-10 w-10 text-red-500" />
        <h3 className="mt-3 font-semibold text-text-primary">Assignment closed</h3>
        <p className="mt-1 text-sm text-text-muted">
          The due date for this assignment has passed, so it can no longer be submitted. No grade will be recorded.
        </p>
      </div>
    );
  }

  if (!allowAttempt) {
    return (
      <div className="card p-8 text-center">
        <AlertCircle aria-hidden="true" className="mx-auto h-10 w-10 text-text-muted/50" />
        <p className="mt-3 font-semibold text-text-primary">This assignment is not open for submissions.</p>
      </div>
    );
  }

  const answeredCount = questions.filter((q) => (answers[q.id] ?? '').trim().length > 0).length;
  const allAnswered = answeredCount === questions.length;

  return (
    <div className="card space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-text-primary">Answer the questions</h3>
          <p className="text-xs text-text-muted">
            {answeredCount} of {questions.length} answered · Most questions are multiple choice
          </p>
        </div>
        {!allAnswered && (
          <span className="text-xs text-amber-600 dark:text-amber-400">Answer every question before submitting</span>
        )}
      </div>

      <div className="space-y-5">
        {questions.map((q, i) => (
          <div key={q.id} className="rounded-xl border border-line p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-text-primary">
                {i + 1}. {q.question}
              </p>
              <Badge variant={q.type === 'mcq' ? 'gold' : 'neutral'}>{q.points} pts</Badge>
            </div>
            {q.type === 'mcq' && q.options && q.options.length > 0 ? (
              <div className="mt-3 space-y-1.5">
                {q.options.map((opt, j) => {
                  const selected = answers[q.id] === opt;
                  return (
                    <button
                      key={j}
                      type="button"
                      onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                        selected ? 'border-gold-500 bg-gold-500/10' : 'border-line hover:border-gold-400 hover:bg-line-soft',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                          selected ? 'bg-gold-500 text-white' : 'bg-line text-text-muted',
                        )}
                      >
                        {String.fromCharCode(65 + j)}
                      </span>
                      <span className="text-text-primary">{opt}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-3">
                <textarea
                  value={answers[q.id] ?? ''}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  rows={3}
                  placeholder="Type your answer…"
                  className="input w-full resize-y"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-text-muted">
          <Sparkles aria-hidden="true" className="mr-1 inline h-3.5 w-3.5 text-gold-500" />
          Auto-graded by AI after you submit
        </p>
        <Button variant="gold" onClick={onSubmit} disabled={submitting || !allAnswered}>
          {submitting ? (
            <><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />Grading…</>
          ) : (
            <><Send aria-hidden="true" className="h-4 w-4" />Submit assignment</>
          )}
        </Button>
      </div>
    </div>
  );
}

function GradedReview({ assignment, submission }: { assignment: AssignmentPayload; submission: Submission & { answers?: AssignmentQuestionResult[] } }) {
  const results = submission.answers ?? [];
  const pastDue = isPastDuePayload(assignment);

  return (
    <div className="card space-y-5 p-6">
      <div className="rounded-xl bg-gradient-to-r from-gold-50 to-brown-50 p-5 text-center dark:from-gold-950 dark:to-brown-950">
        <p className="text-3xl font-extrabold text-gold-700 dark:text-gold-300">{submission.percentage ?? Math.round(((submission.score ?? 0) / Math.max(1, assignment.points)) * 100)}%</p>
        <p className="mt-1 text-sm text-text-muted">
          {submission.score}/{assignment.points} pts{submission.letterGrade ? ` · Grade ${submission.letterGrade}` : ''}
        </p>
        <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" />
          Auto-graded{submission.gradedAt ? ` on ${new Date(submission.gradedAt).toLocaleDateString()}` : ''}
        </p>
      </div>

      {submission.feedback && <p className="rounded-lg bg-line-soft p-3 text-sm text-text-primary">{submission.feedback}</p>}

      <div className="space-y-3">
        {(assignment.questions ?? []).map((q, i) => {
          const result = results.find((r) => r.questionId === q.id);
          if (!result) return null;
          return (
            <div key={q.id} className={cn('rounded-xl border p-4', result.correct ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30' : 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/30')}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-text-primary">{i + 1}. {q.question}</p>
                <Badge variant={result.correct ? 'success' : 'danger'}>{result.earned}/{q.points} pts</Badge>
              </div>
              {result.correct ? (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
                  Your answer: {result.yourAnswer}
                </p>
              ) : (
                <div className="mt-2 space-y-1 text-xs">
                  <p className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                    <XCircle aria-hidden="true" className="h-3.5 w-3.5" />
                    Your answer: {result.yourAnswer || '—'}
                  </p>
                  {result.correctAnswer && (
                    <p className="text-emerald-700 dark:text-emerald-400">Correct answer: {result.correctAnswer}</p>
                  )}
                </div>
              )}
              {(result.explanation || result.feedback) && (
                <p className="mt-1.5 text-xs text-text-muted">{result.feedback || result.explanation}</p>
              )}
            </div>
          );
        })}
      </div>

      {!pastDue && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" />
            Review and retry
          </Button>
        </div>
      )}
    </div>
  );
}

function LegacyUploadView(props: {
  assignment: AssignmentPayload;
  files: Record<string, File | null>;
  setFiles: React.Dispatch<React.SetStateAction<Record<string, File | null>>>;
  uploadingId: string | null;
  onSubmit: () => void;
}) {
  const { assignment, files, setFiles, uploadingId, onSubmit } = props;
  const submission = assignment.mySubmission;
  const pastDue = isPastDuePayload(assignment);

  return (
    <div className="card space-y-4 p-6">
      <h3 className="text-sm font-semibold text-text-primary">Your submission</h3>
      {submission ? (
        <div className="rounded-lg border border-line p-4">
          <div className="flex items-center gap-3">
            <FileText aria-hidden="true" className="h-8 w-8 text-gold-600 dark:text-gold-400" />
            <div>
              <p className="text-sm font-medium text-text-primary">{submission.fileName}</p>
              <p className="text-xs text-text-muted">Submitted {new Date(submission.submittedAt).toLocaleString()}</p>
            </div>
            {submission.score != null && (
              <Badge variant={submission.status === 'graded' ? 'success' : 'neutral'}>
                {submission.score}/{assignment.points}
                {submission.letterGrade && ` (${submission.letterGrade})`}
              </Badge>
            )}
          </div>
        </div>
      ) : pastDue ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          This assignment is past due and can no longer be submitted. No grade will be recorded.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg border-2 border-dashed border-line p-6 text-center">
            <FileText aria-hidden="true" className="mx-auto mb-2 h-10 w-10 text-text-muted" />
            <p className="text-sm font-medium text-text-primary">Upload your submission</p>
            <p className="mt-1 text-xs text-text-muted">{assignment.allowedFormats.join(', ')} files accepted</p>
            <input
              type="file"
              onChange={(e) => setFiles((prev) => ({ ...prev, [assignment.id]: e.target.files?.[0] ?? null }))}
              className="mt-3 text-xs"
            />
          </div>
          {files[assignment.id] && (
            <Button variant="gold" fullWidth onClick={onSubmit} disabled={uploadingId === assignment.id}>
              {uploadingId === assignment.id ? (
                <><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />Uploading…</>
              ) : (
                <>Submit {files[assignment.id]?.name}</>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function isPastDuePayload(a: AssignmentPayload): boolean {
  if (typeof a.pastDue === 'boolean') return a.pastDue;
  return new Date(a.dueDate).getTime() < Date.now();
}
