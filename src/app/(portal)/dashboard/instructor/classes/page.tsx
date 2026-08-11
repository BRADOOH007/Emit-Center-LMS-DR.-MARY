import { InstructorClasses } from '@/components/dashboard/instructor/InstructorClasses';
import { getMockIdentity } from '@/lib/dashboard-data';
import { getSession } from '@/lib/auth';

export default async function InstructorClassesPage() {
  const session = await getSession();
  const identity = getMockIdentity(session);

  return <InstructorClasses instructorId={identity.id} />;
}