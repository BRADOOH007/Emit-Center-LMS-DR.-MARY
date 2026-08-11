import { StudentSchedule } from '@/components/dashboard/student/StudentSchedule';
import { getMockIdentity } from '@/lib/dashboard-data';
import { getSession } from '@/lib/auth';

export default async function StudentSchedulePage() {
  const session = await getSession();
  const identity = getMockIdentity(session);

  return <StudentSchedule studentId={identity.id} />;
}