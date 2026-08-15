import { requireStudent } from '@/lib/route-guards';

export default async function StudentDashboardLayout({ children }: { children: React.ReactNode }) {
  await requireStudent();
  return <>{children}</>;
}