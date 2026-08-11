import { AssignmentPortal } from '@/components/assignments/AssignmentPortal';

export default function AssignmentsPage({ params }: { params: { courseId: string } }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="header-kicker">Coursework</p>
        <h1 className="page-title">Assignments</h1>
        <p className="page-subtitle mt-1">Submit your work with timestamped auditing.</p>
      </div>
      <AssignmentPortal courseId={params.courseId} />
    </div>
  );
}
