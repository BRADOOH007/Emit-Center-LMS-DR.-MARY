import { StudentPayments } from '@/components/dashboard/student/StudentPayments';
import { getMockIdentity } from '@/lib/dashboard-data';
import { getSession } from '@/lib/auth';

export default async function StudentPaymentsPage() {
  const session = await getSession();
  const identity = getMockIdentity(session);

  return <StudentPayments studentId={identity.id} />;
}