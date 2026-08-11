import { InstructorRoster } from '@/components/dashboard/instructor/InstructorRoster';
import { getMockIdentity } from '@/lib/dashboard-data';
import { getSession } from '@/lib/auth';

export default async function InstructorRosterPage() {
  const session = await getSession();
  const identity = getMockIdentity(session);

  return <InstructorRoster instructorId={identity.id} />;
}