import { ParentContact } from '@/components/dashboard/parent/ParentContact';
import { getMockIdentity } from '@/lib/dashboard-data';
import { getSession } from '@/lib/auth';

export default async function ParentContactPage() {
  const session = await getSession();
  const identity = getMockIdentity(session);

  return <ParentContact parentId={identity.id} />;
}