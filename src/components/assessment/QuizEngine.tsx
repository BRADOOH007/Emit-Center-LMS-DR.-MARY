'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileUp,
  Flag,
  Loader2,
  Trophy,
  XCircle,
} from 'lucide-react';
import type { Quiz, QuizAttempt } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const LETTER_COLORS: Record<string, string> = {
  'A+': 'bg-emerald-500/10 text-emerald-600',
  'A': 'bg-emerald-500/10 text-emerald-600',
  'A-': 'bg-emerald-500/10 text-emerald-600',
  'B+': 'bg-blue-500/10 text-blue-600',
  'B': 'bg-blue-500/10 text-blue-600',
  'B-': 'bg-blue-500/10 text-blue-600',
  'C+': 'bg-amber-500/10 text-amber-600',
  'C': 'bg-amber-500/10 text-amber-600',
  'C-': 'bg-amber-500/10 text-amber-600',
  'D': 'bg-orange-500/10 text-orange-600',
  'F': 'bg-red-500/10 text-red-600',
  'INC': 'bg-neutral-500/10 text-neutral-600',
};

export function QuizEngine({ quizId }: { quizId: string }) {
  const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number; pct: number; grade: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch(`/api/quizzes/${quizId}`, { cache: 'no-store' });
        const json = await res.json();
        if (!active) return;
        if (!json.success) {
          setNotFound(true);
          return;
        }
        setQuiz(json.data);
        const prior = json.data.attempts?.[0];
        if (prior) {
          setAttempt(prior as QuizAttempt);
          setResult({
            score: prior.score,
            total: prior.totalPoints,
            pct: prior.percentage,
            grade: prior.letterGrade,
          });
          setSubmitted(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [quizId]);

  const handleSetAnswer = useCallback((questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!quiz) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/quizzes/${quizId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      const json = await res.json();
      if (json.success) {
        setResult({ score: json.data.score, total: json.data.totalPoints, pct: json.data.percentage, grade: json.data.letterGrade });
        setSubmitted(true);
      }
    } finally {
      setSubmitting(false);
    }
  }, [quiz, quizId, answers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-text-muted">
        <Loader2 aria-hidden="true" className="mr-2 h-5 w-5 animate-spin" />
        Loading quiz…
      </div>
    );
  }

  if (notFound || !quiz) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <XCircle aria-hidden="true" className="mb-3 h-12 w-12 text-text-muted/40" />
        <p className="text-lg font-semibold text-text-primary">Quiz not found</p>
        <Button variant="gold" className="mt-4" onClick={() => router.back()}>Go back</Button>
      </div>
    );
  }

  const question = quiz.questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const progressPct = quiz.questions.length > 0 ? (answeredCount / quiz.questions.length) * 100 : 0;

  if (submitted && result) {
    const mcCount = quiz.questions.filter((q) => q.type === 'multiple-choice').length;
    return (
      <div className="mx-auto max-w-lg space-y-6 py-8 text-center">
        <Trophy aria-hidden="true" className="mx-auto h-16 w-16 text-gold-500" />
        <div>
          <h2 className="font-display text-2xl font-bold text-text-primary">{attempt ? 'Attempt recorded' : 'Quiz submitted!'}</h2>
          <p className="mt-1 text-sm text-text-muted">{quiz.title}</p>
        </div>
        <div className="panel space-y-4">
          <div className="flex items-center justify-center gap-4">
            <div className={cn('rounded-full px-5 py-3 text-center font-bold', LETTER_COLORS[result.grade] ?? LETTER_COLORS.F)}>
              <span className="text-sm">Grade</span>
              <p className="font-display text-3xl">{result.grade}</p>
            </div>
            <div className="text-center">
              <p className="font-display text-3xl font-bold text-text-primary">{result.pct}%</p>
              <p className="text-xs text-text-muted">{result.score}/{result.total} points</p>
            </div>
          </div>
          <div className="divider" />
          <div className="text-xs text-text-muted">
            {mcCount} multiple-choice question{mcCount !== 1 ? 's' : ''} auto-graded.
            Short-answer and file upload questions require instructor review.
          </div>
        </div>
        <Button variant="gold" onClick={() => router.back()}>Return to course</Button>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <XCircle aria-hidden="true" className="mb-3 h-12 w-12 text-text-muted/40" />
        <p className="text-lg font-semibold text-text-primary">This quiz has no questions yet</p>
        <Button variant="gold" className="mt-4" onClick={() => router.back()}>Go back</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <Badge variant="gold">{quiz.questions.length} questions</Badge>
        {quiz.timeLimit && (
          <Badge variant="neutral">
            <Clock aria-hidden="true" className="h-3.5 w-3.5" />
            {quiz.timeLimit} min
          </Badge>
        )}
        <span className="text-xs text-text-muted">{answeredCount}/{quiz.questions.length} answered</span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-line-soft">
        <div
          className="h-full rounded-full bg-gold-500 transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="panel">
        <p className="mb-1 text-xs text-text-muted">Question {currentIndex + 1} of {quiz.questions.length}</p>
        <p className="flex items-start gap-2 text-lg font-semibold text-text-primary">
          {question.required && <Flag aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-red-500" />}
          {question.question}
        </p>
        <p className="mt-1 text-xs text-gold-600 dark:text-gold-400">{question.points} points</p>
      </div>

      <div className="panel">
        {question.type === 'multiple-choice' && question.options && (
          <div className="space-y-2">
            {question.options.map((option) => (
              <label
                key={option}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors hover:bg-line-soft',
                  answers[question.id] === option
                    ? 'border-gold-500 bg-gold-500/10 dark:bg-gold-500/15'
                    : 'border-line',
                )}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={answers[question.id] === option}
                  onChange={(e) => handleSetAnswer(question.id, e.target.value)}
                  className="h-4 w-4 accent-gold-600"
                />
                <span className="text-sm text-text-primary">{option}</span>
              </label>
            ))}
          </div>
        )}

        {question.type === 'short-answer' && (
          <div>
            <label htmlFor={`sa-${question.id}`} className="label">Your answer</label>
            <textarea
              id={`sa-${question.id}`}
              rows={4}
              value={answers[question.id] ?? ''}
              onChange={(e) => handleSetAnswer(question.id, e.target.value)}
              className="input !py-2"
              placeholder="Type your response..."
            />
          </div>
        )}

        {question.type === 'file-upload' && (
          <div className="space-y-3">
            <div className="rounded-lg border-2 border-dashed border-line p-6 text-center">
              <FileUp aria-hidden="true" className="mx-auto mb-2 h-8 w-8 text-text-muted" />
              <p className="text-sm font-medium text-text-primary">
                {answers[question.id] ? answers[question.id] : 'Drag and drop or click to upload'}
              </p>
              <p className="mt-1 text-xs text-text-muted">PDF, ZIP, Images, MP4 accepted</p>
              <input
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleSetAnswer(question.id, file.name);
                }}
                className="mt-3 text-xs"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((prev) => prev - 1)}
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Previous
        </Button>

        {currentIndex < quiz.questions.length - 1 ? (
          <Button variant="gold" onClick={() => setCurrentIndex((prev) => prev + 1)}>
            Next
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="gold" onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                Submit Quiz
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}