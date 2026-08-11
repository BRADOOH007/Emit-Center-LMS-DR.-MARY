import { ParentGrades } from '@/components/dashboard/parent/ParentGrades';
import { getMockIdentity } from '@/lib/dashboard-data';
import { getSession } from '@/lib/auth';

export default async function ParentGradesPage() {
  const session = await getSession();
  const identity = getMockIdentity(session);

  return <ParentGrades parentId={identity.id} />;
}