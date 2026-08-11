import { InstructorAnnouncements } from '@/components/dashboard/instructor/InstructorAnnouncements';
import { getMockIdentity } from '@/lib/dashboard-data';
import { getSession } from '@/lib/auth';

export default async function InstructorAnnouncementsPage() {
  const session = await getSession();
  const identity = getMockIdentity(session);

  return <InstructorAnnouncements instructorId={identity.id} />;
}