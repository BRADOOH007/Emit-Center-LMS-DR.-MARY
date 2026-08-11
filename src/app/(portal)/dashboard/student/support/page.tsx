import { StudentSupport } from '@/components/dashboard/student/StudentSupport';
import { getMockIdentity } from '@/lib/dashboard-data';
import { getSession } from '@/lib/auth';

export default async function StudentSupportPage() {
  const session = await getSession();
  const identity = getMockIdentity(session);

  return <StudentSupport studentId={identity.id} />;
}