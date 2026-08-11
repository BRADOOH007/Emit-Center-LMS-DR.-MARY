import { InstructorSchedule } from '@/components/dashboard/instructor/InstructorSchedule';
import { getMockIdentity } from '@/lib/dashboard-data';
import { getSession } from '@/lib/auth';

export default async function InstructorSchedulePage() {
  const session = await getSession();
  const identity = getMockIdentity(session);

  return <InstructorSchedule instructorId={identity.id} />;
}