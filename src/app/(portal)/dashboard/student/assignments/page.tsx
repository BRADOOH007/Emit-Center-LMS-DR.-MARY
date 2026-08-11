import { StudentAssignments } from '@/components/dashboard/student/StudentAssignments';
import { getMockIdentity } from '@/lib/dashboard-data';
import { getSession } from '@/lib/auth';

export default async function StudentAssignmentsPage() {
  const session = await getSession();
  const identity = getMockIdentity(session);

  return <StudentAssignments studentId={identity.id} />;
}