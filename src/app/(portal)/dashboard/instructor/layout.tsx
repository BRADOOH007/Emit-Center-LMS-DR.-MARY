import { requireInstructor } from '@/lib/route-guards';

export default async function InstructorDashboardLayout({ children }: { children: React.ReactNode }) {
  await requireInstructor();
  return <>{children}</>;
}