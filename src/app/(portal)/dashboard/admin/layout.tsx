import { requireAdmin } from '@/lib/route-guards';

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <>{children}</>;
}