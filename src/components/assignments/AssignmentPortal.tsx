'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Clock,
  FileUp,
  FileText,
  Download,
  AlertCircle,
  CheckCircle2,
  ArrowUpCircle,
  X,
} from 'lucide-react';
import type { Assignment, Submission } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

type PortalAssignment = Assignment & { submissions: Submission[] };

export function AssignmentPortal({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [assignments, setAssignments] = useState<PortalAssignment[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadDone, setUploadDone] = useState<Set<string>>(new Set());
  const [files, setFiles] = useState<Record<string, File | null>>({});

  useEffect(() => {
    let active = true;
    fetch(`/api/assignments/${encodeURIComponent(courseId)}`)
      .then((res) => (res.ok ? res.json() : Promise.resolve({ data: { assignments: [] } })))
      .then((json) => {
        if (!active) return;
        const data = json.data;
        const list = Array.isArray(data) ? data : Array.isArray(data?.assignments) ? data.assignments : [];
        setAssignments(list as PortalAssignment[]);
      })
      .catch(() => {
        if (active) setAssignments([]);
      });
    return () => {
      active = false;
    };
  }, [courseId]);

  const activeAssignment = assignments[activeTab];
  const submissions = activeAssignment ? activeAssignment.submissions : [];

  const isPastDue = (dueDate: string) => new Date(dueDate) < new Date();
  const formatDueDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

  const handleUpload = useCallback(async (assignmentId: string) => {
    const file = files[assignmentId];
    if (!file) return;
    setUploadingId(assignmentId);
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
          assignmentId,
          fileName: uploaded?.originalName ?? file.name,
          fileSize: file.size,
          fileUrl: uploaded?.url ?? undefined,
          fileKey: uploaded?.key ?? undefined,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const submission = json?.data as Submission | undefined;
        if (submission) {
          setAssignments((prev) =>
            prev.map((a) => (a.id === assignmentId ? { ...a, submissions: [...a.submissions, submission] } : a)),
          );
        }
        setUploadDone((prev) => new Set(prev).add(assignmentId));
      }
    } catch {
      return;
    } finally {
      setUploadingId(null);
    }
  }, [files, courseId]);

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
        {assignments.map((assignment, index) => (
          <button
            key={assignment.id}
            type="button"
            onClick={() => setActiveTab(index)}
            className={cn(
              'shrink-0 rounded-btn px-4 py-2 text-sm font-medium transition-colors',
              activeTab === index
                ? 'bg-gold-500/10 text-gold-700 dark:text-gold-300'
                : 'text-text-muted hover:bg-line-soft hover:text-text-primary',
            )}
          >
            {assignment.title}
          </button>
        ))}
      </div>

      {activeAssignment && (
        <div className="space-y-6">
          <div className="card space-y-4 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold text-text-primary">{activeAssignment.title}</h2>
                <p className="mt-2 text-sm text-text-muted">{activeAssignment.description}</p>
              </div>
              <div className="flex gap-2">
                <Badge variant="gold">{activeAssignment.points} pts</Badge>
                {isPastDue(activeAssignment.dueDate) ? (
                  <Badge variant="danger" dot>Past due</Badge>
                ) : (
                  <Badge variant="success" dot>
                    <Clock aria-hidden="true" className="h-3 w-3" />
                    Due {formatDueDate(activeAssignment.dueDate)}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
              <span>Accepted formats:</span>
              {activeAssignment.allowedFormats.map((fmt) => (
                <code key={fmt} className="rounded bg-line-soft px-1.5 py-0.5 text-text-primary">{fmt}</code>
              ))}
            </div>

            <div className="divider" />

            <div>
              <h3 className="mb-3 text-sm font-semibold text-text-primary">Your submission</h3>

              {submissions.length > 0 ? (
                <div className="space-y-3">
                  {submissions.map((submission) => (
                    <div key={submission.id} className="flex items-center justify-between rounded-lg border border-line p-3">
                      <div className="flex items-center gap-3">
                        <FileText aria-hidden="true" className="h-8 w-8 text-gold-600 dark:text-gold-400" />
                        <div>
                          <p className="text-sm font-medium text-text-primary">{submission.fileName ?? 'Text submission'}</p>
                          <p className="text-xs text-text-muted">
                            Submitted {new Date(submission.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {submission.score !== undefined && (
                          <Badge variant={submission.status === 'graded' ? 'success' : 'neutral'}>
                            {submission.score}/{activeAssignment.points}
                            {submission.letterGrade && ` (${submission.letterGrade})`}
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (submission.fileUrl) window.open(submission.fileUrl, '_blank');
                          }}
                        >
                          <Download aria-hidden="true" className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {submissions[0]?.feedback && (
                    <div className="rounded-lg bg-gold-500/5 p-3 dark:bg-gold-500/10">
                      <p className="text-xs font-semibold text-text-primary">Instructor feedback</p>
                      <p className="mt-1 text-xs text-text-muted">{submissions[0].feedback}</p>
                    </div>
                  )}
                </div>
              ) : (
                !uploadDone.has(activeAssignment.id) && (
                  <div className="space-y-3">
                    <div className="rounded-lg border-2 border-dashed border-line p-6 text-center">
                      <FileUp aria-hidden="true" className="mx-auto mb-2 h-10 w-10 text-text-muted" />
                      <p className="text-sm font-medium text-text-primary">Upload your submission</p>
                      <p className="mt-1 text-xs text-text-muted">
                        {activeAssignment.allowedFormats.join(', ')} files accepted
                      </p>
                      <input
                        type="file"
                        onChange={(e) => setFiles((prev) => ({ ...prev, [activeAssignment.id]: e.target.files?.[0] ?? null }))}
                        className="mt-3 text-xs"
                      />
                    </div>
                    {files[activeAssignment.id] && (
                      <Button
                        variant="gold"
                        fullWidth
                        onClick={() => handleUpload(activeAssignment.id)}
                        disabled={uploadingId === activeAssignment.id}
                      >
                        {uploadingId === activeAssignment.id ? (
                          <>Uploading...</>
                        ) : (
                          <>
                            <ArrowUpCircle aria-hidden="true" className="h-4 w-4" />
                            Submit {files[activeAssignment.id]?.name}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )
              )}

              {uploadDone.has(activeAssignment.id) && (
                <div className="flex flex-col items-center rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-6 text-center dark:bg-emerald-500/10">
                  <CheckCircle2 aria-hidden="true" className="mb-2 h-10 w-10 text-emerald-500" />
                  <p className="font-semibold text-text-primary">Submission received!</p>
                  <p className="text-sm text-text-muted">Your submission has been timestamped and is pending review.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
