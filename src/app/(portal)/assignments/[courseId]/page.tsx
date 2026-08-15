import { Suspense } from 'react';
import { AssignmentPortal } from '@/components/assignments/AssignmentPortal';

export default function AssignmentsPage({ params }: { params: { courseId: string } }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="header-kicker">Coursework</p>
        <h1 className="page-title">Assignments</h1>
        <p className="page-subtitle mt-1">Submit your work with timestamped auditing.</p>
      </div>
      <Suspense
        fallback={
          <div className="flex items-center justify-center rounded-2xl border border-border bg-surface p-12 text-sm text-text-muted">
            Loading assignments…
          </div>
        }
      >
        <AssignmentPortal courseId={params.courseId} />
      </Suspense>
    </div>
  );
}
