import { ParentCertificates } from '@/components/dashboard/parent/ParentCertificates';
import { getMockIdentity } from '@/lib/dashboard-data';
import { getSession } from '@/lib/auth';

export default async function ParentCertificatesPage() {
  const session = await getSession();
  const identity = getMockIdentity(session);

  return <ParentCertificates parentId={identity.id} />;
}