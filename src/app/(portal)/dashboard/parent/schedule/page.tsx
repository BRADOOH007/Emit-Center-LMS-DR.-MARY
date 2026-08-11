import { ParentSchedule } from '@/components/dashboard/parent/ParentSchedule';
import { getMockIdentity } from '@/lib/dashboard-data';
import { getSession } from '@/lib/auth';

export default async function ParentSchedulePage() {
  const session = await getSession();
  const identity = getMockIdentity(session);

  return <ParentSchedule parentId={identity.id} />;
}