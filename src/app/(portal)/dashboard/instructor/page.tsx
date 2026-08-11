import { InstructorOverview } from '@/components/dashboard/instructor/InstructorOverview';
import { getMockIdentity } from '@/lib/dashboard-data';
import { getSession } from '@/lib/auth';

export default async function InstructorDashboard() {
  const session = await getSession();
  const identity = getMockIdentity(session);

  return <InstructorOverview instructorId={identity.id} />;
}