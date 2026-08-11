import { ParentOverview } from '@/components/dashboard/parent/ParentOverview';
import { getMockIdentity } from '@/lib/dashboard-data';
import { getSession } from '@/lib/auth';

export default async function ParentDashboard() {
  const session = await getSession();
  const identity = getMockIdentity(session);

  return <ParentOverview parentId={identity.id} />;
}