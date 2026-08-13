import { InstructorAssessments } from '@/components/dashboard/instructor/InstructorAssessments';
import { getMockIdentity } from '@/lib/dashboard-data';
import { getSession } from '@/lib/auth';

export default async function InstructorAssessmentsPage() {
  const session = await getSession();
  const identity = getMockIdentity(session);

  return <InstructorAssessments instructorId={identity.id} />;
}