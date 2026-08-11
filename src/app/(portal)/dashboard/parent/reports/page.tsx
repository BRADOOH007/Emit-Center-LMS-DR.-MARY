import { ParentReports } from '@/components/dashboard/parent/ParentReports';
import { getMockIdentity } from '@/lib/dashboard-data';
import { getSession } from '@/lib/auth';

export default async function ParentReportsPage() {
  const session = await getSession();
  const identity = getMockIdentity(session);

  return <ParentReports parentId={identity.id} />;
}