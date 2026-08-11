import { StudentGrades } from '@/components/dashboard/student/StudentGrades';
import { getMockIdentity } from '@/lib/dashboard-data';
import { getSession } from '@/lib/auth';

export default async function StudentGradesPage() {
  const session = await getSession();
  const identity = getMockIdentity(session);

  return <StudentGrades studentId={identity.id} />;
}