import { GradebookTable } from '@/components/gradebook/GradebookTable';
import { getSession } from '@/lib/auth';
import { MOCK_COURSES } from '@/lib/mock-data';

export default async function GradebookPage() {
  const session = await getSession();
  const defaultCourseId = MOCK_COURSES[0]?.id ?? '';

  return (
    <div className="space-y-6">
      <div>
        <p className="header-kicker">Instructor</p>
        <h1 className="page-title">Master Gradebook</h1>
        <p className="page-subtitle mt-1">Track quiz scores, assignment grades, practical assessments, and leave comments.</p>
      </div>
      <GradebookTable courseId={defaultCourseId} />
    </div>
  );
}
