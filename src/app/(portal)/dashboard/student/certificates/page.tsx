import { StudentCertificates } from '@/components/dashboard/student/StudentCertificates';
import { getMockIdentity } from '@/lib/dashboard-data';
import { getSession } from '@/lib/auth';

export default async function StudentCertificatesPage() {
  const session = await getSession();
  const identity = getMockIdentity(session);

  return <StudentCertificates studentId={identity.id} />;
}