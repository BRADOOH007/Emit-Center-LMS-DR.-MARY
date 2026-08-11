import { LessonViewer } from '@/components/learning/LessonViewer';
import { VirtualClassLauncher } from '@/components/learning/VirtualClassroom';

export default function LearnPage({ params }: { params: { courseId: string } }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="header-kicker">Learning</p>
        <h1 className="page-title">Course Content</h1>
        <p className="page-subtitle mt-1">
          Video lessons, documents, assignments, and interactive SCORM modules.
        </p>
      </div>
      <VirtualClassLauncher courseId={params.courseId} />
      <LessonViewer courseId={params.courseId} />
    </div>
  );
}
