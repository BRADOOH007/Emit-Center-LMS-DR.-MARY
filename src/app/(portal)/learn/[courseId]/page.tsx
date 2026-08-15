import { CourseLearnView } from '@/components/learning/CourseLearnView';

export default function LearnPage({ params }: { params: { courseId: string } }) {
  return <CourseLearnView courseId={params.courseId} />;
}
