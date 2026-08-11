import { StudentClasses } from '@/components/dashboard/student/StudentClasses';
import { getMockIdentity } from '@/lib/dashboard-data';
import { getSession } from '@/lib/auth';

export default async function StudentClassesPage() {
  const session = await getSession();
  const identity = getMockIdentity(session);

  return <StudentClasses studentId={identity.id} />;
}