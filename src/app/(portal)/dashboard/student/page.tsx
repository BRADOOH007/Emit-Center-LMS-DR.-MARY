import { StudentOverview } from '@/components/dashboard/student/StudentOverview';
import { getMockIdentity } from '@/lib/dashboard-data';
import { getSession } from '@/lib/auth';

export default async function StudentDashboard() {
  const session = await getSession();
  const identity = getMockIdentity(session);

  return <StudentOverview studentId={identity.id} />;
}