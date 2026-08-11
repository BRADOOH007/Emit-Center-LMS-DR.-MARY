import { ParentPayments } from '@/components/dashboard/parent/ParentPayments';
import { getMockIdentity } from '@/lib/dashboard-data';
import { getSession } from '@/lib/auth';

export default async function ParentPaymentsPage() {
  const session = await getSession();
  const identity = getMockIdentity(session);

  return <ParentPayments parentId={identity.id} />;
}