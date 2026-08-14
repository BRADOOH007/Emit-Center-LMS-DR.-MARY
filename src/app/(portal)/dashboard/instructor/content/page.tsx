import { InstructorContent } from '@/components/dashboard/instructor/InstructorContent';
import { getMockIdentity } from '@/lib/dashboard-data';
import { getSession } from '@/lib/auth';

export default async function InstructorContentPage() {
  const session = await getSession();
  const identity = getMockIdentity(session);

  return <InstructorContent instructorId={identity.id} />;
}
