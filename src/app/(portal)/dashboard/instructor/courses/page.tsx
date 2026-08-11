import { InstructorCourses } from '@/components/dashboard/instructor/InstructorCourses';
import { getMockIdentity } from '@/lib/dashboard-data';
import { getSession } from '@/lib/auth';

export default async function InstructorCoursesPage() {
  const session = await getSession();
  const identity = getMockIdentity(session);

  return <InstructorCourses instructorId={identity.id} />;
}