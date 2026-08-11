import { StudentCourses } from '@/components/dashboard/student/StudentCourses';
import { getMockIdentity } from '@/lib/dashboard-data';
import { getSession } from '@/lib/auth';

export default async function StudentCoursesPage() {
  const session = await getSession();
  const identity = getMockIdentity(session);

  return <StudentCourses studentId={identity.id} />;
}