import { InstructorGrades } from '@/components/dashboard/instructor/InstructorGrades';
import { getMockIdentity } from '@/lib/dashboard-data';
import { getSession } from '@/lib/auth';

export default async function InstructorGradesPage() {
  const session = await getSession();
  const identity = getMockIdentity(session);

  return <InstructorGrades instructorId={identity.id} />;
}