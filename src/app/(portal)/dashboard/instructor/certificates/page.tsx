import { InstructorCertificates } from '@/components/dashboard/instructor/InstructorCertificates';
import { getMockIdentity } from '@/lib/dashboard-data';
import { getSession } from '@/lib/auth';

export default async function InstructorCertificatesPage() {
  const session = await getSession();
  const identity = getMockIdentity(session);

  return <InstructorCertificates instructorId={identity.id} />;
}