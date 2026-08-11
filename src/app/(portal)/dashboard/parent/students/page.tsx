import { ParentStudents } from '@/components/dashboard/parent/ParentStudents';
import { getMockIdentity } from '@/lib/dashboard-data';
import { getSession } from '@/lib/auth';

export default async function ParentStudentsPage() {
  const session = await getSession();
  const identity = getMockIdentity(session);

  return <ParentStudents parentId={identity.id} />;
}